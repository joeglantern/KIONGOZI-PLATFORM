import { Router, Request, Response } from 'express';
import { mediaAlt, postEdited, hasPostEditedAt } from '../config/mediaColumns';
import { describePostImages } from './assist';
import { optimizePostMedia } from '../services/ImageOptimizer';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import MentionService from '../services/MentionService';
import FeedService, { enrichWithUserState, getPrivateUserIds } from '../services/FeedService';
import NotificationService from '../services/NotificationService';
import { Milestones } from '../services/MilestoneService';
import OpenAI from 'openai';
import ModerationService from '../services/ModerationService';
import UploadService from '../services/UploadService';
import { renderPostShareCard } from '../services/ShareCards2';
import { parsePoll, createPoll, attachPolls, vote as votePoll } from '../services/PollService';

/**
 * Returns true if the viewer can access posts from the given author.
 * Private accounts are only visible to followers (and the account owner).
 */
async function canViewProfile(authorId: string, viewerId?: string): Promise<boolean> {
  if (viewerId === authorId) return true;

  const { data: profile } = await supabaseServiceClient
    .from('profiles')
    .select('is_private')
    .eq('id', authorId)
    .single();

  if (!profile?.is_private) return true;
  if (!viewerId) return false;

  const { data: follow } = await supabaseServiceClient
    .from('follows')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', authorId)
    .maybeSingle();

  return !!follow;
}

const router = Router();

// GET /api/v1/social/feed — Personal fan-in feed
router.get('/feed', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const result = await FeedService.getPersonalizedFeed(userId, limit, cursor);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
});

// GET /api/v1/social/explore — Public explore feed
router.get('/explore', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const result = await FeedService.getExploreFeed(limit, cursor, req.user?.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch explore feed' });
  }
});

// GET /api/v1/social/clips — Mzinga: ranked public video posts
// ?exclude=<id prefixes already loaded, comma separated> (older builds page with ?cursor=offset)
router.get('/clips', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 24, 60);
    const offset = Math.max(parseInt(req.query.cursor as string) || 0, 0);
    const served = String(req.query.exclude || '').split(',').filter(x => /^[0-9a-f]{8}$/i.test(x)).slice(0, 500).map(x => x.toLowerCase());
    const raw = String(req.query.street || 'foryou').toLowerCase();
    const street = /^(foryou|fresh|following|tag:[a-z0-9_]{1,50})$/.test(raw) ? raw : 'foryou';
    const result = await FeedService.getClipsFeed(limit, served.length ? 0 : offset, req.user?.id, served, street);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Clips error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch clips' });
  }
});

// GET /api/v1/social/clips/streets — Mitaa: clips grouped into streets (topics)
router.get('/clips/streets', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await FeedService.getClipStreets(req.user?.id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Clip streets error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch streets' });
  }
});

// GET /api/v1/social/posts/:id — Single post + thread
router.get('/posts/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified, is_private),
        post_media (*),
        repost_of:repost_of_id (
          id, content, visibility, like_count, comment_count, repost_count, view_count,
          is_bot_reply, created_at, updated_at, user_id,
          profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder${mediaAlt()})
        )
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }

    // Enforce private account visibility
    if (!(await canViewProfile(post.user_id, req.user?.id))) {
      res.status(403).json({ success: false, error: 'This account is private' });
      return;
    }

    // Strip is_private from the profiles object before returning
    if (post.profiles) delete post.profiles.is_private;

    const [enriched] = await enrichWithUserState([post], req.user?.id);
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// GET /api/v1/social/posts/:id/ancestors — Fetch full ancestor chain for thread view
router.get('/posts/:id/ancestors', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: start } = await supabaseServiceClient
      .from('posts').select('parent_post_id').eq('id', req.params.id).single();
    if (!start?.parent_post_id) {
      res.json({ success: true, data: [] }); return;
    }
    const chain: any[] = [];
    let currentId: string | null = start.parent_post_id;
    for (let depth = 0; depth < 10 && currentId; depth++) {
      const { data: post } = await supabaseServiceClient
        .from('posts')
        .select('*, profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified), post_media(*)')
        .eq('id', currentId).single();
      if (!post) break;
      const ok = await canViewProfile(post.profiles?.id ?? post.user_id, req.user?.id);
      if (!ok) break;
      chain.unshift(post); // oldest first
      currentId = post.parent_post_id ?? null;
    }
    await attachPolls(chain, req.user?.id);
    res.json({ success: true, data: chain });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch thread context' });
  }
});

