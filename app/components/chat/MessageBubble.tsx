"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { MessageBubbleProps } from '../../types/chat';
import { processMarkdown } from '../../utils/messageProcessing';
import { useChatContext } from './ChatProvider';
import MagicalTypewriter from './MagicalTypewriter';
import CompactArtifact from '../artifacts/CompactArtifact';
import ResearchOutput from '../ResearchOutput';
import CommandResponseBubble from './CommandResponseBubble';
import CommandResponseCard from './CommandResponseCard';

// Copy icon component
const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

// Checkmark icon component
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Regenerate icon component
const RegenerateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isTyping = false,
  showAvatar = true,
  onArtifactClick,
  isLastAiMessage = false,
  onRegenerate
}) => {
  const { settings } = useChatContext();
  const { darkMode } = settings;
  const [isCopied, setIsCopied] = useState(false);

  const isWelcomeMessage = message.text?.includes('What can I do for you?') || false;
  const isUser = message.isUser;

  const handleCopyMessage = async () => {
    if (!message.text) return;

    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleTypingComplete = () => {
    // This would typically be handled by parent component
    // For now, we'll just mark the message as complete locally
  };

  const handleArtifactUpdate = (updatedArtifact: any) => {
    // This would typically be handled by parent component
  };

  const renderMessageContent = () => {

    if (isUser) {
      return (
        <div className="text-white font-medium text-base">
          {message.text}
        </div>
      );
    }

    // Command response content (check this FIRST before checking for empty text)
    if (message.commandResponse) {
      // Check if it's our enhanced command response
      if (message.commandResponse.type === 'command_response') {
        return (
          <CommandResponseCard
            response={message.commandResponse}
            darkMode={darkMode}
            onModulePress={(module) => {
              // Handle module selection - could open module details or start module
              console.log('Module selected:', module);
            }}
            onCategoryPress={(category) => {
              // Handle category selection
              console.log('Category selected:', category);
            }}
          />
        );
      } else {
        // Fall back to existing CommandResponseBubble for legacy responses
        return (
          <CommandResponseBubble
            response={message.commandResponse}
            onModuleSelect={(module) => {
              // Handle module selection - could open module details or start module
              console.log('Module selected:', module);
            }}
            onBookmark={(moduleId, bookmarked) => {
              // Handle bookmark action
              console.log('Bookmark action:', moduleId, bookmarked);
            }}
          />
        );
      }
    }

    // AI message content
    if (message.type === 'research' && message.researchData) {
      return isTyping && !message.isTypingComplete ? (
        <MagicalTypewriter
          text={message.text}
          onComplete={handleTypingComplete}
          className="prose prose-lg max-w-none"
        />
      ) : (
        <ResearchOutput
          research={message.researchData}
          isTypingComplete={message.isTypingComplete || false}
          onTopicClick={() => {}} // This would be passed from parent
        />
      );
    }

    // Handle empty or missing AI message content (check this AFTER command responses)
    if (!message.text || message.text.trim() === '' || message.text === '...') {
      return (
        <div className="flex items-center gap-1 py-2">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1s' }}
            />
            <span
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '150ms', animationDuration: '1s' }}
            />
            <span
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '300ms', animationDuration: '1s' }}
            />
          </div>
        </div>
      );
    }

    // Regular chat message with proper styling and typewriter effect
    const shouldUseTypewriter = isTyping && !message.isTypingComplete && message.text.length > 0;


    if (shouldUseTypewriter) {
      return (
        <MagicalTypewriter
          text={message.text}
          onComplete={handleTypingComplete}
          className="prose prose-sm max-w-none text-gray-900 [&>p]:text-base [&>p]:leading-6"
        />
      );
    } else {
      // Render markdown content immediately
      const processedContent = processMarkdown(message.text);

      return (
        <div
          className="prose prose-sm max-w-none text-gray-900 [&>p]:text-base [&>p]:leading-6"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      );
    }
  };

  return (
    <motion.div
      className={`${isUser ? 'flex justify-end my-4' : 'w-full my-6'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isUser ? [0.98, 1.02, 1] : 1,
        rotate: isUser ? [0, 1, 0] : 0
      }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        scale: { duration: 0.4, ease: "easeInOut" },
        rotate: { duration: 0.3, ease: "easeInOut" }
      }}
    >
      {isUser ? (
        /* User Message - Keep as bubble */
        <div className="relative max-w-[85vw] sm:max-w-xl px-4 sm:px-5 py-3 sm:py-4 shadow-sm bg-blue-500 text-white rounded-3xl rounded-br-lg">
          {renderMessageContent()}
        </div>
      ) : (
        /* AI Message - No bubble, full width, rich text */
        <div className="group w-full max-w-4xl mx-auto">
          {/* AI Avatar */}
          {showAvatar && (
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Assistant
              </span>
            </div>
          )}

          {/* AI Message Content - Full width, no background */}
          <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
            {renderMessageContent()}
          </div>

          {/* Action buttons - only show for completed messages with text */}
          {message.text && message.text.trim() !== '' && message.text !== '...' && !isTyping && (
            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity duration-200">
              <button
                onClick={handleCopyMessage}
                className={`
                  p-1.5 rounded-md transition-all duration-200
                  ${isCopied
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
                title={isCopied ? 'Copied!' : 'Copy message'}
              >
                {isCopied ? <CheckIcon /> : <CopyIcon />}
              </button>
              {isLastAiMessage && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-md transition-all duration-200 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Regenerate response"
                >
                  <RegenerateIcon />
                </button>
              )}
            </div>
          )}

          {/* Artifacts */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-6 space-y-3">
              {message.artifacts.map((artifact) => (
                <CompactArtifact
                  key={artifact.id}
                  artifact={artifact}
                  darkMode={darkMode}
                  onUpdate={handleArtifactUpdate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MessageBubble;