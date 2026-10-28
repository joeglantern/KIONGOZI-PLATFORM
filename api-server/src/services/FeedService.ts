import { supabaseServiceClient } from '../config/supabase';

const POST_SELECT = `
  id, content, visibility, like_count, comment_count, repost_count, view_count,
  is_bot_reply, created_at, updated_at,
  user_id, parent_post_id, repost_of_id,
  profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
  post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder),
  repost_of:repost_of_id (
    id, content, visibility, like_count, comment_count, repost_count, view_count,
    is_bot_reply, created_at, updated_at, user_id,
    profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
    post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder)
  )
`;

/** The post a row is "about": the original for a repost, itself otherwise. */
const subjectId = (p: any) => p.repost_of_id || p.id;

/**
 * One card per post (X / Instagram): a post and its reposts collapse to a single item.
 * Rows must be newest first; the newest row for each post wins (so a fresh repost by
 * someone you follow brings the post back once, with "X reposted" on it).
 */
export function collapseReposts(rows: any[], seen = new Set<string>()): any[] {
  const out: any[] = [];
  for (const p of rows) {
    if (p.repost_of_id && !p.repost_of) continue; // original deleted
    const k = subjectId(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/**
 * Batch-enrich posts with isLiked + isBookmarked + isReposted + recentReposters for the given user.
 */
async function enrichWithUserState(posts: any[], userId?: string): Promise<any[]> {
  if (!userId || !posts.length) return posts;

  // Include the originals inside repost cards: the app shows (and likes/bookmarks) those.
  const postIds = [...new Set(posts.flatMap((p: any) => (p.repost_of?.id ? [p.id, p.repost_of.id] : [p.id])))];

  const [{ data: likes }, { data: bookmarks }, { data: mine }, { data: reposts }] = await Promise.all([
    supabaseServiceClient.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabaseServiceClient.from('bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds),
    // The user's own reposts, queried separately so popular posts can't push them out of the limit below
    supabaseServiceClient.from('posts').select('repost_of_id').eq('user_id', userId).in('repost_of_id', postIds),
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
  const repostedSet = new Set((mine || []).map((r: any) => r.repost_of_id));
  const repostersMap: Record<string, any[]> = {};

  for (const r of (reposts || []) as any[]) {
    if (!repostersMap[r.repost_of_id]) repostersMap[r.repost_of_id] = [];
    if (repostersMap[r.repost_of_id].length < 3) repostersMap[r.repost_of_id].push(r.profiles);
  }

  const withState = (p: any) => ({
    ...p,
    isLiked: likedSet.has(p.id),
    isBookmarked: bookmarkedSet.has(p.id),
    isReposted: repostedSet.has(p.id),
    recentReposters: repostersMap[p.id] || [],
  });

  return posts.map((p: any) => {
    const out = withState(p);
    if (p.repost_of?.id) out.repost_of = withState(p.repost_of);
    return out;
  });
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
      .limit(limit * 2); // reposts of the same post collapse below, so fetch a little extra

    if (excludeIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludeIds.join(',')})`);
    }
    if (cursor) query = query.lt('created_at', cursor);

    const { data: rows, error } = await query;
    if (error) throw error;

    // Each post once per page; the cursor is the last row we actually used so nothing is skipped
    const all = rows || [];
    const keep: any[] = [];
    const seen = new Set<string>();
    let lastUsed: string | null = null;
    for (const p of all) {
      if (keep.length >= limit) break;
      lastUsed = p.created_at;
      if (p.repost_of_id && !p.repost_of) continue;
      const k = subjectId(p);
      if (seen.has(k)) continue;
      seen.add(k);
      keep.push(p);
    }
    const nextCursor = all.length >= limit ? lastUsed : null;
    return { data: await enrichWithUserState(keep, userId), nextCursor };
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

    const scored = collapseReposts(posts || [])
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
   *   score = (engagement + 1) × recency × follow_boost × verified_boost × hashtag_affinity_boost
   *
   * Signals used:
   *   - Engagement: likes + comments×2 + reposts×3
   *   - Recency: 1 / (hours + 2)^1.5 (Hacker News gravity)
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
        .order('created_at', { ascending: false })
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

    // Reposts are signals, not extra cards (X / Instagram): group every row by the post it's about.
    // A repost by someone you follow adds social proof and can bring an older post back (once).
    type Cand = { post: any; via: any | null; seenAt: number };
    const byPost = new Map<string, Cand>();
    for (const row of (pool || []) as any[]) {
      if (row.repost_of_id && !row.repost_of) continue;
      const original = row.repost_of_id ? { ...row.repost_of, repost_of_id: null } : row;
      if (!original || excludeSet.has(original.user_id) || excludeSet.has(row.user_id)) continue;
      if (original.user_id === userId || original.visibility !== 'public') continue;
      const k = original.id;
      const c = byPost.get(k) || { post: original, via: null, seenAt: new Date(original.created_at).getTime() };
      if (row.repost_of_id && followingSet.has(row.user_id)) {
        const t = new Date(row.created_at).getTime();
        if (!c.via || t > new Date(c.via.created_at).getTime()) c.via = row;
        c.seenAt = Math.max(c.seenAt, t);
      }
      byPost.set(k, c);
    }

    // Posts you've already liked or reposted sink (you've seen them); your own reposts never show
    const candIds = [...byPost.keys()];
    const liked = new Set<string>();
    const reposted = new Set<string>();
    // Chunked so the id lists stay well under URL limits
    for (let i = 0; i < candIds.length; i += 120) {
      const ids = candIds.slice(i, i + 120);
      const [{ data: l }, { data: r }] = await Promise.all([
        supabaseServiceClient.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', ids),
        supabaseServiceClient.from('posts').select('repost_of_id').eq('user_id', userId).in('repost_of_id', ids),
      ]);
      (l || []).forEach((x: any) => liked.add(x.post_id));
      (r || []).forEach((x: any) => reposted.add(x.repost_of_id));
    }

    // Score every candidate
    const scored = [...byPost.values()]
      .filter(c => !reposted.has(c.post.id))
      .map(({ post: p, via, seenAt }) => {
        // Recency from the newest moment it reached you (posted, or reposted by someone you follow)
        const ageH = (now - seenAt) / 3600000;
        // Hacker News gravity: smooth decay instead of steps, so fresh posts climb and old ones fade gradually
        const recency = 1 / Math.pow(ageH + 2, 1.5);
        const followBoost = followingSet.has(p.user_id) ? 1.5 : 1.0;
        const verifiedBoost = p.profiles?.is_verified ? 1.15 : 1.0;

        const eng = (p.like_count || 0) + (p.comment_count || 0) * 2 + (p.repost_count || 0) * 3;
        // +1 so brand-new posts with no engagement yet can still surface
        const baseEng = eng + 1;

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

        const socialProof = via ? 1.3 : 1.0;
        const seenPenalty = liked.has(p.id) ? 0.35 : 1.0;
        // Card: the original, or the friend's repost row so it reads "Amina reposted"
        const card = via || p;
        return {
          ...card,
          user_id: card.user_id,
          _author: p.user_id,
          _score: baseEng * recency * followBoost * verifiedBoost * affinityBoost * socialProof * seenPenalty,
        };
      })
      .sort((a: any, b: any) => b._score - a._score);

    // Author diversity: cap 3 posts per author across the full ranked list
    const authorCount: Record<string, number> = {};
    const diverse: any[] = [];
    for (const p of scored) {
      const n = authorCount[p._author] || 0;
      if (n < 3) {
        diverse.push(p);
        authorCount[p._author] = n + 1;
      }
    }

    // Paginate
    const page = diverse.slice(offset, offset + limit);

    // Never-empty fallback: fill remaining slots from recent public posts
    if (page.length < limit) {
      const needed = limit - page.length;
      const shownIds = new Set([...diverse.map((p: any) => subjectId(p))]);

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
      const extra = collapseReposts((fallback || []).filter((p: any) => !p.repost_of_id), shownIds)
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
