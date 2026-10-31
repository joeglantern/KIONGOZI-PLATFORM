// Baraza: audio rooms run like a real baraza. One talking stick (Kijiti), time-boxed turns,
// a fair first-come hand queue, captions, and minutes (summary, key points, Ahadi) at the end.
// Mounted at /api/v1/baraza.
//
// Audio is near-live and turn based: the speaker's app records ~6 s chunks, uploads each to
// storage and posts it here; listeners get a realtime ping and play the chunks back to back.
// The server owns who holds the stick, when a turn ends and the queue order. Every change bumps
// baraza_rooms.version, which is the realtime ping the app listens for (it then refetches state).
import { Router, Request, Response } from 'express';
import { isCounty } from '../utils/kenyaCounties';
import OpenAI, { toFile } from 'openai';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import ModerationService from '../services/ModerationService';
import { sendExpoPush } from '../services/PushService';
import UploadService from '../services/UploadService';
import NotificationService from '../services/NotificationService';
import { renderMinutesCard } from '../services/ShareCards2';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROFILE = 'id, username, full_name, avatar_url, is_verified';
const ROOM = 'id, host_id, title, status, turn_seconds, holder_id, turn_started_at, turn_ends_at, prev_holder_id, prev_turn_ended_at, version, minutes_status, minutes_post_id, created_at, ended_at';
const PRESENT_MS = 45_000;          // seen within this = in the room
const GRACE_MS = 20_000;            // last chunk of a turn may land this long after the stick moved
const HOST_GONE_MS = 5 * 60_000;    // host away this long ends the baraza
const MAX_ROOM_MS = 4 * 3600_000;
const TURNS = [60, 120, 180];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARE_BASE = 'https://api.kiongozi.org';

type Room = {
  id: string; host_id: string; title: string; status: 'live' | 'ended'; turn_seconds: number;
  holder_id: string | null; turn_started_at: string | null; turn_ends_at: string | null;
  prev_holder_id: string | null; prev_turn_ended_at: string | null; version: number;
  minutes_status: string; minutes_post_id: string | null; created_at: string; ended_at: string | null;
};

const fail = (res: Response, code: number, error: string) => { res.status(code).json({ success: false, error }); };
const cutoff = () => new Date(Date.now() - PRESENT_MS).toISOString();

async function getRoom(id: string): Promise<Room | null> {
  if (!UUID.test(id)) return null;
  const { data } = await db.from('baraza_rooms').select(ROOM).eq('id', id).maybeSingle();
  return (data as any) || null;
}

