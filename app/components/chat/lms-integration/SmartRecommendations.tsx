"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Users, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '../../../utils/apiClient';
import type { LearningModule } from '../../../types/lms';

interface SmartRecommendationsProps {
  contextTopics?: string[];
  userProgress?: any;
  userProfile?: any;
  maxRecommendations?: number;
  onModuleSelect?: (module: LearningModule) => void;
  onStartLearning?: (module: LearningModule) => void;
  className?: string;
}

interface Recommendation {
  module: LearningModule;
  reason: string;
  confidence: number;
  relevanceScore: number;
  contextMatch?: string[];
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  contextTopics = [],
  userProgress,
  userProfile,
  maxRecommendations = 3,
  onModuleSelect,
  onStartLearning,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [contextTopics, userProgress, userProfile]);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get base recommendations from API
      const response = await apiClient.getModuleRecommendations();

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch recommendations');
      }

      // Enhance recommendations with context analysis
      const enhancedRecommendations = await enhanceWithContext(response.data);

      // Sort by relevance and limit
      const sortedRecommendations = enhancedRecommendations
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxRecommendations);

      setRecommendations(sortedRecommendations);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Unable to load recommendations');

      // Fallback to default recommendations
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const enhanceWithContext = async (baseRecommendations: any[]): Promise<Recommendation[]> => {
    return baseRecommendations.map((rec, index) => {
      const module = rec.module || rec;

      // Calculate relevance based on context topics
      let relevanceScore = 0.5; // Base score
      let contextMatch: string[] = [];

      if (contextTopics.length > 0 && module.keywords) {
        const matchingKeywords = module.keywords.filter(keyword =>
          contextTopics.some(topic =>
            keyword.toLowerCase().includes(topic.toLowerCase()) ||
            topic.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        contextMatch = matchingKeywords;
        relevanceScore += (matchingKeywords.length / module.keywords.length) * 0.4;
      }

      // Boost score based on user progress and difficulty match
      if (userProgress) {
        const userLevel = getUserLevel(userProgress);
        const moduleDifficulty = module.difficulty_level;

        if (isGoodDifficultyMatch(userLevel, moduleDifficulty)) {
          relevanceScore += 0.3;
        }
      }

      // Generate contextual reason
      const reason = generateReason(module, contextMatch, userProgress);

      return {
        module,
        reason,
        confidence: Math.min(relevanceScore * 100, 95),
        relevanceScore,
        contextMatch
      };
    });
  };

  const getUserLevel = (progress: any): string => {
    const completionRate = progress?.completion_rate || 0;
    if (completionRate < 20) return 'beginner';
    if (completionRate < 60) return 'intermediate';
    return 'advanced';
  };

  const isGoodDifficultyMatch = (userLevel: string, moduleDifficulty: string): boolean => {
    const levelMap = { beginner: 0, intermediate: 1, advanced: 2 };
    const userLevelNum = levelMap[userLevel as keyof typeof levelMap] || 0;
    const moduleLevelNum = levelMap[moduleDifficulty as keyof typeof levelMap] || 0;

    // Good match if module is same level or one level higher
    return moduleLevelNum >= userLevelNum && moduleLevelNum <= userLevelNum + 1;
  };

  const generateReason = (module: LearningModule, contextMatch: string[], userProgress: any): string => {
    if (contextMatch.length > 0) {
      return `Matches your interest in ${contextMatch.slice(0, 2).join(' and ')}`;
    }

    if (userProgress?.recent_modules && userProgress.recent_modules.length > 0) {
      const recentModule = userProgress.recent_modules[0];
      if (recentModule.category === module.category?.name) {
        return `Continues your learning in ${module.category?.name}`;
      }
    }

    // Use user profile for more personalized reasons
    if (userProfile) {
      const completionRate = userProgress?.completion_rate || 0;

      if (completionRate < 30) {
        return 'Perfect for getting started with learning';
      } else if (completionRate < 70) {
        return 'Builds on your current progress';
      } else {
        return 'Advanced content for experienced learners';
      }
    }

    const reasons = [
      'Popular with learners at your level',
      'Highly rated by the community',
      'Great for building practical skills',
      'Recommended for skill development'
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const handleStartLearning = (module: LearningModule) => {
    if (onStartLearning) {
      onStartLearning(module);
    } else if (onModuleSelect) {
      onModuleSelect(module);
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Loading recommendations...</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">
          {error || 'No recommendations available at the moment'}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-700">
          Recommended for You
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all bg-white"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                  {rec.module.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {rec.module.description}
                </p>
              </div>

              {rec.confidence > 80 && (
                <div className="ml-2 flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  <Sparkles className="w-3 h-3" />
                  <span>Smart Pick</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="mb-3">
              <p className="text-xs text-purple-600 font-medium">
                💡 {rec.reason}
              </p>
            </div>

            {/* Context matches */}
            {rec.contextMatch && rec.contextMatch.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {rec.contextMatch.slice(0, 2).map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Module details */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{rec.module.estimated_duration_minutes} min</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="capitalize">{rec.module.difficulty_level}</span>
              </div>

              {rec.module.view_count && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{rec.module.view_count} learners</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleStartLearning(rec.module)}
                className="flex-1 h-8 text-xs"
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Start Learning
              </Button>

              {onModuleSelect && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onModuleSelect(rec.module)}
                  className="h-8 px-3"
                >
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Refresh recommendations */}
      <div className="mt-4 text-center">
        <button
          onClick={fetchRecommendations}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isLoading}
        >
          Refresh recommendations
        </button>
      </div>
    </div>
  );
};

export default SmartRecommendations;