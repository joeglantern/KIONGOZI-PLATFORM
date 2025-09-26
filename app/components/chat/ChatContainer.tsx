"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../chat-animations.css';
import '../animations.css';
import '../../sidebar.css';
import '../input-glow.css';
import '../send-effects.css';
import { useChatContext } from './ChatProvider';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import ModernChatLayout from './ModernChatLayout';
import ChatErrorBoundary from './ChatErrorBoundary';

interface ChatContainerProps {
  hideInput?: boolean;
  className?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  hideInput = false,
  className = ''
}) => {
  const {
    messages,
    input,
    isLoading,
    sendMessage,
    setInput,
    setInputFocused,
    selectedArtifact,
    setSelectedArtifact,
    isMobile,
    conversations,
    currentConversationId,
    loadConversation,
    deleteConversation,
    createNewConversation,
    toggleSidebarCollapse,
    showSidebar,
    isSidebarCollapsed
  } = useChatContext();

  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };


  const handleArtifactClick = (artifact: any) => {
    setSelectedArtifact(artifact);
  };

  return (
    <div className={`flex h-full ${className} relative`}>
      {/* Sidebar - Hidden on mobile by default, overlay when shown */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Desktop Sidebar */}
            <div className={`${isMobile ? 'hidden' : 'block'}`}>
              <ChatSidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onConversationSelect={loadConversation}
                onConversationDelete={deleteConversation}
                onNewConversation={createNewConversation}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapse}
              />
            </div>

            {/* Mobile Sidebar - Overlay */}
            {isMobile && (
              <>
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 h-full z-50 md:hidden"
                >
                  <ChatSidebar
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onConversationSelect={loadConversation}
                    onConversationDelete={deleteConversation}
                    onNewConversation={createNewConversation}
                    isCollapsed={false}
                    onToggleCollapse={toggleSidebarCollapse}
                  />
                </motion.div>

                {/* Mobile overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40 md:hidden"
                  onClick={toggleSidebarCollapse}
                />
              </>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Main Modern Layout */}
      <div className="flex-grow">
        <ChatErrorBoundary>
          <ModernChatLayout>
            {!hideInput && (
              <ChatInput
                input={input}
                onInputChange={handleInputChange}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ask a question..."
                onFocusChange={setInputFocused}
              />
            )}
          </ModernChatLayout>
        </ChatErrorBoundary>
      </div>

      {/* Artifact Panel */}
      <AnimatePresence>
        {selectedArtifact && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-2/5 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Artifact Viewer
                </h2>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-grow overflow-hidden">
                <div className="h-full p-4">
                  <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Artifact content will be displayed here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile overlay when artifact is open */}
      {selectedArtifact && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSelectedArtifact(null)}
        />
      )}
    </div>
  );
};

export default ChatContainer;