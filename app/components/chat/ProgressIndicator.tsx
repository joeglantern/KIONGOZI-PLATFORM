"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Trophy, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ModuleCard from '../ModuleCard';
import apiClient, { getLearningStats } from '../../utils/apiClient';
import type { UserProgress, LearningModule } from '../../types/lms';

interface ProgressIndicatorProps {
  isCollapsed?: boolean;
  onViewProgress?: () => void;
  onContinueLearning?: (moduleId: string) => void;
}

interface LearningStats {
  total_modules: number;
  modules_started: number;
  modules_completed: number;
  total_time_spent: number;
  current_streak: number;
  overall_progress_percentage: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isCollapsed = false,
  onViewProgress,
  onContinueLearning
}) => {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [inProgressModules, setInProgressModules] = useState<(UserProgress & { module: LearningModule })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        // Fetch learning stats
        const statsResponse = await getLearningStats();
        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data as LearningStats);
        }

        // Fetch in-progress modules
        const progressResponse = await apiClient.get('/progress?status=in_progress&limit=3');
        if (progressResponse.success && progressResponse.data) {
          setInProgressModules(progressResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch progress data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, []);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="py-3">
        {isCollapsed ? (
          <div className="px-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mx-auto" />
          </div>
        ) : (
          <div className="px-3 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  if (!stats) return null;

  if (isCollapsed) {
    return (
      <div className="py-2 px-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={onViewProgress}
                className="w-full aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex flex-col items-center justify-center border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.overall_progress_percentage}%
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                  Complete
                </div>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-center">
                <p className="font-medium">Learning Progress</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.modules_completed} of {stats.total_modules} modules completed
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(stats.total_time_spent)} studied
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-3 mb-3">
        <div className="flex items-center">
          <TrendingUp size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Learning Progress
          </h3>
        </div>

        {onViewProgress && (
          <Button
            onClick={onViewProgress}
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100"
          >
            <ChevronRight size={12} />
          </Button>
        )}
      </div>

      <div className="px-3 space-y-4">
        {/* Overall Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {stats.overall_progress_percentage}%
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.overall_progress_percentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                {stats.modules_completed}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                {stats.modules_started}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Started</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                {stats.current_streak}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Day Streak</div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-1">
              <Clock size={12} className="text-orange-500 mr-1" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Time Spent</span>
            </div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">
              {formatTime(stats.total_time_spent)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-1">
              <Trophy size={12} className="text-yellow-500 mr-1" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Achievements</span>
            </div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">
              {Math.floor(stats.modules_completed / 3)} Earned
            </div>
          </motion.div>
        </div>

        {/* Continue Learning */}
        {inProgressModules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="flex items-center">
              <BookOpen size={14} className="text-green-600 dark:text-green-400 mr-2" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Continue Learning
              </h4>
            </div>

            {inProgressModules.slice(0, 2).map((progress) => (
              <motion.div
                key={progress.module_id}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
                onClick={() => onContinueLearning?.(progress.module_id)}
              >
                <ModuleCard
                  module={progress.module}
                  progress={progress}
                  variant="compact"
                />
              </motion.div>
            ))}

            {inProgressModules.length > 2 && (
              <Button
                onClick={onViewProgress}
                variant="ghost"
                size="sm"
                className="w-full text-xs py-2 opacity-60 hover:opacity-100"
              >
                View {inProgressModules.length - 2} more in progress
              </Button>
            )}
          </motion.div>
        )}

        {/* Call to Action */}
        {stats.modules_started === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center py-2"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Ready to start learning?
            </p>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => onViewProgress?.()}
            >
              Explore Modules
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;