"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Users, Eye } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import type { LearningModule } from '../../types/lms';

interface TrendingModulesProps {
  onModuleSelect: (module: LearningModule) => void;
  className?: string;
  maxModules?: number;
}

const TrendingModules: React.FC<TrendingModulesProps> = ({
  onModuleSelect,
  className = '',
  maxModules = 5
}) => {
  const [trendingModules, setTrendingModules] = useState<LearningModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingModules();
  }, []);

  const fetchTrendingModules = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getPopularModules();
      if (response.success && response.data) {
        setTrendingModules(response.data.slice(0, maxModules));
      } else {
        throw new Error('Failed to fetch trending modules');
      }
    } catch (err) {
      console.error('Failed to fetch trending modules:', err);
      setError('Unable to load trending modules');
      setTrendingModules([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Loading trending...</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-64 bg-gray-100 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || trendingModules.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <TrendingUp className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          {error || 'No trending modules available'}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-gray-700">Trending Now</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {trendingModules.map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => onModuleSelect(module)}
          >
            {/* Module header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug">
                  {module.title}
                </h3>
              </div>

              {/* Trending indicator */}
              <div className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>Hot</span>
              </div>
            </div>

            {/* Module description */}
            <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
              {module.description}
            </p>

            {/* Module stats */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{module.estimated_duration_minutes} min</span>
              </div>

              {module.view_count && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{module.view_count.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="capitalize">{module.difficulty_level}</span>
              </div>
            </div>

            {/* Category badge */}
            {module.category && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {module.category.name}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Scroll indicator dots */}
      {trendingModules.length > 2 && (
        <div className="flex justify-center mt-3">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(trendingModules.length, 5) }).map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-gray-300 rounded-full"
              />
            ))}
          </div>
        </div>
      )}

      {/* Refresh option */}
      <div className="mt-3 text-center">
        <button
          onClick={fetchTrendingModules}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isLoading}
        >
          Refresh trending
        </button>
      </div>
    </div>
  );
};

export default TrendingModules;