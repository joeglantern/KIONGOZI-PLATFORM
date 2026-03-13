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

    // Check if target account is private
    const { data: targetProfile } = await supabaseServiceClient
      .from('profiles')
      .select('is_private, full_name, username, avatar_url')
      .eq('id', followingId)
      .single();

    if (targetProfile?.is_private) {
      // Private account — create a follow request instead
      const { data: reqData, error: reqError } = await supabaseServiceClient
        .from('follow_requests')
        .insert({ requester_id: followerId, target_id: followingId })
        .select('id')
        .single();

      if (reqError) {
        if (reqError.code === '23505') {
          res.status(409).json({ success: false, error: 'Follow request already sent' });
          return;
        }
        res.status(500).json({ success: false, error: 'Failed to send follow request' });
        return;
      }

      // Notify target
      const io = (req as any).io;
      const requestId = reqData?.id;
      setImmediate(async () => {
        try {
          const { data: follower } = await supabaseServiceClient
            .from('profiles')
            .select('full_name, username, avatar_url, id')
            .eq('id', followerId)
            .single();
          await NotificationService.notify({
            userId: followingId,
            type: 'follow_request',
            title: 'Follow request',
            message: `${follower?.full_name || 'Someone'} wants to follow you`,
            data: {
              from_user_id: followerId,
              from_username: follower?.username,
              from_avatar_url: follower?.avatar_url,
              request_id: requestId,
            },
            io,
          });
        } catch (e) {
          console.error('Follow request notification error:', e);
        }
      });

      res.status(201).json({ success: true, status: 'requested' });
      return;
    }

    // Public account — insert follow directly
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

    res.status(201).json({ success: true, status: 'following' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to follow user' });
  }
});

// DELETE /api/v1/social/follow/:userId
router.delete('/follow/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    // Delete both the follow and any pending follow request
    await Promise.all([
      supabaseServiceClient
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId),
      supabaseServiceClient
        .from('follow_requests')
        .delete()
        .eq('requester_id', followerId)
        .eq('target_id', followingId),
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unfollow user' });
  }
});

// GET /api/v1/social/follow-requests — pending requests for current user (as target)
router.get('/follow-requests', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseServiceClient
      .from('follow_requests')
      .select(`
        id, status, created_at,
        requester:requester_id (id, full_name, username, avatar_url, is_verified)
      `)
      .eq('target_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch follow requests' });
      return;
    }

    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch follow requests' });
  }
});

// POST /api/v1/social/follow-requests/:requestId/accept
router.post('/follow-requests/:requestId/accept', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.params;

    // Fetch request and verify target is current user
    const { data: request, error: fetchErr } = await supabaseServiceClient
      .from('follow_requests')
      .select('id, requester_id, target_id, status')
      .eq('id', requestId)
      .eq('target_id', userId)
      .single();

    if (fetchErr || !request) {
      res.status(404).json({ success: false, error: 'Follow request not found' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(409).json({ success: false, error: 'Request already handled' });
      return;
    }

    // Update status + insert follow
    await Promise.all([
      supabaseServiceClient
        .from('follow_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId),
      supabaseServiceClient
        .from('follows')
        .insert({ follower_id: request.requester_id, following_id: userId }),
    ]);

    // Notify requester
    const io = (req as any).io;
    setImmediate(async () => {
      try {
        const { data: accepter } = await supabaseServiceClient
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', userId)
          .single();
        await NotificationService.notify({
          userId: request.requester_id,
          type: 'follow',
          title: 'Follow request accepted',
          message: `${accepter?.full_name || 'Someone'} accepted your follow request`,
          data: { from_user_id: userId, from_username: accepter?.username, from_avatar_url: accepter?.avatar_url },
          io,
        });
      } catch (e) {
        console.error('Accept follow notification error:', e);
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to accept follow request' });
  }
});

// POST /api/v1/social/follow-requests/:requestId/decline
router.post('/follow-requests/:requestId/decline', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.params;

    const { error } = await supabaseServiceClient
      .from('follow_requests')
      .delete()
      .eq('id', requestId)
      .eq('target_id', userId);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to decline follow request' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to decline follow request' });
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
