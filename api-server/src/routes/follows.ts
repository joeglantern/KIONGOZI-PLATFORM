import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import NotificationService from '../services/NotificationService';

const router = Router();

// POST /api/v1/social/follow/:userId
router.post('/follow/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    if (followerId === followingId) {
      res.status(400).json({ success: false, error: 'Cannot follow yourself' });
      return;
    }

    const { error } = await supabaseServiceClient
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ success: false, error: 'Already following' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to follow user' });
      return;
    }

    // Notify the followed user
    const io = (req as any).io;
    if (io) {
      io.to(`user:${followingId}`).emit('follow:new', { followedBy: followerId });
    }

    setImmediate(async () => {
      try {
        const { data: follower } = await supabaseServiceClient
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', followerId)
          .single();
        await NotificationService.notify({
          userId: followingId,
          type: 'follow',
          title: 'New follower',
          message: `${follower?.full_name || 'Someone'} started following you`,
          data: { from_user_id: followerId, from_username: follower?.username, from_avatar_url: follower?.avatar_url },
          io,
        });
      } catch (e) {
        console.error('Follow notification error:', e);
      }
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to follow user' });
  }
});

// DELETE /api/v1/social/follow/:userId
router.delete('/follow/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    const { error } = await supabaseServiceClient
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to unfollow user' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unfollow user' });
  }
});

// GET /api/v1/social/followers/:userId
router.get('/followers/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabaseServiceClient
      .from('follows')
      .select(`
        follower:follower_id (id, full_name, username, avatar_url, is_verified, bio)
      `)
      .eq('following_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch followers' });
      return;
    }

    res.json({ success: true, data: data?.map(d => d.follower) || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch followers' });
  }
});

// GET /api/v1/social/following/:userId
router.get('/following/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabaseServiceClient
      .from('follows')
      .select(`
        following:following_id (id, full_name, username, avatar_url, is_verified, bio)
      `)
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch following' });
      return;
    }

    res.json({ success: true, data: data?.map(d => d.following) || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch following' });
  }
});

export default router;
