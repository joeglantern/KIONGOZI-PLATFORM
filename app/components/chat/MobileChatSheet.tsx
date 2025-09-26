"use client";

import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Conversation } from '../../types/chat';
import ConversationGroup from './ConversationGroup';
import ConversationSearch from './ConversationSearch';

interface MobileChatSheetProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newTitle: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const MobileChatSheet: React.FC<MobileChatSheetProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
  onNewConversation,
  isOpen,
  onOpenChange,
  trigger
}) => {
  // Group conversations by time periods
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

  const handleConversationSelect = (id: string) => {
    onConversationSelect(id);
    onOpenChange(false); // Close sheet after selection
  };

  const handleNewConversation = () => {
    onNewConversation();
    onOpenChange(false); // Close sheet after creating new conversation
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">
                Conversations
              </SheetTitle>
              <Button
                onClick={handleNewConversation}
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Plus size={16} />
              </Button>
            </div>
          </SheetHeader>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <ConversationSearch
              conversations={conversations}
              onConversationSelect={handleConversationSelect}
              placeholder="Search conversations..."
            />
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1 opacity-75">
                      Start a new conversation to get started!
                    </p>
                  </div>
                  <Button
                    onClick={handleNewConversation}
                    size="sm"
                    className="mt-4"
                  >
                    <Plus size={16} className="mr-2" />
                    New Conversation
                  </Button>
                </div>
              ) : (
                <>
                  <ConversationGroup
                    title="Today"
                    conversations={groupedConversations.today}
                    currentConversationId={currentConversationId}
                    onConversationSelect={handleConversationSelect}
                    onConversationDelete={onConversationDelete}
                    onConversationRename={onConversationRename}
                    defaultExpanded={true}
                  />

                  <ConversationGroup
                    title="Yesterday"
                    conversations={groupedConversations.yesterday}
                    currentConversationId={currentConversationId}
                    onConversationSelect={handleConversationSelect}
                    onConversationDelete={onConversationDelete}
                    onConversationRename={onConversationRename}
                    defaultExpanded={true}
                  />

                  <ConversationGroup
                    title="Previous 7 days"
                    conversations={groupedConversations.previous7Days}
                    currentConversationId={currentConversationId}
                    onConversationSelect={handleConversationSelect}
                    onConversationDelete={onConversationDelete}
                    onConversationRename={onConversationRename}
                    defaultExpanded={false}
                  />

                  <ConversationGroup
                    title="Previous 30 days"
                    conversations={groupedConversations.previous30Days}
                    currentConversationId={currentConversationId}
                    onConversationSelect={handleConversationSelect}
                    onConversationDelete={onConversationDelete}
                    onConversationRename={onConversationRename}
                    defaultExpanded={false}
                  />

                  <ConversationGroup
                    title="Older"
                    conversations={groupedConversations.older}
                    currentConversationId={currentConversationId}
                    onConversationSelect={handleConversationSelect}
                    onConversationDelete={onConversationDelete}
                    onConversationRename={onConversationRename}
                    defaultExpanded={false}
                  />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
              <span>Swipe right to close</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileChatSheet;