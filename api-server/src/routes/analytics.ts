import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimiter';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apply admin rate limiting
router.use(adminRateLimit.middleware());

// Get user engagement metrics
router.get('/user-engagement', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get daily active users
    const { data: dailyUsers } = await supabase
      .from('chat_sessions')
      .select('user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Process daily engagement data
    const dailyEngagement = [];
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayUsers = dailyUsers?.filter(session => 
        session.created_at.startsWith(dateStr)
      ) || [];
      
      const uniqueUsers = new Set(dayUsers.map(s => s.user_id)).size;
      
      dailyEngagement.push({
        date: dateStr,
        activeUsers: uniqueUsers,
        sessions: dayUsers.length
      });
    }

    // Get user retention metrics
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id, created_at')
      .lte('created_at', startDate.toISOString());

    const { data: activeUsers } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .gte('created_at', startDate.toISOString());

    const activeUserIds = new Set(activeUsers?.map(s => s.user_id) || []);
    const retentionRate = totalUsers && totalUsers.length > 0 
      ? (activeUserIds.size / totalUsers.length) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        dailyEngagement,
        summary: {
          totalUsers: totalUsers?.length || 0,
          activeUsers: activeUserIds.size,
          retentionRate: Math.round(retentionRate * 100) / 100,
          timeframe
        }
      }
    });
  } catch (error) {
    console.error('Failed to get user engagement metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch user engagement metrics',
      details: (error as Error).message
    });
  }
});

// Get chat analytics
router.get('/chat-metrics', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    const now = new Date();
    const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get chat sessions and messages
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id, user_id, created_at, updated_at')
      .gte('created_at', startDate.toISOString());

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, session_id, role, created_at, tokens_used')
      .gte('created_at', startDate.toISOString());

    // Calculate daily metrics
    const dailyMetrics = [];
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = sessions?.filter(s => s.created_at.startsWith(dateStr)) || [];
      const dayMessages = messages?.filter(m => m.created_at.startsWith(dateStr)) || [];
      
      const userMessages = dayMessages.filter(m => m.role === 'user');
      const aiMessages = dayMessages.filter(m => m.role === 'assistant');
      
      dailyMetrics.push({
        date: dateStr,
        sessions: daySessions.length,
        totalMessages: dayMessages.length,
        userMessages: userMessages.length,
        aiResponses: aiMessages.length,
        tokensUsed: dayMessages.reduce((sum, m) => sum + (m.tokens_used || 0), 0)
      });
    }

    // Calculate average session duration
    const avgSessionDuration = sessions?.reduce((sum, session) => {
      const duration = new Date(session.updated_at).getTime() - new Date(session.created_at).getTime();
      return sum + duration;
    }, 0) / (sessions?.length || 1);

    // Most active hours
    const hourlyActivity = new Array(24).fill(0);
    messages?.forEach(message => {
      const hour = new Date(message.created_at).getHours();
      hourlyActivity[hour]++;
    });

    res.json({
      success: true,
      data: {
        dailyMetrics,
        summary: {
          totalSessions: sessions?.length || 0,
          totalMessages: messages?.length || 0,
          avgSessionDuration: Math.round(avgSessionDuration / (1000 * 60)), // minutes
          totalTokens: messages?.reduce((sum, m) => sum + (m.tokens_used || 0), 0) || 0,
          timeframe
        },
        hourlyActivity
      }
    });
  } catch (error) {
    console.error('Failed to get chat metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch chat metrics',
      details: (error as Error).message
    });
  }
});

