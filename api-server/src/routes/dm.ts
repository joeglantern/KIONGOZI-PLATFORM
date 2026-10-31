import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import NotificationService from '../services/NotificationService';
import BotService from '../services/BotService';
import { bridgeListening } from './devBridge';
import { startTyping, stopTyping } from '../services/DmTyping';
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Writes out what was said in a voice note (English, Swahili or Sheng) and saves it on the message. */
async function transcribeVoiceNote(messageId: string, mediaUrl: string): Promise<string | null> {
  let text: string | null = null;
  try {
    const marker = '/object/public/social-media/';
    const i = mediaUrl.indexOf(marker);
    if (process.env.OPENAI_API_KEY && i >= 0) {
      const path = decodeURIComponent(mediaUrl.slice(i + marker.length).split('?')[0]);
      const { data: blob, error } = await supabaseServiceClient.storage.from('social-media').download(path);
      if (error || !blob) throw error || new Error('missing audio');
      const file = await toFile(Buffer.from(await blob.arrayBuffer()), 'voice.m4a', { type: 'audio/mp4' });
      const out: any = await openai.audio.transcriptions.create({
        file,
        model: 'gpt-4o-mini-transcribe',
        prompt: 'A voice note between friends in Kenya. It may be in English, Swahili or Sheng.',
      });
      text = String(out?.text || '').trim().slice(0, 4000) || null;
    }
  } catch (e) {
    console.error('Voice note transcribe error:', (e as any)?.message || e);
  }
  // '' marks "tried, nothing to show" so the app stops saying "Transcribing…"
  await supabaseServiceClient.from('dm_messages').update({ transcript: text ?? '' }).eq('id', messageId);
  return text;
}

const BOT_USER_ID = process.env.BOT_USER_ID || '00000000-0000-0000-0000-000000000001';

const router = Router();

// ─── Message requests ─────────────────────────────────────────────────────────
// A first message from someone the recipient doesn't follow waits in their Requests
// (their dm_participants.status = 'pending') until they accept. 'declined' hides it and the
// sender isn't told. Until then the sender gets REQUEST_LIMIT messages. profiles.dm_policy
// decides who may start a chat at all: everyone (strangers go to Requests), following, none.
const REQUEST_LIMIT = 1;
type DmPolicy = 'everyone' | 'following' | 'none';
const DM_POLICIES: DmPolicy[] = ['everyone', 'following', 'none'];

async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabaseServiceClient.from('follows').select('id')
    .eq('follower_id', followerId).eq('following_id', followingId).limit(1).maybeSingle();
  return !!data;
}

/** May senderId message recipientId, and does it go to their Requests? */
async function dmGate(senderId: string, recipientId: string): Promise<{ ok: boolean; request: boolean; handle: string; reason?: string }> {
  if (senderId === BOT_USER_ID || recipientId === BOT_USER_ID) return { ok: true, request: false, handle: 'them' };
  const [{ data: prof }, follows] = await Promise.all([
    supabaseServiceClient.from('profiles').select('username, dm_policy').eq('id', recipientId).maybeSingle(),
    isFollowing(recipientId, senderId),
  ]);
  const handle = prof?.username ? `@${prof.username}` : 'They';
  const policy: DmPolicy = DM_POLICIES.includes(prof?.dm_policy) ? prof!.dm_policy : 'everyone';
  if (policy === 'none') return { ok: false, request: false, handle, reason: `${handle} isn't taking new messages right now` };
  if (follows) return { ok: true, request: false, handle };
  if (policy === 'following') return { ok: false, request: false, handle, reason: `${handle} only gets messages from people they follow` };
  return { ok: true, request: true, handle };
}

/** People I follow who follow them: a count and one username ("Followed by @amina and 2 others") */
async function mutualFollowers(myFollowing: string[], otherId: string): Promise<{ mutual_count: number; mutual_username: string | null }> {
  if (!myFollowing.length) return { mutual_count: 0, mutual_username: null };
  const { data, count } = await supabaseServiceClient.from('follows')
    .select('follower_id, profiles:follower_id (username)', { count: 'exact' })
    .eq('following_id', otherId).in('follower_id', myFollowing).limit(1);
  const first: any = (data || [])[0];
  return { mutual_count: count || 0, mutual_username: first?.profiles?.username || null };
}

