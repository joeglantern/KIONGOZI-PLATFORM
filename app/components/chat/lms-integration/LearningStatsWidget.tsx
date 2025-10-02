"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  BookOpen,
  Award,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw
} from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import type { LearningStatsWidgetProps, CompactLearningStats } from '../../../types/lms-chat';
import type { LearningStats } from '../../../types/lms';

const LearningStatsWidget: React.FC<LearningStatsWidgetProps> = ({
  className = '',
  variant = 'compact',
  showProgress = true,
  showStreak = true,
  onStatsClick
}) => {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [compactStats, setCompactStats] = useState<CompactLearningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getLearningStats();

      if (response.success && response.data) {
        const fullStats = response.data as LearningStats;
        setStats(fullStats);

        // Create compact version for mobile/sidebar display
        const compact: CompactLearningStats = {
          completionRate: fullStats.completion_rate || 0,
          modulesCompleted: fullStats.completed_modules || 0,
          totalModules: fullStats.total_modules || 0,
          currentStreak: fullStats.current_streak_days || 0,
          weeklyProgress: fullStats.completion_rate || 0
        };
        setCompactStats(compact);
      } else {
        // Fallback data if API fails
        setCompactStats({
          completionRate: 0,
          modulesCompleted: 0,
          totalModules: 0,
          currentStreak: 0,
          weeklyProgress: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch learning stats:', err);
      setError('Failed to load stats');
      // Provide fallback data
      setCompactStats({
        completionRate: 0,
        modulesCompleted: 0,
        totalModules: 0,
        currentStreak: 0,
        weeklyProgress: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (variant === 'compact') {
      setIsExpanded(!isExpanded);
    }
    onStatsClick?.();
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchStats();
  };

  if (isLoading) {
    return (
      <div className={`p-3 bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">Loading stats...</span>
        </div>
      </div>
    );
  }

  if (error || !compactStats) {
    return (
      <div className={`p-3 bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">{error || 'No data available'}</div>
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Minimal variant for collapsed sidebar
  if (variant === 'minimal') {
    return (
      <div className={`p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors ${className}`} onClick={handleClick}>
        <div className="text-center">
          <div className="text-sm font-bold text-gray-900">{Math.round(compactStats?.completionRate || 0)}%</div>
          <div className="text-xs text-gray-500">done</div>
        </div>
      </div>
    );
  }

  // Collapsed view - just header
  const CollapsedView = () => (
    <div className="flex items-center justify-between">
      <h3 className="font-medium text-gray-900">Learning Progress</h3>
      <button
        onClick={handleRefresh}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Refresh stats"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );

  // Expanded view - header + stats
  const CompactView = () => (
    <div>
      {/* Simple header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Learning Progress</h3>
        <button
          onClick={handleRefresh}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Refresh stats"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main stats */}
      {showProgress && compactStats && (
        <div className="space-y-4">
          {/* Progress overview */}
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-900">{compactStats.modulesCompleted}</span>
              <span className="text-gray-500">of {compactStats.totalModules} modules</span>
            </div>

            {/* Simple progress bar */}
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${compactStats.completionRate}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {Math.round(compactStats.completionRate)}% complete
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            {showStreak && (
              <div>
                <div className="text-lg font-semibold text-gray-900">{compactStats.currentStreak}</div>
                <div className="text-xs text-gray-500">day streak</div>
              </div>
            )}
            <div>
              <div className="text-lg font-semibold text-gray-900">{Math.round(compactStats.weeklyProgress)}%</div>
              <div className="text-xs text-gray-500">this week</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Expanded view with more details
  const ExpandedView = () => (
    <div className="space-y-4">
      <CompactView />

      {stats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 pt-3 space-y-3"
        >
          {/* Time Spent */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Time spent</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {Math.round((stats.total_time_spent_minutes || 0) / 60)}h
            </span>
          </div>

          {/* In Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">In progress</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {stats.in_progress_modules || 0}
            </span>
          </div>

          {/* Categories Progress (if available) */}
          {stats.favorite_categories && stats.favorite_categories.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Top Categories</div>
              {stats.favorite_categories.slice(0, 3).map((favCat) => (
                <div key={favCat.category.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate">
                    {favCat.category.name}
                  </span>
                  <span className="text-xs font-medium text-gray-900">
                    {favCat.modules_completed}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );

  return (
    <div
      className={`p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors ${className}`}
      onClick={handleClick}
    >
      <AnimatePresence mode="wait">
        {variant === 'compact' && isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 'auto' }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <CompactView />
            <div className="flex justify-center mt-3 pt-2 border-t border-gray-100">
              <ChevronUp className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, height: 'auto' }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <CollapsedView />
            {variant === 'compact' && (
              <div className="flex justify-center mt-3 pt-2 border-t border-gray-100">
                <ChevronDown className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningStatsWidget;