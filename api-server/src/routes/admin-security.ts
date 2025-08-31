import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimiter';
import { securityMonitor } from '../middleware/securityMonitor';
import { chatRateLimit, apiRateLimit, authRateLimit } from '../middleware/rateLimiter';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apply admin rate limiting to all routes
router.use(adminRateLimit.middleware());

// Get security overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const securityStats = securityMonitor.getSecurityStats();
    const rateLimitStats = {
      chat: chatRateLimit.getStats(),
      api: apiRateLimit.getStats(),
      auth: authRateLimit.getStats(),
      admin: adminRateLimit.getStats()
    };

    // Get recent security logs
    const { data: recentLogs } = await supabase
      .from('system_logs')
      .select('*')
      .eq('category', 'security')
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({
      success: true,
      data: {
        security: securityStats,
        rateLimiting: rateLimitStats,
        recentLogs: recentLogs || []
      }
    });
  } catch (error) {
    console.error('Failed to get security overview:', error);
    res.status(500).json({
      error: 'Failed to fetch security overview',
      details: (error as Error).message
    });
  }
});

// Get security logs with filtering
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { 
      level, 
      startDate, 
      endDate, 
      ip, 
      userId, 
      limit = 100, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('system_logs')
      .select('*')
      .eq('category', 'security')
      .order('created_at', { ascending: false });

    if (level) query = query.eq('level', level);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (ip) query = query.contains('details', { ip });
    if (userId) query = query.eq('user_id', userId);

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: logs, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: logs,
      pagination: {
        offset: Number(offset),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Failed to get security logs:', error);
    res.status(500).json({
      error: 'Failed to fetch security logs',
      details: (error as Error).message
    });
  }
});

// Block IP address
router.post('/block-ip', authenticateToken, async (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip || !reason) {
      return res.status(400).json({
        error: 'IP address and reason are required'
      });
    }

    await securityMonitor.blockIP(ip, reason);

    return res.json({
      success: true,
      message: `IP ${ip} has been blocked`,
      blockedBy: (req as any).user.id
    });
  } catch (error) {
    console.error('Failed to block IP:', error);
    return res.status(500).json({
      error: 'Failed to block IP address',
      details: (error as Error).message
    });
  }
});

// Unblock IP address
router.post('/unblock-ip', authenticateToken, async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        error: 'IP address is required'
      });
    }

    await securityMonitor.unblockIP(ip);

    return res.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
      unblockedBy: (req as any).user.id
    });
  } catch (error) {
    console.error('Failed to unblock IP:', error);
    return res.status(500).json({
      error: 'Failed to unblock IP address',
      details: (error as Error).message
    });
  }
});

// Unblock rate limited user/IP
router.post('/unblock-rate-limit', authenticateToken, async (req, res) => {
  try {
    const { identifier, type = 'all' } = req.body;

    if (!identifier) {
      return res.status(400).json({
        error: 'User ID or IP address is required'
      });
    }

    let unblocked = false;

    if (type === 'all' || type === 'chat') {
      unblocked = await chatRateLimit.unblock(identifier) || unblocked;
    }
    if (type === 'all' || type === 'api') {
      unblocked = await apiRateLimit.unblock(identifier) || unblocked;
    }
    if (type === 'all' || type === 'auth') {
      unblocked = await authRateLimit.unblock(identifier) || unblocked;
    }
    if (type === 'all' || type === 'admin') {
      unblocked = await adminRateLimit.unblock(identifier) || unblocked;
    }

    if (unblocked) {
      return res.json({
        success: true,
        message: `Rate limits cleared for ${identifier}`,
        clearedBy: (req as any).user.id
      });
    } else {
      return res.status(404).json({
        error: 'No rate limit records found for the specified identifier'
      });
    }
  } catch (error) {
    console.error('Failed to clear rate limits:', error);
    return res.status(500).json({
      error: 'Failed to clear rate limits',
      details: (error as Error).message
    });
  }
});

// Get threat intelligence summary
router.get('/threats', authenticateToken, async (req, res) => {
  try {
    const { data: threats } = await supabase
      .from('system_logs')
      .select('details, created_at')
      .eq('category', 'security')
      .in('level', ['warning', 'error'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const threatAnalysis = {
      totalThreats: threats?.length || 0,
      ipAddresses: new Set<string>(),
      attackTypes: {} as Record<string, number>,
      hourlyDistribution: Array(24).fill(0)
    };

    threats?.forEach(threat => {
      const details = threat.details;
      if (details.ip) threatAnalysis.ipAddresses.add(details.ip);
      
      const hour = new Date(threat.created_at).getHours();
      threatAnalysis.hourlyDistribution[hour]++;

      // Categorize attack types
      const message = threat.details.message || '';
      if (message.includes('rate limit')) {
        threatAnalysis.attackTypes['Rate Limit Violations'] = (threatAnalysis.attackTypes['Rate Limit Violations'] || 0) + 1;
      } else if (message.includes('suspicious content')) {
        threatAnalysis.attackTypes['Suspicious Content'] = (threatAnalysis.attackTypes['Suspicious Content'] || 0) + 1;
      } else if (message.includes('blocked IP')) {
        threatAnalysis.attackTypes['Blocked IPs'] = (threatAnalysis.attackTypes['Blocked IPs'] || 0) + 1;
      } else {
        threatAnalysis.attackTypes['Other'] = (threatAnalysis.attackTypes['Other'] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        ...threatAnalysis,
        uniqueIPs: threatAnalysis.ipAddresses.size,
        topThreats: Object.entries(threatAnalysis.attackTypes)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Failed to get threat intelligence:', error);
    res.status(500).json({
      error: 'Failed to fetch threat intelligence',
      details: (error as Error).message
    });
  }
});

// Update security settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    
    // Store security settings in database
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'security_config',
        value: settings,
        updated_by: (req as any).user.id,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    console.error('Failed to update security settings:', error);
    res.status(500).json({
      error: 'Failed to update security settings',
      details: (error as Error).message
    });
  }
});

export default router;