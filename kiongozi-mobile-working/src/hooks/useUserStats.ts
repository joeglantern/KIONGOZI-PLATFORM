import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { useAuthStore } from '../stores/authStore';

export interface UserStats {
  conversations_count: number;
  total_messages: number;
  topics_learned: number;
  days_active: number;
  join_date: string;
  last_active: string | null;
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

  const calculateStatsFromConversations = useCallback(async () => {
    if (!user) {
      setStats(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch conversations to calculate stats from existing data (reduce limit to avoid rate limiting)
      const conversationsResponse = await apiClient.getConversations({ limit: 50, offset: 0 });

      if (!conversationsResponse.success || !conversationsResponse.data) {
        throw new Error('Failed to fetch conversations for stats calculation');
      }

      const conversations = Array.isArray(conversationsResponse.data) ? conversationsResponse.data : [];

      // Calculate basic stats from conversation data
      const conversationDates: Date[] = [];

      // Collect conversation dates without fetching individual messages to avoid rate limiting
      conversations.forEach(conversation => {
        if (conversation.created_at) {
          conversationDates.push(new Date(conversation.created_at));
        }
      });

      // Estimate total messages based on conversations (rough estimation to avoid API calls)
      // Assume average of 8-12 messages per conversation
      const estimatedMessagesPerConv = Math.floor(Math.random() * 5) + 8; // 8-12 range
      const totalMessages = conversations.length * estimatedMessagesPerConv;

      // Calculate join date (earliest conversation date or user creation date)
      const earliestConversation = conversationDates.length > 0
        ? new Date(Math.min(...conversationDates.map(d => d.getTime())))
        : new Date();

      // Estimate topics learned (rough calculation based on conversations)
      const topicsLearned = Math.min(conversations.length * 2, 50); // Cap at 50

      // Calculate days active (unique days with conversations)
      const uniqueDays = new Set(
        conversationDates.map(date => date.toDateString())
      ).size;

      const calculatedStats: UserStats = {
        conversations_count: conversations.length,
        total_messages: totalMessages,
        topics_learned: topicsLearned,
        days_active: Math.max(uniqueDays, 1), // At least 1 day if they have conversations
        join_date: earliestConversation.toISOString(),
        last_active: conversationDates.length > 0
          ? new Date(Math.max(...conversationDates.map(d => d.getTime()))).toISOString()
          : new Date().toISOString()
      };

      setStats(calculatedStats);
    } catch (err: any) {
      console.error('Failed to calculate user stats:', err);
      setError(err.message || 'Failed to load statistics');

      // Fallback to basic stats if calculation fails
      const fallbackStats: UserStats = {
        conversations_count: 0,
        total_messages: 0,
        topics_learned: 0,
        days_active: 1,
        join_date: new Date().toISOString(),
        last_active: new Date().toISOString()
      };
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch stats when user changes or hook is first used
  useEffect(() => {
    calculateStatsFromConversations();
  }, [calculateStatsFromConversations]);

  const refreshStats = useCallback(async () => {
    await calculateStatsFromConversations();
  }, [calculateStatsFromConversations]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
};