"use client";

import React from 'react';
import { motion } from 'framer-motion';
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
  PanelLeft
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
}

const CleanLMSSidebar: React.FC<CleanLMSSidebarProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  isCollapsed,
  onToggleCollapse,
  currentPath = '/chat',
  onNavigate
}) => {
  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Modules', path: '/modules' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: TrendingUp, label: 'Progress', path: '/progress' },
  ];

  const recentConversations = conversations.slice(0, 5);

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
                      onClick={onNewConversation}
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
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onNewConversation}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>

                  {/* Conversations List */}
                  <div className="px-2 pr-6 space-y-1 pb-4">
                    {recentConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onConversationSelect(conv.id)}
                        className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors ${
                          currentConversationId === conv.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="truncate font-medium">{conv.title}</div>
                      </button>
                    ))}

                    {conversations.length > 5 && (
                      <button className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-50">
                        View all {conversations.length} conversations
                      </button>
                    )}

                    {conversations.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No conversations yet
                      </div>
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

export default CleanLMSSidebar;