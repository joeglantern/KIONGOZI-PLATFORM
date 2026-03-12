import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import MentionService from '../services/MentionService';
import FeedService, { enrichWithUserState } from '../services/FeedService';
import NotificationService from '../services/NotificationService';

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

// GET /api/v1/social/posts/:id — Single post + thread
router.get('/posts/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
        post_media (*),
        repost_of:repost_of_id (
          id, content, visibility, like_count, comment_count, repost_count, view_count,
          is_bot_reply, created_at, updated_at, user_id,
          profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }

    const [enriched] = await enrichWithUserState([post], req.user?.id);
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
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
    }

    const completePost = { ...post, post_media: postMedia };

    // Process mentions + hashtags (non-blocking)
    setImmediate(async () => {
      try {
        await MentionService.processMentions(post.id, content, userId);
        await MentionService.processHashtags(post.id, content);
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
router.patch('/posts/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content, visibility } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }

    const updates: Record<string, any> = {
      content: content.trim(),
      updated_at: new Date().toISOString(),
    };
    if (visibility === 'public' || visibility === 'followers') {
      updates.visibility = visibility;
    }

    const { data, error } = await supabaseServiceClient
      .from('posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, content, visibility, updated_at')
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: 'Post not found or not authorized' });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update post' });
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
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index)
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
            data: { post_id: parentPostId, from_user_id: userId, from_username: replier?.username, from_avatar_url: replier?.avatar_url },
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
              data: { post_id: parent.parent_post_id, from_user_id: userId, from_username: replier?.username, from_avatar_url: replier?.avatar_url },
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
    const { data: hashtags, error: hErr } = await supabaseServiceClient
      .from('hashtags')
      .select('id, tag, use_count')
      .order('use_count', { ascending: false })
      .limit(10);

    const { data: posts, error: pErr } = await supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified)
      `)
      .eq('visibility', 'public')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('like_count', { ascending: false })
      .limit(10);

    if (hErr || pErr) {
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

    const [{ data: posts }, { data: users }] = await Promise.all([
      supabaseServiceClient
        .from('posts')
        .select(`*, profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified)`)
        .eq('visibility', 'public')
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseServiceClient
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, is_verified, is_bot, follower_count')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(10)
    ]);

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
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index)
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

export default router;
