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
 */
async function enrichWithUserState(posts: any[], userId?: string): Promise<any[]> {
  if (!userId || !posts.length) return posts;

  const postIds = posts.map((p: any) => p.id);

  const [{ data: likes }, { data: bookmarks }, { data: reposts }] = await Promise.all([
    supabaseServiceClient.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabaseServiceClient.from('bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds),
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
  const repostedSet = new Set<string>();
  const repostersMap: Record<string, any[]> = {};

  for (const r of (reposts || []) as any[]) {
    if (r.user_id === userId) repostedSet.add(r.repost_of_id);
    if (!repostersMap[r.repost_of_id]) repostersMap[r.repost_of_id] = [];
    if (repostersMap[r.repost_of_id].length < 3) repostersMap[r.repost_of_id].push(r.profiles);
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

async function getPrivateUserIds(): Promise<string[]> {
  const { data } = await supabaseServiceClient.from('profiles').select('id').eq('is_private', true);
  return (data || []).map((r: any) => r.id);
}

export { getPrivateUserIds };

async function getExcludeIds(userId: string): Promise<string[]> {
  const [{ data: muted }, { data: blocked }, { data: blockedBy }] = await Promise.all([
    supabaseServiceClient.from('mutes').select('muted_id').eq('muter_id', userId),
    supabaseServiceClient.from('blocks').select('blocked_id').eq('blocker_id', userId),
    supabaseServiceClient.from('blocks').select('blocker_id').eq('blocked_id', userId),
  ]);

  const ids = new Set<string>();
  (muted || []).forEach((r: any) => ids.add(r.muted_id));
  (blocked || []).forEach((r: any) => ids.add(r.blocked_id));
  (blockedBy || []).forEach((r: any) => ids.add(r.blocker_id));
  return Array.from(ids);
}

/** Extract hashtags from a string, lowercased */
function extractHashtags(content: string): string[] {
  return (content.match(/#\w+/g) || []).map(t => t.toLowerCase());
}

class FeedService {
  /**
   * Chronological fan-in feed for the Following tab.
   */
  async getPersonalizedFeed(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    const [{ data: following, error: followErr }, excludeIds] = await Promise.all([
      supabaseServiceClient.from('follows').select('following_id').eq('follower_id', userId),
      getExcludeIds(userId),
    ]);

    if (followErr) throw followErr;

    const followingIds = (following || []).map((f: any) => f.following_id);
    followingIds.push(userId);

    if (followingIds.length <= 1) {
      // User follows nobody — fall through to For You as a courtesy
      return this.getForYouFeed(userId, limit, 0);
    }

    let query = supabaseServiceClient
      .from('posts')
      .select(POST_SELECT)
      .in('user_id', followingIds)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (excludeIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludeIds.join(',')})`);
    }
    if (cursor) query = query.lt('created_at', cursor);

    const { data: posts, error } = await query;
    if (error) throw error;

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null;
    return { data: await enrichWithUserState(posts || [], userId), nextCursor };
  }

  /**
   * Explore feed sorted by engagement score.
   */
  async getExploreFeed(
    limit: number,
    cursor?: string,
    userId?: string
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    const [excludeIds, privateUserIds] = await Promise.all([
      userId ? getExcludeIds(userId) : Promise.resolve([]),
      getPrivateUserIds(),
    ]);
    const allExcludeIds = [...new Set([...excludeIds, ...privateUserIds])];

    let query = supabaseServiceClient
      .from('posts')
      .select(POST_SELECT)
      .eq('visibility', 'public')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (allExcludeIds.length > 0) {
      query = query.not('user_id', 'in', `(${allExcludeIds.join(',')})`);
    }
    if (cursor) query = query.lt('created_at', cursor);

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
   * "For You" feed with interest-based scoring.
   *
   * Scoring formula:
   *   score = (engagement + new_post_floor) × recency × follow_boost × verified_boost × hashtag_affinity_boost
   *
   * Signals used:
   *   - Engagement: likes + comments×2 + reposts×3
   *   - Recency: <6h=1.0, <24h=0.8, <72h=0.5, older=0.25
   *   - Follow boost: 1.5× for accounts the user follows
   *   - Verified boost: 1.15× for verified accounts
   *   - New post floor: posts < 2h old with 0 engagement get a base score of 1 so they can surface
   *   - Hashtag affinity: up to 1.5× based on overlap with topics the user recently liked
   *   - Author diversity: max 3 posts per author per page
   *   - Never-empty fallback: fills page from recent public posts when scored pool runs dry
   */
  async getForYouFeed(
    userId: string,
    limit: number,
    offset = 0
  ): Promise<{ data: any[]; nextCursor: string | null }> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Gather all signals in parallel
    const [
      { data: pool, error: poolErr },
      { data: following },
      excludeIds,
      privateUserIds,
      { data: recentLikes },
    ] = await Promise.all([
      // Wider pool: 400 posts from last 14 days
      supabaseServiceClient
        .from('posts')
        .select(POST_SELECT)
        .eq('visibility', 'public')
        .is('parent_post_id', null)
        .neq('user_id', userId)
        .gte('created_at', fourteenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(400),

      supabaseServiceClient.from('follows').select('following_id').eq('follower_id', userId),
      getExcludeIds(userId),
      getPrivateUserIds(),

      // Last 40 liked posts for hashtag affinity
      supabaseServiceClient
        .from('post_likes')
        .select('posts:post_id (content)')
        .eq('user_id', userId)
        .limit(40),
    ]);

    if (poolErr) throw poolErr;

    // Build hashtag affinity map from liked post content
    const hashtagFreq: Record<string, number> = {};
    for (const like of (recentLikes || []) as any[]) {
      const content: string = like.posts?.content || '';
      for (const tag of extractHashtags(content)) {
        hashtagFreq[tag] = (hashtagFreq[tag] || 0) + 1;
      }
    }
    const hasAffinity = Object.keys(hashtagFreq).length > 0;

    const excludeSet = new Set([...excludeIds, ...privateUserIds]);
    const followingSet = new Set((following || []).map((f: any) => f.following_id));
    const now = Date.now();

    // Score every candidate
    const scored = (pool || [])
      .filter((p: any) => !excludeSet.has(p.user_id))
      .map((p: any) => {
        const ageH = (now - new Date(p.created_at).getTime()) / 3600000;
        const recency = ageH < 6 ? 1.0 : ageH < 24 ? 0.8 : ageH < 72 ? 0.5 : 0.25;
        const followBoost = followingSet.has(p.user_id) ? 1.5 : 1.0;
        const verifiedBoost = p.profiles?.is_verified ? 1.15 : 1.0;

        const eng = (p.like_count || 0) + (p.comment_count || 0) * 2 + (p.repost_count || 0) * 3;
        // New posts with no engagement yet get a small floor score so they can surface
        const baseEng = eng === 0 && ageH < 2 ? 1 : eng;

        // Boost posts whose hashtags overlap with user's recent interests
        let affinityBoost = 1.0;
        if (hasAffinity && p.content) {
          const postTags = extractHashtags(p.content);
          const matchWeight = postTags.reduce((sum: number, tag: string) => sum + (hashtagFreq[tag] || 0), 0);
          if (matchWeight > 0) {
            // Soft cap: max 1.5× boost so affinity doesn't completely override quality
            affinityBoost = 1 + Math.min(matchWeight * 0.1, 0.5);
          }
        }

        return {
          ...p,
          _score: baseEng * recency * followBoost * verifiedBoost * affinityBoost,
        };
      })
      .sort((a: any, b: any) => b._score - a._score);

    // Author diversity: cap 3 posts per author across the full ranked list
    const authorCount: Record<string, number> = {};
    const diverse: any[] = [];
    for (const p of scored) {
      const n = authorCount[p.user_id] || 0;
      if (n < 3) {
        diverse.push(p);
        authorCount[p.user_id] = n + 1;
      }
    }

    // Paginate
    const page = diverse.slice(offset, offset + limit);

    // Never-empty fallback: fill remaining slots from recent public posts
    if (page.length < limit) {
      const needed = limit - page.length;
      const shownIds = new Set([...diverse.map((p: any) => p.id)]);

      let fallbackQuery = supabaseServiceClient
        .from('posts')
        .select(POST_SELECT)
        .eq('visibility', 'public')
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(needed + 30); // overfetch then trim — includes own posts so feed is never empty

      const safeExclude = [...excludeSet].filter(Boolean);
      if (safeExclude.length > 0) {
        fallbackQuery = fallbackQuery.not('user_id', 'in', `(${safeExclude.join(',')})`);
      }

      const { data: fallback } = await fallbackQuery;
      const extra = (fallback || [])
        .filter((p: any) => !shownIds.has(p.id))
        .slice(0, needed);

      page.push(...extra);
    }

    return {
      data: await enrichWithUserState(page, userId),
      nextCursor: offset + limit < diverse.length ? String(offset + limit) : null,
    };
  }
}

export default new FeedService();
