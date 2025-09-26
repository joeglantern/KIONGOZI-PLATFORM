"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Edit3, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Conversation } from '../../types/chat';
import { formatTimestamp } from '../../utils/chatUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  isCollapsed?: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
  isCollapsed = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(conversation.title);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitle(conversation.title);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== conversation.title) {
      onRename(conversation.id, trimmedTitle);
    }
    setIsEditing(false);
    setEditingTitle(conversation.title);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditingTitle(conversation.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(conversation.id);
  };

  const truncateTitle = (title: string, maxLength: number = 25) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(conversation.id)}
              className={`w-full p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <MessageSquare
                size={18}
                className={isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-sm font-medium">{conversation.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatTimestamp(conversation.updatedAt)}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className="flex items-center w-full min-w-0 p-3 cursor-pointer"
        onClick={() => !isEditing && onSelect(conversation.id)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mr-3">
          <MessageSquare
            size={16}
            className={
              isActive
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400'
            }
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-grow">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm font-medium bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSave();
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Check size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCancel();
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X size={12} />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                {truncateTitle(conversation.title)}
              </div>
              {conversation.lastMessage && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                  {truncateTitle(conversation.lastMessage, 35)}
                </div>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {formatTimestamp(conversation.updatedAt)}
                {conversation.messageCount && (
                  <span className="ml-2">
                    {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (showActions || isActive) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0 flex items-center gap-1 ml-2"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditStart}
                    className="h-7 w-7 p-0 opacity-60 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Edit3 size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rename conversation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-60 hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">Delete conversation?</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This will permanently delete this conversation and all its messages.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        Cancel
                      </Button>
                    </PopoverTrigger>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ConversationItem;