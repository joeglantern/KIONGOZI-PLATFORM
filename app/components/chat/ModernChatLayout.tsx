"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatContext } from './ChatProvider';
import { useUser } from '../../contexts/UserContext';
import MessageList from './MessageList';
import ProfileMenu from './ProfileMenu';
import SmartSuggestions from './suggestions/SmartSuggestions';
import ExportModal from './ExportModal';
import type { ChatSuggestion } from '../../types/lms-chat';

interface ModernChatLayoutProps {
  children: React.ReactNode; // This will be the ChatInput
}

const ModernChatLayout: React.FC<ModernChatLayoutProps> = ({ children }) => {
  const {
    messages,
    profileMenuOpen,
    setProfileMenuOpen,
    toggleSidebar,
    isMobile,
    sendMessage,
    setInput,
    showSidebar,
    isSidebarCollapsed,
    conversations,
    currentConversationId,
    showExportModal,
    setShowExportModal,
    exportConversations
  } = useChatContext();

  const { user, logout } = useUser();
  const hasMessages = messages.length > 0;

  const handleSuggestionClick = (suggestion: ChatSuggestion) => {
    // Send the suggestion action as a message
    sendMessage(suggestion.action);
    // Also update the input field to show what was sent
    setInput('');
  };

  return (
    <div className="h-full max-h-screen flex flex-col bg-[#f7f7f8] transition-colors duration-300 relative overflow-hidden">
      {/* Corner Controls - Fixed to this container, not the viewport */}
      <div className="flex items-center justify-between px-4 py-3 z-50 flex-shrink-0">
        {/* Mobile menu button - Left side */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="opacity-70 hover:opacity-100 transition-opacity h-8 w-8"
          >
            <Menu size={16} />
          </Button>
        )}

        {/* Platform Title - Shows when sidebar is collapsed on desktop */}
        {!isMobile && showSidebar && isSidebarCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <h1 className="font-semibold text-gray-900">Kiongozi Platform</h1>
          </div>
        )}

        {/* Desktop spacing when sidebar is expanded or hidden */}
        {!isMobile && (!showSidebar || !isSidebarCollapsed) && <div />}

        {/* Profile controls - Right side */}
        <div className="flex items-center gap-2">
          <ProfileMenu
            isOpen={profileMenuOpen}
            onToggle={() => setProfileMenuOpen(!profileMenuOpen)}
            onClose={() => setProfileMenuOpen(false)}
            userName={user?.full_name || user?.first_name || 'User'}
            userEmail={user?.email || 'user@example.com'}
            userAvatar={user?.avatar_url}
            onLogout={logout}
            onExport={() => setShowExportModal(true)}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!hasMessages ? (
          // Empty State - Centered Input (Original Design)
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-grow flex items-center justify-center px-4 pt-0"
          >
            <div className="w-full max-w-2xl">
              {/* Welcome Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-normal text-gray-900 mb-3 tracking-tight">
                  How can I help you today?
                </h1>
                <p className="text-base text-gray-600 max-w-xl mx-auto">
                  Ask me anything about your learning journey, digital transformation, or green technologies.
                </p>
              </motion.div>

              {/* Centered Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {children}
              </motion.div>

              {/* Smart Suggestions */}
              <SmartSuggestions
                onSuggestionClick={handleSuggestionClick}
                className="mt-6 max-w-3xl mx-auto"
                maxSuggestions={6}
                showCategories={false}
              />
            </div>
          </motion.div>
        ) : (
          // Conversation State - Messages + Bottom Input
          <motion.div
            key="conversation-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-grow flex flex-col h-full min-h-0"
          >
            {/* Messages Container - Better responsive spacing */}
            <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
              <div className="w-full h-full flex-grow min-h-0">
                <MessageList
                  messages={messages}
                  className="h-full"
                />
              </div>
            </div>

            {/* Bottom Input Area - Floating Island */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex-shrink-0 p-4 sm:p-6"
            >
              <div className="w-full max-w-2xl mx-auto">
                {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
      />

    </div>
  );
};

export default ModernChatLayout;