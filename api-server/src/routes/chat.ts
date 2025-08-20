import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';

const router = Router();

async function ensureProfile(userId: string, email?: string) {
  if (!supabaseServiceClient) throw new Error('Supabase not configured');
  const { data: existing, error: selErr } = await supabaseServiceClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;
  const insertPayload: any = { id: userId };
  if (email) insertPayload.email = email;
  const { data, error } = await supabaseServiceClient
    .from('profiles')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

function composeTitleFrom(text: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`>\[\]{}()]/g, '')
    .trim();
  const firstSentence = cleaned.split(/[.!?\n]/)[0] || cleaned;
  const words = firstSentence.split(/\s+/).slice(0, 8);
  const title = words.join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// Create or continue a conversation by posting a message
router.post('/message', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const { text, conversation_id } = req.body as { text?: string; conversation_id?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const userId = req.user.id;

    // Ensure profile exists for this user (handles users created before migration)
    await ensureProfile(userId, req.user.email);

    let convId = conversation_id;
    if (!convId) {
      const title = composeTitleFrom(text).slice(0, 80);
      const { data: conv, error: convErr } = await supabaseServiceClient
        .from('conversations')
        .insert({ user_id: userId, title })
        .select('*')
        .single();
      if (convErr) return res.status(500).json({ success: false, error: convErr.message });
      convId = conv.id;
    }

    const { data: msg, error: msgErr } = await supabaseServiceClient
      .from('messages')
      .insert({ conversation_id: convId, user_id: userId, text: text.trim(), is_user: true, type: 'chat' })
      .select('*')
      .single();

    if (msgErr) return res.status(500).json({ success: false, error: msgErr.message });

    // Bump conversation updated_at for ordering
    await supabaseServiceClient.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

    return res.json({ success: true, data: { conversation_id: convId, message: msg } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to post message' });
  }
});

// Persist an assistant message to an existing conversation
router.post('/message/assistant', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const { text, conversation_id, type, research_data } = req.body as { text?: string; conversation_id?: string; type?: 'chat' | 'research'; research_data?: any };
    if (!conversation_id) return res.status(400).json({ success: false, error: 'conversation_id is required' });
    if (!text && !research_data) return res.status(400).json({ success: false, error: 'Text or research_data is required' });

    // Ensure conversation belongs to user
    const { data: conv, error: convErr } = await supabaseServiceClient
      .from('conversations')
      .select('id,user_id')
      .eq('id', conversation_id)
      .single();
    if (convErr || !conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const payload: any = {
      conversation_id,
      user_id: req.user.id,
      text: (text || '').trim(),
      is_user: false,
      type: type === 'research' ? 'research' : 'chat',
    };
    if (research_data) payload.research_data = research_data;

    const { data: msg, error: msgErr } = await supabaseServiceClient
      .from('messages')
      .insert(payload)
      .select('*')
      .single();
    if (msgErr) return res.status(500).json({ success: false, error: msgErr.message });

    // Bump conversation updated_at for ordering
    await supabaseServiceClient.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversation_id);

    return res.json({ success: true, data: { conversation_id, message: msg } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to save assistant message' });
  }
});

// List user's conversations (pagination supported)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 100) || 20;
    const offset = Math.max(parseInt(String(req.query.offset ?? '0')), 0) || 0;

    let base = supabaseServiceClient
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const q = String((req.query.q ?? '').toString()).trim();
    if (q) {
      base = base.ilike('title', `%${q}%`);
    }

    const { data, error, count } = await base;

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data, pagination: { limit, offset, total: count ?? null } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to list conversations' });
  }
});

// Get messages in a conversation (pagination supported)
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const conversationId = req.params.id;

    // Ensure conversation belongs to user
    const { data: conv, error: convErr } = await supabaseServiceClient
      .from('conversations')
      .select('id,user_id')
      .eq('id', conversationId)
      .single();
    if (convErr) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const limit = Math.min(parseInt(String(req.query.limit ?? '50')), 200) || 50;
    const offset = Math.max(parseInt(String(req.query.offset ?? '0')), 0) || 0;

    const { data, error, count } = await supabaseServiceClient
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data, pagination: { limit, offset, total: count ?? null } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to get messages' });
  }
});

// Delete a conversation (owner-only)
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const conversationId = req.params.id;

    // Ensure ownership
    const { data: conv, error: convErr } = await supabaseServiceClient
      .from('conversations')
      .select('id,user_id')
      .eq('id', conversationId)
      .single();
    if (convErr) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Delete (messages will cascade via FK)
    const { error: delErr } = await supabaseServiceClient
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (delErr) return res.status(500).json({ success: false, error: delErr.message });
    return res.json({ success: true, message: 'Conversation deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to delete conversation' });
  }
});

export default router;
