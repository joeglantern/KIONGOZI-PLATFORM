"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useChatContext } from './ChatProvider';
import MessageList from './MessageList';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';
import DebugPanel from './DebugPanel';
import AuthDebug from './AuthDebug';

interface ModernChatLayoutProps {
  children: React.ReactNode; // This will be the ChatInput
}

const ModernChatLayout: React.FC<ModernChatLayoutProps> = ({ children }) => {
  const {
    messages,
    settings,
    toggleDarkMode,
    profileMenuOpen,
    setProfileMenuOpen,
    toggleSidebar,
    isMobile
  } = useChatContext();

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Corner Controls */}
      <div className="absolute top-4 z-50 flex items-center justify-between w-full px-4">
        {/* Mobile menu button - Left side */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="opacity-70 hover:opacity-100 transition-opacity h-8 w-8"
          >
            <FiMenu size={16} />
          </Button>
        )}

        {/* Desktop spacing */}
        {!isMobile && <div />}

        {/* Theme and Profile controls - Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle
            darkMode={settings.darkMode}
            onToggle={toggleDarkMode}
            size="sm"
            className="opacity-70 hover:opacity-100 transition-opacity"
          />
          <ProfileMenu
            isOpen={profileMenuOpen}
            onToggle={() => setProfileMenuOpen(!profileMenuOpen)}
            onClose={() => setProfileMenuOpen(false)}
            darkMode={settings.darkMode}
            onToggleTheme={toggleDarkMode}
            userName="User"
            userEmail="user@example.com"
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
            className="flex-grow flex items-center justify-center px-6"
          >
            <div className="w-full max-w-3xl">
              {/* Welcome Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center mb-12"
              >
                <h1 className="text-4xl font-light text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
                  How can I help you today?
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-light max-w-2xl mx-auto">
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
                className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto"
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
                    className="p-4 text-left rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-300 text-sm backdrop-blur-sm"
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
            <div className="flex-grow flex flex-col justify-end min-h-0 py-8 px-4 sm:px-6 lg:px-8">
              <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col justify-end min-h-0">
                <MessageList
                  messages={messages}
                  className="flex-grow min-h-0"
                />
              </div>
            </div>

            {/* Bottom Input Area - Fixed at bottom */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200/20 dark:border-gray-800/30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md"
            >
              <div className="w-full max-w-4xl mx-auto">
                {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panels (development only) */}
      <DebugPanel />
      <AuthDebug />
    </div>
  );
};

export default ModernChatLayout;