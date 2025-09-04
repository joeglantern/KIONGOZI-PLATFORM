import express from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, requireRole } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimiter';

const router = express.Router();

// Apply admin rate limiting to all routes
router.use(adminRateLimit.middleware());

// Apply authentication to all routes
router.use(authenticateToken);

// Apply admin role requirement to all routes
router.use(requireRole(['admin', 'org_admin']));

/**
 * User Management Endpoints
 */

// Get all users with pagination and filtering
router.get('/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      role, 
      search 
    } = req.query;

    let query = supabaseServiceClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users',
        details: error.message 
      });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount: count || 0,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get user by ID with detailed information
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user profile
    const { data: user, error: userError } = await supabaseServiceClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get user's conversation count
    const { count: conversationCount } = await supabaseServiceClient
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get user's message count
    const { count: messageCount } = await supabaseServiceClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get recent login logs
    const { data: recentLogins } = await supabaseServiceClient
      .from('user_login_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          conversations: conversationCount || 0,
          messages: messageCount || 0,
          lastLogin: user.last_login_at,
          loginCount: user.login_count || 0
        },
        recentLogins: recentLogins || []
      }
    });
  } catch (error: any) {
    console.error('Admin user detail fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update user status (ban/unban/activate/deactivate)
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const adminId = (req as any).user.id;

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be active, inactive, or banned' 
      });
    }

    // Use appropriate database function based on status
    let result;
    if (status === 'banned') {
      result = await supabaseServiceClient.rpc('ban_user', {
        target_user_id: userId,
        admin_user_id: adminId,
        reason: reason || 'No reason provided'
      });
    } else if (status === 'active') {
      // Check current status to determine which function to use
      const { data: currentUser } = await supabaseServiceClient
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .single();

      if (currentUser?.status === 'banned') {
        result = await supabaseServiceClient.rpc('unban_user', {
          target_user_id: userId,
          admin_user_id: adminId
        });
      } else {
        result = await supabaseServiceClient.rpc('activate_user', {
          target_user_id: userId,
          admin_user_id: adminId
        });
      }
    } else if (status === 'inactive') {
      result = await supabaseServiceClient.rpc('deactivate_user', {
        target_user_id: userId,
        admin_user_id: adminId
      });
    }

    if (result?.error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update user status',
        details: result.error.message 
      });
    }

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: { userId, status, reason }
    });
  } catch (error: any) {
    console.error('Admin user status update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update user role
router.patch('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = (req as any).user.id;

    const validRoles = ['user', 'admin', 'content_editor', 'moderator', 'org_admin', 'analyst', 'researcher'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      });
    }

    const { error } = await supabaseServiceClient.rpc('change_user_role', {
      target_user_id: userId,
      admin_user_id: adminId,
      new_role: role
    });

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update user role',
        details: error.message 
      });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { userId, role }
    });
  } catch (error: any) {
    console.error('Admin user role update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const { email, full_name, first_name, last_name, role = 'user', password } = req.body;
    const adminId = (req as any).user.id;

    if (!email || !full_name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, full name, and password are required'
      });
    }

    // Create auth user first
    const { data: authUser, error: authError } = await supabaseServiceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create auth user',
        details: authError.message
      });
    }

    // Create profile
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        first_name,
        last_name,
        role
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabaseServiceClient.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({
        success: false,
        error: 'Failed to create profile',
        details: profileError.message
      });
    }

    // Log admin action
    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: profile.id,
      action_type: 'user_created',
      action_details: { 
        email: profile.email,
        role: profile.role 
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: profile }
    });
  } catch (error: any) {
    console.error('Admin user creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Dashboard Analytics Endpoints
 */

// Get dashboard overview stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers } = await supabaseServiceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabaseServiceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo);

    // Get total conversations
    const { count: totalConversations } = await supabaseServiceClient
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Get total messages
    const { count: totalMessages } = await supabaseServiceClient
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Get banned users
    const { count: bannedUsers } = await supabaseServiceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'banned');

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentRegistrations } = await supabaseServiceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        bannedUsers: bannedUsers || 0,
        recentRegistrations: recentRegistrations || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * System Logs Endpoints
 */

// Get system logs with filtering and pagination
router.get('/logs', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      category, 
      startDate,
      endDate 
    } = req.query;

    let query = supabaseServiceClient
      .from('system_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch logs',
        details: error.message
      });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount: count || 0,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Admin logs fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;