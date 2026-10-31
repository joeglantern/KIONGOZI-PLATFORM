// "While you were away": for people who haven't opened KChat in 2+ days, one push at most every
// 3 days, and only when something real happened (likes on their posts, people they follow posting).
// Sent at the hour they usually open the app (from user_login_logs), 7 PM Nairobi if we don't know,
// never in quiet hours. No news, no push. Never "we miss you".
// Waits for the hooks migration (profiles.last_nudge_at); until then it does nothing.
import { supabaseServiceClient as db } from '../config/supabase';
import { sendExpoPush, isQuietHours } from '../services/PushService';

const DAY = 864e5;
const DEFAULT_HOUR = 19;

const nairobiHour = (d: Date) => Number(d.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Nairobi' })) % 24;

/** The hour (Nairobi) each person most often uses KChat, from the last 30 days of activity */
async function usualHours(ids: string[]) {
  const out = new Map<string, number>();
  const { data } = await db.from('user_login_logs').select('user_id, created_at')
    .in('user_id', ids).gte('created_at', new Date(Date.now() - 30 * DAY).toISOString()).limit(20000);
  const tally = new Map<string, number[]>();
  for (const r of data || []) {
    const t = tally.get((r as any).user_id) || Array(24).fill(0);
    t[nairobiHour(new Date((r as any).created_at))]++;
    tally.set((r as any).user_id, t);
  }
  for (const [uid, t] of tally) {
    const total = t.reduce((a, b) => a + b, 0);
    if (total < 3) continue; // not enough to know
    let best = 0;
    for (let i = 1; i < 24; i++) if (t[i] > t[best]) best = i;
    // A usual hour inside quiet hours (late night) waits for the evening instead
    out.set(uid, best >= 23 || best < 7 ? DEFAULT_HOUR : best);
  }
  return out;
}

const firstName = (p: any) => String(p?.full_name || p?.username || '').trim().split(/\s+/)[0] || `@${p?.username}`;

/** The real news for one person since they last opened KChat, or null */
async function newsFor(uid: string, since: string): Promise<{ body: string; data: Record<string, any> } | null> {
  // 1. Likes on their posts from other people
  const { data: mine } = await db.from('posts').select('id').eq('user_id', uid)
    .gte('created_at', new Date(Date.now() - 90 * DAY).toISOString()).order('created_at', { ascending: false }).limit(100);
  const ids = (mine || []).map((p: any) => p.id);
  if (ids.length) {
    const { data: likes } = await db.from('post_likes').select('post_id').in('post_id', ids)
      .neq('user_id', uid).gt('created_at', since).limit(5000);
    const n = (likes || []).length;
    if (n >= 3) {
      const per = new Map<string, number>();
      for (const l of likes || []) per.set((l as any).post_id, (per.get((l as any).post_id) || 0) + 1);
      const [top, topN] = [...per.entries()].sort((a, b) => b[1] - a[1])[0];
      const body = per.size === 1 || topN === n
        ? `Your post got ${n} likes since you last opened KChat`
        : `Your posts got ${n} likes since you last opened KChat`;
      return { body, data: { type: 'reengage', post_id: top } };
    }
  }
  // 2. People they follow who posted while they were away
  const { data: follows } = await db.from('follows').select('following_id').eq('follower_id', uid).limit(2000);
  const following = (follows || []).map((f: any) => f.following_id);
  if (following.length) {
    const { data: posts } = await db.from('posts').select('user_id, profiles:user_id (username, full_name, is_bot)')
      .in('user_id', following.slice(0, 500)).is('parent_post_id', null).gt('created_at', since)
      .order('created_at', { ascending: false }).limit(300);
    const authors = new Map<string, any>();
    for (const p of posts || []) if (!(p as any).profiles?.is_bot && !authors.has((p as any).user_id)) authors.set((p as any).user_id, (p as any).profiles);
    if (authors.size) {
      const [first] = [...authors.values()];
      const others = authors.size - 1;
      const body = others > 0
        ? `${firstName(first)} and ${others} other${others === 1 ? '' : 's'} you follow posted while you were away`
        : `${firstName(first)} posted while you were away`;
      return { body, data: { type: 'reengage', screen: 'home' } };
    }
  }
  return null;
}

export async function sendReengagePushes(now = new Date()) {
  if (isQuietHours(now)) return { skipped: 'quiet hours' };
  const hour = nairobiHour(now);
  const away = new Date(now.getTime() - 2 * DAY).toISOString();
  const { data: people, error } = await db.from('profiles')
    .select('id, last_login_at, last_nudge_at')
    .lt('last_login_at', away)
    .gt('last_login_at', new Date(now.getTime() - 30 * DAY).toISOString())
    .or(`last_nudge_at.is.null,last_nudge_at.lt.${new Date(now.getTime() - 3 * DAY).toISOString()}`)
    .limit(3000);
  if (error) return { skipped: 'migration not run' };
  const list = (people || []) as any[];
  if (!list.length) return { candidates: 0, sent: 0 };

  // Only people with a device to reach
  const withTokens = new Map<string, string[]>();
  for (let i = 0; i < list.length; i += 300) {
    const { data } = await db.from('push_tokens').select('user_id, token').in('user_id', list.slice(i, i + 300).map(p => p.id));
    for (const t of data || []) withTokens.set((t as any).user_id, [...(withTokens.get((t as any).user_id) || []), (t as any).token]);
  }
  const reachable = list.filter(p => withTokens.has(p.id));
  let sent = 0;
  for (let i = 0; i < reachable.length; i += 200) {
    const chunk = reachable.slice(i, i + 200);
    const hours = await usualHours(chunk.map(p => p.id));
    for (const p of chunk) {
      if ((hours.get(p.id) ?? DEFAULT_HOUR) !== hour) continue;
      try {
        const news = await newsFor(p.id, p.last_login_at);
        if (!news) continue;
        // Claim first so two servers (or a restart) can't both send
        const { data: claimed } = await db.from('profiles').update({ last_nudge_at: now.toISOString() })
          .eq('id', p.id)
          .or(`last_nudge_at.is.null,last_nudge_at.lt.${new Date(now.getTime() - 3 * DAY).toISOString()}`)
          .select('id');
        if (!claimed?.length) continue;
        await sendExpoPush(withTokens.get(p.id)!, 'KChat', news.body, news.data);
        sent++;
      } catch (e) { console.warn('reengage push failed for', p.id, (e as any)?.message || e); }
    }
  }
  return { candidates: reachable.length, sent };
}

export function startReengageJob() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await sendReengagePushes();
      if ((r as any).sent) console.log('reengage push', r);
    } catch (e) { console.error('reengage job error', e); }
    finally { running = false; }
  };
  setInterval(tick, 15 * 60 * 1000).unref?.();
  setTimeout(tick, 2 * 60 * 1000).unref?.();
}
