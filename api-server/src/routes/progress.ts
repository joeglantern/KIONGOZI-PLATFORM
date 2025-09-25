import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';

const router = Router();

// Get user's learning progress (all modules or specific)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { module_id, status, limit = '50', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(String(limit)), 100) || 50;
    const offsetNum = Math.max(parseInt(String(offset)), 0) || 0;

    let query = supabaseServiceClient
      .from('user_progress')
      .select(`
        *,
        learning_modules (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_minutes,
          module_categories (
            name,
            color,
            icon
          )
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('last_accessed_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (module_id) {
      query = query.eq('module_id', module_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get user progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve progress' });
  }
});

// Update user progress for a specific module
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const {
      module_id,
      status = 'in_progress',
      progress_percentage,
      time_spent_minutes,
      notes
    } = req.body;

    if (!module_id) {
      return res.status(400).json({ success: false, error: 'Module ID is required' });
    }

    // Verify the module exists and is published
    const { data: module, error: moduleError } = await supabaseServiceClient
      .from('learning_modules')
      .select('id, status')
      .eq('id', module_id)
      .eq('status', 'published')
      .single();

    if (moduleError || !module) {
      return res.status(404).json({ success: false, error: 'Module not found or not published' });
    }

    // Use the helper function to update progress
    const { error: progressError } = await supabaseServiceClient
      .rpc('update_user_progress_status', {
        p_user_id: req.user.id,
        p_module_id: module_id,
        p_status: status,
        p_progress_percentage: progress_percentage,
        p_time_spent_minutes: time_spent_minutes
      });

    if (progressError) {
      return res.status(500).json({ success: false, error: progressError.message });
    }

    // Update notes separately if provided
    if (notes !== undefined) {
      const { error: notesError } = await supabaseServiceClient
        .from('user_progress')
        .update({ notes: notes?.trim() || null })
        .eq('user_id', req.user.id)
        .eq('module_id', module_id);

      if (notesError) {
        console.warn('Failed to update notes:', notesError);
        // Don't fail the request for notes update
      }
    }

    // Fetch the updated progress
    const { data: updatedProgress, error: fetchError } = await supabaseServiceClient
      .from('user_progress')
      .select(`
        *,
        learning_modules (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_minutes,
          module_categories (
            name,
            color,
            icon
          )
        )
      `)
      .eq('user_id', req.user.id)
      .eq('module_id', module_id)
      .single();

    if (fetchError) {
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    return res.json({
      success: true,
      data: updatedProgress,
      message: 'Progress updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

// Get user's learning statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const userId = req.user.id;

    // Get overall progress statistics
    const { data: progressStats, error: statsError } = await supabaseServiceClient
      .from('user_progress')
      .select('status, progress_percentage, time_spent_minutes, completed_at, last_accessed_at')
      .eq('user_id', userId);

    if (statsError) {
      return res.status(500).json({ success: false, error: statsError.message });
    }

    // Calculate statistics
    const totalModulesStarted = progressStats?.length || 0;
    const completedModules = progressStats?.filter(p => p.status === 'completed').length || 0;
    const inProgressModules = progressStats?.filter(p => p.status === 'in_progress').length || 0;
    const bookmarkedModules = progressStats?.filter(p => p.status === 'bookmarked').length || 0;

    const totalTimeSpent = progressStats?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0;
    const averageProgress = totalModulesStarted > 0
      ? Math.round(progressStats.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / totalModulesStarted)
      : 0;

    // Get completion dates for streak calculation
    const completionDates = progressStats
      ?.filter(p => p.completed_at)
      .map(p => new Date(p.completed_at!).toDateString())
      .sort();

    // Calculate current learning streak (consecutive days with completions)
    let currentStreak = 0;
    if (completionDates && completionDates.length > 0) {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      // Start from today or yesterday
      let checkDate = completionDates.includes(today) ? today : yesterday;
      let checkDateTime = new Date(checkDate).getTime();

      if (completionDates.includes(checkDate)) {
        currentStreak = 1;

        // Count backwards for consecutive days
        for (let i = 1; i < 365; i++) { // Max 365 day streak check
          const prevDate = new Date(checkDateTime - i * 24 * 60 * 60 * 1000).toDateString();
          if (completionDates.includes(prevDate)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Get category-wise progress
    const { data: categoryProgress, error: categoryError } = await supabaseServiceClient
      .from('user_progress')
      .select(`
        status,
        learning_modules (
          module_categories (
            id,
            name,
            color,
            icon
          )
        )
      `)
      .eq('user_id', userId)
      .not('learning_modules.module_categories.id', 'is', null);

    if (categoryError) {
      console.warn('Failed to get category progress:', categoryError);
    }

    // Process category statistics
    const categoryStats: Record<string, any> = {};
    if (categoryProgress) {
      categoryProgress.forEach((progress: any) => {
        const category = progress.learning_modules?.module_categories;
        if (category) {
          if (!categoryStats[category.id]) {
            categoryStats[category.id] = {
              ...category,
              total: 0,
              completed: 0,
              in_progress: 0
            };
          }
          categoryStats[category.id].total++;
          if (progress.status === 'completed') {
            categoryStats[category.id].completed++;
          } else if (progress.status === 'in_progress') {
            categoryStats[category.id].in_progress++;
          }
        }
      });
    }

    const stats = {
      overview: {
        total_modules_started: totalModulesStarted,
        completed_modules: completedModules,
        in_progress_modules: inProgressModules,
        bookmarked_modules: bookmarkedModules,
        completion_rate: totalModulesStarted > 0 ? Math.round((completedModules / totalModulesStarted) * 100) : 0,
        average_progress: averageProgress,
        total_time_spent_minutes: totalTimeSpent,
        current_streak_days: currentStreak
      },
      categories: Object.values(categoryStats),
      recent_activity: progressStats
        ?.sort((a, b) => new Date(b.last_accessed_at || 0).getTime() - new Date(a.last_accessed_at || 0).getTime())
        .slice(0, 5) || []
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Failed to get progress stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve statistics' });
  }
});

// Get learning recommendations based on user progress
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const userId = req.user.id;

    // Get user's completed modules and categories
    const { data: userProgress, error: progressError } = await supabaseServiceClient
      .from('user_progress')
      .select(`
        module_id,
        status,
        learning_modules!inner (
          category_id,
          difficulty_level,
          keywords
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (progressError) {
      return res.status(500).json({ success: false, error: progressError.message });
    }

    const completedModuleIds = userProgress?.map(p => p.module_id) || [];
    const completedCategories = new Set(userProgress?.map((p: any) => p.learning_modules?.category_id).filter(Boolean));
    const userKeywords = new Set(
      userProgress?.flatMap((p: any) => p.learning_modules?.keywords || []) || []
    );

    // Get recommendations based on:
    // 1. Same categories as completed modules
    // 2. Similar keywords
    // 3. Next difficulty level
    // 4. Featured modules

    let query = supabaseServiceClient
      .from('learning_modules')
      .select(`
        *,
        module_categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('status', 'published')
      .not('id', 'in', completedModuleIds.length > 0 ? completedModuleIds : ['00000000-0000-0000-0000-000000000000'])
      .limit(10);

    // Prefer modules from categories user has engaged with
    if (completedCategories.size > 0) {
      query = query.in('category_id', Array.from(completedCategories));
    }

    const { data: recommendations, error: recError } = await query;

    if (recError) {
      return res.status(500).json({ success: false, error: recError.message });
    }

    // Score and sort recommendations
    const scoredRecommendations = (recommendations || []).map(module => {
      let score = 0;

      // Boost score for featured modules
      if (module.featured) score += 10;

      // Boost score for modules with similar keywords
      const moduleKeywords = new Set(module.keywords || []);
      const keywordOverlap = Array.from(userKeywords).filter(k => moduleKeywords.has(k)).length;
      score += keywordOverlap * 5;

      // Boost score for appropriate difficulty progression
      const userDifficulties = new Set(userProgress?.map((p: any) => p.learning_modules?.difficulty_level) || []);
      if (userDifficulties.has('beginner') && module.difficulty_level === 'intermediate') {
        score += 8;
      } else if (userDifficulties.has('intermediate') && module.difficulty_level === 'advanced') {
        score += 8;
      } else if (module.difficulty_level === 'beginner') {
        score += 3; // Always good for new learners
      }

      return { ...module, recommendation_score: score };
    }).sort((a, b) => b.recommendation_score - a.recommendation_score);

    // Also get some popular modules (high view count) as fallback
    const { data: popularModules, error: popularError } = await supabaseServiceClient
      .from('learning_modules')
      .select(`
        *,
        module_categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('status', 'published')
      .not('id', 'in', completedModuleIds.length > 0 ? completedModuleIds : ['00000000-0000-0000-0000-000000000000'])
      .order('view_count', { ascending: false })
      .limit(5);

    if (popularError) {
      console.warn('Failed to get popular modules:', popularError);
    }

    return res.json({
      success: true,
      data: {
        personalized: scoredRecommendations.slice(0, 8),
        popular: popularModules || [],
        next_steps: completedCategories.size > 0
          ? 'Continue exploring modules in your areas of interest'
          : 'Start with beginner-friendly modules to build your foundation'
      }
    });
  } catch (error: any) {
    console.error('Failed to get recommendations:', error);
    return res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

export default router;