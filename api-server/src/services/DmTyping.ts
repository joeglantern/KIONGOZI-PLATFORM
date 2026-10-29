// "Typing…" in a chat from the server's side (Kiongozi AI, or the owner's assistant while it
// works). The app shows typing for 5 s per signal, so this repeats every 4 s until stopped.
import { supabaseServiceClient } from '../config/supabase';

const BOT_USER_ID = process.env.BOT_USER_ID || '00000000-0000-0000-0000-000000000001';
const active = new Map<string, { timer: NodeJS.Timeout; until: number }>();

async function send(conversationId: string, on: boolean) {
  const ch = supabaseServiceClient.channel(`dm-conv-${conversationId}`);
  try {
    await new Promise<void>(resolve => {
      const t = setTimeout(resolve, 3000);
      ch.subscribe(status => { if (status === 'SUBSCRIBED') { clearTimeout(t); resolve(); } });
    });
    await ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: BOT_USER_ID, on } });
  } catch (e) {
    console.error('typing broadcast error', (e as any)?.message || e);
  } finally {
    supabaseServiceClient.removeChannel(ch).catch(() => {});
  }
}

/** Shows "typing" for up to `maxMs` (default 2 min) or until stopTyping. */
export function startTyping(conversationId: string, maxMs = 2 * 60 * 1000) {
  const until = Date.now() + maxMs;
  const cur = active.get(conversationId);
  if (cur) { cur.until = until; return; }
  send(conversationId, true);
  const timer = setInterval(() => {
    const a = active.get(conversationId);
    if (!a || Date.now() > a.until) { stopTyping(conversationId); return; }
    send(conversationId, true);
  }, 4000);
  active.set(conversationId, { timer, until });
}

export function stopTyping(conversationId: string) {
  const a = active.get(conversationId);
  if (a) { clearInterval(a.timer); active.delete(conversationId); }
  send(conversationId, false);
}