// POST /api/v1/social/posts — Create post
router.post('/posts', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { content, visibility = 'public', media, parent_post_id, repost_of_id } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }
    if (content.length > 280) {
      res.status(400).json({ success: false, error: 'Content exceeds 280 characters' });
      return;
    }

    // Poll (like X): the text is the question, 2 to 4 choices, no media
    let poll: { options: string[]; hours: number } | null = null;
    if (req.body.poll) {
      if (Array.isArray(media) && media.length > 0) {
        res.status(400).json({ success: false, error: 'A poll post cannot have photos or videos' });
        return;
      }
      const parsed = parsePoll(req.body.poll);
      if ('error' in parsed) {
        res.status(400).json({ success: false, error: parsed.error });
        return;
      }
      poll = parsed;
    }

    const imageUrls = Array.isArray(media) ? media.filter((m: any) => m?.media_type === 'image').map((m: any) => m.url) : [];
    const textToCheck = poll ? `${content}\n${poll.options.join('\n')}` : content;
    const [moderation, imageCheck] = await Promise.all([ModerationService.checkText(textToCheck), ModerationService.checkImages(imageUrls)]);
    if (moderation.flagged || imageCheck.flagged) {
      res.status(422).json({ success: false, error: moderation.reason || imageCheck.reason });
      return;
    }

    const { data: post, error } = await supabaseServiceClient
      .from('posts')
      .insert({
        user_id: userId,
        content,
        visibility,
        parent_post_id: parent_post_id || null,
        repost_of_id: repost_of_id || null
      })
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified)
      `)
      .single();

    if (error || !post) {
      res.status(500).json({ success: false, error: 'Failed to create post' });
      return;
    }

    // Save media attachments if provided, and include them in the response
    let postMedia: any[] = [];
    if (media && Array.isArray(media) && media.length > 0) {
      const mediaRows = media.map((m: any, idx: number) => ({
        post_id: post.id,
        media_type: m.media_type,
        url: m.url,
        storage_path: m.storage_path,
        width: m.width,
        height: m.height,
        duration_seconds: m.duration_seconds,
        thumbnail_url: m.thumbnail_url,
        order_index: idx
      }));
      const { data: insertedMedia } = await supabaseServiceClient
        .from('post_media')
        .insert(mediaRows)
        .select();
      postMedia = insertedMedia || [];
      // Shrink photos to WebP + blurred placeholder (background; rows update in place)
      setImmediate(() => { optimizePostMedia(post.id).catch(() => {}); describePostImages(post.id); });
    }

    const completePost: any = { ...post, post_media: postMedia };

    if (poll) {
      const made = await createPoll(post.id, poll.options, poll.hours);
      if (!made.ok) {
        // Polls table not there yet (or failed): don't leave a question without choices
        await supabaseServiceClient.from('posts').delete().eq('id', post.id);
        res.status(503).json({ success: false, error: 'Polls are not available right now. Try again later.' });
        return;
      }
      completePost.poll = made.poll;
    }

    // Process mentions + hashtags (non-blocking)
    setImmediate(async () => {
      try {
        await MentionService.processMentions(post.id, content, userId);
        await MentionService.processHashtags(post.id, content);
        if (!parent_post_id) Milestones.posted(userId, post.id);
      } catch (e) {
        console.error('Post post-processing error:', e);
      }
    });

    // Emit to followers via Socket.IO
    const io = (req as any).io;
    if (io) {
      io.emit('feed:post_new', { post: completePost });
    }

    res.status(201).json({ success: true, data: completePost });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// PATCH /api/v1/social/posts/:id — Edit post (content + visibility)
// The text can be changed for 1 hour after posting (like X); who can see it can be changed any time.
// A text change keeps the old version in post_edits and stamps posts.edited_at (both once the
// post_edits migration has run; before that the edit still saves, just without history).
const EDIT_WINDOW_MS = 60 * 60 * 1000;
router.patch('/posts/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content, visibility } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }

    const { data: current } = await supabaseServiceClient
      .from('posts')
      .select('id, user_id, content, created_at')
      .eq('id', id)
      .maybeSingle();
    if (!current || current.user_id !== userId) {
      res.status(404).json({ success: false, error: 'Post not found or not authorized' });
      return;
    }

    const text = content.trim();
    const textChanged = text !== (current.content ?? '').trim();
    const now = new Date();
    if (textChanged && now.getTime() - new Date(current.created_at).getTime() > EDIT_WINDOW_MS) {
      res.status(403).json({ success: false, error: 'Posts can be edited for 1 hour after posting.', code: 'EDIT_WINDOW_CLOSED' });
      return;
    }

    const updates: Record<string, any> = {
      content: text,
      updated_at: now.toISOString(),
    };
    if (visibility === 'public' || visibility === 'followers') {
      updates.visibility = visibility;
    }
    if (textChanged && hasPostEditedAt()) updates.edited_at = now.toISOString();

    const { data, error } = await supabaseServiceClient
      .from('posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`id, content, visibility, updated_at${postEdited()}` as '*')
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: 'Post not found or not authorized' });
      return;
    }

    if (textChanged) {
      // Keep the version that was just replaced; no table yet (migration not run) is fine
      const { error: histErr } = await supabaseServiceClient
        .from('post_edits')
        .insert({ post_id: id, content: current.content ?? '', edited_at: now.toISOString() });
      if (histErr && histErr.code !== '42P01' && histErr.code !== 'PGRST205') console.error('Post edit history error:', histErr.message);
    }

    res.json({ success: true, data: { ...data, edited_at: (data as any).edited_at ?? (textChanged ? now.toISOString() : null) } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// GET /api/v1/social/posts/:id/edits — Edit history, newest first: the current text, then each
// earlier version with the time it was written. Anyone who can see the post can read it.
router.get('/posts/:id/edits', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const viewerId = req.user?.id;
    const { data: post } = await supabaseServiceClient
      .from('posts')
      .select(`id, user_id, content, visibility, created_at${postEdited()}` as '*')
      .eq('id', id)
      .maybeSingle();
    if (!post) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    if (!(await canViewProfile(post.user_id, viewerId))) {
      res.status(403).json({ success: false, error: 'This account is private' });
      return;
    }

    const { data: rows, error } = await supabaseServiceClient
      .from('post_edits')
      .select('content, edited_at')
      .eq('post_id', id)
      .order('edited_at', { ascending: true })
      .limit(50);
    const edits = error ? [] : (rows || []);

    // Version i was written when the one before it was replaced (the first one when the post went up)
    const versions = edits.map((e: any, i: number) => ({
      content: e.content,
      written_at: i === 0 ? post.created_at : edits[i - 1].edited_at,
      original: i === 0,
    }));
    const lastEdit = edits.length ? edits[edits.length - 1].edited_at : null;
    const current = {
      content: post.content,
      written_at: (post as any).edited_at || lastEdit || post.created_at,
      original: edits.length === 0,
    };

    res.json({ success: true, data: { versions: [current, ...versions.reverse()], edited_at: (post as any).edited_at || lastEdit } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load edit history' });
  }
});

// DELETE /api/v1/social/posts/:id
router.delete('/posts/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { error } = await supabaseServiceClient
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(404).json({ success: false, error: 'Post not found or unauthorized' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// POST /api/v1/social/posts/:id/poll/vote — { option } one vote per person, final (like X)
router.post('/posts/:id/poll/vote', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const userId = req.user!.id;
    const option = Number(req.body?.option);

    const { data: post } = await supabaseServiceClient
      .from('posts').select('id, user_id').eq('id', postId).maybeSingle();
    if (!post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }
    if (post.user_id === userId) {
      res.status(403).json({ success: false, error: 'You cannot vote in your own poll' });
      return;
    }
    if (!(await canViewProfile(post.user_id, userId))) {
      res.status(403).json({ success: false, error: 'This account is private' });
      return;
    }

    const result = await votePoll(postId, userId, option);
    switch (result.status) {
      case 'ok':
      case 'already':
        res.json({ success: true, data: result.poll, already: result.status === 'already' });
        return;
      case 'ended':
        res.status(409).json({ success: false, error: 'This poll has ended' });
        return;
      case 'bad_option':
        res.status(400).json({ success: false, error: 'Pick one of the choices' });
        return;
      case 'missing':
        res.status(404).json({ success: false, error: 'Poll not found' });
        return;
      default:
        res.status(503).json({ success: false, error: 'Polls are not available right now' });
    }
  } catch (err) {
    console.error('Poll vote error:', err);
    res.status(500).json({ success: false, error: 'Failed to vote' });
  }
});

// POST /api/v1/social/posts/:id/like — Like/unlike toggle
router.post('/posts/:id/like', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const userId = req.user!.id;

    // Check if already liked
    const { data: existing } = await supabaseServiceClient
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    let liked: boolean;
    if (existing) {
      await supabaseServiceClient.from('post_likes').delete().eq('id', existing.id);
      liked = false;
    } else {
      await supabaseServiceClient.from('post_likes').insert({ post_id: postId, user_id: userId });
      liked = true;
      Milestones.postLiked(postId);

      // Notify post owner
      const io = (req as any).io;
      const { data: post } = await supabaseServiceClient
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      if (post?.user_id && post.user_id !== userId) {
        if (io) {
          io.to(`user:${post.user_id}`).emit('post:liked', { postId, likedBy: userId });
        }
        setImmediate(async () => {
          try {
            const { data: liker } = await supabaseServiceClient
              .from('profiles')
              .select('full_name, username, avatar_url')
              .eq('id', userId)
              .single();
            await NotificationService.notify({
              userId: post.user_id,
              type: 'like',
              title: 'New like',
              message: `${liker?.full_name || 'Someone'} liked your post`,
              data: { post_id: postId, from_user_id: userId, from_username: liker?.username, from_avatar_url: liker?.avatar_url },
              io,
            });
          } catch (e) {
            console.error('Like notification error:', e);
          }
        });
      }
    }

    // Get updated like count
    const { data: postData } = await supabaseServiceClient
      .from('posts')
      .select('like_count')
      .eq('id', postId)
      .single();

    res.json({ success: true, liked, like_count: postData?.like_count ?? 0 });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// POST /api/v1/social/posts/:id/view — count a view (the app calls this after 2s of video playback)
// Deduped per viewer (user id, or IP when signed out) for 6 hours, in memory.
const recentViews = new Map<string, number>();
router.post('/posts/:id/view', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const viewer = req.user?.id ?? req.ip ?? 'anon';
    const key = `${id}:${viewer}`;
    const now = Date.now();
    if ((recentViews.get(key) ?? 0) > now - 6 * 3600e3) { res.json({ success: true, counted: false }); return; }
    recentViews.set(key, now);
    if (recentViews.size > 50000) {
      for (const [k, t] of recentViews) if (t < now - 6 * 3600e3) recentViews.delete(k);
    }
    const { data: post } = await supabaseServiceClient.from('posts').select('view_count, user_id').eq('id', id).maybeSingle();
    if (!post) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    await supabaseServiceClient.from('posts').update({ view_count: (post.view_count ?? 0) + 1 }).eq('id', id);
    // Insights: views per day (no-op until the hooks migration); milestones: 100 / 1K / 10K views
    supabaseServiceClient.rpc('bump_post_stat', { p_post: id, p_kind: 'view' }).then(() => {}, () => {});
    if (post.user_id && post.user_id !== req.user?.id) Milestones.postViewed(id, post.user_id, (post.view_count ?? 0) + 1);
    res.json({ success: true, counted: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to record view' });
  }
});

// POST /api/v1/social/posts/:id/repost
router.post('/posts/:id/repost', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: repostOfId } = req.params;
    const userId = req.user!.id;
    const { content = '' } = req.body;

    // Duplicate guard
    const { data: existing } = await supabaseServiceClient
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('repost_of_id', repostOfId)
      .maybeSingle();
    if (existing) {
      res.status(409).json({ success: false, error: 'Already reposted' });
      return;
    }

    const { data: post, error } = await supabaseServiceClient
      .from('posts')
      .insert({
        user_id: userId,
        content,
        repost_of_id: repostOfId,
        visibility: 'public'
      })
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
        post_media (*),
        repost_of:repost_of_id (
          id, content, visibility, like_count, comment_count, repost_count, view_count,
          is_bot_reply, created_at, updated_at, user_id,
          profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder${mediaAlt()})
        )
      `)
      .single();

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to repost' });
      return;
    }

    // Fetch original post owner
    const { data: original } = await supabaseServiceClient
      .from('posts')
      .select('user_id')
      .eq('id', repostOfId)
      .single();

    const io = (req as any).io;

    // Broadcast to feed
    if (io) {
      io.emit('feed:post_new', { post });
    }

    // Notify original post owner
    if (original?.user_id && original.user_id !== userId) {
      if (io) {
        io.to(`user:${original.user_id}`).emit('post:reposted', { postId: repostOfId, repostedBy: userId });
      }
      setImmediate(async () => {
        try {
          const { data: reposter } = await supabaseServiceClient
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', userId)
            .single();
          // A repost with words is a quote: its own notification with what they said, opening the quote
          const quoteText = String(content || '').trim();
          if (quoteText) {
            await NotificationService.notify({
              userId: original.user_id,
              type: 'quote',
              fallbackType: 'repost',
              title: 'New quote',
              message: `${reposter?.full_name || 'Someone'} quoted your post`,
              data: { post_id: post.id, quoted_post_id: repostOfId, quote_text: quoteText.slice(0, 200), from_user_id: userId, from_username: reposter?.username, from_avatar_url: reposter?.avatar_url },
              io,
            });
            return;
          }
          await NotificationService.notify({
            userId: original.user_id,
            type: 'repost',
            title: 'New repost',
            message: `${reposter?.full_name || 'Someone'} reposted your post`,
            data: { post_id: repostOfId, from_user_id: userId, from_username: reposter?.username, from_avatar_url: reposter?.avatar_url },
            io,
          });
        } catch (e) {
          console.error('Repost notification error:', e);
        }
      });
    }

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to repost' });
  }
});

