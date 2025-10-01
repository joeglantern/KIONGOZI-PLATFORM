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

  // Enhanced suggestion categories with mobile app content
  const categoryBasedSuggestions: ChatSuggestion[] = [
    // Learning Category
    {
      id: 'learn-modules',
      type: 'quick_action',
      title: 'Show me learning modules',
      action: '/modules',
      description: 'Browse all available learning modules',
      icon: '📚',
      category: 'Learning'
    },
    {
      id: 'learn-green-tech',
      type: 'smart_question',
      title: 'Green technology modules',
      action: 'What learning modules are available about sustainable technology and green innovation?',
      description: 'Explore sustainable technology learning',
      icon: '🌱',
      category: 'Learning'
    },
    {
      id: 'learn-progress',
      type: 'quick_action',
      title: 'Check my progress',
      action: '/progress',
      description: 'See your learning statistics and completed modules',
      icon: '📊',
      category: 'Learning'
    },
    {
      id: 'learn-digital-skills',
      type: 'smart_question',
      title: 'Digital skills training',
      action: 'What digital skills training modules are available for career advancement?',
      description: 'Enhance your digital capabilities',
      icon: '💻',
      category: 'Learning'
    },

    // Career Category
    {
      id: 'career-green-economy',
      type: 'smart_question',
      title: 'Career paths in green economy',
      action: 'What career opportunities are available in Kenya\'s green economy and sustainability sector?',
      description: 'Explore green career opportunities',
      icon: '💼',
      category: 'Career'
    },
    {
      id: 'career-entrepreneurship',
      type: 'smart_question',
      title: 'Digital entrepreneurship guide',
      action: 'How can I start a digital business in Kenya? What skills and resources do I need?',
      description: 'Start your digital business journey',
      icon: '🚀',
      category: 'Career'
    },
    {
      id: 'career-remote-work',
      type: 'smart_question',
      title: 'Remote work opportunities',
      action: 'What remote work opportunities are available for Kenyan youth in the digital economy?',
      description: 'Find remote work opportunities',
      icon: '🌍',
      category: 'Career'
    },

    // Technology Category
    {
      id: 'tech-trends-kenya',
      type: 'smart_question',
      title: 'Latest tech trends in Kenya',
      action: 'What are the latest technology trends and innovations happening in Kenya right now?',
      description: 'Stay updated with tech trends',
      icon: '📱',
      category: 'Technology'
    },
    {
      id: 'tech-ai-ml',
      type: 'smart_question',
      title: 'Learn about AI and machine learning',
      action: 'How can I get started with artificial intelligence and machine learning? What resources are available?',
      description: 'Dive into AI and machine learning',
      icon: '🤖',
      category: 'Technology'
    },
    {
      id: 'tech-renewable-energy',
      type: 'smart_question',
      title: 'Renewable energy technologies',
      action: 'What renewable energy technologies are most relevant for Kenya\'s future?',
      description: 'Explore renewable energy tech',
      icon: '☀️',
      category: 'Technology'
    },

    // General Category
    {
      id: 'general-platform',
      type: 'smart_question',
      title: 'What is Kiongozi Platform?',
      action: 'Tell me about the Kiongozi Platform and how it can help me with my learning journey.',
      description: 'Learn about the platform',
      icon: '❓',
      category: 'General'
    },
    {
      id: 'general-transition',
      type: 'smart_question',
      title: 'Twin Green & Digital Transition',
      action: 'Explain Kenya\'s Twin Green and Digital Transition strategy and how it affects young people.',
      description: 'Understand Kenya\'s digital transformation',
      icon: '🔄',
      category: 'General'
    },

    // Quick Actions
    {
      id: 'search_command',
      type: 'quick_action',
      title: 'Search modules',
      action: '/search ',
      description: 'Type /search followed by keywords to find modules',
      icon: '🔍',
      category: 'Quick Actions'
    },
    {
      id: 'help_command',
      type: 'quick_action',
      title: 'Show commands',
      action: '/help',
      description: 'See all available chat commands',
      icon: '❓',
      category: 'Quick Actions'
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

      // Combine all suggestions with intelligent mixing
      const dynamicSuggestions = [
        ...featuredSuggestions,
        ...recentSuggestions,
        ...popularSuggestions
      ];

      // Mix dynamic suggestions with category-based suggestions
      const categoryBasedSelection = categoryBasedSuggestions
        .sort(() => Math.random() - 0.5) // Randomize for variety
        .slice(0, Math.max(2, maxSuggestions - dynamicSuggestions.length));

      const allSuggestions = [
        ...dynamicSuggestions,
        ...categoryBasedSelection
      ].slice(0, maxSuggestions);

      setSuggestions(allSuggestions);

      // Group by categories if requested
      if (showCategories) {
        // Group category-based suggestions by category
        const groupedByCategory = categoryBasedSuggestions.reduce((acc, suggestion) => {
          const category = suggestion.category || 'General';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(suggestion);
          return acc;
        }, {} as Record<string, ChatSuggestion[]>);

        const categorizedSuggestions: SuggestionCategory[] = [
          // Dynamic categories first
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
          // Category-based suggestions
          {
            id: 'learning',
            title: 'Learning',
            icon: '📚',
            suggestions: groupedByCategory['Learning'] || []
          },
          {
            id: 'career',
            title: 'Career',
            icon: '💼',
            suggestions: groupedByCategory['Career'] || []
          },
          {
            id: 'technology',
            title: 'Technology',
            icon: '🔬',
            suggestions: groupedByCategory['Technology'] || []
          },
          {
            id: 'actions',
            title: 'Quick Actions',
            icon: '⚡',
            suggestions: groupedByCategory['Quick Actions'] || []
          },
          {
            id: 'general',
            title: 'General',
            icon: '💡',
            suggestions: groupedByCategory['General'] || []
          }
        ].filter(category => category.suggestions.length > 0);

        setCategories(categorizedSuggestions);
      }

    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setError('Failed to load suggestions');
      // Fallback to category-based suggestions
      const fallbackSuggestions = categoryBasedSuggestions
        .sort(() => Math.random() - 0.5)
        .slice(0, maxSuggestions);
      setSuggestions(fallbackSuggestions);
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