async function blockedBetween(a: string, b: string) {
  const { data } = await db.from('blocks').select('blocker_id')
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`).limit(1);
  return !!data?.length;
}

/** People in the room right now (seen recently, not left, not removed). */
async function present(roomId: string) {
  const { data } = await db.from('baraza_participants')
    .select('user_id, role, hand_raised_at, spoke, joined_at, from_county')
    .eq('room_id', roomId).eq('removed', false).is('left_at', null).gt('last_seen_at', cutoff())
    .order('joined_at', { ascending: true }).limit(500);
  return (data || []) as any[];
}

const queueOf = (people: any[], holderId: string | null) => people
  .filter(p => p.hand_raised_at && p.user_id !== holderId)
  .sort((a, b) => a.hand_raised_at.localeCompare(b.hand_raised_at));

/** Patch that hands the stick to someone. The host's own turn is never timed. */
function stickTo(room: Room, userId: string) {
  const now = new Date();
  const timed = userId !== room.host_id;
  return {
    holder_id: userId,
    turn_started_at: now.toISOString(),
    turn_ends_at: timed ? new Date(now.getTime() + room.turn_seconds * 1000).toISOString() : null,
    prev_holder_id: room.holder_id && room.holder_id !== userId ? room.holder_id : room.prev_holder_id,
    prev_turn_ended_at: room.holder_id && room.holder_id !== userId ? now.toISOString() : room.prev_turn_ended_at,
  };
}

/**
 * Change a room safely: read, compute a patch, write only if nobody else changed it meanwhile
 * (version check), retry a few times. Returns the room after the change (or as it is).
 */
async function mutate(roomId: string, fn: (room: Room) => Promise<Record<string, any> | null> | Record<string, any> | null): Promise<Room | null> {
  for (let i = 0; i < 4; i++) {
    const room = await getRoom(roomId);
    if (!room) return null;
    const patch = await fn(room);
    if (!patch) return room;
    const { data } = await db.from('baraza_rooms').update({ ...patch, version: room.version + 1 })
      .eq('id', roomId).eq('version', room.version).select(ROOM).maybeSingle();
    if (data) return data as any;
  }
  return getRoom(roomId);
}

/** Just tell everyone to refetch (someone joined, raised a hand...). */
const ping = (roomId: string) => mutate(roomId, () => ({}));

/** Give the new holder their turn: hand comes down, marked as a speaker. */
async function seatSpeaker(roomId: string, userId: string) {
  await db.from('baraza_participants').update({ hand_raised_at: null, spoke: true }).eq('room_id', roomId).eq('user_id', userId);
}

/**
 * Server rules that run on every read and on the sweep: an expired turn passes to the first
 * hand in the queue (else the host); a speaker who vanished loses the stick.
 */
async function settle(roomId: string) {
  let seated: string | null = null;
  const room = await mutate(roomId, async r => {
    seated = null;
    if (r.status !== 'live' || !r.holder_id || r.holder_id === r.host_id) {
      if (r.status === 'live' && !r.holder_id) return stickTo(r, r.host_id);
      return null;
    }
    const expired = r.turn_ends_at && new Date(r.turn_ends_at).getTime() <= Date.now();
    const people = await present(r.id);
    const holderHere = people.some(p => p.user_id === r.holder_id);
    if (!expired && holderHere) return null;
    const next = queueOf(people, r.holder_id)[0];
    const to = next && next.user_id !== r.host_id ? next.user_id : r.host_id;
    seated = to;
    return stickTo(r, to);
  });
  if (seated && seated !== room?.host_id) await seatSpeaker(roomId, seated);
  return room;
}

async function profiles(ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data } = await db.from('profiles').select(PROFILE).in('id', [...new Set(ids)]);
  return new Map((data || []).map((p: any) => [p.id, p]));
}

async function stateFor(room: Room, userId: string) {
  const [people, { data: mine }, { data: last }] = await Promise.all([
    present(room.id),
    db.from('baraza_participants').select('role, hand_raised_at, removed, left_at').eq('room_id', room.id).eq('user_id', userId).maybeSingle(),
    db.from('baraza_segments').select('seq').eq('room_id', room.id).order('seq', { ascending: false }).limit(1),
  ]);
  const ids = [room.host_id, ...(room.holder_id ? [room.holder_id] : []), ...people.slice(0, 120).map(p => p.user_id)];
  const shown = people.slice(0, 120);
  const [byId, { data: follows }] = await Promise.all([
    profiles(ids),
    db.from('follows').select('following_id').eq('follower_id', userId).in('following_id', shown.map(p => p.user_id)),
  ]);
  const followed = new Set((follows || []).map((f: any) => f.following_id));
  const queue = queueOf(people, room.holder_id);
  const me: any = mine;
  const myRow = people.find(p => p.user_id === userId);
  // where people are listening from (only those who chose to share), biggest first
  const places = new Map<string, number>();
  for (const p of people) if (p.from_county) places.set(p.from_county, (places.get(p.from_county) || 0) + 1);
  return {
    room: { ...room, prev_holder_id: undefined, prev_turn_ended_at: undefined },
    host: byId.get(room.host_id) || null,
    holder: room.holder_id ? byId.get(room.holder_id) || null : null,
    people: shown.map(p => ({
      user_id: p.user_id, role: p.role, hand_raised_at: p.hand_raised_at, spoke: p.spoke, profile: byId.get(p.user_id) || null,
      from: p.from_county || null, joined_at: p.joined_at, following: followed.has(p.user_id),
    })),
    places: [...places.entries()].sort((a, b) => b[1] - a[1]).map(([county, n]) => ({ county, n })),
    queue: queue.map(p => p.user_id),
    count: people.length,
    me: me ? { role: me.role, hand_raised_at: me.hand_raised_at, removed: me.removed, joined: !me.left_at && !me.removed, from: myRow?.from_county || null } : null,
    latest_seq: last?.[0]?.seq ?? 0,
    server_now: new Date().toISOString(),
  };
}

// GET /live — barazas happening now (for the Explore card)
router.get('/live', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { data: rooms } = await db.from('baraza_rooms').select(ROOM).eq('status', 'live')
      .order('created_at', { ascending: false }).limit(30);
    const list = (rooms || []) as any as Room[];
    if (!list.length) { res.json({ success: true, data: [] }); return; }
    const ids = list.map(r => r.id);
    const [{ data: here }, { data: blocks }] = await Promise.all([
      db.from('baraza_participants').select('room_id, user_id, joined_at, hand_raised_at').in('room_id', ids)
        .eq('removed', false).is('left_at', null).gt('last_seen_at', cutoff()).order('joined_at', { ascending: true }),
      db.from('blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    ]);
    const blocked = new Set((blocks || []).map((b: any) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id)));
    const count = new Map<string, number>();
    const hands = new Map<string, { user_id: string; at: string }[]>();
    for (const p of here || []) {
      count.set(p.room_id, (count.get(p.room_id) || 0) + 1);
      if (p.hand_raised_at && !blocked.has(p.user_id)) {
        const h = hands.get(p.room_id) || [];
        h.push({ user_id: p.user_id, at: p.hand_raised_at });
        hands.set(p.room_id, h);
      }
    }
    // The stools on the Explore card (six at most): the host, whoever holds the stick, then the
    // hands up in the order they were raised. Listeners without a hand up are not on a stool.
    const faces = new Map<string, string[]>();
    for (const r of list) {
      const f: string[] = [];
      const add = (id: string | null) => { if (id && f.length < 6 && !f.includes(id) && !blocked.has(id)) f.push(id); };
      add(r.host_id);
      add(r.holder_id);
      for (const h of (hands.get(r.id) || []).sort((a, b) => a.at.localeCompare(b.at))) add(h.user_id);
      faces.set(r.id, f);
    }
    const byId = await profiles(list.flatMap(r => [r.host_id, ...(r.holder_id ? [r.holder_id] : []), ...(faces.get(r.id) || [])]));
    const out = list
      .filter(r => !blocked.has(r.host_id))
      // a room nobody is in (host vanished, sweep not run yet) is not shown
      .filter(r => (count.get(r.id) || 0) > 0 || r.host_id === userId)
      .map(r => ({
        id: r.id, title: r.title, created_at: r.created_at, turn_seconds: r.turn_seconds,
        host: byId.get(r.host_id) || null,
        speaker: r.holder_id ? byId.get(r.holder_id) || null : null,
        count: count.get(r.id) || 0,
        faces: (faces.get(r.id) || []).map(id => byId.get(id)).filter(Boolean),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('Baraza live error:', err);
    fail(res, 500, 'Failed to load barazas');
  }
});

// POST / — start a baraza { title, turn_seconds }
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const title = String(req.body?.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!title) { fail(res, 400, 'Give your baraza a topic'); return; }
    const turn = TURNS.includes(Number(req.body?.turn_seconds)) ? Number(req.body.turn_seconds) : 120;
    const mod = await ModerationService.checkText(title);
    if (mod.flagged) { fail(res, 422, mod.reason || 'Try a different topic'); return; }

    // One live baraza per host: end the old one first
    const { data: open } = await db.from('baraza_rooms').select('id').eq('host_id', userId).eq('status', 'live').limit(1);
    if (open?.length) { fail(res, 409, 'You already have a baraza going. End it first.'); return; }

    const { data: room, error } = await db.from('baraza_rooms')
      .insert({ host_id: userId, title, turn_seconds: turn, holder_id: userId, turn_started_at: new Date().toISOString() })
      .select(ROOM).single();
    if (error || !room) throw error;
    await db.from('baraza_participants').insert({ room_id: room.id, user_id: userId, role: 'host', spoke: true });
    notifyBarazaMentions(room as any).catch(e => console.warn('Baraza mention notify failed:', e));
    res.status(201).json({ success: true, data: await stateFor(room as any, userId) });
  } catch (err) {
    console.error('Baraza create error:', err);
    fail(res, 500, 'Failed to start the baraza');
  }
});

// GET /:id — room state (also the heartbeat: the app polls this while inside)
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    if (!UUID.test(req.params.id)) { fail(res, 404, 'Baraza not found'); return; }
    await db.from('baraza_participants').update({ last_seen_at: new Date().toISOString() })
      .eq('room_id', req.params.id).eq('user_id', userId).is('left_at', null).eq('removed', false);
    const room = await settle(req.params.id);
    if (!room) { fail(res, 404, 'Baraza not found'); return; }
    res.json({ success: true, data: await stateFor(room, userId) });
  } catch (err) {
    console.error('Baraza state error:', err);
    fail(res, 500, 'Failed to load the baraza');
  }
});

// POST /:id/join — the app shows "This baraza is recorded for minutes" before calling this
router.post('/:id/join', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const room = await getRoom(req.params.id);
    if (!room) { fail(res, 404, 'Baraza not found'); return; }
    if (room.status !== 'live') { fail(res, 410, 'This baraza has ended'); return; }
    if (room.host_id !== userId && await blockedBetween(userId, room.host_id)) { fail(res, 404, 'Baraza not found'); return; }
    const { data: was } = await db.from('baraza_participants').select('removed, role').eq('room_id', room.id).eq('user_id', userId).maybeSingle();
    if (was?.removed) { fail(res, 403, 'The host removed you from this baraza'); return; }
    const now = new Date().toISOString();
    if (was) {
      await db.from('baraza_participants').update({ left_at: null, last_seen_at: now }).eq('room_id', room.id).eq('user_id', userId);
    } else {
      await db.from('baraza_participants').insert({ room_id: room.id, user_id: userId, role: room.host_id === userId ? 'host' : 'listener' });
    }
    const after = await ping(room.id);
    res.json({ success: true, data: await stateFor(after || room, userId) });
  } catch (err) {
    console.error('Baraza join error:', err);
    fail(res, 500, 'Failed to join');
  }
});

// POST /:id/leave
router.post('/:id/leave', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const room = await getRoom(req.params.id);
    if (!room) { fail(res, 404, 'Baraza not found'); return; }
    await db.from('baraza_participants').update({ left_at: new Date().toISOString(), hand_raised_at: null })
      .eq('room_id', room.id).eq('user_id', userId);
    await mutate(room.id, r => (r.status === 'live' && r.holder_id === userId && userId !== r.host_id ? stickTo(r, r.host_id) : {}));
    res.json({ success: true });
  } catch (err) {
    console.error('Baraza leave error:', err);
    fail(res, 500, 'Failed to leave');
  }
});

async function liveMember(roomId: string, userId: string) {
  const room = await getRoom(roomId);
  if (!room || room.status !== 'live') return { room, member: null };
  const { data } = await db.from('baraza_participants').select('role, hand_raised_at, removed, left_at')
    .eq('room_id', roomId).eq('user_id', userId).maybeSingle();
  const member: any = data && !data.removed && !data.left_at ? data : null;
  return { room, member };
}

// POST /:id/from { county | null } — show (or hide) which county you're listening from
router.post('/:id/from', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const county = req.body?.county ?? null;
    if (county !== null && !isCounty(county)) { fail(res, 400, 'Pick a county from the list'); return; }
    if (!UUID.test(req.params.id)) { fail(res, 404, 'Baraza not found'); return; }
    const { error } = await db.from('baraza_participants').update({ from_county: county })
      .eq('room_id', req.params.id).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true, data: { from: county } });
  } catch (err) {
    console.error('Baraza from error:', err);
    fail(res, 500, 'Could not save that');
  }
});

// POST /:id/hand { up } — raise or lower your hand (keeps your place if already up)
router.post('/:id/hand', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const up = req.body?.up !== false;
    const { room, member } = await liveMember(req.params.id, userId);
    if (!room || !member) { fail(res, 404, 'Join the baraza first'); return; }
    if (room.host_id === userId) { fail(res, 400, 'You are the host'); return; }
    if (up && room.holder_id === userId) { fail(res, 400, 'You already have the stick'); return; }
    if (up && !member.hand_raised_at) {
      await db.from('baraza_participants').update({ hand_raised_at: new Date().toISOString() }).eq('room_id', room.id).eq('user_id', userId);
    } else if (!up) {
      await db.from('baraza_participants').update({ hand_raised_at: null }).eq('room_id', room.id).eq('user_id', userId);
    }
    const after = await ping(room.id);
    res.json({ success: true, data: await stateFor(after || room, userId) });
  } catch (err) {
    console.error('Baraza hand error:', err);
    fail(res, 500, 'Failed to raise your hand');
  }
});

// POST /:id/pass { to? } — host: to someone (default: first hand up). Speaker: back to the host.
router.post('/:id/pass', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const want = typeof req.body?.to === 'string' ? req.body.to : null;
    const { room, member } = await liveMember(req.params.id, userId);
    if (!room || !member) { fail(res, 404, 'Join the baraza first'); return; }
    const isHost = room.host_id === userId;
    if (!isHost && room.holder_id !== userId) { fail(res, 403, 'Only the host can pass the stick'); return; }

    let error = '';
    let seated: string | null = null;
    const after = await mutate(room.id, async r => {
      error = ''; seated = null;
      if (!isHost) return r.holder_id === userId ? stickTo(r, r.host_id) : null;
      const people = await present(r.id);
      let to = want;
      if (to) {
        if (to !== r.host_id && !people.some(p => p.user_id === to)) { error = 'They are not in the baraza any more'; return null; }
      } else {
        to = queueOf(people, r.holder_id)[0]?.user_id || null;
        if (!to) { error = 'Nobody has raised a hand yet'; return null; }
      }
      if (to === r.holder_id) return null;
      seated = to;
      return stickTo(r, to);
    });
    if (error) { fail(res, 400, error); return; }
    if (seated && seated !== room.host_id) await seatSpeaker(room.id, seated);
    res.json({ success: true, data: await stateFor(after || room, userId) });
  } catch (err) {
    console.error('Baraza pass error:', err);
    fail(res, 500, 'Failed to pass the stick');
  }
});

// POST /:id/turn { seconds } — host changes the turn length (from the next turn)
router.post('/:id/turn', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const seconds = Number(req.body?.seconds);
    if (!TURNS.includes(seconds)) { fail(res, 400, 'Pick 1, 2 or 3 minutes'); return; }
    const room = await getRoom(req.params.id);
    if (!room || room.host_id !== userId || room.status !== 'live') { fail(res, 403, 'Only the host can do that'); return; }
    const after = await mutate(room.id, () => ({ turn_seconds: seconds }));
    res.json({ success: true, data: await stateFor(after || room, userId) });
  } catch (err) {
    console.error('Baraza turn error:', err);
    fail(res, 500, 'Failed to change the turn length');
  }
});

// POST /:id/remove { user_id } — host removes someone (they can't come back); takes the stick back
router.post('/:id/remove', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const target = String(req.body?.user_id || '');
    const room = await getRoom(req.params.id);
    if (!room || room.host_id !== userId) { fail(res, 403, 'Only the host can do that'); return; }
    if (!UUID.test(target) || target === userId) { fail(res, 400, 'Pick someone else'); return; }
    await db.from('baraza_participants').update({ removed: true, hand_raised_at: null, left_at: new Date().toISOString() })
      .eq('room_id', room.id).eq('user_id', target);
    const after = await mutate(room.id, r => (r.holder_id === target ? stickTo(r, r.host_id) : {}));
    res.json({ success: true, data: await stateFor(after || room, userId) });
  } catch (err) {
    console.error('Baraza remove error:', err);
    fail(res, 500, 'Failed to remove');
  }
});

// GET /:id/segments?after=seq — audio chunks after a point, in order (members only)
router.get('/:id/segments', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    if (!UUID.test(req.params.id)) { fail(res, 404, 'Baraza not found'); return; }
    const { data: m } = await db.from('baraza_participants').select('removed').eq('room_id', req.params.id).eq('user_id', userId).maybeSingle();
    if (!m || m.removed) { fail(res, 403, 'Join the baraza first'); return; }
    const after = Math.max(0, Math.floor(Number(req.query.after) || 0));
    const { data } = await db.from('baraza_segments')
      .select('id, seq, speaker_id, url, duration_ms, transcript, words, transcribed, created_at')
      .eq('room_id', req.params.id).gt('seq', after).order('seq', { ascending: true }).limit(40);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Baraza segments error:', err);
    fail(res, 500, 'Failed to load audio');
  }
});

// POST /:id/segments { storage_path, duration_ms } — the stick holder's next chunk (already uploaded)
router.post('/:id/segments', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const room = await getRoom(req.params.id);
    if (!room || room.status !== 'live') { fail(res, 410, 'This baraza has ended'); return; }
    const path = String(req.body?.storage_path || '');
    const prefix = `baraza/${room.id}/${userId}/`;
    if (!path.startsWith(prefix) || path.includes('..') || path.length > 200) { fail(res, 400, 'Bad audio path'); return; }
    const holds = room.holder_id === userId;
    const justHeld = room.prev_holder_id === userId && room.prev_turn_ended_at
      && Date.now() - new Date(room.prev_turn_ended_at).getTime() < GRACE_MS;
    if (!holds && !justHeld) { fail(res, 403, 'You do not have the stick'); return; }
    const { data: m } = await db.from('baraza_participants').select('removed').eq('room_id', room.id).eq('user_id', userId).maybeSingle();
    if (!m || m.removed) { fail(res, 403, 'You are not in this baraza'); return; }

    const duration = Math.round(Math.min(20000, Math.max(200, Number(req.body?.duration_ms) || 6000)));
    const url = db.storage.from('social-media').getPublicUrl(path).data.publicUrl;
    const { data: seg, error } = await db.from('baraza_segments')
      .insert({ room_id: room.id, speaker_id: userId, storage_path: path, url, duration_ms: duration })
      .select('id, seq, speaker_id, url, duration_ms, transcript, words, transcribed, created_at').single();
    if (error || !seg) throw error;
    setImmediate(() => { transcribe(seg.id).catch(() => {}); });
    res.status(201).json({ success: true, data: seg });
  } catch (err) {
    console.error('Baraza segment error:', err);
    fail(res, 500, 'Failed to send audio');
  }
});

/** Captions: transcribe one chunk and store the text (the UPDATE reaches listeners by realtime). */
async function transcribe(segmentId: string) {
  const { data: seg } = await db.from('baraza_segments').select('id, storage_path, transcribed').eq('id', segmentId).maybeSingle();
  if (!seg || seg.transcribed) return;
  let text: string | null = null;
  let words: [number, number, string][] | null = null;
  try {
    if (process.env.OPENAI_API_KEY) {
      const { data: blob, error } = await db.storage.from('social-media').download(seg.storage_path);
      if (error || !blob) throw error || new Error('missing audio');
      const file = await toFile(Buffer.from(await blob.arrayBuffer()), 'turn.m4a', { type: 'audio/mp4' });
      // whisper-1 is the model that returns word timings, which light the words up like lyrics
      const out: any = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
        prompt: 'A Kenyan community meeting. Speakers may use English, Swahili or Sheng.',
      });
      text = String(out?.text || '').trim().slice(0, 2000) || null;
      if (Array.isArray(out?.words) && out.words.length) {
        // compact: [[startMs, endMs, 'word'], ...]
        words = out.words.slice(0, 400).map((w: any) => [Math.round((w.start || 0) * 1000), Math.round((w.end || 0) * 1000), String(w.word || '').trim()]);
      }
    }
  } catch (e) {
    console.error('Baraza transcribe error:', (e as any)?.message || e);
  }
  await db.from('baraza_segments').update({ transcript: text, words, transcribed: true }).eq('id', segmentId);
}

// POST /:id/end — host ends it; minutes are built in the background
router.post('/:id/end', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const room = await getRoom(req.params.id);
    if (!room || room.host_id !== userId) { fail(res, 403, 'Only the host can end the baraza'); return; }
    const ended = await endRoom(room.id);
    res.json({ success: true, data: { ended: !!ended } });
  } catch (err) {
    console.error('Baraza end error:', err);
    fail(res, 500, 'Failed to end the baraza');
  }
});

/** Ends a live room once (whoever wins the version race builds the minutes). */
async function endRoom(roomId: string) {
  let won = false;
  await mutate(roomId, r => {
    won = false;
    if (r.status !== 'live') return null;
    won = true;
    return { status: 'ended', ended_at: new Date().toISOString(), holder_id: null, turn_ends_at: null, minutes_status: 'building' };
  });
  if (won) {
    await db.from('baraza_participants').update({ hand_raised_at: null }).eq('room_id', roomId);
    setImmediate(() => {
      buildMinutes(roomId).catch(async e => {
        console.error('Baraza minutes error:', e);
        await mutate(roomId, () => ({ minutes_status: 'failed' }));
      });
    });
  }
  return won;
}

const handle = (p: any) => (p?.username ? `@${p.username}` : p?.full_name || 'Someone');

/** Pack lines into posts of at most 280 characters. */
function pack(head: string, lines: string[], max = 280) {
  const out: string[] = [];
  let cur = head;
  for (const l of lines) {
    const line = l.length > max - head.length - 2 ? `${l.slice(0, max - head.length - 3)}…` : l;
    if ((cur + '\n' + line).length > max) { out.push(cur); cur = `${head} (cont.)`; }
    cur += '\n' + line;
  }
  if (cur !== head && cur !== `${head} (cont.)`) out.push(cur);
  return out;
}

async function buildMinutes(roomId: string) {
  const room = await getRoom(roomId);
  if (!room) return;

  // Let the last captions finish (and redo any that got stuck)
  for (let i = 0; i < 20; i++) {
    const { data: pending } = await db.from('baraza_segments').select('id, created_at').eq('room_id', roomId).eq('transcribed', false).limit(50);
    if (!pending?.length) break;
    const stale = pending.filter((s: any) => Date.now() - new Date(s.created_at).getTime() > 25_000);
    await Promise.all(stale.map((s: any) => transcribe(s.id).catch(() => {})));
    if (stale.length < pending.length) await new Promise(r => setTimeout(r, 3000));
  }

  const { data: segs } = await db.from('baraza_segments').select('speaker_id, transcript, seq')
    .eq('room_id', roomId).order('seq', { ascending: true }).limit(5000);
  const said = (segs || []).filter((s: any) => s.transcript?.trim());
  const byId = await profiles([room.host_id, ...said.map((s: any) => s.speaker_id)]);

  // Turns: consecutive chunks by the same person become one paragraph
  const turns: { who: string; text: string }[] = [];
  for (const s of said as any[]) {
    const last = turns[turns.length - 1];
    if (last && last.who === s.speaker_id) last.text += ' ' + s.transcript.trim();
    else turns.push({ who: s.speaker_id, text: s.transcript.trim() });
  }

  let summary = '';
  let keyPoints: { text: string; by_user_id: string | null }[] = [];
  let ahadi: { user_id: string | null; who_name: string | null; text: string }[] = [];

  if (!turns.length) {
    summary = 'Nobody spoke with the stick in this baraza, so there are no minutes.';
  } else {
    const speakers = [...new Set(turns.map(t => t.who))];
    const roster = speakers.map(id => { const p = byId.get(id); return `${id} = ${p?.full_name || ''} (${handle(p)})`; }).join('\n');
    let transcript = turns.map(t => `[${t.who}] ${handle(byId.get(t.who))}: ${t.text}`).join('\n');
    if (transcript.length > 90_000) transcript = transcript.slice(0, 45_000) + '\n…\n' + transcript.slice(-45_000);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write the minutes of a "baraza", a community meeting held as an audio room in a Kenyan social app. ' +
            'The transcript comes from automatic captions, so fix obvious caption mistakes but never invent anything. ' +
            'Write in the language most people used (English, Swahili or Sheng), plain and neutral. ' +
            'Return JSON: {"summary": "2 to 4 sentences", ' +
            '"key_points": [{"text": "one clear sentence", "speaker_id": "id from the roster or null"}] (3 to 8 points, in order), ' +
            '"ahadi": [{"speaker_id": "id of the person who promised, or null", "who": "name if not in the roster", "text": "what they promised to do, starting with a verb"}]}. ' +
            'Ahadi are only real commitments someone made to do something ("I will...", "tutafanya...", "nitaleta..."). If there are none, return an empty list.',
        },
        { role: 'user', content: `Topic: ${room.title}\n\nRoster (speaker_id = name):\n${roster}\n\nTranscript:\n${transcript}` },
      ],
    });
    let parsed: any = {};
    try { parsed = JSON.parse(completion.choices[0]?.message?.content || '{}'); } catch {}
    const known = new Set(speakers);
    const pick = (id: any) => (typeof id === 'string' && known.has(id) ? id : null);
    summary = String(parsed.summary || '').trim().slice(0, 1200);
    keyPoints = (Array.isArray(parsed.key_points) ? parsed.key_points : []).slice(0, 10)
      .map((k: any) => ({ text: String(k?.text || '').trim().slice(0, 300), by_user_id: pick(k?.speaker_id) }))
      .filter((k: any) => k.text);
    ahadi = (Array.isArray(parsed.ahadi) ? parsed.ahadi : []).slice(0, 15)
      .map((a: any) => ({ user_id: pick(a?.speaker_id), who_name: a?.who ? String(a.who).slice(0, 60) : null, text: String(a?.text || '').trim().slice(0, 300) }))
      .filter((a: any) => a.text);
  }

  await db.from('baraza_minutes').upsert({ room_id: roomId, summary, key_points: keyPoints }, { onConflict: 'room_id' });
  await db.from('baraza_ahadi').delete().eq('room_id', roomId);
  if (ahadi.length) {
    const remindAt = new Date(Date.now() + 3 * 24 * 3600_000).toISOString();
    await db.from('baraza_ahadi').insert(ahadi.map(a => ({ room_id: roomId, ...a, remind_at: a.user_id ? remindAt : null })));
  }

  // Minutes stay private to the room until the host chooses to post them (POST /:id/minutes/post)
  await mutate(roomId, () => ({ minutes_status: 'ready', minutes_post_id: null }));

  // Everyone who was there hears about it
  if (!turns.length) return;
  const { data: people } = await db.from('baraza_participants').select('user_id').eq('room_id', roomId).eq('removed', false);
  const ids = (people || []).map((p: any) => p.user_id);
  if (!ids.length) return;
  const { data: tokens } = await db.from('push_tokens').select('token').in('user_id', ids);
  await sendExpoPush((tokens || []).map((t: any) => t.token), 'Minutes are ready',
    `"${room.title}": the summary, key points and Ahadi are up.`,
    { type: 'baraza_minutes', baraza_id: roomId }).catch(() => {});
}

/** Posts the minutes on the host's profile as a thread: headline + summary, then key points, then Ahadi. */
async function postMinutes(room: Room): Promise<string | null> {
  const [{ data: m }, { data: ah }] = await Promise.all([
    db.from('baraza_minutes').select('summary, key_points').eq('room_id', room.id).maybeSingle(),
    db.from('baraza_ahadi').select('user_id, who_name, text').eq('room_id', room.id).order('created_at'),
  ]);
  if (!m) return null;
  const summary = String((m as any).summary || '');
  const keyPoints: { text: string; by_user_id: string | null }[] = (m as any).key_points || [];
  const ahadi: any[] = ah || [];
  const byId = await profiles([room.host_id, ...keyPoints.map(k => k.by_user_id).filter(Boolean) as string[], ...ahadi.map(a => a.user_id).filter(Boolean)]);

  const link = `${SHARE_BASE}/api/v1/baraza/${room.id}/share`;
  const head = `Baraza minutes: ${room.title}`;
  const room4summary = 280 - head.length - link.length - 4;
  const sum = summary.length > room4summary ? `${summary.slice(0, Math.max(0, room4summary - 1))}…` : summary;
  const { data: main } = await db.from('posts').insert({ user_id: room.host_id, content: `${head}\n\n${sum}\n\n${link}`.slice(0, 280), visibility: 'public' })
    .select('id').single();
  const postId: string | null = main?.id || null;
  if (postId) {
    const parts = [
      ...pack('Key points', keyPoints.map(k => `• ${k.text}${k.by_user_id ? ` (${handle(byId.get(k.by_user_id))})` : ''}`)),
      ...pack('Ahadi', ahadi.map(a => `☐ ${a.user_id ? handle(byId.get(a.user_id)) : a.who_name || 'Someone'}: ${a.text}`)),
    ].slice(0, 8);
    for (const content of parts) {
      await db.from('posts').insert({ user_id: room.host_id, content, parent_post_id: postId, visibility: 'public' });
    }
  }
  return postId;
}

const posting = new Set<string>();

// POST /:id/minutes/post — the host chooses to share the minutes on their profile
router.post('/:id/minutes/post', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await getRoom(req.params.id);
    if (!room || room.host_id !== req.user!.id) { fail(res, 403, 'Only the host can post the minutes'); return; }
    if (room.minutes_post_id) { res.json({ success: true, data: { post_id: room.minutes_post_id } }); return; }
    if (room.minutes_status !== 'ready') { fail(res, 409, 'The minutes are not ready yet'); return; }
    // a double tap can't post twice
    if (posting.has(room.id)) { fail(res, 409, 'Already posting'); return; }
    posting.add(room.id);
    let postId: string | null = null;
    try {
      postId = await postMinutes(room).catch(e => { console.error('Baraza post minutes error:', e); return null; });
      if (postId) await mutate(room.id, () => ({ minutes_post_id: postId }));
    } finally { posting.delete(room.id); }
    if (!postId) { fail(res, 500, 'Could not post the minutes'); return; }
    res.json({ success: true, data: { post_id: postId } });
  } catch (err) {
    console.error('Baraza post minutes error:', err);
    fail(res, 500, 'Could not post the minutes');
  }
});

// GET /:id/minutes
router.get('/:id/minutes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const room = await getRoom(req.params.id);
    if (!room) { fail(res, 404, 'Baraza not found'); return; }
    const [{ data: m }, { data: ah }] = await Promise.all([
      db.from('baraza_minutes').select('summary, key_points, created_at').eq('room_id', room.id).maybeSingle(),
      db.from('baraza_ahadi').select('id, user_id, who_name, text, done').eq('room_id', room.id).order('created_at'),
    ]);
    const kp: any[] = (m as any)?.key_points || [];
    const byId = await profiles([room.host_id, ...kp.map(k => k.by_user_id).filter(Boolean), ...(ah || []).map((a: any) => a.user_id).filter(Boolean)]);
    res.json({
      success: true,
      data: {
        room: { id: room.id, title: room.title, status: room.status, minutes_status: room.minutes_status, minutes_post_id: room.minutes_post_id, created_at: room.created_at, ended_at: room.ended_at, host_id: room.host_id },
        host: byId.get(room.host_id) || null,
        summary: (m as any)?.summary || null,
        key_points: kp.map(k => ({ text: k.text, by: k.by_user_id ? byId.get(k.by_user_id) || null : null })),
        ahadi: (ah || []).map((a: any) => ({
          id: a.id, text: a.text, done: a.done, who_name: a.who_name,
          user: a.user_id ? byId.get(a.user_id) || null : null,
          can_check: a.user_id === userId || room.host_id === userId,
        })),
      },
    });
  } catch (err) {
    console.error('Baraza minutes load error:', err);
    fail(res, 500, 'Failed to load the minutes');
  }
});

// PATCH /ahadi/:id { done } — the person who promised (or the host) ticks it off
router.patch('/ahadi/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    if (!UUID.test(req.params.id)) { fail(res, 404, 'Not found'); return; }
    const { data: a } = await db.from('baraza_ahadi').select('id, user_id, room_id').eq('id', req.params.id).maybeSingle();
    if (!a) { fail(res, 404, 'Not found'); return; }
    const room = await getRoom(a.room_id);
    if (a.user_id !== userId && room?.host_id !== userId) { fail(res, 403, 'Only the person who promised can tick this'); return; }
    const done = req.body?.done !== false;
    await db.from('baraza_ahadi').update({ done }).eq('id', a.id);
    res.json({ success: true, data: { done } });
  } catch (err) {
    console.error('Ahadi update error:', err);
    fail(res, 500, 'Failed to save');
  }
});

// GET /:id/share — public page for the link in the minutes post (opens the app, else the store)
const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
router.get('/:id/share', async (req: Request, res: Response): Promise<void> => {
  const store = 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile';
  try {
    const room = await getRoom(req.params.id);
    if (!room) { res.redirect(store); return; }
    const { data: m } = await db.from('baraza_minutes').select('summary').eq('room_id', room.id).maybeSingle();
    const title = `Baraza: ${room.title}`;
    const desc = (m as any)?.summary ? String((m as any).summary).slice(0, 160) : room.status === 'live' ? 'Live now on KChat. Come and listen.' : 'A baraza on KChat.';
    const deep = room.minutes_post_id ? `kiongozi://posts/${room.minutes_post_id}` : 'kiongozi://';
    const ogImage = room.minutes_post_id && room.minutes_status === 'ready' ? `${SHARE_BASE}/api/v1/baraza/${room.id}/minutes/card.png` : `${SHARE_BASE}/og/brand.png`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(ogImage)}">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0C0A07;color:#fff;font-family:-apple-system,system-ui,sans-serif}
