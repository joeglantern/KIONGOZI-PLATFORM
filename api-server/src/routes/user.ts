import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';
import { prisma } from '../config/prisma';

const router = Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const userId = req.user.id;

    const [profile, conversationsCount, totalMessages, progressStats] = await prisma.$transaction([
      prisma.profiles.findUnique({ where: { id: userId }, select: { created_at: true } }),
      prisma.conversations.count({ where: { user_id: userId } }),
      prisma.messages.count({ where: { user_id: userId } }),
      prisma.user_progress.findMany({
        where: { user_id: userId },
        select: { status: true, completed_at: true, started_at: true },
      }),
    ]);

    const topicsLearned = progressStats.filter(
      p => p.status === 'completed' && p.started_at !== null && p.completed_at !== null
    ).length;

    let currentStreak = 0;
    if (progressStats.length > 0) {
      const completionDates = progressStats
        .filter(p => p.completed_at && p.started_at)
        .map(p => new Date(p.completed_at!).toDateString())
        .sort();

      if (completionDates.length > 0) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        let checkDate = completionDates.includes(today) ? today : yesterday;
        const checkDateTime = new Date(checkDate).getTime();

        if (completionDates.includes(checkDate)) {
          currentStreak = 1;
          for (let i = 1; i < 365; i++) {
            const prevDate = new Date(checkDateTime - i * 24 * 60 * 60 * 1000).toDateString();
            if (completionDates.includes(prevDate)) currentStreak++;
            else break;
          }
        }
      }
    }

    const lastCompletion = progressStats
      .filter(p => p.completed_at)
      .map(p => new Date(p.completed_at!).getTime())
      .sort((a, b) => b - a)[0];

    return res.json({
      success: true,
      data: {
        conversations_count: conversationsCount,
        total_messages: totalMessages,
        topics_learned: topicsLearned,
        days_active: currentStreak,
        join_date: profile?.created_at?.toISOString() ?? new Date().toISOString(),
        last_active: lastCompletion ? new Date(lastCompletion).toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error('Failed to get user stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user statistics', details: error.message });
  }
});

router.delete('/account', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Auth deletion cascades to profile via DB FK — Supabase Auth still handles this
    const { error: deleteError } = await supabaseServiceClient.auth.admin.deleteUser(req.user.id);

    if (deleteError) {
      console.error('Failed to delete user account:', deleteError);
      return res.status(500).json({ success: false, error: 'Failed to delete account', details: deleteError.message });
    }

    return res.json({ success: true, message: 'Account successfully deleted' });
  } catch (error: any) {
    console.error('Failed to delete user account:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete account', details: error.message });
  }
});

export default router;
