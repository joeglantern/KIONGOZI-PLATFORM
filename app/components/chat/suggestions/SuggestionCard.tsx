"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Clock, ArrowRight } from 'lucide-react';
import type { SuggestionCardProps } from '../../../types/lms-chat';

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onClick,
  variant = 'default',
  className = ''
}) => {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'featured_module':
        return <Sparkles className="w-4 h-4" />;
      case 'recent_module':
        return <Clock className="w-4 h-4" />;
      case 'quick_action':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return 'p-2 text-xs';
      case 'featured':
        return 'p-4 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50';
      default:
        return 'p-3 text-sm';
    }
  };

  const handleClick = () => {
    onClick(suggestion);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`
        w-full text-left rounded-lg border border-gray-200 bg-white
        hover:bg-gray-50 transition-all duration-200 shadow-sm
        hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        min-h-[44px] // Mobile touch target minimum
        ${getVariantStyles()}
        ${className}
      `}
      aria-label={`Suggestion: ${suggestion.title}`}
    >
      <div className="flex items-start gap-2 w-full">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5 text-gray-500">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {suggestion.title}
          </div>

          {suggestion.description && variant !== 'compact' && (
            <div className="text-gray-600 text-xs mt-1 line-clamp-2">
              {suggestion.description}
            </div>
          )}

          {suggestion.module && variant === 'featured' && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {suggestion.module.difficulty_level}
              </span>
              <span>{suggestion.module.estimated_duration_minutes} min</span>
            </div>
          )}
        </div>

        {/* Action indicator */}
        <div className="flex-shrink-0 text-gray-400">
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </motion.button>
  );
};

export default SuggestionCard;