// Trust and security, mounted at /api/v1/user.
// "Where you're logged in": the phones and browsers signed in to this account, and logging one out.
//  POST   /api/v1/user/devices/ping    the app reports itself (model, OS, version) on start/resume
//  GET    /api/v1/user/sessions        list (this device first) + last_sign_in
//  DELETE /api/v1/user/sessions/:id    log that device out (a device row id or a Supabase session id)
//  DELETE /api/v1/user/sessions        log out everywhere else
// Muted words:
//  GET    /api/v1/user/muted-words
//  POST   /api/v1/user/muted-words     { phrase, duration: '24h' | '7d' | 'forever' }
//  DELETE /api/v1/user/muted-words/:id
// Device rows come from public.user_devices; Supabase's own auth.sessions fills in browsers and older
// app builds. Before the trust_security migration runs, the list is built from auth.sessions alone.
import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticateToken } from '../middleware/auth';
import { deviceIdOf, tokenClaims, ping, listDevices, revokeDevice, revokeBySession, revokeOthers } from '../services/DeviceService';
import { listMutedWords, forgetMutedWords, noteMissing } from '../services/MutedWords';

const router = Router();

const currentSessionId = (req: Request) => tokenClaims(req).sessionId;

/** Turn a user agent into something a person recognises */
function describe(ua: string | null): { device: string; kind: 'phone' | 'computer' | 'unknown' } {
  const s = ua || '';
  if (/okhttp|Android/i.test(s)) return { device: 'Android phone', kind: 'phone' };
  if (/iPad/i.test(s)) return { device: 'iPad', kind: 'phone' };
  if (/CFNetwork|Darwin|iPhone|iOS/i.test(s)) return { device: 'iPhone', kind: 'phone' };
  if (/Windows/i.test(s)) return { device: 'Browser on Windows', kind: 'computer' };
  if (/Macintosh|Mac OS/i.test(s)) return { device: 'Browser on a Mac', kind: 'computer' };
  if (/Linux/i.test(s)) return { device: 'Browser on Linux', kind: 'computer' };
  return { device: 'Unknown device', kind: 'unknown' };
}

const maskIp = (ip: string | null) => {
  if (!ip) return null;
  const v4 = ip.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  return v4 ? `${v4[1]}.${v4[2]}.x.x` : ip.split(':').slice(0, 3).join(':') + ':…';
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post('/devices/ping', authenticateToken, async (req: Request, res: Response) => {
  const r = await ping(req, req.user!.id, req.body || {});
  res.json({ success: true, data: { recorded: r.ok } });
});

router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = currentSessionId(req);
    const myDevice = deviceIdOf(req);
    const [sessions, devices] = await Promise.all([
      prisma.$queryRaw<any[]>`
        select id::text, created_at, updated_at, refreshed_at, user_agent, host(ip)::text as ip
        from auth.sessions
        where user_id = ${req.user!.id}::uuid and (not_after is null or not_after > now())
        order by coalesce(refreshed_at, updated_at, created_at) desc
        limit 30`.catch(e => { console.error('sessions list failed:', e); return null; }),
      listDevices(req.user!.id),
    ]);
    if (!sessions && !devices) { res.status(500).json({ success: false, error: 'Could not load your devices' }); return; }

    const alive = new Map<string, any>((sessions || []).map(s => [s.id, s]));
    const claimed = new Set<string>();
    const data: any[] = [];

    for (const d of devices || []) {
      const isMe = (!!myDevice && d.device_id === myDevice) || (!!me && d.session_id === me);
      // A device whose sign-in has ended (logged out normally) drops off the list
      if (!isMe && sessions && (!d.session_id || !alive.has(d.session_id))) continue;
      if (d.session_id) claimed.add(d.session_id);
      const s = d.session_id ? alive.get(d.session_id) : null;
      const isIos = /ios|ipados/i.test(d.os || '');
      data.push({
        id: d.id,
        device: d.model || (isIos ? 'iPhone' : 'Phone'),
        kind: 'phone',
        current: isMe,
        signed_in_at: s?.created_at || d.created_at,
        last_active_at: isMe ? new Date() : d.last_seen_at,
        place: d.place,
        os: d.os,
        app_version: d.app_version,
        ip: null,
      });
    }
    for (const s of sessions || []) {
      if (claimed.has(s.id)) continue;
      data.push({
        id: s.id,
        ...describe(s.user_agent),
        current: s.id === me,
        signed_in_at: s.created_at,
        last_active_at: s.refreshed_at || s.updated_at || s.created_at,
        place: null, os: null, app_version: null,
        ip: maskIp(s.ip),
      });
    }
    // Only one "this phone"
    let seenMe = false;
    for (const d of data) { if (d.current) { if (seenMe) d.current = false; seenMe = true; } }
    data.sort((a, b) => Number(b.current) - Number(a.current)
      || new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());

    // Most recent sign-in, for "Last sign-in: Yesterday 9:42 PM on iPhone" in Settings
    const last = data.reduce<any>((m, d) => (!m || new Date(d.signed_in_at) > new Date(m.signed_in_at) ? d : m), null);
    res.json({
      success: true,
      data,
      last_sign_in: last ? { at: last.signed_in_at, device: last.device, current: last.current } : null,
    });
  } catch (e) {
    console.error('sessions list failed:', e);
    res.status(500).json({ success: false, error: 'Could not load your devices' });
  }
});