async function myFollowingIds(userId: string): Promise<string[]> {
  const { data } = await supabaseServiceClient.from('follows').select('following_id').eq('follower_id', userId).limit(500);
  return (data || []).map((r: any) => r.following_id);
}

// GET /api/v1/dm/settings — Who can message me + read receipts
router.get('/settings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data } = await supabaseServiceClient.from('profiles').select('dm_policy, dm_read_receipts').eq('id', req.user!.id).maybeSingle();
    res.json({ success: true, data: { dm_policy: data?.dm_policy || 'everyone', dm_read_receipts: data?.dm_read_receipts !== false } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load your message settings' });
  }
});

// PUT /api/v1/dm/settings — { dm_policy?, dm_read_receipts? }
router.put('/settings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const patch: Record<string, any> = {};
    if (req.body?.dm_policy !== undefined) {
      if (!DM_POLICIES.includes(req.body.dm_policy)) { res.status(400).json({ success: false, error: 'Pick everyone, following or no one' }); return; }
      patch.dm_policy = req.body.dm_policy;
    }
    if (req.body?.dm_read_receipts !== undefined) patch.dm_read_receipts = !!req.body.dm_read_receipts;
    if (!Object.keys(patch).length) { res.status(400).json({ success: false, error: 'Nothing to change' }); return; }
    const { error } = await supabaseServiceClient.from('profiles').update(patch).eq('id', req.user!.id);
    if (error) { res.status(500).json({ success: false, error: 'Could not save your message settings' }); return; }
    res.json({ success: true, data: patch });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not save your message settings' });
  }
});

// GET /api/v1/dm/conversations/:id/state — Is this a request I got, am I waiting on mine, can I send?
router.get('/conversations/:id/state', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { data: rows } = await supabaseServiceClient.from('dm_participants').select('user_id, status').eq('conversation_id', conversationId);
    const mine = (rows || []).find((r: any) => r.user_id === userId);
    if (!mine) { res.status(403).json({ success: false, error: 'Not a participant in this conversation' }); return; }
    const other: any = (rows || []).find((r: any) => r.user_id !== userId);
    const request = (mine.status || 'accepted') !== 'accepted';
    const out: any = { request, awaiting: false, can_send: true, reason: null, limit: REQUEST_LIMIT, sent: 0, mutual_count: 0, mutual_username: null };
    if (other && (other.status || 'accepted') !== 'accepted') {
      const g = await dmGate(userId, other.user_id);
      if (!g.ok) { out.can_send = false; out.reason = g.reason; }
      else if (g.request) {
        const { count } = await supabaseServiceClient.from('dm_messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversationId).eq('sender_id', userId);
        out.awaiting = true;
        out.sent = count || 0;
        if (out.sent >= REQUEST_LIMIT) { out.can_send = false; out.reason = `You can send more once ${g.handle} accepts.`; }
      }
    }
    if (request && other) Object.assign(out, await mutualFollowers(await myFollowingIds(userId), other.user_id));
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('DM state error:', err);
    res.status(500).json({ success: false, error: 'Could not load this chat' });
  }
});

// POST /api/v1/dm/conversations/:id/accept — Move a request to my inbox
// POST /api/v1/dm/conversations/:id/decline — Hide it (the sender isn't told)
async function setMyStatus(req: Request, res: Response, status: 'accepted' | 'declined') {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { data, error } = await supabaseServiceClient.from('dm_participants')
      .update({ status }).eq('conversation_id', conversationId).eq('user_id', userId).select('user_id');
    if (error) { res.status(500).json({ success: false, error: 'Could not update the request' }); return; }
    if (!data?.length) { res.status(404).json({ success: false, error: 'Request not found' }); return; }
    if (status === 'declined') {
      await supabaseServiceClient.from('social_notifications').delete()
        .eq('user_id', userId).eq('type', 'dm').eq('read', false).eq('data->>conversation_id', conversationId);
    }
    res.json({ success: true, data: { status } });
  } catch (err) {
    console.error('DM request status error:', err);
    res.status(500).json({ success: false, error: 'Could not update the request' });
  }
}
router.post('/conversations/:id/accept', authenticateToken, (req, res) => setMyStatus(req, res, 'accepted'));
router.post('/conversations/:id/decline', authenticateToken, (req, res) => setMyStatus(req, res, 'declined'));

