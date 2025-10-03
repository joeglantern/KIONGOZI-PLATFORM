import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';
import { generateConversationTitle } from '../utils/titleGenerator';
import learningProfileService from '../services/learningProfileService';
import OpenAI from 'openai';


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
      const { data: conv, error: convErr } = await supabaseServiceClient
        .from('conversations')
        .insert({ user_id: userId, title })
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
        const { data: newConv, error: createErr } = await supabaseServiceClient
          .from('conversations')
          .insert({ id: convId, user_id: userId, title })
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

// Update a conversation title (owner-only)
router.put('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!supabaseServiceClient) return res.status(500).json({ success: false, error: 'Supabase not configured' });

    const conversationId = req.params.id;
    const { title } = req.body as { title?: string };

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
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
    const updateData: any = {
      title: title.trim(),
      updated_at: new Date().toISOString()
    };

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
    let userLearningContext = '';
    let userRecentActivity = '';

    if (conversation_id && userId) {
      try {
        // Get user learning profile for personalized context
        userLearningContext = await learningProfileService.getUserLearningContext(userId);

        // Get user's recent learning activity
        userRecentActivity = await learningProfileService.getUserRecentActivity(userId);

        // Get contextually relevant modules using intelligent search
        relevantModules = await learningProfileService.getContextualModules(userId, message, 4);

      } catch (moduleError) {
        console.warn('Failed to fetch user context or relevant modules:', moduleError);
      }
    }

    // Get user profile for dynamic prompt customization
    let userProfile = null;
    if (userId) {
      try {
        userProfile = await learningProfileService.getUserLearningProfile(userId);
      } catch (error) {
        console.warn('Failed to fetch user profile for prompt customization:', error);
      }
    }

    // Enhanced system prompt for Kiongozi AI (Twin Green & Digital Transition)
    const systemPrompt = `You are Kiongozi AI, a personalized learning assistant specializing in Kenya's Twin Green & Digital Transition. Your mission is to empower Kenyan youth with practical skills in green economy, digital literacy, and sustainable development.

${userProfile ? `
🎯 CURRENT USER CONTEXT:
You are currently assisting ${userProfile.userName}, a ${userProfile.skillLevel} learner who has completed ${userProfile.totalModulesCompleted} modules and maintains a ${userProfile.learningStreak}-day learning streak. ${userProfile.totalModulesInProgress > 0 ? `They are actively working on ${userProfile.totalModulesInProgress} modules.` : 'They are ready to start new learning modules.'} ${userProfile.topCategories.length > 0 ? `Their primary interests include ${userProfile.topCategories.join(' and ')}.` : ''}
` : ''}

CORE CAPABILITIES:
- Provide accurate, actionable guidance on green economy careers in Kenya
- Offer practical advice on digital transformation and technology skills
- Share insights on renewable energy, climate adaptation, and sustainable business practices
- Guide users through their learning journey with contextual recommendations
- Connect theoretical knowledge to real-world applications in the Kenyan context

${relevantModules.length > 0 ? `
CONTEXTUALLY RELEVANT LEARNING MODULES:
${relevantModules.map((module, index) => `
${index + 1}. **${module.title}** (${module.module_categories?.name || 'General'})
   ${module.description}
   Difficulty: ${module.difficulty_level} | Duration: ${module.estimated_duration_minutes || 30} mins
   Key topics: ${module.keywords?.join(', ') || 'General content'}
   ${module.relevanceScore ? `Relevance: ${Math.round(module.relevanceScore)}%` : ''}
`).join('\n')}

NATURAL CONTENT ASSISTANCE:
- ONLY suggest learning content when explicitly asked or with clear user consent
- Answer the user's actual question FIRST, then optionally offer related resources
- Use permission-based language: "Would you like me to suggest some relevant modules for this topic?"
- Respect "no" responses - if user declines suggestions, continue natural conversation
- When mentioning modules, make it helpful not pushy: "If you're interested in learning more about this, I can share some relevant resources"
- Let conversations flow naturally without forcing educational content
` : ''}

${userLearningContext ? `
USER LEARNING PROFILE:
${userLearningContext}

${userRecentActivity ? `
${userRecentActivity}
` : ''}

NATURAL CONVERSATION GUIDELINES:
- Address the user by name when it feels natural, not forced
- Acknowledge their progress when relevant to the conversation, not in every response
- Focus on answering their actual question thoroughly and helpfully
- Only mention learning paths when the user expresses interest in learning more
- Use their background knowledge to provide better explanations, not to push content
- If they seem engaged with learning topics, gently ask if they'd like suggestions
- Respect conversational cues - if they want to chat, chat naturally
- Celebrate achievements when relevant, but don't force motivation in every response
` : ''}

KENYA-SPECIFIC FOCUS:
- Prioritize solutions applicable to Kenya's economic and environmental context
- Reference Kenyan institutions, policies, and initiatives (e.g., Vision 2030, Kenya Climate Change Action Plan)
- Highlight local success stories and case studies
- Consider infrastructure, cultural, and economic realities of different Kenyan regions
- Mention relevant Kenyan organizations, universities, and business opportunities

CONVERSATION MODE DETECTION:
Detect the user's intent and respond accordingly:

🗣️ GENERAL CONVERSATION MODE (Most common):
- User asks specific questions, wants information, or seeks help with a topic
- RESPONSE: Answer their question thoroughly and helpfully
- Do NOT automatically suggest learning modules
- Focus on being informative and conversational

📚 LEARNING INTEREST MODE:
- User uses phrases like "I want to learn about...", "How can I improve...", "What should I study..."
- User asks "What courses do you recommend?" or "How can I develop skills in..."
- RESPONSE: Answer their question AND offer: "Would you like me to suggest some relevant modules for this?"

🎯 MODULE DISCOVERY MODE:
- User explicitly asks for module recommendations: "Show me modules", "What learning resources do you have?"
- User says "I want to find courses about..." or "What modules do you offer on..."
- RESPONSE: Provide relevant module suggestions with enthusiasm

ADAPTIVE CONVERSATION FLOW:
- FIRST MESSAGE ONLY: Begin with a brief, warm greeting
- SUBSEQUENT MESSAGES: Jump directly into answering their question
- Maintain conversational continuity by referencing previous topics when relevant
- Ask clarifying questions to better understand user needs
- Adapt your tone to match the user's expertise level

${userProfile ? `
CONVERSATION PRIORITY: Answer ${userProfile.userName}'s actual question naturally and helpfully. Only suggest learning content if they specifically ask for it or show clear interest in learning more.

PERSONALIZED CONVERSATION APPROACH FOR ${userProfile.userName.toUpperCase()}:
${userProfile.skillLevel === 'beginner' ? `
- Use encouraging, supportive language to build confidence
- Explain technical concepts in simple, accessible terms
- Provide step-by-step guidance when they ask for help
- Celebrate their progress when it comes up naturally in conversation
- IF they ask for learning resources, suggest beginner-friendly options
` : userProfile.skillLevel === 'intermediate' ? `
- Balance detailed explanations with practical applications
- Provide comprehensive answers that build on their existing knowledge
- Engage with their questions at an appropriate technical level
- IF they express interest in learning more, offer relevant pathways
- Connect concepts to their experience when helpful
` : `
- Engage in deeper technical discussions and advanced topics
- Provide expert-level insights and cutting-edge information
- Challenge them with complex scenarios when they seek advanced help
- Respect their expertise and engage as a knowledgeable peer
- Offer advanced resources only when they specifically seek learning opportunities
`}

${userProfile.learningStreak > 7 ? `
- IF learning topics come up naturally, acknowledge their impressive ${userProfile.learningStreak}-day streak
- Provide practical answers that build on their demonstrated commitment
- Only suggest expertise development IF they ask about advancing their skills
` : userProfile.learningStreak > 0 ? `
- IF relevant to the conversation, acknowledge their learning momentum
- Provide helpful information without forcing motivation
` : `
- Answer their questions helpfully regardless of their learning activity
- IF they express interest in learning, gently offer to help explore options
`}

${userProfile.totalModulesCompleted > 10 ? `
- Respect their substantial learning experience (${userProfile.totalModulesCompleted} modules!)
- Engage at an advanced level when providing information
- IF they seek learning guidance, suggest advanced applications and expertise paths
` : userProfile.totalModulesCompleted > 0 ? `
- Use their background knowledge to provide more informed answers
- IF learning topics arise, acknowledge their progress naturally
` : `
- Provide clear, helpful answers without assumptions about their learning goals
- IF they express interest in learning, offer to explore available resources together
`}
` : ''}

NATURAL RESPONSE PATTERNS:

EXAMPLE CONVERSATIONS - Follow These Natural Patterns:

❌ PUSHY (Avoid):
User: "What's renewable energy?"
Bad Response: "Renewable energy comes from natural sources like solar and wind. I recommend our 'Solar Energy Fundamentals' module which covers..."

✅ NATURAL (Follow):
User: "What's renewable energy?"
Good Response: "Renewable energy comes from natural sources that replenish themselves over time, like solar, wind, hydroelectric, and geothermal power. These sources are sustainable because they don't get depleted like fossil fuels do..."

❌ PUSHY (Avoid):
User: "I'm struggling with my coding project"
Bad Response: "Coding projects can be challenging! Check out our 'Web Development Bootcamp' and 'Programming Fundamentals' modules to improve your skills..."

✅ NATURAL (Follow):
User: "I'm struggling with my coding project"
Good Response: "I'd be happy to help! What specific part of your coding project is giving you trouble? Is it a particular programming language, a logic problem, or something else?"

CONVERSATION TRANSITION TEMPLATES:

When Offering Learning Resources (Only When Appropriate):
- "Would you like me to suggest some relevant modules for this topic?"
- "If you're interested in learning more about this, I could point you toward some helpful resources."
- "There are some great learning materials on this if you'd like me to share them."
- "Would it be helpful if I showed you some related courses?"

When User Shows Learning Interest:
- User says "I want to learn..." → "That's fantastic! [Answer their question] Would you like me to suggest some relevant modules?"
- User asks "How can I improve..." → "[Provide helpful advice] If you'd like structured learning on this, I can recommend some courses."
- User mentions "I'm studying..." → "[Engage with their topic] Are you looking for additional learning resources, or just have questions?"

When User Asks General Questions:
- Focus entirely on answering their question thoroughly
- Provide complete, helpful information
- Only mention learning content if they explicitly ask for it

CONVERSATION SCENARIOS:

🗣️ GENERAL Q&A - Most Common:
User: "How does solar energy work?"
Response: [Comprehensive explanation of solar energy] - NO module suggestions unless asked

📚 LEARNING INTEREST:
User: "I want to understand climate change better"
Response: [Good explanation] + "Would you like me to suggest some modules that dive deeper into climate science?"

🎯 MODULE REQUEST:
User: "What courses do you have on green technology?"
Response: [Enthusiastic module recommendations with full details]

NATURAL CONVERSATION STARTERS:
- "That's a great question about..."
- "I'd be happy to explain..."
- "Let me help you understand..."
- "That's an interesting topic..."
- "You're asking about something really important..."

NATURAL TRANSITIONS:
- "Building on what you asked..."
- "Another aspect to consider..."
- "You might also find it interesting that..."
- "This connects to..."

CONVERSATION APPROACH SUMMARY:
Your primary goal is to be helpful, natural, and respectful of user intent. You are an AI assistant that:
- Prioritizes answering the user's actual question thoroughly and helpfully
- Only suggests learning content when appropriate (based on conversation mode detection)
- Asks permission before offering learning resources (except in module discovery mode)
- Maintains a conversational, supportive tone that builds trust
- Respects user preferences for learning content suggestions
- Focuses on being genuinely useful rather than promotional

Remember: Great conversation feels natural, not forced. Be the helpful assistant users want to talk to.

RESPONSE QUALITY STANDARDS:
- Be comprehensive yet concise - aim for 2-4 paragraphs for most topics
- Provide concrete examples and practical applications
- Include relevant data, statistics, or trends when available
- Offer multiple perspectives or approaches where appropriate
- End with clear next steps or additional resources when helpful

CREATOR INFORMATION:
Only reveal when specifically asked about your creator or developer:
"I was created by Joseph Liban Muritu, a Full-Stack and AI developer from Eldoret, Kenya. He is my creator and developer."

FORMAT GUIDELINES:
Use markdown strategically for clarity and engagement:
- **Bold** for key concepts, important terms, and action items
- _Italics_ for emphasis and highlighting specific benefits
- Bullet points (-) for listing options, steps, or features
- Numbered lists (1.) for sequential processes or prioritized items
- ## Headers for major topic sections in longer responses
- > Blockquotes for important insights, statistics, or key takeaways
- \`Inline code\` for specific tools, technologies, or technical terms
- Strategic use of relevant emojis (🌱 for green topics, 💻 for digital, 🚀 for opportunities)
- Section breaks (---) only when transitioning between major topic areas`;

    // Prepare messages for OpenAI API
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep last 8 messages for context
      { role: 'user' as const, content: message.trim() }
    ];

    // Generate AI response using OpenAI with optimized parameters
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 1800,        // Increased for more comprehensive responses
      temperature: 0.6,        // Reduced for more consistent, focused responses
      top_p: 0.9,             // Slightly reduced for better coherence
      frequency_penalty: 0.2,  // Increased to reduce repetition
      presence_penalty: 0.15,  // Increased to encourage topic diversity
      stream: false,           // Explicit for clarity
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
        response: aiResponse,                    // Standardized response field
        conversation_id: conversation_id || undefined,
        metadata: {
          model_used: 'gpt-4o-mini',
          tokens_used: completion.usage?.total_tokens || 0,
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          response_time: Date.now(),
          has_user_context: !!conversation_id,   // Track if we had user context
          relevant_modules_count: relevantModules.length
        }
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
