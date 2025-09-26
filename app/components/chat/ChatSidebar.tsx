"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiMessageSquare,
  FiTrash2,
  FiEdit3,
  FiSearch,
  FiMoreVertical
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatTimestamp } from '../../utils/chatUtils';
import type { Conversation } from '../../types/chat';

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onNewConversation,
  isCollapsed,
  onToggleCollapse
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditStart = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleEditSave = () => {
    // Future: implement conversation rename
    setEditingId(null);
    setEditingTitle('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDeleteConfirm = (id: string) => {
    onConversationDelete(id);
    setShowDeleteConfirm(null);
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
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

        <div className="flex items-center gap-1">
          {!isCollapsed && (
            <Button
              onClick={onNewConversation}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <FiPlus size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <>
          <div className="px-4 pb-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:border-transparent text-gray-900 dark:text-gray-100 transition-all"
              />
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* New conversation button for collapsed state */}
      {isCollapsed && (
        <div className="p-2">
          <Button
            onClick={onNewConversation}
            variant="ghost"
            size="icon"
            className="w-full h-12"
          >
            <FiPlus size={20} />
          </Button>
        </div>
      )}

      {/* Conversations list */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          <AnimatePresence>
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                {!isCollapsed && (
                  <div className="text-gray-500 dark:text-gray-400">
                    <FiMessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchTerm ? 'No conversations found' : 'No conversations yet'}
                    </p>
                    <p className="text-xs mt-1 opacity-75">Start a new conversation!</p>
                  </div>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative w-full rounded-md transition-colors cursor-pointer ${
                    currentConversationId === conversation.id
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                  title={isCollapsed ? conversation.title : ''}
                >
                  <div className={`flex items-center w-full min-w-0 p-3 ${isCollapsed ? 'px-3' : ''}`}>
                    <div className="flex-shrink-0 mr-3">
                      <FiMessageSquare
                        size={16}
                        className={
                          currentConversationId === conversation.id
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      />
                    </div>

                    {!isCollapsed && (
                      <div className="min-w-0 flex-grow text-left">
                        {editingId === conversation.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            className="w-full text-sm font-medium bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                              {truncateTitle(conversation.title)}
                            </div>
                            {conversation.lastMessage && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                                {truncateTitle(conversation.lastMessage, 40)}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTimestamp(conversation.updatedAt || new Date().toISOString())}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Actions menu - Now separate from main click area */}
                    {!isCollapsed && (
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <div className="flex gap-1">
                          <button
                            className="h-6 w-6 rounded-sm flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(conversation);
                            }}
                            title="Rename conversation"
                          >
                            <FiEdit3 size={12} />
                          </button>
                          <button
                            className="h-6 w-6 rounded-sm flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(conversation.id);
                            }}
                            title="Delete conversation"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteConfirm(showDeleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ChatSidebar;