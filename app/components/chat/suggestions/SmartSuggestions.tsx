"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import type { SmartSuggestionsProps, ChatSuggestion, SuggestionCategory } from '../../../types/lms-chat';
import type { LearningModule } from '../../../types/lms';
import SuggestionCard from './SuggestionCard';

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  onSuggestionClick,
  isLoading: externalLoading = false,
  className = '',
  maxSuggestions = 6,
  showCategories = false
}) => {
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [categories, setCategories] = useState<SuggestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default quick action suggestions
  const defaultQuickActions: ChatSuggestion[] = [
    {
      id: 'help',
      type: 'quick_action',
      title: 'How can you help me?',
      action: 'What can you help me with today?',
      icon: '❓'
    },
    {
      id: 'progress',
      type: 'quick_action',
      title: 'Show my progress',
      action: 'Show me my learning progress and statistics',
      icon: '📊'
    },
    {
      id: 'recommendations',
      type: 'quick_action',
      title: 'Recommend modules',
      action: 'What learning modules do you recommend for me?',
      icon: '🎯'
    }
  ];

  const generateSuggestionFromModule = (module: LearningModule, type: 'featured_module' | 'recent_module'): ChatSuggestion => {
    const actionText = type === 'featured_module'
      ? `Tell me about the "${module.title}" module`
      : `Show me details about "${module.title}"`;

    return {
      id: `module-${module.id}`,
      type,
      title: module.title,
      description: module.description,
      action: actionText,
      module,
      category: module.category?.name
    };
  };

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch featured modules
      const featuredResponse = await apiClient.getFeaturedModules();
      const recentResponse = await apiClient.getRecentModules();

      const featuredSuggestions: ChatSuggestion[] = featuredResponse.success && featuredResponse.data?.modules
        ? featuredResponse.data.modules.slice(0, 2).map(module => generateSuggestionFromModule(module, 'featured_module'))
        : [];

      const recentSuggestions: ChatSuggestion[] = recentResponse.success && recentResponse.data
        ? recentResponse.data.slice(0, 2).map(module => generateSuggestionFromModule(module, 'recent_module'))
        : [];

      // Combine all suggestions
      const allSuggestions = [
        ...featuredSuggestions,
        ...recentSuggestions,
        ...defaultQuickActions
      ].slice(0, maxSuggestions);

      setSuggestions(allSuggestions);

      // Group by categories if requested
      if (showCategories) {
        const categorizedSuggestions: SuggestionCategory[] = [
          {
            id: 'featured',
            title: 'Featured Content',
            icon: '⭐',
            suggestions: featuredSuggestions
          },
          {
            id: 'recent',
            title: 'Recently Added',
            icon: '🆕',
            suggestions: recentSuggestions
          },
          {
            id: 'actions',
            title: 'Quick Actions',
            icon: '⚡',
            suggestions: defaultQuickActions
          }
        ].filter(category => category.suggestions.length > 0);

        setCategories(categorizedSuggestions);
      }

    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setError('Failed to load suggestions');
      // Fallback to default suggestions
      setSuggestions(defaultQuickActions);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [maxSuggestions, showCategories]);

  const handleRefresh = () => {
    fetchSuggestions();
  };

  const renderSuggestions = () => {
    if (showCategories && categories.length > 0) {
      return categories.map((category, categoryIndex) => (
        <div key={category.id} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span>{category.icon}</span>
            {category.title}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {category.suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: (categoryIndex * category.suggestions.length + index) * 0.1
                }}
              >
                <SuggestionCard
                  suggestion={suggestion}
                  onClick={onSuggestionClick}
                  variant={suggestion.type === 'featured_module' ? 'featured' : 'default'}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ));
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <SuggestionCard
              suggestion={suggestion}
              onClick={onSuggestionClick}
              variant={suggestion.type === 'featured_module' ? 'featured' : 'default'}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  if (isLoading || externalLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <div className="text-gray-500 text-sm mb-3">{error}</div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className={`space-y-4 ${className}`}
    >
      <AnimatePresence mode="wait">
        {renderSuggestions()}
      </AnimatePresence>

      {/* Refresh button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
          aria-label="Refresh suggestions"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    </motion.div>
  );
};

export default SmartSuggestions;