main{max-width:360px;padding:32px 24px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{color:#bdb5a6;margin:0 0 24px;line-height:1.45}
a{display:block;padding:14px;border-radius:26px;text-decoration:none;font-weight:700;margin-top:10px}.p{background:#F2B544;color:#1A1206}.s{border:1px solid #3a3226;color:#fff}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(desc)}</p><a class="p" href="${deep}">Open in KChat</a><a class="s" href="${store}">Get KChat on Google Play</a></main></body></html>`);
  } catch {
    res.redirect(store);
  }
});

// ── Share cards, the profile's Barazas tab, @mentions in titles ──

// Who may see a room's minutes: the host, anyone who was in the room, or everyone once posted.
async function canSeeMinutes(room: Room, userId: string) {
  if (room.host_id === userId || room.minutes_post_id) return true;
  const { data } = await db.from('baraza_participants').select('user_id').eq('room_id', room.id).eq('user_id', userId).eq('removed', false).maybeSingle();
  return !!data;
}

async function minutesCardInput(room: Room) {
  const [{ data: m }, { data: ah }, { count }, byHost] = await Promise.all([
    db.from('baraza_minutes').select('summary, key_points').eq('room_id', room.id).maybeSingle(),
    db.from('baraza_ahadi').select('user_id, who_name, text').eq('room_id', room.id).order('created_at').limit(1),
    db.from('baraza_participants').select('user_id', { count: 'exact', head: true }).eq('room_id', room.id).eq('removed', false),
    profiles([room.host_id]),
  ]);
  const kp: any[] = (m as any)?.key_points || [];
  const first: any = ah?.[0];
  const promiser = first?.user_id ? (await profiles([first.user_id])).get(first.user_id) : null;
  const points = kp.map(k => String(k?.text || '')).filter(Boolean);
  if (!points.length && (m as any)?.summary) points.push(String((m as any).summary));
  return {
    title: room.title,
    keyPoints: points,
    ahadi: first ? { who: promiser?.username || first.who_name || 'Someone', text: String(first.text) } : null,
    host: byHost.get(room.host_id)?.username || 'kchat',
    date: room.created_at,
    people: Math.max(1, count || 0),
  };
}

