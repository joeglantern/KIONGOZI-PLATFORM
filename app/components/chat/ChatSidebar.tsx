"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '../../types/chat';
import ConversationGroup from './ConversationGroup';
import ConversationSearch from './ConversationSearch';

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newTitle: string) => void;
  onNewConversation: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
  onNewConversation,
  isCollapsed,
  onToggleCollapse
}) => {
  // Group conversations by time periods like ChatGPT
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groupedConversations = {
    today: conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      return convDate >= today;
    }),
    yesterday: conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      return convDate >= yesterday && convDate < today;
    }),
    previous7Days: conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      return convDate >= sevenDaysAgo && convDate < yesterday;
    }),
    previous30Days: conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      return convDate >= thirtyDaysAgo && convDate < sevenDaysAgo;
    }),
    older: conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      return convDate < thirtyDaysAgo;
    })
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 64 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex-shrink-0 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversations
          </h2>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNewConversation}
                variant="ghost"
                size="icon"
                className={isCollapsed ? "w-full h-12" : "h-8 w-8"}
              >
                <Plus size={isCollapsed ? 20 : 16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "bottom"}>
              <p>New conversation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Search - only show in expanded mode */}
      {!isCollapsed && (
        <>
          <div className="px-4 pb-4">
            <ConversationSearch
              conversations={conversations}
              onConversationSelect={onConversationSelect}
              showCommandDialog={true}
            />
          </div>
          <Separator />
        </>
      )}

      {/* Conversations list */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2">
          {conversations.length === 0 ? (
            <div className="p-4 text-center">
              {!isCollapsed && (
                <div className="text-gray-500 dark:text-gray-400">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Plus size={20} className="opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs mt-1 opacity-75">Start chatting to see your conversations here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <ConversationGroup
                title="Today"
                conversations={groupedConversations.today}
                currentConversationId={currentConversationId}
                onConversationSelect={onConversationSelect}
                onConversationDelete={onConversationDelete}
                onConversationRename={onConversationRename}
                isCollapsed={isCollapsed}
                defaultExpanded={true}
              />

              <ConversationGroup
                title="Yesterday"
                conversations={groupedConversations.yesterday}
                currentConversationId={currentConversationId}
                onConversationSelect={onConversationSelect}
                onConversationDelete={onConversationDelete}
                onConversationRename={onConversationRename}
                isCollapsed={isCollapsed}
                defaultExpanded={true}
              />

              <ConversationGroup
                title="Previous 7 days"
                conversations={groupedConversations.previous7Days}
                currentConversationId={currentConversationId}
                onConversationSelect={onConversationSelect}
                onConversationDelete={onConversationDelete}
                onConversationRename={onConversationRename}
                isCollapsed={isCollapsed}
                defaultExpanded={false}
              />

              <ConversationGroup
                title="Previous 30 days"
                conversations={groupedConversations.previous30Days}
                currentConversationId={currentConversationId}
                onConversationSelect={onConversationSelect}
                onConversationDelete={onConversationDelete}
                onConversationRename={onConversationRename}
                isCollapsed={isCollapsed}
                defaultExpanded={false}
              />

              <ConversationGroup
                title="Older"
                conversations={groupedConversations.older}
                currentConversationId={currentConversationId}
                onConversationSelect={onConversationSelect}
                onConversationDelete={onConversationDelete}
                onConversationRename={onConversationRename}
                isCollapsed={isCollapsed}
                defaultExpanded={false}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with conversation count */}
      {!isCollapsed && conversations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default ChatSidebar;