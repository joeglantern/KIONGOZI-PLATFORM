"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, BarChart, BookOpen, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookmarkButton from './BookmarkButton';
import apiClient from '../../utils/apiClient';
import type { LearningModule, UserProgress } from '../../types/lms';

interface ModuleDetailModalProps {
  moduleId: string;
  module?: LearningModule;
  isOpen: boolean;
  onClose: () => void;
  onStartLearning?: (module: LearningModule) => void;
  className?: string;
}

const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({
  moduleId,
  module: initialModule,
  isOpen,
  onClose,
  onStartLearning,
  className = ''
}) => {
  const [module, setModule] = useState<LearningModule | null>(initialModule || null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(!initialModule);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !module) {
      fetchModuleDetails();
    }
  }, [isOpen, moduleId]);

  const fetchModuleDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [moduleResponse, progressResponse] = await Promise.all([
        apiClient.getLearningModule(moduleId),
        apiClient.getModuleProgress(moduleId)
      ]);

      if (moduleResponse.success && moduleResponse.data) {
        setModule(moduleResponse.data);
      } else {
        throw new Error('Failed to fetch module details');
      }

      if (progressResponse.success && progressResponse.data) {
        setProgress(progressResponse.data);
      }
    } catch (err) {
      console.error('Failed to fetch module details:', err);
      setError('Unable to load module details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLearning = () => {
    if (module && onStartLearning) {
      onStartLearning(module);
    }
    onClose();
  };

  const handleBookmarkChange = (isBookmarked: boolean) => {
    if (progress) {
      setProgress({
        ...progress,
        status: isBookmarked ? 'bookmarked' : 'not_started'
      });
    }
  };

  // Mobile-first: bottom sheet on mobile, centered modal on desktop
  const modalVariants = {
    hidden: {
      opacity: 0,
      y: '100%',
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      y: '100%',
      scale: 0.95
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`
              relative bg-white w-full sm:w-full sm:max-w-2xl
              h-[85vh] sm:h-auto sm:max-h-[85vh]
              rounded-t-3xl sm:rounded-3xl
              flex flex-col overflow-hidden
              ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  Module Details
                </h2>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    <span>Loading module details...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-center p-6">
                  <div>
                    <div className="text-red-500 mb-2">⚠️</div>
                    <p className="text-gray-600">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchModuleDetails}
                      className="mt-3"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : module ? (
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Module Header */}
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                          {module.title}
                        </h3>
                        {module.category && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {module.category.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <BookmarkButton
                        moduleId={module.id}
                        isBookmarked={progress?.status === 'bookmarked'}
                        onBookmarkChange={handleBookmarkChange}
                        size="md"
                        className="ml-3"
                      />
                    </div>

                    {module.description && (
                      <p className="text-gray-600 leading-relaxed">
                        {module.description}
                      </p>
                    )}
                  </div>

                  {/* Module Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900">
                        {module.estimated_duration_minutes} min
                      </div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <BarChart className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {module.difficulty_level}
                      </div>
                      <div className="text-xs text-gray-500">Difficulty</div>
                    </div>

                    {module.view_count && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Eye className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                        <div className="text-sm font-medium text-gray-900">
                          {module.view_count.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Views</div>
                      </div>
                    )}

                    {progress && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <BookOpen className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                        <div className="text-sm font-medium text-gray-900">
                          {progress.progress_percentage || 0}%
                        </div>
                        <div className="text-xs text-gray-500">Progress</div>
                      </div>
                    )}
                  </div>

                  {/* Keywords */}
                  {module.keywords && module.keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Topics Covered</h4>
                      <div className="flex flex-wrap gap-2">
                        {module.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Objectives (if available) */}
                  {module.learning_objectives && module.learning_objectives.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Learning Objectives</h4>
                      <ul className="space-y-2">
                        {module.learning_objectives.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prerequisites (if available) */}
                  {module.prerequisites && module.prerequisites.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Prerequisites</h4>
                      <ul className="space-y-2">
                        {module.prerequisites.map((prereq, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span>{prereq}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Progress bar if user has started */}
                  {progress && progress.progress_percentage > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Your Progress</span>
                        <span className="text-sm text-gray-600">{progress.progress_percentage}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-blue-500 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.progress_percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            {module && (
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 sm:flex-none"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleStartLearning}
                    className="flex-1"
                  >
                    <Play size={16} className="mr-2" />
                    {progress?.progress_percentage > 0 ? 'Continue Learning' : 'Start Learning'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModuleDetailModal;