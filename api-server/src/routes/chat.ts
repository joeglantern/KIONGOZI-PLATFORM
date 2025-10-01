import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';
import { generateConversationTitle } from '../utils/titleGenerator';
import OpenAI from 'openai';

// Utility function to generate conversation slug
function generateConversationSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);
}

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      // Generate title using GPT or fallback to simple generation
      const title = await generateConversationTitle(text);
      const slug = generateConversationSlug(title);
      const { data: conv, error: convErr } = await supabaseServiceClient
        .from('conversations')
        .insert({ user_id: userId, title, slug })
        .select('*')
        .single();
      if (convErr) return res.status(500).json({ success: false, error: convErr.message });
      convId = conv.id;
    } else {
      // Check if conversation exists, if not create it with the provided ID
      const { data: existingConv, error: checkErr } = await supabaseServiceClient
        .from('conversations')
        .select('id')
        .eq('id', convId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkErr) return res.status(500).json({ success: false, error: checkErr.message });
      
      if (!existingConv) {
        // Conversation doesn't exist, create it with the provided ID and generated title
        const title = await generateConversationTitle(text);
        const slug = generateConversationSlug(title);
        const { data: newConv, error: createErr } = await supabaseServiceClient
          .from('conversations')
          .insert({ id: convId, user_id: userId, title, slug })
          .select('*')
          .single();
        if (createErr) return res.status(500).json({ success: false, error: createErr.message });
      }
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

    const { data: conversations, error, count } = await base;

    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!conversations) return res.json({ success: true, data: [], pagination: { limit, offset, total: 0 } });

    // Enhance conversations with lastMessage and messageCount
    const enhancedConversations = await Promise.all(conversations.map(async (conv) => {
      try {
        // Get message count
        const { count: messageCount } = await supabaseServiceClient
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        // Get last message
        const { data: lastMessages } = await supabaseServiceClient
          .from('messages')
          .select('text, is_user, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;

        return {
          ...conv,
          messageCount: messageCount || 0,
          lastMessage: lastMessage ? lastMessage.text : null,
          lastMessageIsUser: lastMessage ? lastMessage.is_user : null,
          lastMessageAt: lastMessage ? lastMessage.created_at : conv.updated_at
        };
      } catch (enhanceError) {
        console.warn(`Failed to enhance conversation ${conv.id}:`, enhanceError);
        return {
          ...conv,
          messageCount: 0,
          lastMessage: null,
          lastMessageIsUser: null,
          lastMessageAt: conv.updated_at
        };
      }
    }));

    return res.json({ success: true, data: enhancedConversations, pagination: { limit, offset, total: count ?? null } });
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

// Update a conversation title and slug (owner-only)
router.put('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const conversationId = req.params.id;
    const { title, slug } = req.body as { title?: string; slug?: string };

    if (!title && !slug) {
      return res.status(400).json({ success: false, error: 'Title or slug is required' });
    }

    // Ensure ownership
    const { data: conv, error: convErr } = await supabaseServiceClient
      .from('conversations')
      .select('id,user_id,title')
      .eq('id', conversationId)
      .single();
    if (convErr) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (conv.user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title) {
      updateData.title = title.trim();
      // Auto-generate slug from new title if not provided
      updateData.slug = slug ? slug.trim() : generateConversationSlug(title.trim());
    } else if (slug) {
      updateData.slug = slug.trim();
    }

    // Update conversation
    const { data: updatedConv, error: updateErr } = await supabaseServiceClient
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select('*')
      .single();

    if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });
    return res.json({ success: true, data: updatedConv });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to update conversation' });
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

