"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { MessageListProps, Message } from '../../types/chat';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // ChatGPT-style scroll behavior: automatically scroll only when user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // Only consider it "near bottom" if really close (within 50px) or at actual bottom
      const veryNearBottom = distanceFromBottom < 50;
      setIsNearBottom(veryNearBottom);

      // Track manual scrolling - if user scrolls up more than 200px from bottom
      if (distanceFromBottom > 200) {
        setUserHasScrolled(true);
      } else if (distanceFromBottom < 50) {
        // User is back at bottom, reset the flag
        setUserHasScrolled(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [userHasScrolled]);


  // ChatGPT-style positioning: new message at top when user sends
  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // If it's a user message, position it at the top of viewport
    if (lastMessage.isUser) {
      // Get the last message element
      const messageElements = container.querySelectorAll('.message-container');
      const lastMessageElement = messageElements[messageElements.length - 1] as HTMLElement;

      if (lastMessageElement) {
        // Calculate scroll position to put the message at top
        const messageOffsetTop = lastMessageElement.offsetTop;
        container.scrollTo({
          top: messageOffsetTop,
          behavior: 'smooth'
        });
      }
    } else {
      // For AI responses, only auto-scroll if user is near bottom
      const shouldAutoScroll = isNearBottom && !userHasScrolled;

      if (shouldAutoScroll) {
        const scrollTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          });
        }, 100);

        return () => clearTimeout(scrollTimeout);
      }
    }
  }, [messages, isNearBottom, userHasScrolled]);

  // Progressive scroll during typing
  useEffect(() => {
    if (typingMessageId !== null && isNearBottom && !userHasScrolled) {
      const container = containerRef.current;
      if (!container) return;

      const progressiveScroll = setInterval(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

        if (distanceFromBottom > 100) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 1000);

      return () => clearInterval(progressiveScroll);
    }
  }, [typingMessageId, isNearBottom, userHasScrolled]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      setUserHasScrolled(false);
    }
  };

  return (
    <div className="relative flex-grow h-full overflow-hidden">
      <div
        ref={containerRef}
        className={`h-full overflow-y-auto custom-scrollbar scroll-container p-4 sm:px-6 sm:py-4 pb-32 transition-all duration-500 ${className}`}>
      <div className="max-w-3xl mx-auto">
        {/* Welcome message or empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                <Image
                  src="/Kiongozi.png"
                  alt="Kiongozi"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-lg font-medium mb-2">Ready to help!</p>
              <p className="text-sm">Start a conversation to get assistance.</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div key={`message-${message.id}`} className="message-container">
            <MessageBubble
              message={message}
              isTyping={typingMessageId === message.id && !message.isTypingComplete}
              showAvatar={!message.isUser}
              onArtifactClick={onArtifactClick}
            />
          </div>
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
                  src="/Kiongozi.png"
                  alt="Kiongozi"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <LoadingDots size="sm" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      </div>

      {/* ChatGPT-style scroll to bottom button */}
      <AnimatePresence>
        {!isNearBottom && (
          <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToBottom}
          className="absolute bottom-20 right-4 sm:right-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 z-10 group"
          aria-label="Scroll to bottom"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;