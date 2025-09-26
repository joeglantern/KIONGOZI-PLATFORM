"use client";

import React from 'react';
import { ChatProvider } from './chat/ChatProvider';
import ChatContainer from './chat/ChatContainer';
import PageTransition from './PageTransition';

interface AskAIProps {
  conversationId?: string;
  overrideContent?: React.ReactNode;
  hideInput?: boolean;
  disableInitialLoader?: boolean;
  initialMode?: 'chat';
  className?: string;
}

const AskAI: React.FC<AskAIProps> = ({
  conversationId,
  overrideContent,
  hideInput = false,
  disableInitialLoader = false,
  initialMode = 'chat',
  className = ''
}) => {
  // If override content is provided, render it instead
  if (overrideContent) {
    return (
      <div className={`min-h-screen h-screen flex flex-col bg-gray-50 ${className}`}>
        <PageTransition mode={initialMode}>
          {overrideContent}
        </PageTransition>
      </div>
    );
  }

  return (
    <div className={`min-h-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${className}`}>
      <ChatProvider
        conversationId={conversationId}
        initialMode='chat'
        initialSettings={{
          showTypingEffect: true,
          darkMode: false,
          autoCollapseOnMouseLeave: true,
          showSidebar: true
        }}
      >
        <PageTransition mode={initialMode}>
          <ChatContainer
            hideInput={hideInput}
            className="h-full"
          />
        </PageTransition>
      </ChatProvider>
    </div>
  );
};

export default AskAI;