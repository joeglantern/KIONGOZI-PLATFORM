import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';

const router = Router();

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const userId = req.user.id;

    // Get user's profile info (for join date)
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.warn('Profile not found, using auth created_at:', profileError);
    }

    // Get conversations count
    const { count: conversationsCount, error: conversationsError } = await supabaseServiceClient
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (conversationsError) {
      throw new Error(`Failed to count conversations: ${conversationsError.message}`);
    }

    // Get total messages count
    const { count: totalMessages, error: messagesError } = await supabaseServiceClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (messagesError) {
      throw new Error(`Failed to count messages: ${messagesError.message}`);
    }

    // Get LMS progress data for real learning statistics
    const { data: progressStats, error: progressError } = await supabaseServiceClient
      .from('user_progress')
      .select('status, completed_at, started_at')
      .eq('user_id', userId);

    if (progressError) {
      console.warn('Failed to get LMS progress:', progressError);
    }

    // Calculate real topics learned from completed modules
    // Only count modules that were actually started and completed
    const topicsLearned = progressStats?.filter(p =>
      p.status === 'completed' &&
      p.started_at !== null &&
      p.completed_at !== null
    ).length || 0;

    // Calculate learning streak from module completions
    let currentStreak = 0;
    if (progressStats && progressStats.length > 0) {
      // Only count completions where the module was actually started
      const completionDates = progressStats
        .filter(p => p.completed_at && p.started_at)
        .map(p => new Date(p.completed_at!).toDateString())
        .sort();

      if (completionDates.length > 0) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

        // Start from today or yesterday
        let checkDate = completionDates.includes(today) ? today : yesterday;
        let checkDateTime = new Date(checkDate).getTime();

        if (completionDates.includes(checkDate)) {
          currentStreak = 1;

          // Count backwards for consecutive days
          for (let i = 1; i < 365; i++) {
            const prevDate = new Date(checkDateTime - i * 24 * 60 * 60 * 1000).toDateString();
            if (completionDates.includes(prevDate)) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
    }

    // Use streak as days_active (real learning activity, not chat activity)
    const daysActive = currentStreak;

    // Determine join date (prefer profile created_at, fallback to current date)
    let joinDate: string;
    if (profile?.created_at) {
      joinDate = profile.created_at;
    } else {
      // Fallback to current date if profile doesn't exist
      joinDate = new Date().toISOString();
    }

    // Calculate last active from LMS activity or conversations
    let lastActive: string | null = null;
    if (progressStats && progressStats.length > 0) {
      // Use most recent module completion or access
      const lastCompletion = progressStats
        .filter(p => p.completed_at)
        .map(p => new Date(p.completed_at!).getTime())
        .sort((a, b) => b - a)[0];

      if (lastCompletion) {
        lastActive = new Date(lastCompletion).toISOString();
      }
    }

    const stats = {
      conversations_count: conversationsCount || 0,
      total_messages: totalMessages || 0,
      topics_learned: topicsLearned,
      days_active: daysActive,
      join_date: joinDate,
      last_active: lastActive
    };

    return res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Failed to get user stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user statistics',
      details: error.message
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const userId = req.user.id;

    // Delete user's auth account (this will cascade delete profile and related data due to foreign keys)
    const { error: deleteError } = await supabaseServiceClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Failed to delete user account:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        details: deleteError.message
      });
    }

    return res.json({
      success: true,
      message: 'Account successfully deleted'
    });

  } catch (error: any) {
    console.error('Failed to delete user account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      details: error.message
    });
  }
});

export default router;