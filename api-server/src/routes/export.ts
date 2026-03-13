import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/v1/user/export
router.get('/export', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [
      { data: profile },
      { data: posts },
      { data: bookmarks },
      { data: following },
      { data: followers },
    ] = await Promise.all([
      supabaseServiceClient
        .from('profiles')
        .select('id, full_name, username, bio, avatar_url, banner_url, is_private, is_verified, follower_count, following_count, post_count, created_at')
        .eq('id', userId)
        .single(),
      supabaseServiceClient
        .from('posts')
        .select('id, content, visibility, like_count, comment_count, repost_count, created_at, parent_post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabaseServiceClient
        .from('bookmarks')
        .select('post_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseServiceClient
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', userId)
        .limit(1000),
      supabaseServiceClient
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', userId)
        .limit(1000),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      profile,
      posts: posts || [],
      bookmarks: bookmarks || [],
      following: following || [],
      followers: followers || [],
    };

    const filename = `kiongozi-data-${userId.slice(0, 8)}-${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to export user data' });
  }
});

export default router;
