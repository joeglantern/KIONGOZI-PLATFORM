"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Clock, Users, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookmarkButton from './BookmarkButton';
import type { LearningModule } from '../../types/lms';

interface BookmarksListProps {
  bookmarks: LearningModule[];
  message: string;
  onModuleSelect: (module: LearningModule) => void;
  onBookmarkChange?: (moduleId: string, isBookmarked: boolean) => void;
}

const BookmarksList: React.FC<BookmarksListProps> = ({
  bookmarks,
  message,
  onModuleSelect,
  onBookmarkChange
}) => {
  const handleBookmarkToggle = (moduleId: string, isBookmarked: boolean) => {
    onBookmarkChange?.(moduleId, isBookmarked);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-4 h-4 text-red-500" />
        <span className="font-medium text-gray-900">Your Bookmarks</span>
      </div>

      {/* Message */}
      <p className="text-sm text-gray-600 mb-4">{message}</p>

      {/* Bookmarks List */}
      {bookmarks.length > 0 ? (
        <div className="space-y-3">
          {bookmarks.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
            >
              {/* Module Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                    {module.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {module.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {module.is_featured && (
                    <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Featured
                    </div>
                  )}
                  <BookmarkButton
                    moduleId={module.id}
                    isBookmarked={true}
                    onBookmarkChange={(isBookmarked) => handleBookmarkToggle(module.id, isBookmarked)}
                    size="sm"
                  />
                </div>
              </div>

              {/* Module Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{module.estimated_duration_minutes} min</span>
                </div>

                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="capitalize">{module.difficulty_level}</span>
                </div>

                {module.view_count && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{module.view_count} learners</span>
                  </div>
                )}

                {module.category && (
                  <div className="text-blue-600">
                    {module.category.name}
                  </div>
                )}
              </div>

              {/* Keywords */}
              {module.keywords && module.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {module.keywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
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

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onModuleSelect(module)}
                  className="flex-1 h-8 text-xs"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Start Learning
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onModuleSelect(module)}
                  className="h-8 px-3"
                >
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">No bookmarks yet</h3>
          <p className="text-xs text-gray-600 mb-4">
            Save modules for later by using the bookmark button or typing:
          </p>
          <div className="bg-gray-100 rounded-lg p-3 max-w-xs mx-auto">
            <code className="text-xs text-gray-700">/bookmark [module name]</code>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {bookmarks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-center">
            <p className="text-xs text-gray-500">
              Use <code className="bg-gray-100 px-1 rounded">/bookmark [module]</code> to add more bookmarks
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarksList;