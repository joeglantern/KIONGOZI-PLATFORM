import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/v1/social/block/:userId
router.post('/block/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const blockerId = req.user!.id;
    const { userId: blockedId } = req.params;

    if (blockerId === blockedId) {
      res.status(400).json({ success: false, error: 'Cannot block yourself' });
      return;
    }

    const { error } = await supabaseServiceClient
      .from('blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ success: false, error: 'Already blocked' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to block user' });
      return;
    }

    // Remove follows in both directions
    await Promise.all([
      supabaseServiceClient
        .from('follows')
        .delete()
        .eq('follower_id', blockerId)
        .eq('following_id', blockedId),
      supabaseServiceClient
        .from('follows')
        .delete()
        .eq('follower_id', blockedId)
        .eq('following_id', blockerId),
    ]);

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to block user' });
  }
});

// DELETE /api/v1/social/block/:userId
router.delete('/block/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const blockerId = req.user!.id;
    const { userId: blockedId } = req.params;

    const { error } = await supabaseServiceClient
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to unblock user' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unblock user' });
  }
});

// GET /api/v1/social/blocked
router.get('/blocked', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const blockerId = req.user!.id;

    const { data, error } = await supabaseServiceClient
      .from('blocks')
      .select(`
        blocked:blocked_id (id, full_name, username, avatar_url, is_verified),
        created_at
      `)
      .eq('blocker_id', blockerId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch blocked users' });
      return;
    }

    res.json({ success: true, data: (data || []).map((d: any) => d.blocked) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch blocked users' });
  }
});

// POST /api/v1/social/mute/:userId
router.post('/mute/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const muterId = req.user!.id;
    const { userId: mutedId } = req.params;

    if (muterId === mutedId) {
      res.status(400).json({ success: false, error: 'Cannot mute yourself' });
      return;
    }

    const { error } = await supabaseServiceClient
      .from('mutes')
      .insert({ muter_id: muterId, muted_id: mutedId });

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ success: false, error: 'Already muted' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to mute user' });
      return;
    }

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mute user' });
  }
});

// DELETE /api/v1/social/mute/:userId
router.delete('/mute/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const muterId = req.user!.id;
    const { userId: mutedId } = req.params;

    const { error } = await supabaseServiceClient
      .from('mutes')
      .delete()
      .eq('muter_id', muterId)
      .eq('muted_id', mutedId);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to unmute user' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unmute user' });
  }
});

// GET /api/v1/social/muted
router.get('/muted', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const muterId = req.user!.id;

    const { data, error } = await supabaseServiceClient
      .from('mutes')
      .select(`
        muted:muted_id (id, full_name, username, avatar_url, is_verified),
        created_at
      `)
      .eq('muter_id', muterId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch muted users' });
      return;
    }

    res.json({ success: true, data: (data || []).map((d: any) => d.muted) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch muted users' });
  }
});

export default router;
