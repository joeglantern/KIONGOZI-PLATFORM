"use client";

import React from 'react';
import { BookOpen, Clock, Users, Bookmark, BookmarkCheck } from 'lucide-react';
import type { ModuleSearchResultsProps } from '../../../types/lms-chat';

const ModuleSearchResults: React.FC<ModuleSearchResultsProps> = ({
  results,
  query,
  isLoading = false,
  onModuleSelect,
  onBookmark,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No modules found for "{query}"</p>
        <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm text-gray-600 mb-4">
        Found {results.length} module{results.length !== 1 ? 's' : ''} for "{query}"
      </div>

      {results.map((result) => {
        const { module, relevanceScore } = result;

        return (
          <div
            key={module.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onModuleSelect(module)}
                  className="text-left w-full group"
                >
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {module.description}
                  </p>
                </button>
              </div>

              <button
                onClick={() => onBookmark(module.id, true)}
                className="ml-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Bookmark module"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            {/* Module details */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{module.estimated_duration_minutes} min</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="capitalize">{module.difficulty_level}</span>
              </div>

              {module.view_count && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{module.view_count} views</span>
                </div>
              )}

              {module.category && (
                <div className="text-blue-600">
                  {module.category.name}
                </div>
              )}
            </div>

            {/* Keywords/tags if available */}
            {module.keywords && module.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {module.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
                {module.keywords.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{module.keywords.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Relevance indicator for high matches */}
            {relevanceScore > 0.8 && (
              <div className="mt-3 text-xs text-green-600 font-medium">
                High relevance match
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ModuleSearchResults;