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
      id: 'search_command',
      type: 'quick_action',
      title: 'Search modules',
      action: '/search ',
      description: 'Type /search followed by keywords to find modules',
      icon: '🔍'
    },
    {
      id: 'progress_command',
      type: 'quick_action',
      title: 'Check progress',
      action: '/progress',
      description: 'See your learning statistics and completed modules',
      icon: '📊'
    },
    {
      id: 'help_command',
      type: 'quick_action',
      title: 'Show commands',
      action: '/help',
      description: 'See all available chat commands',
      icon: '❓'
    }
  ];

  const generateSuggestionFromModule = (module: LearningModule, type: 'featured_module' | 'recent_module' | 'trending_module'): ChatSuggestion => {
    const actionText = type === 'featured_module'
      ? `Tell me about the "${module.title}" module`
      : type === 'trending_module'
      ? `Start the trending "${module.title}" module`
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

      // Fetch featured modules, recent modules, and popular modules
      const [featuredResponse, recentResponse, popularResponse] = await Promise.all([
        apiClient.getFeaturedModules(),
        apiClient.getRecentModules(),
        apiClient.getPopularModules()
      ]);

      const featuredSuggestions: ChatSuggestion[] = featuredResponse.success && featuredResponse.data?.modules
        ? featuredResponse.data.modules.slice(0, 1).map(module => generateSuggestionFromModule(module, 'featured_module'))
        : [];

      const recentSuggestions: ChatSuggestion[] = recentResponse.success && recentResponse.data
        ? recentResponse.data.slice(0, 1).map(module => generateSuggestionFromModule(module, 'recent_module'))
        : [];

      const popularSuggestions: ChatSuggestion[] = popularResponse.success && popularResponse.data
        ? popularResponse.data.slice(0, 1).map(module => generateSuggestionFromModule(module, 'trending_module'))
        : [];

      // Combine all suggestions
      const allSuggestions = [
        ...featuredSuggestions,
        ...recentSuggestions,
        ...popularSuggestions,
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
            id: 'trending',
            title: 'Trending Now',
            icon: '🔥',
            suggestions: popularSuggestions
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
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onClick={onSuggestionClick}
            variant={suggestion.type === 'featured_module' ? 'featured' : 'default'}
          />
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
    <div className={className}>
      {renderSuggestions()}

      {/* Simple refresh option */}
      <div className="flex justify-center mt-4">
        <button
          onClick={handleRefresh}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Refresh suggestions"
        >
          Refresh suggestions
        </button>
      </div>
    </div>
  );
};

export default SmartSuggestions;