// GET /api/v1/dm/conversations — List DM conversations
router.get('/conversations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Step 1: Get user's conversation IDs + conversation metadata
    const { data, error } = await supabaseServiceClient
      .from('dm_participants')
      .select(`
        conversation_id,
        last_read_at,
        status,
        dm_conversations!inner (
          id,
          last_message_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .neq('status', 'declined');

    if (error) {
      console.error('DM conversations query error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
      return;
    }

    // Requests show who they are by people in common (my follows loaded once)
    const hasRequests = (data || []).some((r: any) => r.status === 'pending');
    const following = hasRequests ? await myFollowingIds(userId) : [];

    // Step 2: Enrich each conversation with participants + last message.
    // Unread = their messages after my last_read_at (so read receipts can be off),
    // falling back to is_read for chats never opened.
    const enriched = await Promise.all(
      (data || []).map(async (row: any) => {
        const convId = row.conversation_id;
        const isRequest = row.status === 'pending';
        let unreadQ = supabaseServiceClient
          .from('dm_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', userId);
        unreadQ = row.last_read_at ? unreadQ.gt('created_at', row.last_read_at) : unreadQ.eq('is_read', false);

        const [participantsRes, lastMsgRes, unreadRes] = await Promise.all([
          supabaseServiceClient
            .from('dm_participants')
            .select('user_id, profiles:user_id (id, full_name, username, avatar_url, is_verified, is_bot)')
            .eq('conversation_id', convId)
            .neq('user_id', userId),
          supabaseServiceClient
            .from('dm_messages')
            .select('id, content, sender_id, created_at, media_type, is_read')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1),
          unreadQ,
        ]);

        const participants = (participantsRes.data || []).map((p: any) => p.profiles);
        const lastMessage = (lastMsgRes.data || [])[0] ?? null;
        // A request with nothing in it yet isn't shown; requests never count as unread
        if (isRequest && !lastMessage) return null;
        const unreadCount = isRequest ? 0 : (unreadRes.count || 0);
        const mutual = isRequest && participants[0]?.id ? await mutualFollowers(following, participants[0].id) : null;

        return {
          id: convId,
          last_message_at: row.dm_conversations?.last_message_at,
          last_read_at: row.last_read_at,
          last_message: lastMessage,
          unread_count: unreadCount,
          participants,
          ...(isRequest ? { request: true, ...mutual } : {}),
        };
      })
    ).then(list => list.filter((c): c is NonNullable<typeof c> => !!c));

    // Sort by last_message_at descending
    enriched.sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('List DM conversations error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// POST /api/v1/dm/conversations — Start new DM
router.post('/conversations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { recipientId } = req.body;

    if (!recipientId) {
      res.status(400).json({ success: false, error: 'recipientId is required' });
      return;
    }

    if (recipientId === userId) {
      res.status(400).json({ success: false, error: 'Cannot message yourself' });
      return;
    }

    // Block check: either party has blocked the other
    const { data: blockRow } = await supabaseServiceClient
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    if (blockRow) {
      res.status(403).json({ success: false, error: 'Cannot start a conversation with this user' });
      return;
    }

    // Check if conversation already exists between these two users
    const { data: existingParticipation } = await supabaseServiceClient
      .from('dm_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (existingParticipation && existingParticipation.length > 0) {
      const conversationIds = existingParticipation.map((p: any) => p.conversation_id);
      const { data: shared } = await supabaseServiceClient
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', recipientId)
        .in('conversation_id', conversationIds)
        .limit(1);

      if (shared && shared.length > 0) {
        res.json({ success: true, data: { id: shared[0].conversation_id, existing: true } });
        return;
      }
    }

    // Who can message them: a stranger's chat goes to their Requests. A chat that settings
    // don't allow still opens, so the chat screen can say why in plain words.
    const gate = await dmGate(userId, recipientId);

    // Create new conversation
    const { data: conversation, error: convError } = await supabaseServiceClient
      .from('dm_conversations')
      .insert({})
      .select()
      .single();

    if (convError || !conversation) {
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
      return;
    }

    // Add both participants
    await supabaseServiceClient.from('dm_participants').insert([
      { conversation_id: conversation.id, user_id: userId, status: 'accepted' },
      { conversation_id: conversation.id, user_id: recipientId, status: gate.ok && !gate.request ? 'accepted' : 'pending' }
    ]);

    res.status(201).json({ success: true, data: { id: conversation.id, existing: false, can_send: gate.ok, reason: gate.reason || null } });
  } catch (err) {
    console.error('Create DM conversation error:', err);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// GET /api/v1/dm/conversations/:id — Get DM messages
router.get('/conversations/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const cursor = req.query.cursor as string | undefined;

    // Verify participant
    const { data: participation } = await supabaseServiceClient
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      res.status(403).json({ success: false, error: 'Not a participant in this conversation' });
      return;
    }

    let query = supabaseServiceClient
      .from('dm_messages')
      .select(`
        *,
        sender:sender_id (id, full_name, username, avatar_url, is_bot),
        reactions:dm_message_reactions (user_id, emoji)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
      return;
    }

    const nextCursor = messages && messages.length === limit ? messages[messages.length - 1].created_at : null;
    res.json({ success: true, data: messages?.reverse() || [], nextCursor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// POST /api/v1/dm/conversations/:id — Send DM message
router.post('/conversations/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;
    const { content, media_url, media_type } = req.body;
    const durationMs = Number.isFinite(Number(req.body?.duration_ms)) ? Math.max(0, Math.min(15 * 60 * 1000, Math.round(Number(req.body.duration_ms)))) : null;

    if (!content && !media_url) {
      res.status(400).json({ success: false, error: 'Message content or media required' });
      return;
    }

    // Verify participant
    const { data: participation } = await supabaseServiceClient
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      res.status(403).json({ success: false, error: 'Not a participant in this conversation' });
      return;
    }

    // Block check: get the other participant and check if either party has blocked the other
    const { data: otherParticipants } = await supabaseServiceClient
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId);

    if (otherParticipants && otherParticipants.length > 0) {
      const otherIds = otherParticipants.map((p: any) => p.user_id);
      for (const otherId of otherIds) {
        const { data: blockRow } = await supabaseServiceClient
          .from('blocks')
          .select('id')
          .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`)
          .limit(1)
          .maybeSingle();
        if (blockRow) {
          res.status(403).json({ success: false, error: 'Cannot send messages to this user' });
          return;
        }
      }
    }

    // Message requests. Replying to a request accepts it. A chat the other person hasn't
    // accepted yet follows their "Who can message me" and gets REQUEST_LIMIT messages.
    const { data: statusRows } = await supabaseServiceClient
      .from('dm_participants').select('user_id, status').eq('conversation_id', conversationId);
    const myRow = (statusRows || []).find((r: any) => r.user_id === userId);
    if (myRow && (myRow.status || 'accepted') !== 'accepted') {
      await supabaseServiceClient.from('dm_participants').update({ status: 'accepted' })
        .eq('conversation_id', conversationId).eq('user_id', userId);
    }
    /** Recipients for whom this is a request: 'pending' gets one quiet notification, 'declined' nothing */
    const requestTo: Record<string, 'pending' | 'declined'> = {};
    for (const r of (statusRows || []) as any[]) {
      if (r.user_id === userId || (r.status || 'accepted') === 'accepted') continue;
      const g = await dmGate(userId, r.user_id);
      if (!g.ok) {
        res.status(403).json({ success: false, code: 'dm_not_allowed', error: g.reason });
        return;
      }
      if (!g.request) {
        // They follow me now: no request needed
        await supabaseServiceClient.from('dm_participants').update({ status: 'accepted' })
          .eq('conversation_id', conversationId).eq('user_id', r.user_id);
        continue;
      }
      const { count } = await supabaseServiceClient.from('dm_messages').select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId).eq('sender_id', userId);
      if ((count || 0) >= REQUEST_LIMIT) {
        res.status(403).json({ success: false, code: 'dm_request_limit', error: `You can send more once ${g.handle} accepts.` });
        return;
      }
      requestTo[r.user_id] = r.status === 'declined' ? 'declined' : 'pending';
    }

    const { data: message, error } = await supabaseServiceClient
      .from('dm_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content || null,
        media_url: media_url || null,
        media_type: media_type || null,
        ...(media_type === 'audio' ? { duration_ms: durationMs } : {}),
      })
      .select(`
        *,
        sender:sender_id (id, full_name, username, avatar_url, is_bot)
      `)
      .single();

    if (error || !message) {
      res.status(500).json({ success: false, error: 'Failed to send message' });
      return;
    }

    // Voice notes get a transcript in the background (the app updates live when it lands)
    const transcriptP: Promise<string | null> = media_type === 'audio' && media_url
      ? transcribeVoiceNote(message.id, media_url)
      : Promise.resolve(null);

    // Update conversation timestamp
    await supabaseServiceClient
      .from('dm_conversations')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Notify other participants via Socket.IO + notification row
    const io = (req as any).io;
    const { data: participants } = await supabaseServiceClient
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId);

    if (io) {
      participants?.forEach((p: any) => {
        if (requestTo[p.user_id] === 'declined') return;
        io.to(`user:${p.user_id}`).emit('dm:message_new', { conversationId, message });
      });
      io.to(`dm:${conversationId}`).emit('dm:message_new', { conversationId, message });
    }

    if (participants && participants.length > 0) {
      setImmediate(async () => {
        try {
          const { data: sender } = await supabaseServiceClient
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', userId)
            .single();
          for (const p of participants) {
            // A request: one quiet "New message request", never for one they deleted
            if (requestTo[p.user_id]) {
              if (requestTo[p.user_id] === 'declined') continue;
              const { data: already } = await supabaseServiceClient.from('social_notifications').select('id')
                .eq('user_id', p.user_id).eq('type', 'dm').eq('data->>conversation_id', conversationId).limit(1).maybeSingle();
              if (already) continue;
              await NotificationService.notify({
                userId: p.user_id,
                type: 'dm',
                title: 'New message request',
                message: `${sender?.username ? '@' + sender.username : sender?.full_name || 'Someone'} wants to send you a message`,
                data: { conversation_id: conversationId, request: true, from_user_id: userId, from_username: sender?.username, from_name: sender?.full_name, from_avatar_url: sender?.avatar_url },
                silent: true,
                io,
              });
              continue;
            }
            // Remove stale unread DM notification for this conversation before inserting fresh
            await supabaseServiceClient
              .from('social_notifications')
              .delete()
              .eq('user_id', p.user_id)
              .eq('type', 'dm')
              .eq('read', false)
              .eq('data->>conversation_id', conversationId);

            await NotificationService.notify({
              userId: p.user_id,
              type: 'dm',
              title: 'New message',
              message: `${sender?.full_name || 'Someone'} sent you a message`,
              data: { conversation_id: conversationId, from_user_id: userId, from_username: sender?.username, from_name: sender?.full_name, from_avatar_url: sender?.avatar_url },
              io,
            });
          }
        } catch (e) {
          console.error('DM notification error:', e);
        }
      });
    }

    // Bot auto-reply: if any other participant is the bot, generate a reply
    setImmediate(async () => {
      try {
        const isToBot = participants?.some((p: any) => p.user_id === BOT_USER_ID);
        if (!isToBot) return;
        // The owner's coding assistant answers these while it is listening
        if (bridgeListening(userId)) return;
        // Show Kiongozi AI typing while it thinks
        startTyping(conversationId, 60 * 1000);
        // Wait for a voice note's words so the AI can answer what was said
        await transcriptP;

        // Fetch last 10 messages for context
        const { data: history } = await supabaseServiceClient
          .from('dm_messages')
          .select('content, sender_id, media_url, media_type, transcript')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Photos without words still count as a turn (the AI can't see them yet)
        const messages = (history || []).reverse()
          .map((m: any) => ({
            role: m.sender_id === BOT_USER_ID ? 'assistant' as const : 'user' as const,
            content: m.content || (m.media_type === 'audio' ? (m.transcript ? `[voice note] ${m.transcript}` : '[sent a voice note]') : m.media_url ? '[sent a photo]' : '')
          }))
          .filter(m => m.content);

        const reply = await BotService.generateBotReply(messages, { chat: true });
        if (!reply) { stopTyping(conversationId); return; }

        const now = new Date().toISOString();
        const { data: botMessage } = await supabaseServiceClient
          .from('dm_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: BOT_USER_ID,
            content: reply,
            is_read: false,
            created_at: now
          })
          .select()
          .single();

        await supabaseServiceClient
          .from('dm_conversations')
          .update({ last_message_at: now, updated_at: now })
          .eq('id', conversationId);

        stopTyping(conversationId);
        const io = (req as any).io;
        if (io && botMessage) {
          io.to(`user:${userId}`).emit('dm:message_new', { conversationId, message: botMessage });
          io.to(`dm:${conversationId}`).emit('dm:message_new', { conversationId, message: botMessage });
        }
      } catch (e) {
        console.error('Bot DM reply error:', e);
        stopTyping(conversationId);
      }
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error('Send DM error:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// DELETE /api/v1/dm/conversations/:id — Leave conversation (removes user from participants)
// Reactions: PUT sets or changes mine, DELETE removes it. Members only. Live via the chat's broadcast channel.
async function reactionTarget(messageId: string, userId: string) {
  const { data: msg } = await supabaseServiceClient.from('dm_messages').select('id, conversation_id').eq('id', messageId).maybeSingle();
  if (!msg) return null;
  const { data: part } = await supabaseServiceClient.from('dm_participants').select('user_id')
    .eq('conversation_id', msg.conversation_id).eq('user_id', userId).maybeSingle();
  return part ? msg : null;
}
async function broadcastReaction(conversationId: string, payload: any) {
  try {
    const ch = supabaseServiceClient.channel(`dm-conv-${conversationId}`);
    await ch.send({ type: 'broadcast', event: 'reaction', payload });
    await supabaseServiceClient.removeChannel(ch);
  } catch {}
}

router.put('/messages/:id/reaction', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const emoji = String(req.body?.emoji || '').trim();
    if (!emoji || emoji.length > 16) { res.status(400).json({ success: false, error: 'Pick a reaction' }); return; }
    const msg = await reactionTarget(req.params.id, userId);
    if (!msg) { res.status(403).json({ success: false, error: 'Not a participant in this conversation' }); return; }
    const { error } = await supabaseServiceClient.from('dm_message_reactions')
      .upsert({ message_id: msg.id, user_id: userId, emoji }, { onConflict: 'message_id,user_id' });
    if (error) { res.status(500).json({ success: false, error: 'Could not react' }); return; }
    broadcastReaction(msg.conversation_id, { message_id: msg.id, user_id: userId, emoji });
    res.json({ success: true, data: { message_id: msg.id, emoji } });
  } catch (err) {
    console.error('DM reaction error:', err);
    res.status(500).json({ success: false, error: 'Could not react' });
  }
});

router.delete('/messages/:id/reaction', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const msg = await reactionTarget(req.params.id, userId);
    if (!msg) { res.status(403).json({ success: false, error: 'Not a participant in this conversation' }); return; }
    await supabaseServiceClient.from('dm_message_reactions').delete().eq('message_id', msg.id).eq('user_id', userId);
    broadcastReaction(msg.conversation_id, { message_id: msg.id, user_id: userId, emoji: null });
    res.json({ success: true, data: { message_id: msg.id, emoji: null } });
  } catch (err) {
    console.error('DM unreact error:', err);
    res.status(500).json({ success: false, error: 'Could not remove the reaction' });
  }
});

router.delete('/conversations/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    // Verify the user is actually a participant
    const { data: participation } = await supabaseServiceClient
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      res.status(403).json({ success: false, error: 'Not a participant in this conversation' });
      return;
    }

    // Remove user from participants — conversation stays for the other person
    await supabaseServiceClient
      .from('dm_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete DM conversation error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
});

// PUT /api/v1/dm/conversations/:id/read — Mark as read
router.put('/conversations/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    // Update last_read_at for the participant (this alone clears my unread count)
    const { data: mine } = await supabaseServiceClient
      .from('dm_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select('status')
      .maybeSingle();

    // "Seen" goes to the sender only for an accepted chat, and only with read receipts on
    if (!mine || (mine.status && mine.status !== 'accepted')) { res.json({ success: true }); return; }
    const { data: prof } = await supabaseServiceClient.from('profiles').select('dm_read_receipts').eq('id', userId).maybeSingle();
    if (prof?.dm_read_receipts === false) { res.json({ success: true }); return; }

    // Mark all unread messages as read
    await supabaseServiceClient
      .from('dm_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', userId);

    // Notify sender of read receipt
    const io = (req as any).io;
    if (io) {
      io.to(`dm:${conversationId}`).emit('dm:read', { conversationId, readBy: userId });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

export default router;
