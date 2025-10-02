import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface UserLearningProfile {
  userId: string;
  userName: string;
  userEmail: string;
  totalModulesCompleted: number;
  totalModulesInProgress: number;
  totalTimeSpent: number; // in minutes
  learningStreak: number; // days of consecutive activity
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  topCategories: string[]; // most active learning categories
  recentModules: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    completedAt?: string;
    lastAccessedAt: string;
  }>;
  currentGoals: string[]; // learning objectives they're working toward
  recommendedModules: Array<{
    id: string;
    title: string;
    category: string;
    difficulty: string;
    reason: string; // why this is recommended
  }>;
  learningStats: {
    avgSessionTime: number;
    preferredDifficulty: string;
    completionRate: number;
    mostActiveCategory: string;
  };
}

class LearningProfileService {
  /**
   * Get comprehensive learning profile for a user
   */
  async getUserLearningProfile(userId: string): Promise<UserLearningProfile | null> {
    try {
      // Get user basic info
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', userId)
        .single();

      if (userError || !userProfile) {
        console.error('Failed to fetch user profile:', userError);
        return null;
      }

      // Get user progress data
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          *,
          learning_modules!inner(
            id,
            title,
            difficulty_level,
            estimated_duration_minutes,
            module_categories(name)
          )
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false });

      if (progressError) {
        console.error('Failed to fetch user progress:', progressError);
        return null;
      }

      // Calculate learning statistics
      const completedModules = progressData?.filter(p => p.status === 'completed') || [];
      const inProgressModules = progressData?.filter(p => p.status === 'in_progress') || [];
      const totalTimeSpent = progressData?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0;

      // Calculate learning streak (simplified - consecutive days with activity)
      const learningStreak = await this.calculateLearningStreak(userId);

      // Determine skill level based on completed modules and difficulty
      const skillLevel = this.determineSkillLevel(completedModules);

      // Get top categories by activity
      const topCategories = this.getTopCategories(progressData || []);

      // Get recent modules (last 10 accessed)
      const recentModules = (progressData || [])
        .slice(0, 10)
        .map(p => ({
          id: p.learning_modules.id,
          title: p.learning_modules.title,
          status: p.status,
          category: p.learning_modules.module_categories?.name || 'Uncategorized',
          completedAt: p.completed_at,
          lastAccessedAt: p.last_accessed_at
        }));

      // Generate learning goals based on progress
      const currentGoals = this.generateLearningGoals(progressData || [], completedModules.length);

      // Get recommended modules
      const recommendedModules = await this.getRecommendedModules(userId, topCategories, skillLevel);

      // Calculate detailed learning stats
      const learningStats = this.calculateLearningStats(progressData || []);

