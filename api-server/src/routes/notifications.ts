import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimiter';
import { sendExpoPush } from '../services/PushService';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apply rate limiting
router.use(adminRateLimit.middleware());

// Get notifications for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = supabase
      .from('social_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unread_only === 'true') {
      query = query.eq('read', false);
    }

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: notifications, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: notifications,
      pagination: {
        offset: Number(offset),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      details: (error as Error).message
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const { error } = await supabase
      .from('social_notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({
      error: 'Failed to update notification',
      details: (error as Error).message
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { error } = await supabase
      .from('social_notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to update notifications',
      details: (error as Error).message
    });
  }
});

// Create notification (internal endpoint for system use)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, title, message, type = 'info', priority = 'medium', data = null } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({
        error: 'user_id, title, and message are required'
      });
    }

    const notification = {
      user_id,
      title,
      message,
      type,
      priority,
      data,
      read: false,
      created_at: new Date().toISOString()
    };

    const { data: created, error } = await supabase
      .from('social_notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;

    // Emit to WebSocket clients if socket server is available
    const io = (req as any).io;
    if (io) {
      io.to(`user:${user_id}`).emit('notification', created);
    }

    // Fire push notification to all registered devices for this user
    try {
      const { data: tokenRows } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', user_id);
      const tokens = (tokenRows || []).map((r: any) => r.token);
      if (tokens.length > 0) {
        await sendExpoPush(tokens, title, message, data || undefined);
      }
    } catch (pushErr) {
      console.error('Push send error:', pushErr);
    }

    return res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return res.status(500).json({
      error: 'Failed to create notification',
      details: (error as Error).message
    });
  }
});

// Get notification counts
router.get('/counts', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { data: unreadCount } = await supabase
      .from('social_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    const { data: totalCount } = await supabase
      .from('social_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      success: true,
      data: {
        unread: unreadCount?.length || 0,
        total: totalCount?.length || 0
      }
    });
  } catch (error) {
    console.error('Failed to get notification counts:', error);
    res.status(500).json({
      error: 'Failed to get notification counts',
      details: (error as Error).message
    });
  }
});

// Register a push token for the authenticated user
router.post('/push-token', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform: platform || null }, { onConflict: 'user_id,token' });

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to register push token:', error);
    return res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Unregister a push token for the authenticated user
router.delete('/push-token', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to unregister push token:', error);
    return res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

export default router;