import OpenAI from 'openai';
import { supabaseServiceClient } from '../config/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BOT_USER_ID = process.env.BOT_USER_ID || '00000000-0000-0000-0000-000000000001';
const BOT_MAX_REPLY_CHARS = 280;

// Rate limiting: track last reply timestamps per post
const repliedPosts = new Set<string>();
const botCooldownMs = 5000; // 5 seconds between replies
let lastReplyTime = 0;

const SYSTEM_PROMPT = `You are @kiongozi, Kenya's civic AI assistant embedded in a social platform.
Your role is to educate and inform Kenyans about:
- The Constitution of Kenya 2010
- Kenya Vision 2030 development blueprint
- Green Economy and environmental policy
- County devolution and civic rights
- Public participation and civic engagement

Respond in a helpful, factual, and encouraging tone. Keep replies concise (under 280 characters).
When answering @mentions in posts, be conversational and relevant to the thread context.
Always be accurate, never fabricate facts. If unsure, say so.
Respond in the same language used in the post (Swahili or English).`;

class BotService {
  /**
   * Handle a new @kiongozi mention in a post.
   * Fetches the post + thread context, generates a reply, posts it.
   */
  async handleMention(postId: string): Promise<void> {
    // Prevent duplicate replies to same post
    if (repliedPosts.has(postId)) return;

    // Enforce cooldown
    const now = Date.now();
    if (now - lastReplyTime < botCooldownMs) {
      // Schedule retry after cooldown
      const delay = botCooldownMs - (now - lastReplyTime);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    repliedPosts.add(postId);

    try {
      // Fetch the post
      const { data: post, error } = await supabaseServiceClient
        .from('posts')
        .select(`
          id, content, user_id, parent_post_id,
          profiles:user_id (username, full_name)
        `)
        .eq('id', postId)
        .single();

      if (error || !post) {
        console.error('BotService: could not fetch post', postId);
        return;
      }

      // Build thread context (up to 5 parent messages)
      const threadMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      let currentPost: any = post;

      while (currentPost?.parent_post_id && threadMessages.length < 5) {
        const { data: parent } = await supabaseServiceClient
          .from('posts')
          .select('id, content, user_id, parent_post_id, profiles:user_id (username)')
          .eq('id', currentPost.parent_post_id)
          .single();

        if (!parent) break;

        const isBot = parent.user_id === BOT_USER_ID;
        threadMessages.unshift({
          role: isBot ? 'assistant' : 'user',
          content: `@${(parent as any).profiles?.username || 'user'}: ${parent.content}`
        });
        currentPost = parent;
      }

      // Add the triggering post
      const authorUsername = (post as any).profiles?.username || 'user';
      threadMessages.push({
        role: 'user',
        content: `@${authorUsername}: ${post.content}`
      });

      // Generate reply
      const replyContent = await this.generateBotReply(threadMessages);
      if (!replyContent) return;

      // Post as bot
      await this.postBotReply(postId, replyContent);
      lastReplyTime = Date.now();
    } catch (err) {
      console.error('BotService.handleMention error:', err);
      repliedPosts.delete(postId); // Allow retry on error
    }
  }

  /**
   * Generate a reply using OpenAI
   */
  async generateBotReply(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string | null> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) return null;

      // Truncate to 280 chars
      return text.length > BOT_MAX_REPLY_CHARS
        ? text.slice(0, BOT_MAX_REPLY_CHARS - 1) + '…'
        : text;
    } catch (err) {
      console.error('OpenAI error in BotService:', err);
      return null;
    }
  }

  /**
   * Insert a bot reply post into the posts table
   */
  async postBotReply(parentPostId: string, content: string): Promise<void> {
    const { error } = await supabaseServiceClient
      .from('posts')
      .insert({
        user_id: BOT_USER_ID,
        content,
        parent_post_id: parentPostId,
        visibility: 'public',
        is_bot_reply: true
      });

    if (error) {
      console.error('BotService: failed to post reply', error);
    }
  }
}

export default new BotService();
