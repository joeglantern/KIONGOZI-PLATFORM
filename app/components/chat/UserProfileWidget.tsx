"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Award, Target, Flame, Calendar } from 'lucide-react';
import apiClient from '../../utils/apiClient';

interface UserProfileWidgetProps {
  variant?: 'compact' | 'detailed';
  className?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  last_active?: string;
}

interface UserStats {
  modules_completed: number;
  total_modules: number;
  completion_rate: number;
  current_streak: number;
  total_time_spent: number;
  achievements_count: number;
  last_activity_date?: string;
  modules_in_progress: number;
}

const UserProfileWidget: React.FC<UserProfileWidgetProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [profileResponse, statsResponse] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getUserStats()
      ]);

      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data as UserProfile);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data as UserStats);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Unable to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const formatTimeSpent = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 text-center ${className}`}>
        <User className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{error || 'Profile unavailable'}</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {getInitials(profile.full_name)}
                </span>
              </div>
            )}

            {/* Streak indicator */}
            {stats?.current_streak && stats.current_streak > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {stats.current_streak > 9 ? '9+' : stats.current_streak}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {profile.first_name || profile.full_name}
            </h3>
            {stats && (
              <div className="text-sm text-gray-600">
                {stats.modules_completed} modules completed
                {stats.current_streak > 0 && (
                  <span className="ml-2 text-orange-600">
                    🔥 {stats.current_streak} day streak
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Achievement indicator */}
          {stats?.achievements_count && stats.achievements_count > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
              <Award className="w-3 h-3" />
              <span className="text-xs font-medium">{stats.achievements_count}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Detailed variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {/* Avatar */}
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {getInitials(profile.full_name)}
              </span>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {profile.full_name}
          </h2>
          <p className="text-gray-600">{profile.email}</p>
          {profile.created_at && (
            <p className="text-sm text-gray-500 mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-gray-900">
              {stats.modules_completed}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Flame className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-gray-900">
              {stats.current_streak}
            </div>
            <div className="text-xs text-gray-500">Day Streak</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-gray-900">
              {formatTimeSpent(stats.total_time_spent || 0)}
            </div>
            <div className="text-xs text-gray-500">Time Spent</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Award className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-gray-900">
              {stats.achievements_count || 0}
            </div>
            <div className="text-xs text-gray-500">Achievements</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {stats && stats.total_modules > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Learning Progress
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(stats.completion_rate)}%
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.completion_rate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.modules_completed} of {stats.total_modules} modules
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default UserProfileWidget;