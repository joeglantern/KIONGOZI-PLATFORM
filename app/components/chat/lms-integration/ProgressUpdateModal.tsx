"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Star, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LearningModule } from '../../../types/lms';

interface ProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: LearningModule;
  onUpdateProgress: (moduleId: string, progress: number) => Promise<void>;
  onCompleteModule: (moduleId: string) => Promise<void>;
  currentProgress?: number;
}

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  isOpen,
  onClose,
  module,
  onUpdateProgress,
  onCompleteModule,
  currentProgress = 0
}) => {
  const [progress, setProgress] = useState(currentProgress);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleProgressUpdate = async () => {
    setIsLoading(true);
    try {
      if (progress >= 100) {
        await onCompleteModule(module.id);
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          onClose();
        }, 2000);
      } else {
        await onUpdateProgress(module.id, progress);
        onClose();
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const progressSteps = [
    { value: 25, label: 'Started', icon: Target },
    { value: 50, label: 'Halfway', icon: TrendingUp },
    { value: 75, label: 'Almost done', icon: Star },
    { value: 100, label: 'Complete', icon: CheckCircle }
  ];

  if (showCelebration) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-lg p-8 max-w-sm w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Module Complete!
            </h3>
            <p className="text-gray-600">
              Great job completing "{module.title}"!
            </p>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Update Progress
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {module.title}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Current Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Current Progress
                  </span>
                  <span className="text-sm text-gray-600">
                    {progress}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    initial={{ width: `${currentProgress}%` }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-700">
                  Quick Updates
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {progressSteps.map((step) => {
                    const Icon = step.icon;
                    const isActive = progress >= step.value;
                    const isCurrent = progress < step.value;

                    return (
                      <button
                        key={step.value}
                        onClick={() => setProgress(step.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          progress === step.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : isActive
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            progress === step.value ? 'text-blue-500' :
                            isActive ? 'text-green-500' : 'text-gray-400'
                          }`}
                        />
                        <div className="text-left">
                          <div className="text-xs font-medium">
                            {step.label}
                          </div>
                          <div className="text-xs opacity-75">
                            {step.value}%
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Progress Slider */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Or set custom progress
                </h4>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProgressUpdate}
                className="flex-1"
                disabled={isLoading || progress === currentProgress}
              >
                {isLoading ? 'Updating...' : progress >= 100 ? 'Complete Module' : 'Update Progress'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProgressUpdateModal;