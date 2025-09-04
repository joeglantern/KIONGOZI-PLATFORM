import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimiter';

const router = express.Router();

// Apply rate limiting and authentication
router.use(adminRateLimit.middleware());
router.use(authenticateToken);

/**
 * WebSocket Management Routes
 */

// Get connected users statistics (admin only)
router.get('/connected-users', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const connectedCount = socketService.getConnectedUsersCount();
    const connectedUsers = socketService.getConnectedUsers();

    res.json({
      success: true,
      data: {
        totalConnected: connectedCount,
        connectedUserIds: connectedUsers,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Connected users fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Send notification to specific user (admin only)
router.post('/notify-user/:userId', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const { userId } = req.params;
    const { title, message, type = 'info', priority = 'normal', data = {} } = req.body;
    const adminId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const notification = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      priority,
      data: {
        ...data,
        sentBy: adminId,
        sentByAdmin: true
      },
      created_at: new Date().toISOString()
    };

    socketService.sendNotificationToUser(userId, notification);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: { notification, targetUserId: userId }
    });
  } catch (error: any) {
    console.error('Send user notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Send notification to users by role (admin only)
router.post('/notify-role/:role', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const { role } = req.params;
    const { title, message, type = 'info', priority = 'normal', data = {} } = req.body;
    const adminId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    const validRoles = ['user', 'admin', 'content_editor', 'moderator', 'org_admin', 'analyst', 'researcher'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const notification = {
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      priority,
      data: {
        ...data,
        sentBy: adminId,
        sentByAdmin: true,
        targetRole: role
      },
      created_at: new Date().toISOString()
    };

    socketService.sendNotificationToRole(role, notification);

    res.json({
      success: true,
      message: `Notification sent to all users with role: ${role}`,
      data: { notification, targetRole: role }
    });
  } catch (error: any) {
    console.error('Send role notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Send security alert (admin only)
router.post('/security-alert', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const { message, severity = 'medium', category = 'general', metadata = {} } = req.body;
    const adminId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const alert = {
      id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      severity,
      category,
      metadata: {
        ...metadata,
        triggeredBy: adminId,
        triggeredByAdmin: true
      },
      timestamp: new Date().toISOString()
    };

    socketService.sendSecurityAlert(alert);

    res.json({
      success: true,
      message: 'Security alert sent successfully',
      data: { alert }
    });
  } catch (error: any) {
    console.error('Send security alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Send admin event (admin only)
router.post('/admin-event', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const { event_type, description, metadata = {} } = req.body;
    const adminId = req.user.id;

    if (!event_type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Event type and description are required'
      });
    }

    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const event = {
      id: `admin_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type,
      description,
      metadata: {
        ...metadata,
        triggeredBy: adminId,
        triggeredByAdmin: true
      },
      timestamp: new Date().toISOString()
    };

    socketService.sendAdminEvent(event);

    res.json({
      success: true,
      message: 'Admin event sent successfully',
      data: { event }
    });
  } catch (error: any) {
    console.error('Send admin event error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Broadcast system update (admin only)
router.post('/system-update', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const { title, message, version, maintenance = false, metadata = {} } = req.body;
    const adminId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const update = {
      id: `system_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      version,
      maintenance,
      metadata: {
        ...metadata,
        announcedBy: adminId,
        announcedByAdmin: true
      },
      timestamp: new Date().toISOString()
    };

    socketService.broadcastSystemUpdate(update);

    res.json({
      success: true,
      message: 'System update broadcasted successfully',
      data: { update }
    });
  } catch (error: any) {
    console.error('Broadcast system update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Check if user is connected (admin only)
router.get('/user-status/:userId', requireRole(['admin', 'org_admin']), (req: any, res) => {
  try {
    const { userId } = req.params;
    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: 'Socket service not available'
      });
    }

    const isConnected = socketService.isUserConnected(userId);

    res.json({
      success: true,
      data: {
        userId,
        isConnected,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Check user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;