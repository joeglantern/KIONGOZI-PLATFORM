// Devices signed in to an account ("Where you're logged in"), the revoke check the auth middleware
// runs, and the new sign-in alert. Backed by public.user_devices (migration 20261031000900); until
// that migration runs every function here quietly does nothing, so the API keeps working.
import { Request } from 'express';
import { prisma } from '../config/prisma';
import { supabaseServiceClient } from '../config/supabase';
import { sendExpoPush } from './PushService';

const DEVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Stable per-install id the app sends on every request (absent on web and older builds) */
export function deviceIdOf(req: Request): string | null {
  const v = req.headers['x-device-id'];
  const id = Array.isArray(v) ? v[0] : v;
  return id && DEVICE_ID.test(id) ? id : null;
}

/** session_id and iat from an access token that has already been verified */
export function tokenClaims(req: Request): { sessionId: string | null; iat: number | null } {
  try {
    const token = (req.headers.authorization || '').slice(7);
    const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return {
      sessionId: typeof p.session_id === 'string' ? p.session_id : null,
      iat: typeof p.iat === 'number' ? p.iat : null,
    };
  } catch {
    return { sessionId: null, iat: null };
  }
}

// ─── Table availability (before the migration runs) ──────────────────────────
let missingUntil = 0;
const isMissingTable = (e: any) => /42P01|does not exist/i.test(String(e?.message || '') + String(e?.meta?.code || ''));
function ready() { return Date.now() >= missingUntil; }
function noteError(e: any, what: string) {
  if (isMissingTable(e)) { missingUntil = Date.now() + 5 * 60_000; return; }
  console.error(`devices: ${what} failed:`, e?.message || e);
}

// ─── Revoke check (runs on every authenticated request that carries a device id) ──
type RevokeState = { revokedAt: number | null; revokedSession: string | null; at: number };
const REVOKE_TTL = 60_000;
const revokeCache = new Map<string, RevokeState>();

async function revokeState(userId: string, deviceId: string): Promise<RevokeState> {
  const key = `${userId}:${deviceId}`;
  const hit = revokeCache.get(key);
  if (hit && Date.now() - hit.at < REVOKE_TTL) return hit;
  const state: RevokeState = { revokedAt: null, revokedSession: null, at: Date.now() };
  if (ready()) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        select revoked_at, revoked_session_id::text as revoked_session_id
        from public.user_devices where user_id = ${userId}::uuid and device_id = ${deviceId} limit 1`;
      if (rows[0]?.revoked_at) {
        state.revokedAt = new Date(rows[0].revoked_at).getTime();
        state.revokedSession = rows[0].revoked_session_id || null;
      }
    } catch (e) { noteError(e, 'revoke check'); }
  }
  if (revokeCache.size > 20_000) revokeCache.clear();
  revokeCache.set(key, state);
  return state;
}

/** True when this device was logged out from another device and this request still uses that sign-in */
export async function isRevoked(req: Request, userId: string): Promise<boolean> {
  const deviceId = deviceIdOf(req);
  if (!deviceId) return false;
  const s = await revokeState(userId, deviceId);
  if (!s.revokedAt) return false;
  const { sessionId, iat } = tokenClaims(req);
  // A fresh sign-in on the same phone has a new session: it's let through (and the ping clears the flag)
  if (s.revokedSession && sessionId) return sessionId === s.revokedSession;
  return iat != null ? iat * 1000 < s.revokedAt : true;
}

function forgetRevoke(userId: string, deviceId?: string) {
  if (deviceId) { revokeCache.delete(`${userId}:${deviceId}`); return; }
  for (const k of revokeCache.keys()) if (k.startsWith(`${userId}:`)) revokeCache.delete(k);
}

// ─── Rough place from the network ────────────────────────────────────────────
const placeCache = new Map<string, { place: string | null; at: number }>();

function headerPlace(req: Request): string | null {
  const h = (n: string) => { const v = req.headers[n]; return typeof v === 'string' && v.trim() ? decodeURIComponent(v.trim()) : null; };
  return h('cf-ipcity') || h('x-vercel-ip-city') || h('x-geo-city');
}

async function lookupPlace(ip: string | null): Promise<string | null> {
  if (!ip || process.env.DEVICE_GEO === 'off') return null;
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/i.test(ip)) return null;
  const hit = placeCache.get(ip);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.place;
  let place: string | null = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country,country_code`, { signal: ctrl.signal });
    clearTimeout(t);
    const j: any = await r.json();
    if (j?.success) {
      const local = j.city || j.region || null;
      place = j.country_code && j.country_code !== 'KE' ? [local, j.country].filter(Boolean).join(', ') : local;
    }
  } catch { /* no place is fine */ }
  if (placeCache.size > 5000) placeCache.clear();
  placeCache.set(ip, { place, at: Date.now() });
  return place;
}

const clip = (s: unknown, n: number) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, n) : null);

