"use client";

import React from 'react';
import { Search, TrendingUp, ThumbsUp, HelpCircle, CheckCircle, Folder, Heart, Bookmark, User } from 'lucide-react';
import ModuleSearchResults from './lms-integration/ModuleSearchResults';
import CategoryBrowse from './CategoryBrowse';
import BookmarksList from './BookmarksList';
import UserProfileWidget from './UserProfileWidget';
import type { LearningModule } from '../../types/lms';

interface CommandResponseBubbleProps {
  response: any;
  onModuleSelect: (module: LearningModule) => void;
  onBookmark: (moduleId: string, bookmarked: boolean) => void;
}

const CommandResponseBubble: React.FC<CommandResponseBubbleProps> = ({
  response,
  onModuleSelect,
  onBookmark
}) => {
  const renderContent = () => {
    switch (response.type) {
      case 'search_results':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900">Search Results</span>
            </div>
            <ModuleSearchResults
              results={response.results}
              query={response.query}
              onModuleSelect={onModuleSelect}
              onBookmark={onBookmark}
            />
          </div>
        );

      case 'progress_summary':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium text-gray-900">Your Progress</span>
            </div>
            <div className="space-y-3">
              {response.data.stats && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">
                        {response.data.stats.modules_completed || 0}
                      </div>
                      <div className="text-gray-600">Modules completed</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {Math.round(response.data.stats.completion_rate || 0)}%
                      </div>
                      <div className="text-gray-600">Overall progress</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'recommendations':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-900">Recommended for You</span>
            </div>
            <div className="space-y-3">
              {response.data.map((rec: any) => (
                <div key={rec.module.id} className="border border-gray-200 rounded-lg p-3">
                  <button
                    onClick={() => onModuleSelect(rec.module)}
                    className="text-left w-full"
                  >
                    <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {rec.module.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {rec.module.estimated_duration_minutes} minutes • {rec.module.difficulty_level}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'module_completion':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-medium text-gray-900">Module Completed!</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <div className="font-medium text-gray-900 mb-2">
                  {response.message}
                </div>
                {response.module && (
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">{response.module.title}</div>
                    <div className="text-xs mt-1">
                      {response.module.estimated_duration_minutes} minutes • {response.module.difficulty_level}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'category_browse':
        return (
          <CategoryBrowse
            categoryName={response.categoryName}
            modules={response.modules || []}
            categories={response.categories}
            onModuleSelect={onModuleSelect}
            onCategorySelect={(categoryName) => {
              // This could trigger a new browse command
              console.log('Category selected:', categoryName);
            }}
          />
        );

      case 'bookmark_action':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-medium text-gray-900">Bookmark Added!</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl mb-3">🔖</div>
                <div className="font-medium text-gray-900 mb-2">
                  {response.message}
                </div>
                {response.module && (
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">{response.module.title}</div>
                    <div className="text-xs mt-1">
                      {response.module.estimated_duration_minutes} minutes • {response.module.difficulty_level}
                    </div>
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-500">
                  View all your bookmarks with <code className="bg-gray-100 px-1 rounded">/bookmarks</code>
                </div>
              </div>
            </div>
          </div>
        );

      case 'bookmarks_list':
        return (
          <BookmarksList
            bookmarks={response.bookmarks || []}
            message={response.message}
            onModuleSelect={onModuleSelect}
            onBookmarkChange={(moduleId, isBookmarked) => {
              // Handle bookmark change
              console.log('Bookmark changed:', moduleId, isBookmarked);
            }}
          />
        );

      case 'user_profile':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900">Your Profile</span>
            </div>
            <UserProfileWidget variant="detailed" />
          </div>
        );

      case 'help':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900">Available Commands</span>
            </div>
            <div className="space-y-3">
              {response.commands.map((cmd: any) => (
                <div key={cmd.command} className="border-l-2 border-blue-200 pl-3">
                  <div className="font-mono text-sm font-medium text-blue-600">
                    {cmd.command}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {cmd.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Example: <code className="bg-gray-100 px-1 rounded">{cmd.example}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            Unsupported response type: {response.type}
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-2xl">
      {renderContent()}
    </div>
  );
};

export default CommandResponseBubble;