// DELETE /api/v1/social/posts/:id/repost — undo a repost
router.delete('/posts/:id/repost', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: repostOfId } = req.params;
    const userId = req.user!.id;

    const { data: repost } = await supabaseServiceClient
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('repost_of_id', repostOfId)
      .maybeSingle();

    if (!repost) {
      res.status(404).json({ success: false, error: 'Repost not found' });
      return;
    }

    const { error } = await supabaseServiceClient
      .from('posts')
      .delete()
      .eq('id', repost.id)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to remove repost' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to remove repost' });
  }
});

// POST /api/v1/social/posts/:id/reply
router.post('/posts/:id/reply', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: parentPostId } = req.params;
    const userId = req.user!.id;
    const { content, media } = req.body;

    if (!content || content.length > 280) {
      res.status(400).json({ success: false, error: 'Content required and must be ≤280 chars' });
      return;
    }

    // Replies get the same checks as posts
    const replyImages = Array.isArray(media) ? media.filter((m: any) => m?.media_type === 'image').map((m: any) => m.url) : [];
    const [replyText, replyImgs] = await Promise.all([ModerationService.checkText(content), ModerationService.checkImages(replyImages)]);
    if (replyText.flagged || replyImgs.flagged) {
      res.status(422).json({ success: false, error: replyText.reason || replyImgs.reason });
      return;
    }

    const { data: post, error } = await supabaseServiceClient
      .from('posts')
      .insert({
        user_id: userId,
        content,
        parent_post_id: parentPostId,
        visibility: 'public'
      })
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified)
      `)
      .single();

    if (error || !post) {
      res.status(500).json({ success: false, error: 'Failed to create reply' });
      return;
    }

    if (media && Array.isArray(media) && media.length > 0) {
      const mediaRows = media.map((m: any, idx: number) => ({
        post_id: post.id,
        media_type: m.media_type,
        url: m.url,
        storage_path: m.storage_path,
        width: m.width,
        height: m.height,
        duration_seconds: m.duration_seconds,
        thumbnail_url: m.thumbnail_url,
        order_index: idx
      }));
      await supabaseServiceClient.from('post_media').insert(mediaRows);
      setImmediate(() => { optimizePostMedia(post.id).catch(() => {}); describePostImages(post.id); });
    }

    // Process mentions
    setImmediate(async () => {
      try {
        await MentionService.processMentions(post.id, content, userId);
        await MentionService.processHashtags(post.id, content);
      } catch (e) {
        console.error('Reply post-processing error:', e);
      }
    });

    // Notify parent post owner (and root post owner if this is a nested reply)
    const io = (req as any).io;
    const { data: parent } = await supabaseServiceClient
      .from('posts')
      .select('user_id, parent_post_id')
      .eq('id', parentPostId)
      .single();

    setImmediate(async () => {
      try {
        const { data: replier } = await supabaseServiceClient
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', userId)
          .single();

        const notifiedUsers = new Set<string>();

        // Always notify the direct parent's author
        if (parent?.user_id && parent.user_id !== userId) {
          notifiedUsers.add(parent.user_id);
          if (io) io.to(`user:${parent.user_id}`).emit('post:commented', { postId: parentPostId, replyId: post.id, replyBy: userId });
          await NotificationService.notify({
            userId: parent.user_id,
            type: 'comment',
            title: 'New reply',
            message: `${replier?.full_name || 'Someone'} replied to your post`,
            data: { post_id: parentPostId, reply_id: post.id, reply_text: String(content || '').slice(0, 200), from_user_id: userId, from_username: replier?.username, from_avatar_url: replier?.avatar_url },
            io,
          });
        }

        // If this is a nested reply, also notify the root post author (if different)
        if (parent?.parent_post_id) {
          const { data: root } = await supabaseServiceClient
            .from('posts')
            .select('user_id')
            .eq('id', parent.parent_post_id)
            .single();
          if (root?.user_id && root.user_id !== userId && !notifiedUsers.has(root.user_id)) {
            await NotificationService.notify({
              userId: root.user_id,
              type: 'comment',
              title: 'New reply',
              message: `${replier?.full_name || 'Someone'} replied in your thread`,
              data: { post_id: parent.parent_post_id, reply_id: post.id, reply_text: String(content || '').slice(0, 200), from_user_id: userId, from_username: replier?.username, from_avatar_url: replier?.avatar_url },
              io,
            });
          }
        }
      } catch (e) {
        console.error('Reply notification error:', e);
      }
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    console.error('Reply error:', err);
    res.status(500).json({ success: false, error: 'Failed to create reply' });
  }
});

// GET /api/v1/social/posts/:id/replies
router.get('/posts/:id/replies', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    // Enforce private account: check the parent post's author before returning replies
    const { data: parentPost } = await supabaseServiceClient
      .from('posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (parentPost && !(await canViewProfile(parentPost.user_id, req.user?.id))) {
      res.status(403).json({ success: false, error: 'This account is private' });
      return;
    }

    let query = supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
        post_media (*)
      `)
      .eq('parent_post_id', id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (cursor) {
      query = query.gt('created_at', cursor);
    }

    const { data: replies, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch replies' });
      return;
    }

    const nextCursor = replies && replies.length === limit
      ? replies[replies.length - 1].created_at
      : null;

    const enriched = await enrichWithUserState(replies || [], req.user?.id);
    res.json({ success: true, data: enriched, nextCursor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch replies' });
  }
});

