import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import UploadService from '../services/UploadService';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/v1/social/profile/me — Own profile (by auth token, no username needed)
router.get('/profile/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: profile, error } = await supabaseServiceClient
      .from('profiles')
      .select('id, full_name, username, bio, avatar_url, banner_url, is_bot, is_verified, is_private, follower_count, following_count, post_count, created_at')
      .eq('id', req.user!.id)
      .single();

    if (error || !profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

const RESERVED_USERNAMES = ['kiongozi', 'admin', 'support', 'help', 'bot', 'system', 'official'];

// GET /api/v1/social/username/check/:username — Check availability (no auth)
router.get('/username/check/:username', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;
  const cleaned = username.toLowerCase().trim();

  if (cleaned.length < 3) {
    res.json({ available: false, reason: 'Too short' });
    return;
  }

  if (RESERVED_USERNAMES.includes(cleaned)) {
    res.json({ available: false, reason: 'Reserved' });
    return;
  }

  try {
    const { data } = await supabaseServiceClient
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle();

    res.json({ available: !data });
  } catch {
    res.status(500).json({ available: false, reason: 'Error' });
  }
});

// GET /api/v1/social/users/:username — Public profile
router.get('/users/:username', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const { data: profile, error } = await supabaseServiceClient
      .from('profiles')
      .select('id, full_name, username, bio, avatar_url, banner_url, is_bot, is_verified, is_private, follower_count, following_count, post_count, created_at')
      .eq('username', username)
      .single();

    if (error || !profile) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // If requester is authenticated, check follow state
    let isFollowing = false;
    let followRequestStatus: string | null = null;
    if (req.user) {
      const [{ data: follow }, { data: followReq }] = await Promise.all([
        supabaseServiceClient
          .from('follows')
          .select('id')
          .eq('follower_id', req.user.id)
          .eq('following_id', profile.id)
          .maybeSingle(),
        supabaseServiceClient
          .from('follow_requests')
          .select('status')
          .eq('requester_id', req.user.id)
          .eq('target_id', profile.id)
          .maybeSingle(),
      ]);
      isFollowing = !!follow;
      followRequestStatus = followReq?.status ?? null;
    }

    res.json({ success: true, data: { ...profile, isFollowing, followRequestStatus } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// GET /api/v1/social/users/:username/posts
// ?type=posts (default, no replies) | replies (replies only) | media (posts with media)
router.get('/users/:username/posts', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;
    const type = (req.query.type as string) || 'posts';

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
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type === 'replies') {
      query = query.not('parent_post_id', 'is', null);
    } else if (type === 'media') {
      // Only posts that have at least one media item; still exclude replies
      query = (query as any).not('post_media', 'is', null).is('parent_post_id', null);
    } else {
      // Default: top-level posts only
      query = query.is('parent_post_id', null);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch posts' });
      return;
    }

    // For media type, filter client-side to posts that actually have media items
    const filtered = type === 'media'
      ? (posts || []).filter((p: any) => p.post_media && p.post_media.length > 0)
      : posts;

    const list = filtered || [];
    const nextCursor = list.length === limit ? list[list.length - 1].created_at : null;
    res.json({ success: true, data: list, nextCursor });
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
      const files = req.files as Record<string, { buffer: Buffer; mimetype: string; originalname: string; size: number }[]> | undefined;

      const updates: Record<string, any> = {};
      if (bio !== undefined) updates.bio = bio;
      if (full_name !== undefined) updates.full_name = full_name;
      if (req.body.is_private !== undefined) {
        updates.is_private = req.body.is_private === 'true' || req.body.is_private === true;
      }

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
        .select('id, full_name, username, bio, avatar_url, banner_url, is_verified, is_private')
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