// Generate AI response via OpenAI API
router.post('/ai-response', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const { message, conversation_id, type } = req.body as {
      message?: string;
      conversation_id?: string;
      type?: 'chat' | 'research'
    };

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
    }

    const userId = req.user.id;

    // Ensure profile exists for this user
    await ensureProfile(userId, req.user.email);

    // Get conversation history for context if conversation_id is provided
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (conversation_id) {
      // Verify conversation belongs to user
      const { data: conv, error: convErr } = await supabaseServiceClient
        .from('conversations')
        .select('id,user_id')
        .eq('id', conversation_id)
        .single();

      if (convErr || !conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      if (conv.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Get recent messages for context (last 10 messages)
      const { data: messages, error: msgErr } = await supabaseServiceClient
        .from('messages')
        .select('text, is_user')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (msgErr) {
        console.warn('Failed to get conversation history:', msgErr);
      } else if (messages) {
        // Reverse to get chronological order and convert to OpenAI format
        conversationHistory = messages
          .reverse()
          .map(msg => ({
            role: msg.is_user ? 'user' as const : 'assistant' as const,
            content: msg.text
          }));
      }
    }

    // Get relevant learning modules for context (if user is logged in)
    let relevantModules: any[] = [];
    if (conversation_id && userId) {
      try {
        const { data: modules } = await supabaseServiceClient
          .from('learning_modules')
          .select('title, description, content, keywords')
          .eq('status', 'published')
          .or(`title.ilike.%${message.slice(0, 50)}%,description.ilike.%${message.slice(0, 50)}%,keywords.cs.{${message.toLowerCase()}}`)
          .limit(3);

        if (modules) {
          relevantModules = modules;
        }
      } catch (moduleError) {
        console.warn('Failed to fetch relevant modules:', moduleError);
      }
    }

    // Enhanced system prompt for Kiongozi AI (Twin Green & Digital Transition)
    const systemPrompt = `You are Kiongozi AI, a knowledgeable assistant specializing in Kenya's Twin Green & Digital Transition, empowering youth with green economy skills and digital literacy.

Answer questions accurately, concisely, and focus on Kenya. Provide comprehensive information about sustainable career opportunities, green economy practices, digital transformation, renewable energy, climate adaptation, and future-ready skills for Kenyan youth.

${relevantModules.length > 0 ? `
LEARNING CONTEXT: Use the following educational content to enhance your responses when relevant:
${relevantModules.map(module => `
**${module.title}**
${module.description}
Key topics: ${module.keywords?.join(', ') || 'General content'}
`).join('\n')}

When discussing topics covered in these modules, you can reference them by saying "As covered in our learning module on [topic]" or "You might be interested in our module about [topic]".
` : ''}

CRITICAL: If someone asks about your creator, developer, or who made you, ONLY then reveal this information:
"I was created by Joseph Liban Muritu, a Full-Stack and AI developer from Eldoret, Kenya. He is my creator and developer."
Do not reveal this information unless specifically asked about your creator or developer.

CONVERSATION FLOW INSTRUCTIONS:
- Only greet the user ('Hello', 'Hi', etc.) in your first message of a conversation.
- For all subsequent responses, DO NOT start with greetings like 'Hello', 'Hi', etc.
- Jump directly into answering the question or continuing the conversation.
- Maintain a natural conversational flow without repetitive patterns.

Focus on providing helpful, accurate information about green economy opportunities, digital skills development, sustainable business models, climate change solutions, renewable energy technologies, and digital entrepreneurship opportunities in Kenya.

Format your responses using markdown to make them more engaging and easier to read:
- Use **bold** for important concepts and key terms
- Use _italics_ for emphasis
- Use bullet points (- ) or numbered lists (1. ) for steps or multiple points
- Use ## for section headers if needed
- Use > for important quotes or callouts
- Use \`code\` for specific terms, legal citations, or document references
- Include section breaks (---) when transitioning between major topics
- Organize information in a visually pleasing way with occasional emojis where appropriate`;

    // Prepare messages for OpenAI API
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep last 8 messages for context
      { role: 'user' as const, content: message.trim() }
    ];

    // Generate AI response using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 1200,
      temperature: 0.9,
      top_p: 0.95,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate AI response'
      });
    }

    // If conversation_id is provided, auto-save the AI response
    if (conversation_id) {
      try {
        await supabaseServiceClient
          .from('messages')
          .insert({
            conversation_id,
            user_id: userId,
            text: aiResponse,
            is_user: false,
            type: type === 'research' ? 'research' : 'chat'
          });

        // Bump conversation updated_at for ordering
        await supabaseServiceClient
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation_id);
      } catch (saveError) {
        console.warn('Failed to save AI response to database:', saveError);
        // Continue anyway - return the response even if saving failed
      }
    }

    return res.json({
      success: true,
      data: {
        response: aiResponse,
        conversation_id: conversation_id || undefined
      }
    });

  } catch (error: any) {
    console.error('AI response generation error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate AI response'
    });
  }
});

export default router;
