"use client";

import React, { useState, useEffect } from 'react';
import { Search, Clock, MessageSquare } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import type { Conversation } from '../../types/chat';
import { formatTimestamp } from '../../utils/chatUtils';

interface ConversationSearchProps {
  conversations: Conversation[];
  onConversationSelect: (id: string) => void;
  placeholder?: string;
  showCommandDialog?: boolean;
}

const ConversationSearch: React.FC<ConversationSearchProps> = ({
  conversations,
  onConversationSelect,
  placeholder = "Search conversations...",
  showCommandDialog = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Command palette shortcut (Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    if (showCommandDialog) {
      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
    }
  }, [showCommandDialog]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    search === '' ||
    conv.title.toLowerCase().includes(search.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  // Group recent conversations (last 5)
  const recentConversations = conversations
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleSelect = (conversationId: string) => {
    onConversationSelect(conversationId);
    setOpen(false);
    setSearch('');
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (showCommandDialog) {
    return (
      <>
        <Button
          variant="outline"
          className="relative h-9 w-full justify-start text-sm font-normal text-gray-500 dark:text-gray-400"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          Search conversations...
          <CommandShortcut className="ml-auto">⌘K</CommandShortcut>
        </Button>

        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No conversations found.</CommandEmpty>

            {search === '' && recentConversations.length > 0 && (
              <CommandGroup heading="Recent">
                {recentConversations.map((conversation) => (
                  <CommandItem
                    key={conversation.id}
                    value={conversation.id}
                    onSelect={() => handleSelect(conversation.id)}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {conversation.title}
                      </div>
                      {conversation.lastMessage && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {truncateText(conversation.lastMessage, 60)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatTimestamp(conversation.updatedAt)}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {search !== '' && (
              <CommandGroup heading={`Results (${filteredConversations.length})`}>
                {filteredConversations.map((conversation) => (
                  <CommandItem
                    key={conversation.id}
                    value={conversation.id}
                    onSelect={() => handleSelect(conversation.id)}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {conversation.title}
                      </div>
                      {conversation.lastMessage && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {truncateText(conversation.lastMessage, 60)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(conversation.updatedAt)}
                        {conversation.messageCount && (
                          <span>• {conversation.messageCount} messages</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>
      </>
    );
  }

  // Simple search input for mobile/inline use
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 transition-all"
      />

      {/* Search results dropdown for inline search */}
      {search && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No conversations found
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelect(conversation.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                    {conversation.title}
                  </div>
                  {conversation.lastMessage && (
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {truncateText(conversation.lastMessage, 50)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(conversation.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationSearch;