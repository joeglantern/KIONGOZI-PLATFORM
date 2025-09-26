"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '../../types/chat';
import { formatTimestamp } from '../../utils/chatUtils';

interface RecentConversationsProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  onViewAll: () => void;
  isCollapsed?: boolean;
  limit?: number;
}

const RecentConversations: React.FC<RecentConversationsProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onViewAll,
  isCollapsed = false,
  limit = 4
}) => {
  const recentConversations = conversations
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);

  const truncateTitle = (title: string, maxLength: number = 25) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  const truncateMessage = (message: string, maxLength: number = 35) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  if (isCollapsed) {
    return (
      <div className="py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNewConversation}
                variant="ghost"
                size="icon"
                className="w-full h-10 mb-1"
              >
                <Plus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>New Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="space-y-1">
          {recentConversations.slice(0, 3).map((conversation) => (
            <TooltipProvider key={conversation.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onConversationSelect(conversation.id)}
                    className={`w-full p-2 rounded-lg transition-all duration-200 ${
                      currentConversationId === conversation.id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <MessageSquare size={16} />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="max-w-48">
                    <p className="font-medium">{conversation.title}</p>
                    {conversation.lastMessage && (
                      <p className="text-xs text-gray-500 mt-1">
                        {truncateMessage(conversation.lastMessage, 50)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(conversation.updatedAt)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}

          {conversations.length > 3 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onViewAll}
                    variant="ghost"
                    size="icon"
                    className="w-full h-8 opacity-60 hover:opacity-100"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>View all conversations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-3 mb-3">
        <div className="flex items-center">
          <MessageSquare size={16} className="text-gray-600 dark:text-gray-400 mr-2" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Chats
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <Button
            onClick={onNewConversation}
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100"
          >
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-1 px-1">
        {recentConversations.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent chats</p>
              <Button
                onClick={onNewConversation}
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
              >
                Start your first chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            {recentConversations.map((conversation) => (
              <motion.button
                key={conversation.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onConversationSelect(conversation.id)}
                className={`w-full text-left p-2 rounded-lg transition-all duration-200 group ${
                  currentConversationId === conversation.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-2 mt-0.5">
                    <MessageSquare size={14} className="opacity-60" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate mb-1">
                      {truncateTitle(conversation.title)}
                    </div>

                    {conversation.lastMessage && (
                      <div className="text-xs opacity-75 truncate mb-1">
                        {truncateMessage(conversation.lastMessage)}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs opacity-60">
                      <span>{formatTimestamp(conversation.updatedAt)}</span>
                      {conversation.messageCount && (
                        <span className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                          {conversation.messageCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}

            {/* View All Button */}
            {conversations.length > limit && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-2"
              >
                <Button
                  onClick={onViewAll}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs py-2 opacity-60 hover:opacity-100"
                >
                  View all {conversations.length} conversations
                  <ChevronRight size={12} className="ml-1" />
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecentConversations;