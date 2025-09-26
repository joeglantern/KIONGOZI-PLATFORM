"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Conversation } from '../../types/chat';
import UserStats from './UserStats';
import NavigationMenu from './NavigationMenu';
import RecentConversations from './RecentConversations';
import ProgressIndicator from './ProgressIndicator';

interface LMSSidebarProps {
  // Conversation props (for the chat functionality)
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newTitle: string) => void;
  onNewConversation: () => void;

  // Navigation props
  currentPath?: string;
  onNavigate?: (path: string) => void;

  // UI props
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // User props
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

const LMSSidebar: React.FC<LMSSidebarProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
  onNewConversation,
  currentPath = '/chat',
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  user
}) => {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleViewAllConversations = () => {
    // Navigate to full chat view or open chat modal
    handleNavigate('/chat');
  };

  const handleViewProgress = () => {
    handleNavigate('/progress');
  };

  const handleContinueLearning = (moduleId: string) => {
    handleNavigate(`/modules/${moduleId}`);
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 64 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex-shrink-0 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
    >
      {/* User Stats Header */}
      <UserStats
        isCollapsed={isCollapsed}
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Navigation Menu */}
        <div className="flex-shrink-0">
          <NavigationMenu
            isCollapsed={isCollapsed}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
        </div>

        <Separator className="my-2" />

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {/* Learning Progress - Only show when not on chat page */}
            {currentPath !== '/chat' && (
              <>
                <ProgressIndicator
                  isCollapsed={isCollapsed}
                  onViewProgress={handleViewProgress}
                  onContinueLearning={handleContinueLearning}
                />
                <Separator className="my-2" />
              </>
            )}

            {/* Recent Conversations - Always show but limited */}
            <RecentConversations
              conversations={conversations}
              currentConversationId={currentConversationId}
              onConversationSelect={onConversationSelect}
              onNewConversation={onNewConversation}
              onViewAll={handleViewAllConversations}
              isCollapsed={isCollapsed}
              limit={currentPath === '/chat' ? 8 : 4}
            />

            {/* Featured Modules Section - Only when collapsed or not on modules page */}
            {(isCollapsed || !currentPath.startsWith('/modules')) && (
              <>
                <Separator className="my-2" />
                <FeaturedModulesSection
                  isCollapsed={isCollapsed}
                  onNavigate={handleNavigate}
                />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Collapse Toggle */}
        {!isCollapsed && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Kiongozi LMS</span>
              <button
                onClick={onToggleCollapse}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Collapse
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Featured Modules Mini-Section
const FeaturedModulesSection: React.FC<{
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
}> = ({ isCollapsed, onNavigate }) => {
  if (isCollapsed) {
    return (
      <div className="px-3 py-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => onNavigate('/modules')}
          className="w-full aspect-square bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-lg flex items-center justify-center border border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 transition-all"
        >
          <span className="text-lg">📚</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="px-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">📚</span>
          Quick Learning
        </h3>
      </div>

      <div className="px-3 space-y-2">
        <motion.button
          whileHover={{ x: 2 }}
          onClick={() => onNavigate('/modules/featured')}
          className="w-full text-left p-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-100 dark:border-green-800 hover:border-green-200 dark:hover:border-green-700 transition-all"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-sm">🌱</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Green Technology
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                3 new modules
              </div>
            </div>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ x: 2 }}
          onClick={() => onNavigate('/modules/digital-skills')}
          className="w-full text-left p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800 hover:border-blue-200 dark:hover:border-blue-700 transition-all"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-sm">💻</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Digital Skills
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                5 trending
              </div>
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default LMSSidebar;