import { Router, Request, Response } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/v1/social/report
router.post('/report', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const reporterId = req.user!.id;
    const { type, id, reason, description } = req.body;

    if (!type || !id || !reason) {
      res.status(400).json({ success: false, error: 'type, id, and reason are required' });
      return;
    }

    if (!['post', 'user'].includes(type)) {
      res.status(400).json({ success: false, error: 'type must be post or user' });
      return;
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'misinformation', 'explicit_content', 'other'];
    if (!validReasons.includes(reason)) {
      res.status(400).json({ success: false, error: 'Invalid reason' });
      return;
    }

    // Deduplicate: reject same reporter+target within 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dupeQuery = supabaseServiceClient
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .gte('created_at', twentyFourHoursAgo);

    if (type === 'post') {
      dupeQuery.eq('reported_post_id', id);
    } else {
      dupeQuery.eq('reported_user_id', id);
    }

    const { data: existing } = await dupeQuery.maybeSingle();
    if (existing) {
      res.status(409).json({ success: false, error: 'You already reported this recently' });
      return;
    }

    const insertData: Record<string, any> = {
      reporter_id: reporterId,
      reason,
      description: description || null,
    };

    if (type === 'post') {
      insertData.reported_post_id = id;
    } else {
      insertData.reported_user_id = id;
    }

    const { error } = await supabaseServiceClient.from('reports').insert(insertData);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to submit report' });
      return;
    }

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit report' });
  }
});

// GET /api/v1/social/reports — own reports
router.get('/reports', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const reporterId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabaseServiceClient
      .from('reports')
      .select('id, reason, description, status, created_at, reported_user_id, reported_post_id')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch reports' });
      return;
    }

    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

export default router;
