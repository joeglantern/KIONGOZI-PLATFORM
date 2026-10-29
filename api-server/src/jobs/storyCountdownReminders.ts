// Countdown sticker "Remind me": when a countdown ends, push everyone who asked.
// Rows are claimed (notified_at set) in one update before sending, so two API
// instances or a restart can't push the same reminder twice.
import { supabaseServiceClient as db } from '../config/supabase';
import { sendExpoPush } from '../services/PushService';

export async function sendDueCountdownReminders() {
  const now = new Date().toISOString();
  const { data: due, error } = await db.from('story_countdown_reminders')
    .update({ notified_at: now })
    .is('notified_at', null).lte('ends_at', now)
    .select('story_id, user_id, author_id, title');
  if (error || !due?.length) return 0;

  const authorIds = [...new Set(due.map((r: any) => r.author_id))];
  const userIds = [...new Set(due.map((r: any) => r.user_id))];
  const [{ data: authors }, { data: tokens }] = await Promise.all([
    db.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds),
    db.from('push_tokens').select('user_id, token').in('user_id', userIds),
  ]);
  const authorById = new Map((authors || []).map((a: any) => [a.id, a]));
  const tokensBy = new Map<string, string[]>();
  for (const t of tokens || []) tokensBy.set(t.user_id, [...(tokensBy.get(t.user_id) || []), t.token]);

  let sent = 0;
  for (const r of due as any[]) {
    const list = tokensBy.get(r.user_id);
    if (!list?.length) continue;
    const a: any = authorById.get(r.author_id);
    const who = a?.username ? `@${a.username}` : 'Someone';
    const title = r.title ? `${r.title} is starting` : 'Countdown is over';
    await sendExpoPush(list, title, `${who}'s countdown just ended. Tap to see their story.`, {
      type: 'story_countdown', story_id: r.story_id, from_user_id: r.author_id, from_username: a?.username,
    }).catch(() => {}); // asked for, so not muted in quiet hours
    sent++;
  }
  return sent;
}

export function startStoryCountdownJob() {
  const tick = () => { sendDueCountdownReminders().catch(e => console.error('countdown reminder job error', e)); };
  setInterval(tick, 60 * 1000).unref?.();
  setTimeout(tick, 30 * 1000).unref?.();
}