// POST /:id/minutes/card { preview? }: the minutes as a 4:5 image.
// preview → small PNG as a data URI (nothing stored); otherwise full size, uploaded, ready to share or post.
router.post('/:id/minutes/card', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const room = await getRoom(req.params.id);
    if (!room) { fail(res, 404, 'Baraza not found'); return; }
    if (!(await canSeeMinutes(room, userId))) { fail(res, 403, 'Only people who were there can share these minutes'); return; }
    if (room.minutes_status !== 'ready') { fail(res, 409, 'The minutes are not ready yet'); return; }
    const card = await renderMinutesCard(await minutesCardInput(room), req.body?.preview ? 540 : undefined);
    if (req.body?.preview) {
      res.json({ success: true, data: { uri: `data:image/png;base64,${card.png.toString('base64')}`, width: card.width, height: card.height } });
      return;
    }
    const up = await UploadService.uploadFile(card.png, 'image/png', `posts/${userId}/minutes_${room.id}_${Date.now()}.png`);
    res.json({
      success: true,
      data: { url: up.url, storage_path: up.storagePath, width: card.width, height: card.height, share_url: `${SHARE_BASE}/api/v1/baraza/${room.id}/share` },
    });
  } catch (err) {
    console.error('Baraza minutes card error:', err);
    fail(res, 500, 'Could not make the card');
  }
});

