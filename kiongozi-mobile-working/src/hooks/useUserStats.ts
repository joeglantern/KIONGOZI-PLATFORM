import { useState, useEffect, useCallback } from 'react';
import apiClient, { LearningStats } from '../utils/apiClient';
import { useAuthStore } from '../stores/authStore';

export interface UserStats {
  conversations_count: number;
  total_messages: number;
  topics_learned: number;
  days_active: number;
  join_date: string;
  last_active: string | null;
  // Extended LMS stats (optional - gracefully handles if API fails)
  learning_stats?: LearningStats;
}

interface UseUserStatsReturn {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export const useUserStats = (): UseUserStatsReturn => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchUserStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch both basic user stats and detailed learning stats in parallel
      const [userStatsResponse, learningStatsResponse] = await Promise.all([
        apiClient.getUserStats(),
        apiClient.getLearningStats().catch(err => {
          console.warn('Learning stats fetch failed (non-critical):', err);
          return { success: false, error: err.message };
        })
      ]);

      if (!userStatsResponse.success || !userStatsResponse.data) {
        throw new Error('Failed to fetch user statistics');
      }

      // Merge user stats with learning stats (learning stats are optional)
      const combinedStats: UserStats = {
        ...userStatsResponse.data,
        learning_stats: learningStatsResponse.success ? learningStatsResponse.data : undefined
      };

      setStats(combinedStats);
    } catch (err: any) {
      console.error('Failed to fetch user stats:', err);
      setError(err.message || 'Failed to load statistics');

      // Fallback to basic stats if API fails
      const fallbackStats: UserStats = {
        conversations_count: 0,
        total_messages: 0,
        topics_learned: 0,
        days_active: 0,
        join_date: new Date().toISOString(),
        last_active: null
      };
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch stats when user changes or hook is first used
  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const refreshStats = useCallback(async () => {
    await fetchUserStats();
  }, [fetchUserStats]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
};