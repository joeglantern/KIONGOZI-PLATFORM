import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import UploadService from '../services/UploadService';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/v1/social/users/:username — Public profile
router.get('/users/:username', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const { data: profile, error } = await supabaseServiceClient
      .from('profiles')
      .select('id, full_name, username, bio, avatar_url, banner_url, is_bot, is_verified, follower_count, following_count, post_count, created_at')
      .eq('username', username)
      .single();

    if (error || !profile) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // If requester is authenticated, check if they follow this user
    let isFollowing = false;
    if (req.user) {
      const { data: follow } = await supabaseServiceClient
        .from('follows')
        .select('id')
        .eq('follower_id', req.user.id)
        .eq('following_id', profile.id)
        .single();
      isFollowing = !!follow;
    }

    res.json({ success: true, data: { ...profile, isFollowing } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// GET /api/v1/social/users/:username/posts
router.get('/users/:username/posts', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const { data: profile } = await supabaseServiceClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!profile) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    let query = supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
        post_media (*)
      `)
      .eq('user_id', profile.id)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch posts' });
      return;
    }

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null;
    res.json({ success: true, data: posts, nextCursor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user posts' });
  }
});

// PATCH /api/v1/social/profile — Update own profile
router.patch(
  '/profile',
  authenticateToken,
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { bio, username, full_name } = req.body;
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      const updates: Record<string, any> = {};
      if (bio !== undefined) updates.bio = bio;
      if (full_name !== undefined) updates.full_name = full_name;

      if (username !== undefined) {
        // Validate username
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
          res.status(400).json({ success: false, error: 'Username must be 3-30 alphanumeric characters or underscores' });
          return;
        }
        updates.username = username.toLowerCase();
      }

      // Handle avatar upload
      if (files?.avatar?.[0]) {
        const file = files.avatar[0];
        const result = await UploadService.uploadFile(
          file.buffer,
          file.mimetype,
          `avatars/${userId}_${Date.now()}`
        );
        updates.avatar_url = result.url;
      }

      // Handle banner upload
      if (files?.banner?.[0]) {
        const file = files.banner[0];
        const result = await UploadService.uploadFile(
          file.buffer,
          file.mimetype,
          `banners/${userId}_${Date.now()}`
        );
        updates.banner_url = result.url;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      const { data, error } = await supabaseServiceClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('id, full_name, username, bio, avatar_url, banner_url, is_verified')
        .single();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ success: false, error: 'Username already taken' });
          return;
        }
        res.status(500).json({ success: false, error: 'Failed to update profile' });
        return;
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }
);

export default router;
