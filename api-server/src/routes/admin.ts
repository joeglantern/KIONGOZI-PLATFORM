import express from 'express';
import { prisma } from '../config/prisma';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, requireRole } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimiter';
import { sendExpoPush } from '../services/PushService';

const router = express.Router();

router.use(adminRateLimit.middleware());
router.use(authenticateToken);
router.use(requireRole(['admin', 'org_admin', 'super_admin']));

// ─── Users ────────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { full_name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [users, count] = await prisma.$transaction([
      prisma.profiles.findMany({ where, orderBy: { created_at: 'desc' }, skip, take }),
      prisma.profiles.count({ where }),
    ]);

    const totalPages = Math.ceil(count / Number(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount: count,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.profiles.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const [conversationCount, messageCount, recentLogins] = await prisma.$transaction([
      prisma.conversations.count({ where: { user_id: userId } }),
      prisma.messages.count({ where: { user_id: userId } }),
      prisma.user_login_logs.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          conversations: conversationCount,
          messages: messageCount,
          lastLogin: user.last_login_at,
          loginCount: user.login_count,
        },
        recentLogins,
      },
    });
  } catch (error: any) {
    console.error('Admin user detail fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.get('/users/:userId/enrollments', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = '20', offset = '0' } = req.query;

    const userExists = await prisma.profiles.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) return res.status(404).json({ success: false, error: 'User not found' });

    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    const where: any = { user_id: userId };
    if (status && ['active', 'completed', 'dropped', 'suspended'].includes(status as string)) {
      where.status = status;
    }

    const enrollments = await prisma.course_enrollments.findMany({
      where,
      include: { courses: true },
      orderBy: { last_accessed_at: 'desc' },
      skip: offsetNum,
      take: limitNum,
    });

    res.json({ success: true, data: enrollments });
  } catch (error: any) {
    console.error('Admin user enrollments fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const adminId = (req as any).user.id;

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be active, inactive, or banned' });
    }

    let result;
    if (status === 'banned') {
      result = await supabaseServiceClient.rpc('ban_user', {
        target_user_id: userId,
        admin_user_id: adminId,
        reason: reason || 'No reason provided',
      });
    } else if (status === 'active') {
      const currentUser = await prisma.profiles.findUnique({ where: { id: userId }, select: { status: true } });
      if (currentUser?.status === 'banned') {
        result = await supabaseServiceClient.rpc('unban_user', { target_user_id: userId, admin_user_id: adminId });
      } else {
        result = await supabaseServiceClient.rpc('activate_user', { target_user_id: userId, admin_user_id: adminId });
      }
    } else if (status === 'inactive') {
      result = await supabaseServiceClient.rpc('deactivate_user', { target_user_id: userId, admin_user_id: adminId });
    }

    if (result?.error) {
      return res.status(500).json({ success: false, error: 'Failed to update user status', details: result.error.message });
    }

    res.json({ success: true, message: `User status updated to ${status}`, data: { userId, status, reason } });
  } catch (error: any) {
    console.error('Admin user status update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.patch('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = (req as any).user.id;

    const validRoles = ['user', 'admin', 'super_admin', 'content_editor', 'moderator', 'org_admin', 'analyst', 'researcher'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const currentProfile = await prisma.profiles.findUnique({ where: { id: userId }, select: { role: true } });

    await prisma.profiles.update({ where: { id: userId }, data: { role, updated_at: new Date() } });

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: userId,
      action_type: 'role_changed',
      action_details: { old_role: currentProfile?.role ?? null, new_role: role },
    }).then(undefined, () => { /* non-critical */ });

    res.json({ success: true, message: `User role updated to ${role}`, data: { userId, role } });
  } catch (error: any) {
    console.error('Admin user role update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, full_name, first_name, last_name, role = 'user', password } = req.body;
    const adminId = (req as any).user.id;

    if (!email || !full_name || !password) {
      return res.status(400).json({ success: false, error: 'Email, full name, and password are required' });
    }

    const { data: authUser, error: authError } = await supabaseServiceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ success: false, error: 'Failed to create auth user', details: authError.message });
    }

    let profile;
    try {
      profile = await prisma.profiles.create({
        data: { id: authUser.user.id, email, full_name, first_name, last_name, role },
      });
    } catch (profileError: any) {
      await supabaseServiceClient.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ success: false, error: 'Failed to create profile', details: profileError.message });
    }

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: profile.id,
      action_type: 'user_created',
      action_details: { email: profile.email, role: profile.role },
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: { user: profile } });
  } catch (error: any) {
    console.error('Admin user creation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/dashboard/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalConversations, totalMessages, bannedUsers, recentRegistrations] =
      await prisma.$transaction([
        prisma.profiles.count(),
        prisma.profiles.count({ where: { last_login_at: { gte: thirtyDaysAgo } } }),
        prisma.conversations.count(),
        prisma.messages.count(),
        prisma.profiles.count({ where: { status: 'banned' } }),
        prisma.profiles.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalConversations,
        totalMessages,
        bannedUsers,
        recentRegistrations,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
  try {
    const range = (req.query.range as string) || '7d';
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [newUsersRaw, activeUsersRaw, messagesRaw] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
        FROM profiles WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date ASC
      ` as Promise<{ date: string; count: number }[]>,
      // Distinct users with any authenticated activity per day (user_login_logs
      // gets a throttled row from the auth middleware on every active user)
      prisma.$queryRaw`
        SELECT DATE(created_at)::text AS date, COUNT(DISTINCT user_id)::int AS count
        FROM user_login_logs WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date ASC
      ` as Promise<{ date: string; count: number }[]>,
      prisma.$queryRaw`
        SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
        FROM messages WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date ASC
      ` as Promise<{ date: string; count: number }[]>,
    ]);

    // Build complete date series (days with 0 data still included)
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const toMap = (rows: { date: string; count: number }[]) =>
      Object.fromEntries(rows.map(r => [String(r.date).slice(0, 10), Number(r.count)]));

    const nuMap  = toMap(newUsersRaw);
    const auMap  = toMap(activeUsersRaw);
    const msgMap = toMap(messagesRaw);

    const points = dates.map(date => ({
      date,
      newUsers:    nuMap[date]  ?? 0,
      activeUsers: auMap[date]  ?? 0,
      messages:    msgMap[date] ?? 0,
    }));

    res.json({ success: true, data: { points, range } });
  } catch (error: any) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── App Config (mobile force-update control) ─────────────────────────────────

router.patch('/app-config', async (req, res) => {
  try {
    const adminId = (req as any).user.id;
    const patch = req.body ?? {};

    const existing = await prisma.system_settings.findFirst({
      where: { category: 'app_config', setting_key: 'config' },
    });
    const current = (existing?.setting_value as any) ?? {};

    const merged = {
      ...current,
      ...patch,
      android: { ...(current.android ?? {}), ...(patch.android ?? {}) },
      ios: { ...(current.ios ?? {}), ...(patch.ios ?? {}) },
    };

    if (existing) {
      await prisma.system_settings.update({
        where: { id: existing.id },
        data: { setting_value: merged, updated_at: new Date(), updated_by: adminId },
      });
    } else {
      await prisma.system_settings.create({
        data: {
          category: 'app_config',
          setting_key: 'config',
          setting_value: merged,
          description: 'Mobile app version & force-update configuration (managed from admin panel)',
          data_type: 'json',
          is_public: true,
          updated_by: adminId,
        },
      });
    }

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: null,
      action_type: 'app_config_updated',
      action_details: patch,
    }).then(undefined, () => { /* non-critical */ });

    res.json({ success: true, message: 'App config updated', data: merged });
  } catch (error: any) {
    console.error('Admin app-config update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── System Settings ──────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const { category } = req.query;

    const settings = await prisma.system_settings.findMany({
      where: category ? { category: category as string } : undefined,
      orderBy: [{ category: 'asc' }, { setting_key: 'asc' }],
    });

    const groupedSettings: Record<string, any> = {};
    for (const setting of settings) {
      if (!groupedSettings[setting.category]) groupedSettings[setting.category] = {};

      let value = setting.setting_value;
      try {
        if (setting.data_type === 'number') value = parseFloat(String(value));
        else if (setting.data_type === 'boolean') value = value === true || value === 'true';
        else if (setting.data_type === 'string') value = typeof value === 'string' ? value : String(value);
      } catch { /* use raw value */ }

      groupedSettings[setting.category][setting.setting_key] = {
        value,
        description: setting.description,
        dataType: setting.data_type,
        isPublic: setting.is_public,
        updatedAt: setting.updated_at,
      };
    }

    res.json({ success: true, data: { settings: groupedSettings } });
  } catch (error: any) {
    console.error('Admin settings fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { category, settings } = req.body;
    const adminId = (req as any).user.id;

    if (!category || !settings) {
      return res.status(400).json({ success: false, error: 'Missing required fields: category, settings' });
    }

    const updates: string[] = [];
    const errors: string[] = [];

    for (const [settingKey, settingData] of Object.entries(settings)) {
      try {
        const { value } = settingData as any;
        const result = await prisma.system_settings.updateMany({
          where: { category, setting_key: settingKey },
          data: { setting_value: value, updated_at: new Date(), updated_by: adminId },
        });
        if (result.count > 0) updates.push(settingKey);
        else errors.push(`${settingKey}: not found`);
      } catch (err: any) {
        errors.push(`${settingKey}: ${err.message}`);
      }
    }

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: null,
      action_type: 'update_settings',
      action_details: { category, updated_settings: updates, errors: errors.length > 0 ? errors : null },
    });

    if (errors.length > 0) {
      return res.status(207).json({
        success: false,
        message: `Updated ${updates.length} settings, but encountered ${errors.length} errors`,
        data: { updated: updates, errors },
      });
    }

    res.json({ success: true, message: `Successfully updated ${updates.length} settings`, data: { updated: updates } });
  } catch (error: any) {
    console.error('Admin settings update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { category, setting_key, setting_value, description, data_type = 'string', is_public = false } = req.body;
    const adminId = (req as any).user.id;

    if (!category || !setting_key || setting_value === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields: category, setting_key, setting_value' });
    }

    const setting = await prisma.system_settings.create({
      data: { category, setting_key, setting_value, description, data_type, is_public, updated_by: adminId },
    });

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: null,
      action_type: 'create_setting',
      action_details: { category, setting_key, data_type },
    });

    res.status(201).json({ success: true, message: 'Setting created successfully', data: { setting } });
  } catch (error: any) {
    console.error('Admin setting creation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── System Logs ──────────────────────────────────────────────────────────────

router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, level, category, startDate, endDate } = req.query;

    const where: any = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate as string);
      if (endDate) where.created_at.lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [logs, count] = await prisma.$transaction([
      prisma.system_logs.findMany({ where, orderBy: { created_at: 'desc' }, skip, take }),
      prisma.system_logs.count({ where }),
    ]);

    const totalPages = Math.ceil(count / Number(limit));

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount: count,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Admin logs fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── Verify badge ─────────────────────────────────────────────────────────────

router.patch('/users/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = (req as any).user.id;

    await prisma.profiles.update({ where: { id: userId }, data: { is_verified: true } });

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: userId,
      action_type: 'user_verified',
      action_details: { verified: true },
    }).then(undefined, () => { /* non-critical */ });

    res.json({ success: true, message: 'User verified successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.delete('/users/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = (req as any).user.id;

    await prisma.profiles.update({ where: { id: userId }, data: { is_verified: false } });

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: userId,
      action_type: 'user_unverified',
      action_details: { verified: false },
    }).then(undefined, () => { /* non-critical */ });

    res.json({ success: true, message: 'Verification removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────

router.post('/notifications/push', async (req, res) => {
  try {
    const { title, body, target, user_id } = req.body as {
      title: string;
      body: string;
      target: 'all' | 'android' | 'ios' | 'user';
      user_id?: string;
    };

    if (!title || !body || !target) {
      return res.status(400).json({ success: false, error: 'title, body, and target are required' });
    }

    if (target === 'user' && !user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required when target is "user"' });
    }

    const where: any = {};
    if (target === 'android') where.platform = 'android';
    else if (target === 'ios') where.platform = 'ios';
    else if (target === 'user') where.user_id = user_id;

    const tokenRows = await prisma.push_tokens.findMany({ where, select: { token: true } });
    const tokens = tokenRows.map(r => r.token);

    if (tokens.length === 0) {
      return res.json({ success: true, message: 'No registered devices found for the selected target', sent: 0 });
    }

    await sendExpoPush(tokens, title, body);

    return res.json({ success: true, message: `Notification sent to ${tokens.length} device(s)`, sent: tokens.length });
  } catch (error: any) {
    console.error('Failed to send push notification:', error);
    return res.status(500).json({ success: false, error: 'Failed to send push notification', details: error.message });
  }
});

// ─── Content moderation ───────────────────────────────────────────────────────

const REPORTER_SELECT = { id: true, full_name: true, username: true, avatar_url: true };

const humanizeReason = (reason: string) => reason.replace(/_/g, ' ');

router.get('/reports', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const take = Math.min(Number(limit) || 50, 100);

    const reports = await prisma.reports.findMany({
      where: status ? { status: status as string } : {},
      orderBy: { created_at: 'desc' },
      take,
      include: {
        profiles_reports_reporter_idToprofiles: { select: REPORTER_SELECT },
        profiles_reports_reported_user_idToprofiles: { select: REPORTER_SELECT },
        posts: {
          select: {
            id: true,
            content: true,
            created_at: true,
            profiles: { select: REPORTER_SELECT },
          },
        },
      },
    });

    const data = reports.map(r => ({
      id: r.id,
      type: r.reported_post_id ? 'post' : 'user',
      reason: r.description ? `${humanizeReason(r.reason)} — ${r.description}` : humanizeReason(r.reason),
      status: r.status ?? 'pending',
      created_at: r.created_at,
      reporter: r.profiles_reports_reporter_idToprofiles,
      reported_user: r.profiles_reports_reported_user_idToprofiles,
      post: r.posts ? { ...r.posts, author: r.posts.profiles } : null,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin reports fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.post('/reports/:reportId/resolve', async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminId = (req as any).user.id;
    const { action } = req.body as { action: 'dismiss' | 'remove' };

    if (!['dismiss', 'remove'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be "dismiss" or "remove"' });
    }

    const report = await prisma.reports.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    if (action === 'dismiss') {
      await prisma.reports.update({ where: { id: reportId }, data: { status: 'dismissed' } });
    } else if (report.reported_post_id) {
      // Deleting the post cascades away its report rows, so log first.
      await supabaseServiceClient.rpc('log_admin_action', {
        admin_id: adminId,
        target_user_id: report.reported_user_id ?? report.reporter_id,
        action_type: 'post_removed',
        action_details: { report_id: reportId, post_id: report.reported_post_id, reason: report.reason },
      }).then(undefined, () => { /* non-critical */ });

      await prisma.posts.delete({ where: { id: report.reported_post_id } });
      return res.json({ success: true, message: 'Post removed and report resolved' });
    } else {
      // User report — the account action (ban/deactivate) happens on the Users page.
      await prisma.reports.update({ where: { id: reportId }, data: { status: 'resolved' } });
    }

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: report.reported_user_id ?? report.reporter_id,
      action_type: `report_${action === 'dismiss' ? 'dismissed' : 'resolved'}`,
      action_details: { report_id: reportId, reason: report.reason },
    }).then(undefined, () => { /* non-critical */ });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Admin report resolve error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// Posts with at least one pending report ("flagged")
router.get('/content/flagged', async (req, res) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 100);

    const posts = await prisma.posts.findMany({
      where: { reports: { some: { status: 'pending' } } },
      orderBy: { created_at: 'desc' },
      take,
      include: {
        profiles: { select: REPORTER_SELECT },
        reports: { where: { status: 'pending' }, select: { reason: true } },
      },
    });

    const data = posts.map(p => {
      const counts = new Map<string, number>();
      for (const r of p.reports) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
      const topReason = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'reported';
      return {
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        author: p.profiles,
        flagReason: `${p.reports.length} report${p.reports.length === 1 ? '' : 's'} — ${humanizeReason(topReason)}`,
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin flagged posts fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const adminId = (req as any).user.id;

    const post = await prisma.posts.findUnique({ where: { id: postId }, select: { user_id: true } });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await supabaseServiceClient.rpc('log_admin_action', {
      admin_id: adminId,
      target_user_id: post.user_id,
      action_type: 'post_removed',
      action_details: { post_id: postId },
    }).then(undefined, () => { /* non-critical */ });

    await prisma.posts.delete({ where: { id: postId } });

    return res.json({ success: true, message: 'Post removed' });
  } catch (error: any) {
    console.error('Admin post delete error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

export default router;