// GET /:id/minutes/card.png: link-preview image for the /share page (only once the host posted the minutes)
const ogCards = new Map<string, { png: Buffer; at: number }>();
router.get('/:id/minutes/card.png', async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await getRoom(req.params.id);
    if (!room || room.minutes_status !== 'ready' || !room.minutes_post_id) { res.redirect(`${SHARE_BASE}/og/brand.png`); return; }
    let hit = ogCards.get(room.id);
    if (!hit || Date.now() - hit.at > 30 * 60_000) {
      hit = { png: (await renderMinutesCard(await minutesCardInput(room), 720)).png, at: Date.now() };
      if (ogCards.size > 100) ogCards.delete(ogCards.keys().next().value as string);
      ogCards.set(room.id, hit);
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(hit.png);
  } catch {
    res.redirect(`${SHARE_BASE}/og/brand.png`);
  }
});

// GET /user/:id: ended barazas this person hosted that have minutes (the profile's Barazas tab).
// Others only see the ones the host posted; you see all of yours.
router.get('/user/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const viewer = req.user!.id;
    const hostId = req.params.id;
    if (!UUID.test(hostId)) { fail(res, 404, 'Not found'); return; }
    const mine = viewer === hostId;
    if (!mine) {
      if (await blockedBetween(viewer, hostId)) { res.json({ success: true, data: [], nextCursor: null }); return; }
      const { data: prof } = await db.from('profiles').select('is_private').eq('id', hostId).maybeSingle();
      if ((prof as any)?.is_private) {
        const { data: f } = await db.from('follows').select('id').eq('follower_id', viewer).eq('following_id', hostId).maybeSingle();
        if (!f) { res.json({ success: true, data: [], nextCursor: null }); return; }
      }
    }
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    let q = db.from('baraza_rooms').select('id, title, status, minutes_status, minutes_post_id, created_at, ended_at')
      .eq('host_id', hostId).eq('status', 'ended').eq('minutes_status', 'ready')
      .order('created_at', { ascending: false }).limit(limit);
    if (!mine) q = q.not('minutes_post_id', 'is', null);
    if (typeof req.query.cursor === 'string') q = q.lt('created_at', req.query.cursor);
    const { data: rooms } = await q;
    const list = (rooms || []) as any[];
    if (!list.length) { res.json({ success: true, data: [], nextCursor: null }); return; }
    const ids = list.map(r => r.id);
    const [{ data: mins }, { data: parts }, { data: ahadi }] = await Promise.all([
      db.from('baraza_minutes').select('room_id, summary, key_points').in('room_id', ids),
      db.from('baraza_participants').select('room_id').in('room_id', ids).eq('removed', false).limit(5000),
      db.from('baraza_ahadi').select('room_id').in('room_id', ids).limit(2000),
    ]);
    const sum = new Map<string, any>((mins || []).map((m: any) => [m.room_id, m]));
    const tally = (rows: any[] | null) => {
      const out = new Map<string, number>();
      for (const r of rows || []) out.set(r.room_id, (out.get(r.room_id) || 0) + 1);
      return out;
    };
    const people = tally(parts), promises = tally(ahadi);
    res.json({
      success: true,
      data: list.map(r => ({
        id: r.id, title: r.title, created_at: r.created_at, ended_at: r.ended_at,
        minutes_post_id: r.minutes_post_id, posted: !!r.minutes_post_id,
        summary: sum.get(r.id)?.summary ? String(sum.get(r.id).summary).slice(0, 220) : null,
        key_points: (sum.get(r.id)?.key_points || []).length,
        ahadi: promises.get(r.id) || 0,
        people: people.get(r.id) || 0,
      })),
      nextCursor: list.length < limit ? null : list[list.length - 1].created_at,
    });
  } catch (err) {
    console.error('Baraza user list error:', err);
    fail(res, 500, 'Failed to load barazas');
  }
});

