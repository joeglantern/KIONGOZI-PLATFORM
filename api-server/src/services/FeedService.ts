import { supabaseServiceClient } from '../config/supabase';

const POST_SELECT = `
  id, content, visibility, like_count, comment_count, repost_count, view_count,
  is_bot_reply, created_at, updated_at,
  user_id, parent_post_id, repost_of_id,
  profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
  post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index),
  repost_of:repost_of_id (
    id, content, visibility, like_count, comment_count, repost_count, view_count,
    is_bot_reply, created_at, updated_at, user_id,
    profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
    post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index)
  )
`;

/**
 * Batch-enrich posts with isLiked + isBookmarked + isReposted + recentReposters for the given user.
 * Makes three parallel queries — post_likes, bookmarks, and reposts.
 * Safe to call with userId=undefined (returns posts unchanged).
 */
async function enrichWithUserState(posts: any[], userId?: string): Promise<any[]> {
  if (!userId || !posts.length) return posts;

  const postIds = posts.map((p: any) => p.id);

  const [{ data: likes }, { data: bookmarks }, { data: reposts }] = await Promise.all([
    supabaseServiceClient
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds),
    supabaseServiceClient
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds),
    supabaseServiceClient
      .from('posts')
      .select('repost_of_id, user_id, profiles:user_id(id, username, avatar_url)')
      .in('repost_of_id', postIds)
      .not('repost_of_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(postIds.length * 3),
  ]);

  const likedSet = new Set((likes || []).map((l: any) => l.post_id));
  const bookmarkedSet = new Set((bookmarks || []).map((b: any) => b.post_id));

  // Build repostedSet (posts the current user has reposted) and repostersMap (up to 3 reposters per post)
  const repostedSet = new Set<string>();
  const repostersMap: Record<string, any[]> = {};
  for (const r of (reposts || []) as any[]) {
    if (r.user_id === userId) repostedSet.add(r.repost_of_id);
    if (!repostersMap[r.repost_of_id]) repostersMap[r.repost_of_id] = [];
    if (repostersMap[r.repost_of_id].length < 3) {
      repostersMap[r.repost_of_id].push(r.profiles);
    }
  }

  return posts.map((p: any) => ({
    ...p,
    isLiked: likedSet.has(p.id),
    isBookmarked: bookmarkedSet.has(p.id),
    isReposted: repostedSet.has(p.id),
    recentReposters: repostersMap[p.id] || [],
  }));
}

export { enrichWithUserState };

class FeedService {
  /**
   * Get personalized fan-in feed for a user.
   * Returns posts from users they follow, ordered newest-first.
   * Includes isLiked + isBookmarked per post.
   */
  async getPersonalizedFeed(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    const { data: following, error: followErr } = await supabaseServiceClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followErr) throw followErr;

    const followingIds = (following || []).map((f: any) => f.following_id);
    followingIds.push(userId);

    if (followingIds.length === 0) {
      return { data: [], nextCursor: null };
    }

    let query = supabaseServiceClient
      .from('posts')
      .select(POST_SELECT)
      .in('user_id', followingIds)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null;
    return { data: await enrichWithUserState(posts || [], userId), nextCursor };
  }

  /**
   * Get the public explore feed, sorted by engagement score.
   * Includes isLiked + isBookmarked when userId is provided.
   */
  async getExploreFeed(
    limit: number,
    cursor?: string,
    userId?: string
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

    const scored = (posts || [])
      .map((p: any) => ({
        ...p,
        _score: (p.like_count || 0) + (p.comment_count || 0) * 2 + (p.repost_count || 0) * 3,
      }))
      .sort((a: any, b: any) => b._score - a._score);

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null;
    return { data: await enrichWithUserState(scored, userId), nextCursor };
  }

  /**
   * Score-based "For You" feed.
   * Pool: 200 recent public non-reply posts from last 7 days, excluding own.
   * Score = (likes + comments×2 + reposts×3) × recency_multiplier × follow_boost
   * Includes isLiked + isBookmarked per post.
   */
  async getForYouFeed(
    userId: string,
    limit: number,
    offset = 0
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: pool, error }, { data: following }] = await Promise.all([
      supabaseServiceClient
        .from('posts')
        .select(POST_SELECT)
        .eq('visibility', 'public')
        .is('parent_post_id', null)
        .neq('user_id', userId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200),
      supabaseServiceClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId),
    ]);

    if (error) throw error;

    const followingSet = new Set((following || []).map((f: any) => f.following_id));
    const now = Date.now();

    const scored = (pool || [])
      .map((p: any) => {
        const ageH = (now - new Date(p.created_at).getTime()) / 3600000;
        const recency = ageH < 6 ? 1.0 : ageH < 24 ? 0.8 : ageH < 72 ? 0.5 : 0.2;
        const boost = followingSet.has(p.user_id) ? 1.5 : 1.0;
        const eng = (p.like_count || 0) + (p.comment_count || 0) * 2 + (p.repost_count || 0) * 3;
        return { ...p, _score: eng * recency * boost };
      })
      .sort((a: any, b: any) => b._score - a._score);

    const page = scored.slice(offset, offset + limit);
    // Guard: empty page always means end of feed
    if (page.length === 0) {
      return { data: [], nextCursor: null };
    }
    return {
      data: await enrichWithUserState(page, userId),
      nextCursor: offset + limit < scored.length ? String(offset + limit) : null,
    };
  }
}

export default new FeedService();
