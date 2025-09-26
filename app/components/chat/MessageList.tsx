"use client";

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { MessageListProps } from '../../types/chat';
import MessageBubble from './MessageBubble';
import LoadingDots from './LoadingDots';

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  typingMessageId = null,
  onArtifactClick,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug messages when they change
  useEffect(() => {
    console.log('📋 [MessageList Debug] Messages received:', messages.length);
    console.log('📋 [MessageList Debug] Messages array:', messages);
    console.log('📋 [MessageList Debug] isLoading:', isLoading);
    console.log('📋 [MessageList Debug] typingMessageId:', typingMessageId);
  }, [messages, isLoading, typingMessageId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTypingComplete = (messageId: number) => {
    // This would typically be handled by parent component
    // Update message state to mark typing as complete
    console.log('Typing complete for message:', messageId);
  };

  return (
    <div className={`flex-grow overflow-y-auto custom-scrollbar h-[calc(100vh-160px)] sm:h-[calc(100vh-150px)] md:h-[calc(100vh-130px)] p-4 sm:px-6 sm:py-6 pt-16 sm:pt-16 md:pt-6 pb-32 transition-all duration-500 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Welcome message or empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                <Image
                  src="/images/ai-head-icon.svg"
                  alt="AI Assistant"
                  width={64}
                  height={64}
                  className="w-full h-full"
                />
              </div>
              <p className="text-lg font-medium mb-2">Ready to help!</p>
              <p className="text-sm">Start a conversation to get assistance.</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <MessageBubble
            key={`message-${message.id}`}
            message={message}
            isTyping={typingMessageId === message.id && !message.isTypingComplete}
            showAvatar={!message.isUser}
            onArtifactClick={onArtifactClick}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-start w-full my-6"
          >
            <div className="flex items-start w-full">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex items-center justify-center mr-3">
                <Image
                  src="/images/ai-head-icon.svg"
                  alt="AI Assistant"
                  width={28}
                  height={28}
                  className="w-full h-full"
                />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                <LoadingDots size="sm" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;