router.delete('/sessions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    if (!UUID.test(id)) { res.status(400).json({ success: false, error: 'Unknown device' }); return; }
    const me = currentSessionId(req);
    if (id === me) {
      res.status(400).json({ success: false, error: 'Use Log out to sign out this phone' });
      return;
    }
    // A device row: flag it (its next request is refused) and end its Supabase session
    const dev = await revokeDevice(userId, id);
    let sessionId = dev.found ? dev.sessionId : id;
    if (dev.found && sessionId === me) sessionId = null;
    let removed = 0;
    if (sessionId) {
      removed = await prisma.$executeRaw`
        delete from auth.sessions where id = ${sessionId}::uuid and user_id = ${userId}::uuid`;
      if (!dev.found) await revokeBySession(userId, sessionId);
    }
    res.json({ success: true, data: { removed: removed + (dev.found ? 1 : 0) } });
  } catch (e) {
    console.error('session delete failed:', e);
    res.status(500).json({ success: false, error: 'Could not log that device out' });
  }
});

router.delete('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const me = currentSessionId(req);
    if (!me) { res.status(400).json({ success: false, error: 'Could not tell which device this is' }); return; }
    const flagged = await revokeOthers(userId, deviceIdOf(req), me);
    const n = await prisma.$executeRaw`
      delete from auth.sessions where user_id = ${userId}::uuid and id <> ${me}::uuid`;
    res.json({ success: true, data: { removed: Math.max(n, flagged) } });
  } catch (e) {
    console.error('sessions delete-all failed:', e);
    res.status(500).json({ success: false, error: 'Could not log the other devices out' });
  }
});

// ─── Muted words ─────────────────────────────────────────────────────────────
const DURATIONS: Record<string, number | null> = { '24h': 24 * 3600_000, '7d': 7 * 86400_000, forever: null };

router.get('/muted-words', authenticateToken, async (req: Request, res: Response) => {
  const words = await listMutedWords(req.user!.id, true);
  res.json({ success: true, data: words || [], available: words !== null });
});

router.post('/muted-words', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const phrase = String(req.body?.phrase || '').replace(/\s+/g, ' ').trim();
  const duration = String(req.body?.duration || 'forever');
  if (!phrase || phrase.length > 60) { res.status(400).json({ success: false, error: 'Use 1 to 60 characters' }); return; }
  if (!(duration in DURATIONS)) { res.status(400).json({ success: false, error: 'Pick 24 hours, 7 days or forever' }); return; }
  const ms = DURATIONS[duration];
  const expires = ms ? new Date(Date.now() + ms) : null;
  try {
    const count: any[] = await prisma.$queryRaw`select count(*)::int as n from public.muted_words where user_id = ${userId}::uuid`;
    if ((count[0]?.n || 0) >= 200) { res.status(400).json({ success: false, error: 'You can mute up to 200 words' }); return; }
    // Muting the same word again just changes how long it lasts
    const rows: any[] = await prisma.$queryRaw`
      insert into public.muted_words (user_id, phrase, expires_at)
      values (${userId}::uuid, ${phrase}, ${expires})
      on conflict (user_id, lower(phrase)) do update set expires_at = excluded.expires_at, created_at = now()
      returning id::text, phrase, expires_at, created_at`;
    forgetMutedWords(userId);
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    if (noteMissing(e)) { res.status(503).json({ success: false, error: 'Muted words aren’t ready yet. Try again later.' }); return; }
    console.error('muted word add failed:', e);
    res.status(500).json({ success: false, error: 'Could not mute that' });
  }
});

router.delete('/muted-words/:id', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  if (!UUID.test(req.params.id)) { res.status(400).json({ success: false, error: 'Unknown word' }); return; }
  try {
    await prisma.$executeRaw`delete from public.muted_words where id = ${req.params.id}::uuid and user_id = ${userId}::uuid`;
    forgetMutedWords(userId);
    res.json({ success: true });
  } catch (e) {
    if (noteMissing(e)) { res.json({ success: true }); return; }
    console.error('muted word delete failed:', e);
    res.status(500).json({ success: false, error: 'Could not unmute that' });
  }
});

export default router;
