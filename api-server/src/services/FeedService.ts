import { supabaseServiceClient } from '../config/supabase';

const POST_SELECT = `
  id, content, visibility, like_count, comment_count, repost_count, view_count,
  is_bot_reply, created_at, updated_at,
  user_id, parent_post_id, repost_of_id,
  profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
  post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index)
`;

class FeedService {
  /**
   * Get personalized fan-in feed for a user.
   * Returns posts from users they follow, ordered newest-first.
   * Uses cursor-based pagination.
   */
  async getPersonalizedFeed(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    // Get list of following IDs
    const { data: following, error: followErr } = await supabaseServiceClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followErr) throw followErr;

    // Include own posts + followed users' posts
    const followingIds = (following || []).map((f: any) => f.following_id);
    followingIds.push(userId);

    if (followingIds.length === 0) {
      return { data: [], nextCursor: null };
    }

    let query = supabaseServiceClient
      .from('posts')
      .select(POST_SELECT)
      .in('user_id', followingIds)
      .is('parent_post_id', null) // No replies in feed
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null;
    return { data: posts || [], nextCursor };
  }

  /**
   * Get the public explore feed.
   * Returns public posts ordered by engagement score (like_count + comment_count * 2 + repost_count * 3).
   */
  async getExploreFeed(
    limit: number,
    cursor?: string
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    let query = supabaseServiceClient
      .from('posts')
      .select(POST_SELECT)
      .eq('visibility', 'public')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    // Sort by engagement score client-side (avoid complex SQL for now)
    const scored = (posts || []).map((p: any) => ({
      ...p,
      _score: (p.like_count || 0) + (p.comment_count || 0) * 2 + (p.repost_count || 0) * 3
    }));
    scored.sort((a: any, b: any) => b._score - a._score);

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null;
    return { data: scored, nextCursor };
  }
}

export default new FeedService();
