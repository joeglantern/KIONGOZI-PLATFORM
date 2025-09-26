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
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '../../types/chat';

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
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-full bg-white border-r border-gray-300/40 flex flex-col relative shadow-sm"
    >
      {/* Modern Collapse Toggle */}
      <div className="absolute -right-3 top-6 z-10">
        <motion.button
          onClick={onToggleCollapse}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight size={12} />
          </motion.div>
        </motion.button>
      </div>

      {/* Header */}
      <div className="p-3 border-b border-gray-200/60">
        {isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                      U
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-center">
                    <p className="font-medium">User</p>
                    <p className="text-xs text-gray-500">Learning</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-2"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-indigo-500 text-white">
                U
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 truncate">User</h3>
              <p className="text-xs text-gray-500">Learning</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1">
        <div className="p-2 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            if (isCollapsed) {
              return (
                <TooltipProvider key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onNavigate?.(item.path)}
                        className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

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

        {/* Recent Chats */}
        {currentPath === '/chat' && (
          <div className="mt-6">
            {isCollapsed ? (
              <div className="px-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-full h-10"
                        onClick={onNewConversation}
                      >
                        <Plus size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>New Conversation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 flex items-center justify-between">
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
              </>
            )}
          </div>
        )}

        {/* Recent Conversations - Only show when expanded */}
        {!isCollapsed && currentPath === '/chat' && (
          <div>
            <ScrollArea className="px-2">
              <div className="space-y-0.5">
                {recentConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onConversationSelect(conv.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="truncate font-medium">{conv.title}</div>
                  </button>
                ))}

                {conversations.length > 5 && (
                  <button className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    View all {conversations.length} conversations
                  </button>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Quick Stats for non-chat pages */}
        {currentPath !== '/chat' && (
          <div className="mt-6">
            {isCollapsed ? (
              <div className="px-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800 cursor-pointer">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">60%</div>
                          <div className="text-xs text-blue-500 dark:text-blue-400">Progress</div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="text-center">
                        <p className="font-medium">Learning Progress</p>
                        <p className="text-xs text-gray-500 mt-1">12 of 20 modules completed</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <div className="px-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Modules</span>
                    <span className="text-gray-500">12/20</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-3 border-t border-gray-200/60"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full justify-start text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={14} className="mr-2" />
            Collapse
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CleanLMSSidebar;