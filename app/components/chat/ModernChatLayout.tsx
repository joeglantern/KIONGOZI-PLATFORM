"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatContext } from './ChatProvider';
import { useUser } from '../../contexts/UserContext';
import MessageList from './MessageList';
import ProfileMenu from './ProfileMenu';

interface ModernChatLayoutProps {
  children: React.ReactNode; // This will be the ChatInput
}

const ModernChatLayout: React.FC<ModernChatLayoutProps> = ({ children }) => {
  const {
    messages,
    profileMenuOpen,
    setProfileMenuOpen,
    toggleSidebar,
    isMobile
  } = useChatContext();

  const { user, logout } = useUser();
  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#f7f7f8] transition-colors duration-300 relative">
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

        {/* Desktop spacing */}
        {!isMobile && <div />}

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
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!hasMessages ? (
          // Empty State - Centered Input
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

              {/* Quick Suggestions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-2 max-w-3xl mx-auto"
              >
                {[
                  "Explain digital transformation strategies",
                  "What are sustainable tech practices?",
                  "Help me plan a learning module"
                ].map((suggestion, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 text-left rounded-lg border border-gray-200 bg-white hover:bg-gray-100 transition-colors text-gray-900 text-sm shadow-sm"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </motion.div>
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
            <div className="flex-grow flex flex-col justify-end min-h-0 py-3 px-4 sm:px-6">
              <div className="w-full max-w-3xl mx-auto flex-grow flex flex-col justify-end min-h-0">
                <MessageList
                  messages={messages}
                  className="flex-grow min-h-0"
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

    </div>
  );
};

export default ModernChatLayout;