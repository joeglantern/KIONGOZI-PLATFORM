// Monday 10:00 Nairobi: "Your week is ready" push with the person's real numbers (Spotify /
// Strava style re-engagement — a reason to open, never a generic "we miss you").
// Only people who were active get it; sent once per week, remembered in system_settings
// so a restart inside the hour can't send it twice.
import { supabaseServiceClient as db } from '../config/supabase';
import { prisma } from '../config/prisma';
import { weekStats } from '../services/RecapService';
import { sendExpoPush } from '../services/PushService';

const KEY = { category: 'jobs', setting_key: 'weekly_recap_push' };

function nairobiNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', weekday: 'short', hour: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { weekday: get('weekday'), hour: Number(get('hour')), date: `${get('year')}-${get('month')}-${get('day')}` };
}

async function recapEnabled() {
  const row = await prisma.system_settings.findFirst({ where: { category: 'app_config', setting_key: 'config' } }).catch(() => null);
  return (row?.setting_value as any)?.features?.recap !== false;
}

async function claimWeek(date: string): Promise<boolean> {
  const row = await prisma.system_settings.findFirst({ where: KEY });
  if ((row?.setting_value as any)?.sent === date) return false;
  if (row) await prisma.system_settings.update({ where: { id: row.id }, data: { setting_value: { sent: date }, updated_at: new Date() } });
  else await prisma.system_settings.create({ data: { ...KEY, setting_value: { sent: date }, data_type: 'json', display_name: 'Weekly recap push' } });
  return true;
}

export async function sendWeeklyRecaps(limit = 1000) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: posters }, { data: storiers }] = await Promise.all([
    db.from('posts').select('user_id').gte('created_at', since).limit(5000),
    db.from('stories').select('user_id').gte('created_at', since).limit(5000),
  ]);
  const users = [...new Set([...(posters || []), ...(storiers || [])].map((r: any) => r.user_id))].slice(0, limit);
  let sent = 0;
  for (const uid of users) {
    try {
      const { data: tokens } = await db.from('push_tokens').select('token').eq('user_id', uid);
      if (!tokens?.length) continue;
      const s: any = await weekStats(uid);
      const bits = [
        s.likes ? `${s.likes} like${s.likes === 1 ? '' : 's'}` : null,
        s.followers ? `${s.followers} new follower${s.followers === 1 ? '' : 's'}` : null,
        s.posts ? `${s.posts} post${s.posts === 1 ? '' : 's'}` : null,
      ].filter(Boolean).slice(0, 2);
      if (!bits.length && !s.storyViews) continue;
      const body = bits.length ? `${bits.join(', ')}. See your recap and share it.` : `${s.storyViews} story views. See your recap and share it.`;
      await sendExpoPush(tokens.map((t: any) => t.token), 'Your week is ready', body, { type: 'recap' });
      sent++;
    } catch (e) { console.warn('weekly recap push failed for', uid, (e as any)?.message || e); }
  }
  return { candidates: users.length, sent };
}

export function startWeeklyRecapJob() {
  const tick = async () => {
    try {
      const n = nairobiNow();
      if (n.weekday !== 'Mon' || n.hour !== 10) return;
      if (!(await recapEnabled())) return;
      if (!(await claimWeek(n.date))) return;
      const r = await sendWeeklyRecaps();
      console.log('weekly recap push', r);
    } catch (e) { console.error('weekly recap job error', e); }
  };
  setInterval(tick, 10 * 60 * 1000).unref?.();
  setTimeout(tick, 60 * 1000).unref?.();
}