// GET /api/v1/social/trending
router.get('/trending', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const privateUserIds = await getPrivateUserIds();
    const HASHTAG_RE = /#([a-zA-Z0-9_]+)/g;

    // ── Trending hashtags: count usage in recent posts (last 30 days) ──────
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let recentPostsQuery = supabaseServiceClient
      .from('posts')
      .select('content')
      .eq('visibility', 'public')
      .gte('created_at', cutoff30d)
      .limit(300);

    if (privateUserIds.length > 0) {
      recentPostsQuery = recentPostsQuery.not('user_id', 'in', `(${privateUserIds.join(',')})`);
    }

    const { data: recentPosts } = await recentPostsQuery;

    const tagCounts: Record<string, number> = {};
    for (const p of recentPosts || []) {
      const matches = [...(p.content || '').matchAll(HASHTAG_RE)];
      for (const m of matches) {
        const tag = m[1].toLowerCase();
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    let hashtags: { id: string; tag: string; use_count: number }[] = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ id: tag, tag, use_count: count }));

    // Fall back to all-time use_count when there's little recent activity
    if (hashtags.length < 3) {
      const { data: fallbackTags } = await supabaseServiceClient
        .from('hashtags')
        .select('id, tag, use_count')
        .gt('use_count', 0)
        .order('use_count', { ascending: false })
        .limit(10);
      if ((fallbackTags?.length ?? 0) > hashtags.length) {
        hashtags = (fallbackTags || []) as typeof hashtags;
      }
    }

    // ── Trending posts: top liked in last 48 hours ──────────────────────────
    let postsQuery = supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified)
      `)
      .eq('visibility', 'public')
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('like_count', { ascending: false })
      .limit(10);

    if (privateUserIds.length > 0) {
      postsQuery = postsQuery.not('user_id', 'in', `(${privateUserIds.join(',')})`);
    }

    const { data: posts, error: pErr } = await postsQuery;

    if (pErr) {
      res.status(500).json({ success: false, error: 'Failed to fetch trending' });
      return;
    }

    const enrichedPosts = await enrichWithUserState(posts || [], req.user?.id);
    res.json({ success: true, data: { hashtags, posts: enrichedPosts } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch trending' });
  }
});

// GET /api/v1/social/search
router.get('/search', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      res.status(400).json({ success: false, error: 'Search query required' });
      return;
    }

    // Fetch IDs of users who have blocked the current viewer + private users (to exclude from post results)
    const [blockedByRows, privateUserIds] = await Promise.all([
      req.user
        ? supabaseServiceClient.from('blocks').select('blocker_id').eq('blocked_id', req.user.id)
        : Promise.resolve({ data: [] }),
      getPrivateUserIds(),
    ]);

    const blockedByIds = ((blockedByRows as any).data || []).map((r: any) => r.blocker_id);
    const postExcludeIds = [...new Set([...blockedByIds, ...privateUserIds])];

    let postsQuery = supabaseServiceClient
      .from('posts')
      .select(`*, profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified)`)
      .eq('visibility', 'public')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    let usersQuery = supabaseServiceClient
      .from('profiles')
      .select('id, full_name, username, avatar_url, bio, is_verified, is_bot, follower_count')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(10);

    if (postExcludeIds.length > 0) {
      postsQuery = postsQuery.not('user_id', 'in', `(${postExcludeIds.join(',')})`);
    }
    if (blockedByIds.length > 0) {
      usersQuery = usersQuery.not('id', 'in', `(${blockedByIds.join(',')})`);
    }

    const [{ data: posts }, { data: users }] = await Promise.all([postsQuery, usersQuery]);

    const enrichedPosts = await enrichWithUserState(posts || [], req.user?.id);
    res.json({ success: true, data: { posts: enrichedPosts, users: users || [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /api/v1/social/for-you — Score-based "For You" feed
router.get('/for-you', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await FeedService.getForYouFeed(req.user!.id, limit, offset);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('For You feed error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch For You feed' });
  }
});

// POST /api/v1/social/posts/:id/bookmark — Toggle bookmark
router.post('/posts/:id/bookmark', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const userId = req.user!.id;

    const { data: existing } = await supabaseServiceClient
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabaseServiceClient.from('bookmarks').delete().eq('id', existing.id);
      res.json({ success: true, bookmarked: false });
    } else {
      await supabaseServiceClient.from('bookmarks').insert({ post_id: postId, user_id: userId });
      res.json({ success: true, bookmarked: true });
    }
  } catch (err) {
    console.error('Bookmark error:', err);
    res.status(500).json({ success: false, error: 'Failed to toggle bookmark' });
  }
});

// GET /api/v1/social/bookmarks — Get bookmarked posts
router.get('/bookmarks', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    let query = supabaseServiceClient
      .from('bookmarks')
      .select(`
        id, created_at,
        post:post_id (
          id, content, visibility, like_count, comment_count, repost_count,
          view_count, is_bot_reply, created_at, updated_at,
          user_id, parent_post_id, repost_of_id,
          profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder${mediaAlt()})
        )
      `)
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rawPosts = (data || []).map((b: any) => b.post).filter(Boolean);
    // All are bookmarked; still enrich for isLiked + confirm isBookmarked=true
    const posts = await enrichWithUserState(rawPosts, req.user!.id);
    const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null;

    res.json({ success: true, data: posts, nextCursor });
  } catch (err) {
    console.error('Bookmarks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
  }
});

// POST /api/v1/social/posts/:id/view — Record post view / interaction for For You feed scoring
router.post('/posts/:id/view', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const userId = req.user!.id;
    const { event_type = 'view', duration_ms } = req.body;

    const allowed = ['view', 'like', 'repost', 'reply', 'profile_click', 'share', 'bookmark', 'scroll_past'];
    if (!allowed.includes(event_type)) {
      res.status(400).json({ success: false, error: 'Invalid event_type' });
      return;
    }

    // Upsert so rapid duplicate views don't bloat the table
    await supabaseServiceClient
      .from('post_interactions')
      .upsert(
        {
          post_id: postId,
          user_id: userId,
          event_type,
          duration_ms: duration_ms ?? null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'post_id,user_id,event_type' }
      );

    res.json({ success: true });
  } catch (err) {
    // Non-critical — don't let tracking failures affect the client
    console.error('Post view tracking error:', err);
    res.json({ success: true });
  }
});

// POST /api/v1/social/translate
router.post('/translate', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, targetLang = 'en' } = req.body;
    if (!text?.trim()) {
      res.status(400).json({ success: false, error: 'text required' });
      return;
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Detect the language of the following text. If it is in English, translate it to Swahili. If it is in Swahili, translate it to English. If it is in any other language, translate it to English. Return only the translation, nothing else.' },
        { role: 'user', content: text.trim() },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    const translated = completion.choices[0]?.message?.content?.trim() ?? text;
    res.json({ success: true, data: { translated } });
  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({ success: false, error: 'Translation failed' });
  }
});

// POST /api/v1/social/posts/:id/share-card { preview? }: a post as a dark 9:16 image for stories and other apps.
// preview → small PNG as a data URI (nothing stored); otherwise full size, uploaded, ready to share.
router.post('/posts/:id/share-card', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { data: post } = await supabaseServiceClient
      .from('posts')
      .select(`
        id, content, visibility, user_id, repost_of_id,
        profiles:user_id (username, full_name, avatar_url),
        post_media (media_type, url, thumbnail_url, order_index),
        repost_of:repost_of_id (
          id, content, visibility, user_id,
          profiles:user_id (username, full_name, avatar_url),
          post_media (media_type, url, thumbnail_url, order_index)
        )
      `)
      .eq('id', req.params.id)
      .maybeSingle();
    if (!post) { res.status(404).json({ success: false, error: 'Post not found' }); return; }

    // A plain repost shares the original
    const p: any = (post as any).repost_of && !String((post as any).content || '').trim() ? (post as any).repost_of : post;
    if (!(await canViewProfile(p.user_id, userId)) || (p.visibility !== 'public' && p.user_id !== userId)) {
      res.status(403).json({ success: false, error: 'This post can not be shared' });
      return;
    }
    const media = [...(p.post_media || [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];
    const isVideo = media?.media_type === 'video';
    const card = await renderPostShareCard({
      name: p.profiles?.full_name || p.profiles?.username || 'KChat',
      username: p.profiles?.username || 'kchat',
      avatarUrl: p.profiles?.avatar_url,
      content: p.content || '',
      mediaUrl: media ? (isVideo ? media.thumbnail_url : media.url) : null,
      isVideo,
    }, req.body?.preview ? 540 : undefined);

    if (req.body?.preview) {
      res.json({ success: true, data: { uri: `data:image/png;base64,${card.png.toString('base64')}`, width: card.width, height: card.height } });
      return;
    }
    const up = await UploadService.uploadFile(card.png, 'image/png', `posts/${userId}/postcard_${p.id}_${Date.now()}.png`);
    res.json({
      success: true,
      data: { url: up.url, storage_path: up.storagePath, width: card.width, height: card.height, share_url: `https://api.kiongozi.org/p/${p.id}` },
    });
  } catch (err) {
    console.error('Post share card error:', err);
    res.status(500).json({ success: false, error: 'Could not make the card' });
  }
});

export default router;