/**
 * "@amina mentioned you in a baraza": everyone tagged by @username in a new room's title gets a
 * `mention` notification (data.kind = 'baraza', data.baraza_id).
 */
async function notifyBarazaMentions(room: { id: string; title: string; host_id: string }) {
  const names = [...new Set(Array.from(room.title.matchAll(/@([a-z0-9_.]{2,30})/gi)).map(m => m[1].toLowerCase().replace(/\.+$/, '')))].slice(0, 10);
  if (!names.length) return;
  const [{ data: users }, { data: host }] = await Promise.all([
    db.from('profiles').select('id, username').in('username', names),
    db.from('profiles').select('username, full_name, avatar_url').eq('id', room.host_id).maybeSingle(),
  ]);
  const who: any = host || {};
  for (const u of (users || []) as any[]) {
    if (u.id === room.host_id || u.username === 'kiongozi') continue;
    if (await blockedBetween(u.id, room.host_id)) continue;
    await NotificationService.notify({
      userId: u.id,
      type: 'mention',
      title: 'You were mentioned',
      message: `${who.username ? `@${who.username}` : who.full_name || 'Someone'} mentioned you in a baraza`,
      data: {
        kind: 'baraza', baraza_id: room.id, baraza_title: room.title,
        from_user_id: room.host_id, from_username: who.username || null, from_avatar_url: who.avatar_url || null,
      },
    });
  }
}