// ─── Ping: the app reports itself on start/resume ────────────────────────────
export async function ping(req: Request, userId: string, body: any): Promise<{ ok: boolean; newDevice: boolean }> {
  // Header only: the same header the revoke check reads, so a logged-out phone can't ping itself back in
  const deviceId = deviceIdOf(req);
  if (!deviceId || !ready()) return { ok: false, newDevice: false };
  const { sessionId } = tokenClaims(req);
  const model = clip(body?.model, 60);
  const os = clip(body?.os, 40);
  const appVersion = clip(body?.app_version, 30);
  const ip = req.ip || null;

  try {
    const existing: any[] = await prisma.$queryRaw`
      select id::text, ip, place, revoked_at, session_id::text as session_id
      from public.user_devices where user_id = ${userId}::uuid and device_id = ${deviceId} limit 1`;
    const row = existing[0];
    const place = headerPlace(req) || (row && row.ip === ip && row.place ? row.place : await lookupPlace(ip));

    if (row) {
      await prisma.$executeRaw`
        update public.user_devices set
          session_id = coalesce(${sessionId}::uuid, session_id),
          model = coalesce(${model}, model), os = coalesce(${os}, os), app_version = coalesce(${appVersion}, app_version),
          ip = ${ip}, place = coalesce(${place}, place), last_seen_at = now(),
          revoked_at = null, revoked_session_id = null
        where id = ${row.id}::uuid`;
      if (row.revoked_at) forgetRevoke(userId, deviceId);
      return { ok: true, newDevice: false };
    }

    const others: any[] = await prisma.$queryRaw`
      select count(*)::int as n from public.user_devices where user_id = ${userId}::uuid`;
    const inserted = await prisma.$executeRaw`
      insert into public.user_devices (user_id, device_id, session_id, model, os, app_version, ip, place)
      values (${userId}::uuid, ${deviceId}, ${sessionId}::uuid, ${model}, ${os}, ${appVersion}, ${ip}, ${place})
      on conflict (user_id, device_id) do nothing`;
    // The very first device (sign-up, or the first ping after this shipped) never alerts
    if (inserted && (others[0]?.n || 0) > 0 && sessionId && (await isFreshSession(sessionId))) {
      void alertNewSignIn(userId, model || 'A new device', place);
    }
    return { ok: true, newDevice: !!inserted };
  } catch (e) {
    noteError(e, 'ping');
    return { ok: false, newDevice: false };
  }
}

/** A sign-in made in the last half hour (not a phone that was already signed in and just updated the app) */
async function isFreshSession(sessionId: string): Promise<boolean> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      select created_at from auth.sessions where id = ${sessionId}::uuid limit 1`;
    return !!rows[0] && Date.now() - new Date(rows[0].created_at).getTime() < 30 * 60_000;
  } catch {
    return false;
  }
}

async function alertNewSignIn(userId: string, model: string, place: string | null) {
  const where = place ? `${model} · ${place}` : model;
  const title = 'New sign-in to your account';
  const message = `New sign-in on ${where}. Not you? Tap to secure your account.`;
  const data = { kind: 'new_login', device: model, place };
  try {
    // 'info' is already allowed by the notifications type check, so this needs no constraint change
    await supabaseServiceClient.from('social_notifications')
      .insert({ user_id: userId, type: 'info', title, message, data, read: false });
    const { data: tokens } = await supabaseServiceClient.from('push_tokens').select('token').eq('user_id', userId);
    await sendExpoPush((tokens || []).map((t: any) => t.token), title, `${where}. Not you? Secure your account.`, { ...data, type: 'info' });
  } catch (e) {
    console.error('devices: new sign-in alert failed:', e);
  }
}

// ─── Listing and logging out ─────────────────────────────────────────────────
export type DeviceRow = {
  id: string; device_id: string; session_id: string | null; model: string | null; os: string | null;
  app_version: string | null; place: string | null; created_at: Date; last_seen_at: Date;
};

export async function listDevices(userId: string): Promise<DeviceRow[] | null> {
  if (!ready()) return null;
  try {
    return await prisma.$queryRaw<DeviceRow[]>`
      select id::text, device_id, session_id::text as session_id, model, os, app_version, place, created_at, last_seen_at
      from public.user_devices
      where user_id = ${userId}::uuid and revoked_at is null and last_seen_at > now() - interval '120 days'
      order by last_seen_at desc limit 30`;
  } catch (e) {
    noteError(e, 'list');
    return null;
  }
}

/** Log one device out: flag it (its next request gets 401) and end its Supabase session */
export async function revokeDevice(userId: string, id: string): Promise<{ found: boolean; sessionId: string | null }> {
  if (!ready()) return { found: false, sessionId: null };
  try {
    const rows: any[] = await prisma.$queryRaw`
      update public.user_devices set revoked_at = now(), revoked_session_id = session_id
      where user_id = ${userId}::uuid and id = ${id}::uuid
      returning device_id, session_id::text as session_id`;
    if (!rows[0]) return { found: false, sessionId: null };
    forgetRevoke(userId, rows[0].device_id);
    return { found: true, sessionId: rows[0].session_id || null };
  } catch (e) {
    noteError(e, 'revoke');
    return { found: false, sessionId: null };
  }
}

/** Revoke any device rows that were using this Supabase session (logging out from the sessions list) */
export async function revokeBySession(userId: string, sessionId: string) {
  if (!ready()) return;
  try {
    await prisma.$executeRaw`
      update public.user_devices set revoked_at = now(), revoked_session_id = session_id
      where user_id = ${userId}::uuid and session_id = ${sessionId}::uuid and revoked_at is null`;
    forgetRevoke(userId);
  } catch (e) { noteError(e, 'revoke by session'); }
}

/** Every device except this one */
export async function revokeOthers(userId: string, keepDeviceId: string | null, keepSessionId: string | null) {
  if (!ready()) return 0;
  try {
    const n = await prisma.$executeRaw`
      update public.user_devices set revoked_at = now(), revoked_session_id = session_id
      where user_id = ${userId}::uuid and revoked_at is null
        and device_id is distinct from ${keepDeviceId}
        and (${keepSessionId}::uuid is null or session_id is distinct from ${keepSessionId}::uuid)`;
    forgetRevoke(userId);
    return n;
  } catch (e) {
    noteError(e, 'revoke others');
    return 0;
  }
}
