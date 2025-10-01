"use client";

/**
 * Enhanced CommandResponseCard Component - Web Version
 * Displays structured responses from chat commands with real LMS integration
 * Adapted from mobile app for web browsers
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  TrendingUp,
  Grid3X3,
  Search,
  CheckCircle,
  PlayCircle,
  Terminal,
  AlertCircle,
  Library,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  Trophy
} from 'lucide-react';
import {
  CommandResponse,
  ModuleCommandResponse,
  ProgressCommandResponse,
  CategoryCommandResponse,
  LearningModule,
  ModuleCategory,
  LearningStats,
  UserProgress,
  EnhancedCommandResponse
} from '../../types/lms';

interface CommandResponseCardProps {
  response: EnhancedCommandResponse;
  darkMode?: boolean;
  onModulePress?: (module: LearningModule) => void;
  onCategoryPress?: (category: ModuleCategory) => void;
}

export default function CommandResponseCard({
  response,
  darkMode = false,
  onModulePress,
  onCategoryPress,
}: CommandResponseCardProps) {

  const handleModulePress = (module: LearningModule) => {
    onModulePress?.(module);
  };

  const handleCategoryPress = (category: ModuleCategory) => {
    onCategoryPress?.(category);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return '#10b981'; // Green
      case 'intermediate':
        return '#f59e0b'; // Amber
      case 'advanced':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch (level) {
      case 'beginner':
        return Star;
      case 'intermediate':
        return Sparkles;
      case 'advanced':
        return Trophy;
      default:
        return BookOpen;
    }
  };

  const renderModules = () => {
    if (!response.data || response.data.type !== 'modules') {
      return null;
    }

    const moduleData = response.data as ModuleCommandResponse;

    if (!moduleData.modules || moduleData.modules.length === 0) {
      return (
        <div className="flex flex-col items-center py-6 space-y-3">
          <Library size={48} className={`${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              No modules found
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Try browsing different categories or search terms
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Search/Filter Info */}
        {moduleData.search_query && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <Search size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Search results for "{moduleData.search_query}"
            </span>
          </div>
        )}

        {/* Module Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {moduleData.modules.map((module) => {
            const DifficultyIcon = getDifficultyIcon(module.difficulty_level);
            const difficultyColor = getDifficultyColor(module.difficulty_level);

            return (
              <motion.div
                key={module.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => handleModulePress(module)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${module.category?.color || '#3b82f6'}15` }}
                  >
                    <BookOpen
                      size={24}
                      style={{ color: module.category?.color || '#3b82f6' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {module.title}
                    </h3>

                    <div className="flex items-center gap-3 mb-2 text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {module.category?.name || 'General'}
                      </span>

                      <div className="flex items-center gap-1" style={{ color: difficultyColor }}>
                        <DifficultyIcon size={12} />
                        <span className="capitalize text-xs font-medium">
                          {module.difficulty_level}
                        </span>
                      </div>

                      <div className={`flex items-center gap-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Clock size={12} />
                        <span>{module.estimated_duration_minutes} min</span>
                      </div>
                    </div>

                    <p className={`text-xs leading-relaxed line-clamp-2 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {module.description}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <div className={`flex items-center gap-1 text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <span>👁️ {module.view_count} views</span>
                      </div>

                      <ArrowRight size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Show more hint */}
        {moduleData.total_count && moduleData.total_count > moduleData.modules.length && (
          <p className={`text-center text-xs italic ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Showing {moduleData.modules.length} of {moduleData.total_count} modules
          </p>
        )}
      </div>
    );
  };

  const renderProgress = () => {
    if (!response.data || response.data.type !== 'progress') {
      return null;
    }

    const progressData = response.data as ProgressCommandResponse;
    const stats = progressData.stats;

    return (
      <div className="space-y-5">
        {/* Overall Progress */}
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 border-blue-500 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {Math.round(stats.completion_rate || 0)}%
            </span>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Complete
            </span>
          </div>

          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-1 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Learning Progress
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stats.completed_modules || 0} of {stats.total_modules || 0} modules completed
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg border text-center ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.in_progress_modules || 0}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              In Progress
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.current_streak_days || 0}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Day Streak
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {Math.round((stats.total_time_spent_minutes || 0) / 60)}h
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Time Spent
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {progressData.recent_modules && progressData.recent_modules.length > 0 && (
          <div className="space-y-3">
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Activity
            </h4>
            <div className="space-y-2">
              {progressData.recent_modules.slice(0, 3).map((progress) => (
                <div
                  key={progress.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {progress.status === 'completed' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <PlayCircle size={16} className="text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {progress.module?.title || 'Module'}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {progress.status.replace('_', ' ').charAt(0).toUpperCase() +
                       progress.status.slice(1).replace('_', ' ')} • {progress.progress_percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategories = () => {
    if (!response.data || response.data.type !== 'categories') {
      return null;
    }

    const categoryData = response.data as CategoryCommandResponse;

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryData.categories.map((category) => (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-md'
              }`}
              onClick={() => handleCategoryPress(category)}
            >
              <div className="text-center space-y-3">
                <div
                  className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                  style={{ backgroundColor: `${category.color || '#3b82f6'}15` }}
                >
                  <Grid3X3
                    size={24}
                    style={{ color: category.color || '#3b82f6' }}
                  />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {category.name}
                  </h3>
                  <p className={`text-xs mt-1 line-clamp-2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {category.description || 'Explore modules in this category'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border overflow-hidden my-2 ${
        darkMode
          ? 'bg-gray-900 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        darkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            response.success ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {response.success ? (
              <Terminal size={14} className="text-green-600" />
            ) : (
              <AlertCircle size={14} className="text-red-600" />
            )}
          </div>
          <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {response.title}
          </h2>
        </div>
        <span className={`text-xs font-mono px-2 py-1 rounded ${
          darkMode
            ? 'bg-gray-700 text-gray-300'
            : 'bg-gray-100 text-gray-600'
        }`}>
          /{response.command}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Render structured responses */}
        {renderModules()}
        {renderProgress()}
        {renderCategories()}

        {/* Fallback to markdown content for help and error commands */}
        {(!response.data || response.command === 'help') && (
          <div className={`prose prose-sm max-w-none ${
            darkMode ? 'prose-invert' : ''
          }`}>
            <div dangerouslySetInnerHTML={{
              __html: response.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>')
            }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}