// ── Background: turn expiry, vanished hosts, Ahadi reminders ──

async function sweepRooms() {
  const { data: rooms } = await db.from('baraza_rooms').select('id, host_id, created_at, holder_id, turn_ends_at').eq('status', 'live').limit(200);
  for (const r of (rooms || []) as any[]) {
    const { data: host } = await db.from('baraza_participants').select('last_seen_at, left_at')
      .eq('room_id', r.id).eq('user_id', r.host_id).maybeSingle();
    const hostGone = !host || Date.now() - new Date(host.last_seen_at).getTime() > HOST_GONE_MS;
    if (hostGone || Date.now() - new Date(r.created_at).getTime() > MAX_ROOM_MS) { await endRoom(r.id); continue; }
    if (r.holder_id && r.holder_id !== r.host_id) await settle(r.id);
  }
}

async function sendAhadiReminders() {
  const now = new Date().toISOString();
  const { data: due } = await db.from('baraza_ahadi').update({ notified_at: now })
    .is('notified_at', null).eq('done', false).not('user_id', 'is', null).lte('remind_at', now)
    .select('id, room_id, user_id, text');
  if (!due?.length) return;
  const roomIds = [...new Set(due.map((a: any) => a.room_id))];
  const [{ data: rooms }, { data: tokens }] = await Promise.all([
    db.from('baraza_rooms').select('id, title, minutes_post_id').in('id', roomIds),
    db.from('push_tokens').select('user_id, token').in('user_id', [...new Set(due.map((a: any) => a.user_id))]),
  ]);
  const roomById = new Map((rooms || []).map((r: any) => [r.id, r]));
  for (const a of due as any[]) {
    const list = (tokens || []).filter((t: any) => t.user_id === a.user_id).map((t: any) => t.token);
    const r: any = roomById.get(a.room_id);
    if (!list.length || !r) continue;
    await sendExpoPush(list, 'Your ahadi', `In "${r.title}" you said you would ${a.text.replace(/^[A-Z]/, (c: string) => c.toLowerCase())}. Done yet?`,
      { type: 'baraza_ahadi', baraza_id: a.room_id, ...(r.minutes_post_id ? { post_id: r.minutes_post_id } : {}) }).catch(() => {});
  }
}

let started = false;
export function startBarazaJobs() {
  if (started) return;
  started = true;
  setInterval(() => { sweepRooms().catch(e => console.error('baraza sweep error', e)); }, 10_000).unref?.();
  setInterval(() => { sendAhadiReminders().catch(e => console.error('ahadi reminder error', e)); }, 10 * 60_000).unref?.();
}
startBarazaJobs();

export default router;
