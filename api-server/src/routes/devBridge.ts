// Dev bridge: lets the owner's coding assistant read the owner's DMs with Kiongozi AI and reply
// as Kiongozi AI. Only the owner accounts' chats with the bot are visible, nothing else.
// Auth: header x-bridge-key = sha256(SUPABASE_SERVICE_ROLE_KEY + ':dev-bridge'), so the raw
// service key never travels. While the bridge is polling, the bot's own AI reply is skipped for
// the owner (the assistant answers instead); if the bridge goes quiet, the AI answers again.
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseServiceClient } from '../config/supabase';
import NotificationService from '../services/NotificationService';
import { startTyping, stopTyping } from '../services/DmTyping';

const BOT_USER_ID = process.env.BOT_USER_ID || '00000000-0000-0000-0000-000000000001';
// @liban and @afosi unless set
export const BRIDGE_OWNERS = (process.env.DEV_BRIDGE_USER_IDS || '3dfa9762-add8-4cfa-9967-fb95042ff503,fe680b2d-0035-48a2-8418-1c3b071754fc')
  .split(',').map(s => s.trim()).filter(Boolean);

let lastPoll = 0;
/** True while the assistant is listening (polled in the last 3 minutes). */
export const bridgeListening = (userId: string) => BRIDGE_OWNERS.includes(userId) && Date.now() - lastPoll < 3 * 60 * 1000;

const expected = () => {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return k ? crypto.createHash('sha256').update(`${k}:dev-bridge`).digest('hex') : null;
};

function bridgeAuth(req: Request, res: Response, next: NextFunction) {
  const want = expected();
  const got = String(req.headers['x-bridge-key'] || '');
  if (!want || got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}

const router = Router();
router.use(bridgeAuth);

/** The owner <-> bot conversation ids. */
async function ownerChats(): Promise<string[]> {
  const { data: botIn } = await supabaseServiceClient
    .from('dm_participants').select('conversation_id').eq('user_id', BOT_USER_ID);
  const ids = (botIn || []).map((r: any) => r.conversation_id);
  if (!ids.length) return [];
  const { data: ownerIn } = await supabaseServiceClient
    .from('dm_participants').select('conversation_id').in('conversation_id', ids).in('user_id', BRIDGE_OWNERS);
  return [...new Set((ownerIn || []).map((r: any) => r.conversation_id))];
}

// GET /api/v1/dev-bridge/inbox?since=ISO — owner messages to the bot after `since`
router.get('/inbox', async (req: Request, res: Response): Promise<void> => {
  try {
    lastPoll = Date.now();
    const since = (req.query.since as string) || new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const chats = await ownerChats();
    if (!chats.length) { res.json({ success: true, data: [], chats: [] }); return; }
    const { data, error } = await supabaseServiceClient
      .from('dm_messages')
      .select('id, conversation_id, sender_id, content, media_url, media_type, transcript, created_at')
      .in('conversation_id', chats)
      .in('sender_id', BRIDGE_OWNERS)
      .gt('created_at', since)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data: data || [], chats, now: new Date().toISOString() });
  } catch (e) {
    console.error('Bridge inbox error:', e);
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// POST /api/v1/dev-bridge/reply { conversation_id?, content, media_url?, media_type? }
router.post('/reply', async (req: Request, res: Response): Promise<void> => {
  try {
    lastPoll = Date.now();
    const { content, media_url, media_type } = req.body || {};
    if (!content && !media_url) { res.status(400).json({ success: false, error: 'content or media_url required' }); return; }
    const chats = await ownerChats();
    const conversationId = req.body?.conversation_id || chats[0];
    if (!conversationId || !chats.includes(conversationId)) { res.status(404).json({ success: false, error: 'No owner chat with the bot yet' }); return; }

    const now = new Date().toISOString();
    const { data: msg, error } = await supabaseServiceClient
      .from('dm_messages')
      .insert({ conversation_id: conversationId, sender_id: BOT_USER_ID, content: content || null, media_url: media_url || null, media_type: media_type || null, is_read: false, created_at: now })
      .select('*, sender:sender_id (id, full_name, username, avatar_url, is_bot)')
      .single();
    if (error || !msg) throw error || new Error('insert failed');
    await supabaseServiceClient.from('dm_conversations').update({ last_message_at: now, updated_at: now }).eq('id', conversationId);

    const io = (req as any).io;
    const { data: people } = await supabaseServiceClient
      .from('dm_participants').select('user_id').eq('conversation_id', conversationId).neq('user_id', BOT_USER_ID);
    for (const p of people || []) {
      io?.to(`user:${p.user_id}`).emit('dm:message_new', { conversationId, message: msg });
      await NotificationService.notify({
        userId: p.user_id,
        type: 'dm',
        title: 'Kiongozi AI',
        message: (content || 'Sent you a photo').slice(0, 140),
        data: { conversation_id: conversationId, from_user_id: BOT_USER_ID, from_username: 'kiongozi', from_name: 'Kiongozi AI' },
        io,
      });
    }
    io?.to(`dm:${conversationId}`).emit('dm:message_new', { conversationId, message: msg });
    if (!req.body?.keep_typing) stopTyping(conversationId);
    res.status(201).json({ success: true, data: msg });
  } catch (e) {
    console.error('Bridge reply error:', e);
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// POST /api/v1/dev-bridge/typing { on, conversation_id? } — show/hide "typing…" while working
router.post('/typing', async (req: Request, res: Response): Promise<void> => {
  try {
    lastPoll = Date.now();
    const chats = await ownerChats();
    const conversationId = req.body?.conversation_id || chats[0];
    if (!conversationId || !chats.includes(conversationId)) { res.status(404).json({ success: false, error: 'No owner chat' }); return; }
    if (req.body?.on === false) stopTyping(conversationId); else startTyping(conversationId, 10 * 60 * 1000);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

export default router;
