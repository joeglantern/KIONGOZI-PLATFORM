import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import MentionService from '../services/MentionService';
import FeedService from '../services/FeedService';

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

    const result = await FeedService.getExploreFeed(limit, cursor);
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
        post_media (*)
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }

    res.json({ success: true, data: post });
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
      if (io) {
        const { data: post } = await supabaseServiceClient
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();
        if (post?.user_id && post.user_id !== userId) {
          io.to(`user:${post.user_id}`).emit('post:liked', { postId, likedBy: userId });
        }
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

    const { data: post, error } = await supabaseServiceClient
      .from('posts')
      .insert({
        user_id: userId,
        content,
        repost_of_id: repostOfId,
        visibility: 'public'
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to repost' });
      return;
    }

    // Notify original post owner
    const io = (req as any).io;
    if (io) {
      const { data: original } = await supabaseServiceClient
        .from('posts')
        .select('user_id')
        .eq('id', repostOfId)
        .single();
      if (original?.user_id && original.user_id !== userId) {
        io.to(`user:${original.user_id}`).emit('post:reposted', { postId: repostOfId, repostedBy: userId });
      }
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

    // Notify parent post owner
    const io = (req as any).io;
    if (io) {
      const { data: parent } = await supabaseServiceClient
        .from('posts')
        .select('user_id')
        .eq('id', parentPostId)
        .single();
      if (parent?.user_id && parent.user_id !== userId) {
        io.to(`user:${parent.user_id}`).emit('post:commented', { postId: parentPostId, replyId: post.id, replyBy: userId });
      }
    }

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

    res.json({ success: true, data: replies, nextCursor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch replies' });
  }
});

// GET /api/v1/social/trending
router.get('/trending', async (_req: Request, res: Response): Promise<void> => {
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

    res.json({ success: true, data: { hashtags, posts } });
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

    res.json({ success: true, data: { posts: posts || [], users: users || [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

export default router;
