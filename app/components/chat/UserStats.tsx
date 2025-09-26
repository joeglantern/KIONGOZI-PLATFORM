"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, BookOpen, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserStats } from '../../utils/apiClient';

interface UserStatsProps {
  isCollapsed?: boolean;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface UserStats {
  conversations_count: number;
  total_messages: number;
  topics_learned: number;
  days_active: number;
  join_date: string;
  last_active: string | null;
}

const UserStats: React.FC<UserStatsProps> = ({
  isCollapsed = false,
  user = { name: 'User', email: 'user@example.com' }
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await getUserStats();
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isCollapsed) {
    return (
      <div className="p-4 flex flex-col items-center border-b border-gray-200 dark:border-gray-800">
        <Avatar className="w-8 h-8 mb-2">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        {!loading && stats && (
          <div className="text-center">
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {stats.topics_learned}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Topics
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20"
    >
      {/* User Profile */}
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-3">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-semibold">
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {user.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {user.email}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-60 hover:opacity-100"
        >
          <User size={16} />
        </Button>
      </div>

      {/* Learning Stats */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mr-3" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-2">
                <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.topics_learned}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Topics Learned
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-2">
                <Trophy size={14} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.days_active}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Days Active
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-2">
                <TrendingUp size={14} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.conversations_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  AI Chats
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mr-2">
                <Calendar size={14} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {new Date(stats.join_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Joined
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Unable to load stats
          </p>
        </div>
      )}

      {/* Quick Action */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          <Button
            size="sm"
            className="w-full text-xs"
            variant="outline"
          >
            View Dashboard
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default UserStats;