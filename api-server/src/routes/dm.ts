import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

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
        dm_conversations!inner (
          id,
          last_message_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('DM conversations query error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
      return;
    }

    // Step 2: Enrich each conversation with participants, last message, unread count
    const enriched = await Promise.all(
      (data || []).map(async (row: any) => {
        const convId = row.conversation_id;

        const [participantsRes, lastMsgRes, unreadRes] = await Promise.all([
          supabaseServiceClient
            .from('dm_participants')
            .select('user_id, profiles:user_id (id, full_name, username, avatar_url, is_verified, is_bot)')
            .eq('conversation_id', convId)
            .neq('user_id', userId),
          supabaseServiceClient
            .from('dm_messages')
            .select('id, content, sender_id, created_at, media_type')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseServiceClient
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('is_read', false)
            .neq('sender_id', userId),
        ]);

        const participants = (participantsRes.data || []).map((p: any) => p.profiles);

        return {
          id: convId,
          last_message_at: row.dm_conversations?.last_message_at,
          last_read_at: row.last_read_at,
          last_message: lastMsgRes.data,
          unread_count: unreadRes.count || 0,
          participants
        };
      })
    );

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
      { conversation_id: conversation.id, user_id: userId },
      { conversation_id: conversation.id, user_id: recipientId }
    ]);

    res.status(201).json({ success: true, data: { id: conversation.id, existing: false } });
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
        sender:sender_id (id, full_name, username, avatar_url, is_bot)
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

    const { data: message, error } = await supabaseServiceClient
      .from('dm_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content || null,
        media_url: media_url || null,
        media_type: media_type || null
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

    // Update conversation timestamp
    await supabaseServiceClient
      .from('dm_conversations')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Notify other participants via Socket.IO
    const io = (req as any).io;
    if (io) {
      const { data: participants } = await supabaseServiceClient
        .from('dm_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', userId);

      participants?.forEach((p: any) => {
        io.to(`user:${p.user_id}`).emit('dm:message_new', {
          conversationId,
          message
        });
      });

      // Also emit to the DM room
      io.to(`dm:${conversationId}`).emit('dm:message_new', { conversationId, message });
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error('Send DM error:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// PUT /api/v1/dm/conversations/:id/read — Mark as read
router.put('/conversations/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    // Update last_read_at for the participant
    await supabaseServiceClient
      .from('dm_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

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
