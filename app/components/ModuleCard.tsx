"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FiClock,
  FiBarChart,
  FiBookmark,
  FiStar,
  FiUser,
  FiPlay,
  FiCheckCircle,
  FiEye
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
import type { ModuleCardProps } from '../types/lms';
import { toggleModuleBookmark } from '../utils/apiClient';

const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  progress,
  onProgressUpdate,
  variant = 'default'
}) => {
  const [isBookmarked, setIsBookmarked] = useState(
    progress?.status === 'bookmarked' || false
  );
  const [isBookmarking, setIsBookmarking] = useState(false);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBookmarking) return;

    setIsBookmarking(true);
    try {
      const newBookmarkState = !isBookmarked;
      const response = await toggleModuleBookmark(module.id, newBookmarkState);

      if (response.success && response.data) {
        setIsBookmarked(newBookmarkState);
        if (onProgressUpdate) {
          onProgressUpdate(response.data);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarking(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-200 dark:bg-gray-700';
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (progress?.status === 'completed') {
      return <FiCheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (progress?.status === 'in_progress') {
      return <FiPlay className="w-5 h-5 text-blue-500" />;
    }
    return <FiPlay className="w-5 h-5 text-gray-400" />;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const hoverVariants = {
    hover: {
      y: -4,
      transition: { duration: 0.2 }
    }
  };

  // Compact variant for sidebars/lists
  if (variant === 'compact') {
    return (
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        className="group"
      >
        <Link href={`/modules/${module.id}`}>
          <motion.div
            variants={hoverVariants}
            className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200"
          >
            <div className="flex-shrink-0 mr-3">
              {getStatusIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {module.title}
              </h3>
              <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                <FiClock className="w-3 h-3 mr-1" />
                <span>{formatDuration(module.estimated_duration_minutes)}</span>
                {progress && (
                  <span className="ml-2">
                    {progress.progress_percentage}%
                  </span>
                )}
              </div>
            </div>

            {module.is_featured && (
              <HiOutlineSparkles className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}
          </motion.div>
        </Link>
      </motion.div>
    );
  }

  // Featured variant for hero sections
  if (variant === 'featured') {
    return (
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        className="group"
      >
        <Link href={`/modules/${module.id}`}>
          <motion.div
            variants={hoverVariants}
            className="relative p-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <HiOutlineSparkles className="w-6 h-6 text-yellow-300 mr-2" />
                  <span className="text-sm font-medium text-white/80">Featured</span>
                </div>

                <motion.button
                  onClick={handleBookmark}
                  disabled={isBookmarking}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked
                      ? 'bg-white/20 text-yellow-300'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiBookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </motion.button>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                {module.title}
              </h3>

              <p className="text-white/80 text-sm mb-4 line-clamp-3">
                {module.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-white/70 text-sm">
                  <div className="flex items-center">
                    <FiClock className="w-4 h-4 mr-1" />
                    <span>{formatDuration(module.estimated_duration_minutes)}</span>
                  </div>
                  <div className="flex items-center">
                    <FiEye className="w-4 h-4 mr-1" />
                    <span>{module.view_count}</span>
                  </div>
                </div>

                {progress && (
                  <div className="text-right">
                    <div className="text-white text-sm font-medium">
                      {progress.progress_percentage}%
                    </div>
                    <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-white transition-all duration-300"
                        style={{ width: `${progress.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      className="group"
    >
      <Link href={`/modules/${module.id}`}>
        <motion.div
          variants={hoverVariants}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                {module.is_featured && (
                  <HiOutlineSparkles className="w-5 h-5 text-yellow-500 mr-2" />
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty_level)}`}>
                  {module.difficulty_level}
                </span>
              </div>

              <motion.button
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <FiBookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {module.title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
              {module.description}
            </p>

            {/* Learning Objectives Preview */}
            {module.learning_objectives && module.learning_objectives.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Learning Objectives:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {module.learning_objectives.slice(0, 2).map((objective, index) => (
                    <li key={index} className="flex items-center">
                      <div className="w-1 h-1 bg-primary-500 rounded-full mr-2" />
                      <span className="line-clamp-1">{objective}</span>
                    </li>
                  ))}
                  {module.learning_objectives.length > 2 && (
                    <li className="text-primary-600 dark:text-primary-400">
                      +{module.learning_objectives.length - 2} more...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress && progress.progress_percentage > 0 && (
            <div className="px-6 pb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {progress.progress_percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${getProgressColor(progress.progress_percentage)} transition-all duration-500`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress_percentage}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400 text-sm">
              <div className="flex items-center">
                <FiClock className="w-4 h-4 mr-1" />
                <span>{formatDuration(module.estimated_duration_minutes)}</span>
              </div>
              {module.author_name && (
                <div className="flex items-center">
                  <FiUser className="w-4 h-4 mr-1" />
                  <span className="truncate">{module.author_name}</span>
                </div>
              )}
              <div className="flex items-center">
                <FiEye className="w-4 h-4 mr-1" />
                <span>{module.view_count}</span>
              </div>
            </div>

            <div className="flex items-center">
              {getStatusIcon()}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default ModuleCard;