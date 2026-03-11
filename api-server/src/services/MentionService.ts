import { supabaseServiceClient } from '../config/supabase';
import BotService from './BotService';
import NotificationService from './NotificationService';

const MENTION_REGEX = /@(\w+)/g;
const HASHTAG_REGEX = /#(\w+)/g;

class MentionService {
  /**
   * Extract @usernames from content string
   */
  extractMentions(content: string): string[] {
    const matches = content.matchAll(MENTION_REGEX);
    const usernames = new Set<string>();
    for (const match of matches) {
      usernames.add(match[1].toLowerCase());
    }
    return Array.from(usernames);
  }

  /**
   * Extract #hashtags from content string
   */
  extractHashtags(content: string): string[] {
    const matches = content.matchAll(HASHTAG_REGEX);
    const tags = new Set<string>();
    for (const match of matches) {
      tags.add(match[1].toLowerCase());
    }
    return Array.from(tags);
  }

  /**
   * Process @mentions in a post:
   * - Look up usernames in profiles
   * - Insert into mentions table
   * - Check if @kiongozi is mentioned → trigger BotService
   */
  async processMentions(postId: string, content: string, mentionerId: string): Promise<void> {
    const usernames = this.extractMentions(content);
    if (usernames.length === 0) return;

    // Look up mentioned users
    const { data: users, error } = await supabaseServiceClient
      .from('profiles')
      .select('id, username')
      .in('username', usernames);

    if (error || !users || users.length === 0) return;

    // Insert mention records
    const mentionRows = users.map(u => ({
      post_id: postId,
      mentioned_user_id: u.id,
      mentioner_user_id: mentionerId
    }));

    await supabaseServiceClient.from('mentions').insert(mentionRows);

    // Check if @kiongozi bot is mentioned
    const botMentioned = users.some(u => u.username === 'kiongozi');
    if (botMentioned) {
      // Trigger bot reply asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          await BotService.handleMention(postId);
        } catch (e) {
          console.error('BotService.handleMention error:', e);
        }
      });
    }

    // Notify each mentioned user (excluding bot and self)
    const nonBotUsers = users.filter(u => u.username !== 'kiongozi' && u.id !== mentionerId);
    if (nonBotUsers.length > 0) {
      setImmediate(async () => {
        try {
          const { data: mentioner } = await supabaseServiceClient
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', mentionerId)
            .single();
          for (const user of nonBotUsers) {
            await NotificationService.notify({
              userId: user.id,
              type: 'mention',
              title: 'You were mentioned',
              message: `${mentioner?.full_name || 'Someone'} mentioned you in a post`,
              data: { post_id: postId, from_user_id: mentionerId, from_username: mentioner?.username, from_avatar_url: mentioner?.avatar_url },
            });
          }
        } catch (e) {
          console.error('Mention notification error:', e);
        }
      });
    }
  }

  /**
   * Process #hashtags in a post:
   * - Upsert hashtag records
   * - Insert post_hashtags rows
   */
  async processHashtags(postId: string, content: string): Promise<void> {
    const tags = this.extractHashtags(content);
    if (tags.length === 0) return;

    for (const tag of tags) {
      // Upsert hashtag
      const { data: hashtag } = await supabaseServiceClient
        .from('hashtags')
        .upsert({ tag }, { onConflict: 'tag' })
        .select('id')
        .single();

      if (hashtag) {
        await supabaseServiceClient
          .from('post_hashtags')
          .upsert({ post_id: postId, hashtag_id: hashtag.id }, { onConflict: 'post_id,hashtag_id' });
      }
    }
  }
}

export default new MentionService();
