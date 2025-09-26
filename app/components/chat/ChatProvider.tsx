"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ChatContextType } from '../../types/chat';
import { useChat } from '../../hooks/useChat';

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: React.ReactNode;
  conversationId?: string;
  initialMode?: 'chat';
  initialSettings?: Partial<ChatContextType['settings']>;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  conversationId,
  initialMode = 'chat',
  initialSettings = {}
}) => {
  const [isClient, setIsClient] = useState(false);
  const chatState = useChat(conversationId);

  // Hydration guard - only run client-side features after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Apply initial settings
  useEffect(() => {
    if (Object.keys(initialSettings).length > 0) {
      chatState.updateSettings(initialSettings);
    }
  }, [initialSettings, chatState.updateSettings]);

  // Apply initial mode
  useEffect(() => {
    if (initialMode && initialMode !== chatState.mode) {
      chatState.setMode(initialMode);
    }
  }, [initialMode, chatState.mode, chatState.setMode]);

  // Note: Dark mode is now handled by ThemeProvider

  // Save sidebar state (client-side only)
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem('chat-sidebar-open', JSON.stringify(chatState.showSidebar));
  }, [chatState.showSidebar, isClient]);

  // Load saved sidebar state on mount (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const savedSidebarState = localStorage.getItem('chat-sidebar-open');
    if (savedSidebarState !== null) {
      const isOpen = JSON.parse(savedSidebarState);
      if (isOpen !== chatState.showSidebar) {
        chatState.toggleSidebar();
      }
    }
  }, [isClient]);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (chatState.isMobile && chatState.showSidebar && !chatState.isSidebarCollapsed) {
      chatState.toggleSidebarCollapse();
    }
  }, [chatState.isMobile, chatState.showSidebar, chatState.isSidebarCollapsed]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        chatState.toggleSidebar();
      }

      // New conversation with Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        chatState.createNewConversation();
      }

      // Toggle dark mode with Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        chatState.toggleDarkMode();
      }


      // Close menus on Escape
      if (e.key === 'Escape') {
        if (chatState.profileMenuOpen) {
          chatState.setProfileMenuOpen(false);
        }
        if (chatState.showToolsMenu) {
          chatState.setShowToolsMenu(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    chatState.toggleSidebar,
    chatState.createNewConversation,
    chatState.toggleDarkMode,
    chatState.profileMenuOpen,
    chatState.setProfileMenuOpen,
    chatState.showToolsMenu,
    chatState.setShowToolsMenu
  ]);

  // Click outside handler to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;

      // Close profile menu if clicking outside
      if (chatState.profileMenuOpen && !target.closest('[data-profile-menu]')) {
        chatState.setProfileMenuOpen(false);
      }

      // Close tools menu if clicking outside
      if (chatState.showToolsMenu && !target.closest('[data-tools-menu]')) {
        chatState.setShowToolsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    chatState.profileMenuOpen,
    chatState.setProfileMenuOpen,
    chatState.showToolsMenu,
    chatState.setShowToolsMenu
  ]);

  // Auto-save current conversation (client-side only)
  useEffect(() => {
    if (!isClient) return;

    if (chatState.currentConversationId) {
      localStorage.setItem('chat-current-conversation', chatState.currentConversationId);
    } else {
      localStorage.removeItem('chat-current-conversation');
    }
  }, [chatState.currentConversationId, isClient]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const conversationId = e.state?.conversationId;
      if (conversationId && conversationId !== chatState.currentConversationId) {
        chatState.loadConversation(conversationId);
      } else if (!conversationId && chatState.currentConversationId) {
        chatState.createNewConversation();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [chatState.currentConversationId, chatState.loadConversation, chatState.createNewConversation]);

  // Update browser history when conversation changes
  useEffect(() => {
    if (chatState.currentConversationId) {
      const url = new URL(window.location.href);
      url.searchParams.set('conversation', chatState.currentConversationId);

      window.history.pushState(
        { conversationId: chatState.currentConversationId },
        '',
        url.toString()
      );
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('conversation');

      window.history.pushState(
        { conversationId: null },
        '',
        url.toString()
      );
    }
  }, [chatState.currentConversationId]);

  // Prevent hydration mismatch by only rendering after client-side mount
  if (!isClient) {
    return (
      <div className="min-h-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatContext.Provider value={chatState}>
      <div className="fade-in">
        {children}
      </div>
    </ChatContext.Provider>
  );
};

// Custom hook to use the chat context
export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }

  return context;
};

// Export the context for advanced usage
export { ChatContext };