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
import CleanLMSSidebar from './CleanLMSSidebar';
import CleanMobileMenu from './CleanMobileMenu';
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
    updateConversation,
    loadMoreConversations,
    createNewConversation,
    toggleSidebarCollapse,
    showSidebar,
    isSidebarCollapsed,
    toggleSidebar,
    conversationsLoading,
    conversationsError,
    hasMoreConversations,
    isLoadingMore
  } = useChatContext();

  // Handle conversation rename (placeholder - implement API call)
  const handleConversationRename = async (id: string, newTitle: string) => {
    // TODO: Implement API call to rename conversation
  };

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
    <div className={`flex h-screen min-h-screen max-h-screen ${className} relative overflow-hidden`}>
      {/* Desktop LMS Sidebar - Only show on desktop */}
      {!isMobile && (
        <AnimatePresence>
          {showSidebar && (
            <CleanLMSSidebar
              conversations={conversations}
              currentConversationId={currentConversationId}
              onConversationSelect={loadConversation}
              onNewConversation={createNewConversation}
              onConversationDelete={deleteConversation}
              onConversationUpdate={updateConversation}
              onLoadMore={loadMoreConversations}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse}
              conversationsLoading={conversationsLoading}
              conversationsError={conversationsError}
              hasMoreConversations={hasMoreConversations}
              isLoadingMore={isLoadingMore}
              currentPath="/chat"
              onNavigate={(path) => {
                // Handle navigation to other parts of the LMS
                // TODO: Implement navigation logic or use router
              }}
            />
          )}
        </AnimatePresence>
      )}

      {/* Mobile Menu - Only available on mobile */}
      {isMobile && (
        <CleanMobileMenu
          conversations={conversations}
          currentConversationId={currentConversationId}
          onConversationSelect={loadConversation}
          onNewConversation={createNewConversation}
          isOpen={showSidebar}
          onOpenChange={toggleSidebar}
          conversationsLoading={conversationsLoading}
          conversationsError={conversationsError}
          currentPath="/chat"
          onNavigate={(path) => {
            // Handle navigation to other parts of the LMS
            // TODO: Implement navigation logic or use router
          }}
        />
      )}

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
            className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-2/5 bg-white border-l border-gray-200 z-50 shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Artifact Viewer
                </h2>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-grow overflow-hidden">
                <div className="h-full p-4">
                  <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">
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