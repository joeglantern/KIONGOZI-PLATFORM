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
  const getTypeColor = () => {
    switch (suggestion.type) {
      case 'featured_module':
        return 'bg-amber-500';
      case 'recent_module':
        return 'bg-blue-500';
      case 'trending_module':
        return 'bg-orange-500';
      case 'quick_action':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const handleClick = () => {
    onClick(suggestion);
  };

  if (variant === 'featured') {
    return (
      <button
        onClick={handleClick}
        className={`w-full p-4 text-left bg-white border-2 border-gray-100 hover:border-blue-200 rounded-lg transition-colors min-h-[44px] ${className}`}
        aria-label={`Suggestion: ${suggestion.title}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full ${getTypeColor()} mt-2 flex-shrink-0`} />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-1">{suggestion.title}</h3>
            {suggestion.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{suggestion.description}</p>
            )}
            {suggestion.module && (
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                <span className="uppercase font-medium">{suggestion.module.difficulty_level}</span>
                <span>•</span>
                <span>{suggestion.module.estimated_duration_minutes} minutes</span>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full p-3 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors min-h-[44px] ${className}`}
      aria-label={`Suggestion: ${suggestion.title}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-1.5 h-1.5 rounded-full ${getTypeColor()} flex-shrink-0`} />
        <span className="font-medium text-gray-900 truncate">{suggestion.title}</span>
      </div>
    </button>
  );
};

export default SuggestionCard;