// Get AI performance metrics  
router.get('/ai-performance', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    const now = new Date();
    const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get AI messages with response times
    const { data: aiMessages } = await supabase
      .from('chat_messages')
      .select('id, created_at, response_time, tokens_used, feedback_rating')
      .eq('role', 'assistant')
      .gte('created_at', startDate.toISOString());

    // Calculate performance metrics
    const totalResponses = aiMessages?.length || 0;
    const avgResponseTime = aiMessages?.reduce((sum, m) => sum + (m.response_time || 0), 0) / totalResponses || 0;
    const avgTokensPerResponse = aiMessages?.reduce((sum, m) => sum + (m.tokens_used || 0), 0) / totalResponses || 0;

    // Feedback analysis
    const feedbackMessages = aiMessages?.filter(m => m.feedback_rating !== null) || [];
    const avgRating = feedbackMessages.reduce((sum, m) => sum + (m.feedback_rating || 0), 0) / feedbackMessages.length || 0;
    
    const ratingDistribution = {
      positive: feedbackMessages.filter(m => m.feedback_rating >= 4).length,
      neutral: feedbackMessages.filter(m => m.feedback_rating === 3).length,
      negative: feedbackMessages.filter(m => m.feedback_rating <= 2).length
    };

    // Daily performance trends
    const dailyPerformance = [];
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMessages = aiMessages?.filter(m => m.created_at.startsWith(dateStr)) || [];
      
      dailyPerformance.push({
        date: dateStr,
        responses: dayMessages.length,
        avgResponseTime: dayMessages.reduce((sum, m) => sum + (m.response_time || 0), 0) / dayMessages.length || 0,
        avgTokens: dayMessages.reduce((sum, m) => sum + (m.tokens_used || 0), 0) / dayMessages.length || 0
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalResponses,
          avgResponseTime: Math.round(avgResponseTime * 100) / 100,
          avgTokensPerResponse: Math.round(avgTokensPerResponse),
          avgRating: Math.round(avgRating * 100) / 100,
          totalFeedback: feedbackMessages.length,
          timeframe
        },
        ratingDistribution,
        dailyPerformance
      }
    });
  } catch (error) {
    console.error('Failed to get AI performance metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch AI performance metrics',
      details: (error as Error).message
    });
  }
});

// Get system health metrics
router.get('/system-health', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    const now = new Date();
    const hoursBack = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720; // 24h, 7d, 30d
    const startDate = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));

    // Get system logs
    const { data: errorLogs } = await supabase
      .from('system_logs')
      .select('*')
      .eq('level', 'error')
      .gte('created_at', startDate.toISOString());

    const { data: warningLogs } = await supabase
      .from('system_logs')
      .select('*')
      .eq('level', 'warning')
      .gte('created_at', startDate.toISOString());

    // Calculate error rates by hour
    const errorsByHour = [];
    for (let i = 0; i < Math.min(hoursBack, 24); i++) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourStr = hour.toISOString().slice(0, 13);
      
      const hourErrors = errorLogs?.filter(log => log.created_at.startsWith(hourStr)).length || 0;
      const hourWarnings = warningLogs?.filter(log => log.created_at.startsWith(hourStr)).length || 0;
      
      errorsByHour.unshift({
        time: hourStr + ':00',
        errors: hourErrors,
        warnings: hourWarnings
      });
    }

    // Security incidents
    const { data: securityLogs } = await supabase
      .from('system_logs')
      .select('*')
      .eq('category', 'security')
      .in('level', ['warning', 'error'])
      .gte('created_at', startDate.toISOString());

    // System uptime calculation (simplified)
    const totalHours = hoursBack;
    const errorHours = new Set(errorLogs?.map(log => log.created_at.slice(0, 13)) || []).size;
    const uptime = ((totalHours - errorHours) / totalHours) * 100;

    res.json({
      success: true,
      data: {
        summary: {
          uptime: Math.round(uptime * 100) / 100,
          totalErrors: errorLogs?.length || 0,
          totalWarnings: warningLogs?.length || 0,
          securityIncidents: securityLogs?.length || 0,
          timeframe
        },
        errorsByHour: errorsByHour.slice(-24), // Last 24 hours
        topErrors: this.getTopErrors(errorLogs || []),
        systemStatus: uptime >= 99 ? 'healthy' : uptime >= 95 ? 'degraded' : 'critical'
      }
    });
  } catch (error) {
    console.error('Failed to get system health metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch system health metrics',
      details: (error as Error).message
    });
  }
});

// Helper function to get top errors
function getTopErrors(errorLogs: any[]) {
  const errorCounts = {};
  errorLogs.forEach(log => {
    const message = log.message || 'Unknown error';
    errorCounts[message] = (errorCounts[message] || 0) + 1;
  });

  return Object.entries(errorCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }));
}

export default router;