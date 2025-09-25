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

    // Get total messages count and calculate topics learned
    const { data: messages, count: totalMessages, error: messagesError } = await supabaseServiceClient
      .from('messages')
      .select('text, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw new Error(`Failed to count messages: ${messagesError.message}`);
    }

    // Calculate topics learned (estimate from unique conversation starters and varied vocabulary)
    let topicsLearned = 0;
    if (messages && messages.length > 0) {
      // Simple heuristic: estimate topics based on conversation variety
      // More sophisticated topic extraction could be added later
      const uniqueQuestionWords = new Set();
      const greenDigitalKeywords = [
        'sustainability', 'renewable', 'solar', 'green', 'climate', 'environment',
        'digital', 'technology', 'coding', 'programming', 'entrepreneurship', 'innovation',
        'business', 'agriculture', 'energy', 'recycling', 'conservation', 'skills', 'career', 'jobs'
      ];

      messages.forEach(message => {
        if (message.text) {
          const text = message.text.toLowerCase();
          greenDigitalKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
              uniqueQuestionWords.add(keyword);
            }
          });
        }
      });

      topicsLearned = uniqueQuestionWords.size;
    }

    // Calculate days active
    let daysActive = 0;
    if (messages && messages.length > 0) {
      const firstMessage = new Date(messages[0].created_at);
      const lastMessage = new Date(messages[messages.length - 1].created_at);
      const daysDiff = Math.ceil((lastMessage.getTime() - firstMessage.getTime()) / (1000 * 60 * 60 * 24));
      daysActive = Math.max(1, daysDiff); // At least 1 day if they have messages
    }

    // Determine join date (prefer profile created_at, fallback to current date)
    let joinDate: string;
    if (profile?.created_at) {
      joinDate = profile.created_at;
    } else {
      // Fallback to current date if profile doesn't exist
      joinDate = new Date().toISOString();
    }

    // Calculate last active (most recent message)
    let lastActive: string | null = null;
    if (messages && messages.length > 0) {
      lastActive = messages[messages.length - 1].created_at;
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

export default router;