"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  BookOpen,
  MessageCircle,
  TrendingUp,
  User,
  Plus,
  X,
  Search,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '../../types/chat';
import UserProfileWidget from './UserProfileWidget';
import LearningStatsWidget from './lms-integration/LearningStatsWidget';

interface CleanMobileMenuProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const CleanMobileMenu: React.FC<CleanMobileMenuProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  isOpen,
  onOpenChange,
  currentPath = '/chat',
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Modules', path: '/modules' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: TrendingUp, label: 'Progress', path: '/progress' },
  ];

  const quickActions = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    onOpenChange(false);
  };

  const handleConversationSelect = (id: string) => {
    onConversationSelect(id);
    onOpenChange(false);
  };

  // Match sidebar behavior exactly - always show first 5 recent conversations
  const recentConversations = conversations.slice(0, 5);

  // Apply search filter only for display, but keep the 5-item limit consistent
  const displayedConversations = searchQuery
    ? recentConversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentConversations;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header with User Profile */}
          <SheetHeader className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <UserProfileWidget
                  variant="compact"
                  className="border-0 p-0 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 flex-shrink-0"
              >
                <X size={16} />
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-6 py-4">
                {/* Navigation */}
                <div className="space-y-2 mb-6">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <motion.button
                      onClick={() => handleNavigate(item.path)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center space-x-3 px-4 py-4 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {/* Recent Chats */}
            <AnimatePresence>
              {currentPath === '/chat' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent</h4>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            onNewConversation();
                            onOpenChange(false);
                          }}
                          className="h-6 w-6"
                        >
                          <Plus size={14} />
                        </Button>
                      </motion.div>
                    </div>

                    {/* Search Input */}
                    {conversations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                        className="relative mb-3"
                      >
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-lg focus:border-blue-300 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-colors min-h-[44px]"
                        />
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <AnimatePresence>
                      {displayedConversations.map((conv, index) => (
                        <motion.div
                          key={conv.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                        >
                          <motion.button
                            onClick={() => handleConversationSelect(conv.id)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full text-left px-3 py-4 rounded-md text-sm transition-colors min-h-[44px] ${
                              currentConversationId === conv.id
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <div className="truncate font-medium">{conv.title}</div>
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {conv.lastMessage}
                            </div>
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* View all conversations link */}
                    {conversations.length > 5 && !searchQuery && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-50"
                      >
                        View all {conversations.length} conversations
                      </motion.button>
                    )}

                    {conversations.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center py-8"
                      >
                        <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No conversations yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
                      </motion.div>
                    )}

                    {/* Search Results Message */}
                    {searchQuery && displayedConversations.length === 0 && conversations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-6"
                      >
                        <Search className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No conversations found</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Learning Progress - Always show stats but adapt for chat view */}
            <motion.div
              className="mt-6 pt-4 border-t border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <LearningStatsWidget
                variant="compact"
                showProgress={true}
                showStreak={true}
                className="w-full shadow-sm hover:shadow-md transition-shadow duration-200"
                onStatsClick={() => {
                  // Navigate to progress page and close menu
                  handleNavigate('/progress');
                }}
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              className="mt-6 pt-4 border-t border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.path}
                      onClick={() => handleNavigate(action.path)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.2 }}
                      className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 min-h-[60px]"
                    >
                      <Icon size={18} className="text-gray-600 mb-1" />
                      <span className="text-xs font-medium text-gray-700">{action.label}</span>
                    </motion.button>
                  );
                })}
              </div>
                </motion.div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CleanMobileMenu;