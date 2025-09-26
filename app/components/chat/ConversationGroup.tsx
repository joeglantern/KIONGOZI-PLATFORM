"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Conversation } from '../../types/chat';
import ConversationItem from './ConversationItem';

interface ConversationGroupProps {
  title: string;
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newTitle: string) => void;
  isCollapsed?: boolean;
  defaultExpanded?: boolean;
}

const ConversationGroup: React.FC<ConversationGroupProps> = ({
  title,
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
  isCollapsed = false,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (conversations.length === 0) {
    return null;
  }

  if (isCollapsed) {
    // In collapsed mode, don't show group headers, just render conversations
    return (
      <div className="space-y-1">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={currentConversationId === conversation.id}
            onSelect={onConversationSelect}
            onDelete={onConversationDelete}
            onRename={onConversationRename}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <span className="uppercase tracking-wider">{title}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      {/* Conversations List */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 mt-2">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={currentConversationId === conversation.id}
                  onSelect={onConversationSelect}
                  onDelete={onConversationDelete}
                  onRename={onConversationRename}
                  isCollapsed={false}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConversationGroup;