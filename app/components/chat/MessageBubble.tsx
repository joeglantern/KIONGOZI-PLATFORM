"use client";

import React from 'react';
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

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isTyping = false,
  showAvatar = true,
  onArtifactClick
}) => {
  const { settings } = useChatContext();
  const { darkMode } = settings;

  const isWelcomeMessage = message.text?.includes('What can I do for you?') || false;
  const isUser = message.isUser;


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
        <div className="text-gray-500 dark:text-gray-400 italic">
          <div className="flex items-center gap-2">
            <div className="animate-pulse">🤔</div>
            <span>Thinking...</span>
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
        <div className="w-full max-w-4xl mx-auto">
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