      return {
        userId,
        userName: userProfile.full_name || 'User',
        userEmail: userProfile.email,
        totalModulesCompleted: completedModules.length,
        totalModulesInProgress: inProgressModules.length,
        totalTimeSpent,
        learningStreak,
        skillLevel,
        topCategories,
        recentModules,
        currentGoals,
        recommendedModules,
        learningStats
      };

    } catch (error) {
      console.error('Error creating learning profile:', error);
      return null;
    }
  }

  /**
   * Calculate consecutive learning streak in days
   */
  private async calculateLearningStreak(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('last_accessed_at')
        .eq('user_id', userId)
        .not('last_accessed_at', 'is', null)
        .order('last_accessed_at', { ascending: false });

      if (error || !data?.length) return 0;

      // Simple streak calculation - count consecutive days with activity
      const dates = data.map(p => new Date(p.last_accessed_at!).toDateString());
      const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let streak = 0;
      const today = new Date().toDateString();
      let checkDate = new Date();

      for (let i = 0; i < uniqueDates.length; i++) {
        const dateStr = checkDate.toDateString();
        if (uniqueDates.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating learning streak:', error);
      return 0;
    }
  }

  /**
   * Determine user skill level based on completed modules
   */
  private determineSkillLevel(completedModules: any[]): 'beginner' | 'intermediate' | 'advanced' {
    if (completedModules.length === 0) return 'beginner';

    const difficultyCount = completedModules.reduce((acc, module) => {
      const difficulty = module.learning_modules?.difficulty_level || 'beginner';
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});

    const totalCompleted = completedModules.length;
    const advancedCount = difficultyCount.advanced || 0;
    const intermediateCount = difficultyCount.intermediate || 0;

    if (advancedCount >= 3 || (totalCompleted >= 10 && advancedCount >= 1)) {
      return 'advanced';
    } else if (intermediateCount >= 3 || totalCompleted >= 5) {
      return 'intermediate';
    }
    return 'beginner';
  }

  /**
   * Get top learning categories by activity
   */
  private getTopCategories(progressData: any[]): string[] {
    const categoryCount = progressData.reduce((acc, p) => {
      const category = p.learning_modules?.module_categories?.name || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([category]) => category);
  }

  /**
   * Generate personalized learning goals
   */
  private generateLearningGoals(progressData: any[], completedCount: number): string[] {
    const goals = [];

    if (completedCount === 0) {
      goals.push('Complete your first learning module');
      goals.push('Explore green economy fundamentals');
    } else if (completedCount < 3) {
      goals.push('Complete 3 modules to unlock intermediate content');
      goals.push('Develop foundational digital skills');
    } else if (completedCount < 10) {
      goals.push('Master an advanced topic in your area of interest');
      goals.push('Explore new learning categories');
    } else {
      goals.push('Become an expert in sustainable technology');
      goals.push('Share knowledge by helping other learners');
    }

    // Add category-specific goals based on activity
    const inProgressModules = progressData.filter(p => p.status === 'in_progress');
    if (inProgressModules.length > 0) {
      goals.unshift(`Complete ${inProgressModules.length} module${inProgressModules.length > 1 ? 's' : ''} in progress`);
    }

    return goals.slice(0, 3); // Return top 3 goals
  }

  /**
   * Get recommended modules based on user profile
   */
  private async getRecommendedModules(
    userId: string,
    topCategories: string[],
    skillLevel: string
  ): Promise<Array<{id: string; title: string; category: string; difficulty: string; reason: string}>> {
    try {
      // Get modules user hasn't started yet
      const { data: availableModules, error } = await supabase
        .from('learning_modules')
        .select(`
          id,
          title,
          difficulty_level,
          module_categories(name)
        `)
        .eq('status', 'published')
        .not('id', 'in', `(
          SELECT module_id FROM user_progress WHERE user_id = '${userId}'
        )`)
        .limit(20);

      if (error || !availableModules) return [];

      const recommendations = [];

      // Recommend modules from user's top categories
      const categoryModules = availableModules.filter(m =>
        topCategories.includes(m.module_categories?.name || '')
      );
      categoryModules.slice(0, 2).forEach(module => {
        recommendations.push({
          id: module.id,
          title: module.title,
          category: module.module_categories?.name || 'Uncategorized',
          difficulty: module.difficulty_level,
          reason: `Matches your interest in ${module.module_categories?.name}`
        });
      });

      // Recommend skill-appropriate modules
      const skillAppropriate = availableModules.filter(m => {
        if (skillLevel === 'beginner') return m.difficulty_level === 'beginner';
        if (skillLevel === 'intermediate') return ['beginner', 'intermediate'].includes(m.difficulty_level);
        return true; // advanced users can take any level
      });

      skillAppropriate.slice(0, 2).forEach(module => {
        if (!recommendations.find(r => r.id === module.id)) {
          recommendations.push({
            id: module.id,
            title: module.title,
            category: module.module_categories?.name || 'Uncategorized',
            difficulty: module.difficulty_level,
            reason: `Perfect for your ${skillLevel} skill level`
          });
        }
      });

      // Fill remaining slots with featured or popular modules
      const remaining = availableModules.filter(m =>
        !recommendations.find(r => r.id === m.id)
      );
      remaining.slice(0, 2).forEach(module => {
        recommendations.push({
          id: module.id,
          title: module.title,
          category: module.module_categories?.name || 'Uncategorized',
          difficulty: module.difficulty_level,
          reason: 'Popular with other learners'
        });
      });

      return recommendations.slice(0, 4); // Return top 4 recommendations

    } catch (error) {
      console.error('Error getting recommended modules:', error);
      return [];
    }
  }

  /**
   * Calculate detailed learning statistics
   */
  private calculateLearningStats(progressData: any[]): {
    avgSessionTime: number;
    preferredDifficulty: string;
    completionRate: number;
    mostActiveCategory: string;
  } {
    if (!progressData.length) {
      return {
        avgSessionTime: 0,
        preferredDifficulty: 'beginner',
        completionRate: 0,
        mostActiveCategory: 'None'
      };
    }

    // Average session time
    const totalTime = progressData.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
    const avgSessionTime = Math.round(totalTime / progressData.length);

    // Preferred difficulty (most common among completed modules)
    const completedModules = progressData.filter(p => p.status === 'completed');
    const difficultyCount = completedModules.reduce((acc, p) => {
      const difficulty = p.learning_modules?.difficulty_level || 'beginner';
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});
    const preferredDifficulty = Object.entries(difficultyCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'beginner';

    // Completion rate
    const completionRate = Math.round((completedModules.length / progressData.length) * 100);

    // Most active category
    const categoryCount = progressData.reduce((acc, p) => {
      const category = p.learning_modules?.module_categories?.name || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    const mostActiveCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'None';

    return {
      avgSessionTime,
      preferredDifficulty: preferredDifficulty as any,
      completionRate,
      mostActiveCategory
    };
  }

  /**
   * Get contextually relevant modules based on user query and profile
   */
  async getContextualModules(userId: string, userQuery: string, limit: number = 5): Promise<any[]> {
    try {
      const profile = await this.getUserLearningProfile(userId);
      if (!profile) {
        // Fallback to basic search if no profile
        return await this.getBasicModuleSearch(userQuery, limit);
      }

      // Extract keywords from user query
      const queryKeywords = userQuery.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5);

      // Get modules using intelligent search strategy
      const { data: modules, error } = await supabase
        .from('learning_modules')
        .select(`
          id,
          title,
          description,
          content,
          keywords,
          difficulty_level,
          estimated_duration_minutes,
          module_categories(name)
        `)
        .eq('status', 'published')
        .not('id', 'in', `(
          SELECT module_id FROM user_progress
          WHERE user_id = '${userId}' AND status = 'completed'
        )`)
        .limit(20);

      if (error || !modules) {
        console.error('Error fetching modules:', error);
        return await this.getBasicModuleSearch(userQuery, limit);
      }

      // Score modules based on multiple factors
      const scoredModules = modules.map(module => {
        let score = 0;

        // 1. Query relevance (40% weight)
        const titleMatch = queryKeywords.some(keyword =>
          module.title.toLowerCase().includes(keyword)
        );
        const descriptionMatch = queryKeywords.some(keyword =>
          module.description?.toLowerCase().includes(keyword)
        );
        const keywordMatch = queryKeywords.some(keyword =>
          module.keywords?.some(k => k.toLowerCase().includes(keyword))
        );

        if (titleMatch) score += 40;
        if (descriptionMatch) score += 20;
        if (keywordMatch) score += 15;

        // 2. User interest alignment (30% weight)
        const category = module.module_categories?.name;
        if (category && profile.topCategories.includes(category)) {
          score += 30;
        }

        // 3. Skill level appropriateness (20% weight)
        const difficulty = module.difficulty_level;
        if (difficulty === profile.skillLevel) {
          score += 20;
        } else if (
          (profile.skillLevel === 'intermediate' && difficulty === 'beginner') ||
          (profile.skillLevel === 'advanced' && ['beginner', 'intermediate'].includes(difficulty))
        ) {
          score += 10;
        }

        // 4. Learning path continuity (10% weight)
        // Prefer modules in categories user is already active in
        if (category && profile.recentModules.some(rm => rm.category === category)) {
          score += 10;
        }

        return { ...module, relevanceScore: score };
      });

      // Sort by relevance score and return top results
      return scoredModules
        .filter(m => m.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting contextual modules:', error);
      return await this.getBasicModuleSearch(userQuery, limit);
    }
  }

  /**
   * Fallback basic module search
   */
  private async getBasicModuleSearch(userQuery: string, limit: number): Promise<any[]> {
    try {
      const { data: modules } = await supabase
        .from('learning_modules')
        .select('id, title, description, content, keywords, difficulty_level, module_categories(name)')
        .eq('status', 'published')
        .or(`title.ilike.%${userQuery.slice(0, 50)}%,description.ilike.%${userQuery.slice(0, 50)}%,keywords.cs.{${userQuery.toLowerCase()}}`)
        .limit(limit);

      return modules || [];
    } catch (error) {
      console.error('Error in basic module search:', error);
      return [];
    }
  }

  /**
   * Get user's recent activity for AI context
   */
  async getUserRecentActivity(userId: string): Promise<string> {
    try {
      const { data: recentProgress, error } = await supabase
        .from('user_progress')
        .select(`
          status,
          progress_percentage,
          last_accessed_at,
          learning_modules!inner(title, module_categories(name))
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false })
        .limit(5);

      if (error || !recentProgress?.length) return '';

      const activityLines = ['RECENT LEARNING ACTIVITY:'];
      recentProgress.forEach(progress => {
        const module = progress.learning_modules;
        const category = module.module_categories?.name || 'General';
        const statusText = progress.status === 'completed'
          ? '✅ Completed'
          : `📚 ${progress.progress_percentage}% progress`;

        activityLines.push(`- ${module.title} (${category}) - ${statusText}`);
      });

      return activityLines.join('\n');
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return '';
    }
  }

  /**
   * Get a quick summary for AI context (lighter version)
   */
  async getUserLearningContext(userId: string): Promise<string> {
    try {
      const profile = await this.getUserLearningProfile(userId);
      if (!profile) return '';

      const contextLines = [
        `User: ${profile.userName}`,
        `Learning Level: ${profile.skillLevel}`,
        `Completed Modules: ${profile.totalModulesCompleted}`,
        `Current Progress: ${profile.totalModulesInProgress} modules in progress`,
        `Learning Streak: ${profile.learningStreak} days`
      ];

      if (profile.topCategories.length > 0) {
        contextLines.push(`Top Interests: ${profile.topCategories.join(', ')}`);
      }

      if (profile.recentModules.length > 0) {
        const recentTitles = profile.recentModules.slice(0, 3).map(m => m.title);
        contextLines.push(`Recent Modules: ${recentTitles.join(', ')}`);
      }

      if (profile.currentGoals.length > 0) {
        contextLines.push(`Learning Goals: ${profile.currentGoals.join(', ')}`);
      }

      return contextLines.join('\n');
    } catch (error) {
      console.error('Error getting user learning context:', error);
      return '';
    }
  }
}

export default new LearningProfileService();