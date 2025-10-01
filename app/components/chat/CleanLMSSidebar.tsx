"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  BookOpen,
  MessageCircle,
  TrendingUp,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeft,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '../../types/chat';
import LearningStatsWidget from './lms-integration/LearningStatsWidget';

interface CleanLMSSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  conversationsLoading?: boolean;
  conversationsError?: string | null;
  hasMoreConversations?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
}

const CleanLMSSidebar: React.FC<CleanLMSSidebarProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  isCollapsed,
  onToggleCollapse,
  currentPath = '/chat',
  onNavigate,
  conversationsLoading = false,
  conversationsError = null,
  hasMoreConversations = false,
  isLoadingMore = false,
  onLoadMore
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Modules', path: '/modules' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: TrendingUp, label: 'Progress', path: '/progress' },
  ];

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations.slice(0, 8); // Show more recent conversations with pagination
    }

    return conversations
      .filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      ); // Show all search results
  }, [conversations, searchQuery]);

  const displayConversations = filteredConversations;

  // Handle conversation navigation with URL routing
  const handleConversationClick = (conversation: Conversation) => {
    // Add loading state during navigation
    const targetUrl = conversation.slug
      ? `/chats/${conversation.slug}`
      : `/chats/${conversation.id}`;

    // Only navigate if we're not already on this conversation
    if (!pathname.includes(conversation.slug || conversation.id)) {
      router.push(targetUrl);
      // Also call the original callback for state management
      onConversationSelect(conversation.id);
    }
  };

  // Handle new conversation navigation
  const handleNewConversation = () => {
    router.push('/chat');
    onNewConversation();
  };

  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    } else if (diffInHours > 0) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    } else if (diffInMinutes > 0) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 320 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-full max-h-screen bg-white border-r border-gray-300/40 flex flex-col relative shadow-sm overflow-visible"
    >
      {/* Sidebar Collapse Toggle - Positioned at sidebar edge */}
      <div className="absolute -right-3 top-3 z-20">
        <motion.button
          onClick={onToggleCollapse}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-6 h-6 bg-white border border-gray-300 rounded-md shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <PanelLeft
            size={14}
            className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
          />
        </motion.button>
      </div>

      {/* Header */}
      <div className="p-3 border-b border-gray-200/60">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">Kiongozi Platform</h3>
              <p className="text-xs text-gray-500">Learning Management System</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Content Area */}
      {isCollapsed ? (
        /* Collapsed View - Icon Only Navigation */
        <div className="flex flex-col items-center py-4 space-y-3">
          {/* Navigation Icons */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <TooltipProvider key={item.path}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onNavigate?.(item.path)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-200 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Progress Widget - Minimal */}
          <div className="mt-4 px-2">
            <LearningStatsWidget
              variant="minimal"
              showProgress={true}
              showStreak={false}
              className="w-full"
            />
          </div>

          {/* New Chat Button */}
          {currentPath === '/chat' && (
            <div className="px-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleNewConversation}
                      className="w-full h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>New Conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      ) : (
        /* Expanded View - Full Sidebar */
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {/* Navigation */}
              <div className="p-2 pr-6 space-y-0.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;

                  return (
                    <button
                      key={item.path}
                      onClick={() => onNavigate?.(item.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Learning Stats Widget */}
              <div className="px-2 pr-6">
                <LearningStatsWidget
                  variant="compact"
                  showProgress={true}
                  showStreak={true}
                  className="w-full"
                />
              </div>

              {/* Recent Chats Section */}
              {currentPath === '/chat' && (
                <div>
                  {/* Recent Chats Header */}
                  <div className="px-3 pr-6 py-2 flex items-center justify-between">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {searchQuery ? 'Search Results' : 'Recent'}
                    </h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleNewConversation}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>

                  {/* Search Input */}
                  <div className="px-3 pr-6 pb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conversations List */}
                  <div className="px-2 pr-6 space-y-1 pb-4">
                    {/* Loading State */}
                    {conversationsLoading && (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-full px-3 py-3 rounded-md">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 bg-gray-100 rounded mt-2 w-3/4 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Error State */}
                    {conversationsError && !conversationsLoading && (
                      <div className="text-center py-6 px-3">
                        <div className="text-red-500 text-sm mb-2">⚠️ {conversationsError}</div>
                        <button
                          onClick={onNewConversation}
                          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Start a new conversation
                        </button>
                      </div>
                    )}

                    {/* Conversations */}
                    {!conversationsLoading && !conversationsError && (
                      <>
                        {displayConversations.map((conv) => (
                          <div
                            key={conv.id}
                            onClick={() => handleConversationClick(conv)}
                            className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors cursor-pointer ${
                              currentConversationId === conv.id
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <div className="flex-1 truncate font-medium mb-1">
                              {conv.title}
                            </div>
                            {conv.lastMessage && (
                              <div className="truncate text-xs text-gray-500 mb-1">
                                {conv.lastMessage}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>
                                {conv.messageCount ? `${conv.messageCount} messages` : ''}
                              </span>
                              <span>
                                {conv.updatedAt && formatTimestamp(conv.updatedAt)}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Load More Button */}
                        {!searchQuery && hasMoreConversations && onLoadMore && (
                          <button
                            onClick={onLoadMore}
                            disabled={isLoadingMore}
                            className="w-full text-left px-3 py-3 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isLoadingMore ? (
                              <>
                                <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                                Loading more...
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                Load more conversations
                              </>
                            )}
                          </button>
                        )}

                        {searchQuery && displayConversations.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            No conversations found for "{searchQuery}"
                          </div>
                        )}

                        {!searchQuery && conversations.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No conversations yet
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}


    </motion.div>
  );
};

export default React.memo(CleanLMSSidebar);