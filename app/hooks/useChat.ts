"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Message,
  Conversation,
  ChatMode,
  ChatSettings,
  VoiceInputState,
  UseChatReturn
} from '../types/chat';
import { generateUniqueId, isMobileDevice, formatConversationTitle } from '../utils/chatUtils';
import { processMessageContent } from '../utils/messageProcessing';
import { detectArtifacts } from '../utils/artifact-detector';
import { isCommand } from '../utils/messageProcessor';
import { processCommand } from '../utils/commandProcessor';
import { exportConversations } from '../utils/exportUtils';
import apiClient from '../utils/apiClient';

const defaultSettings: ChatSettings = {
  darkMode: false, // This will be managed by ThemeProvider now
  showTypingEffect: true,
  autoCollapseOnMouseLeave: true,
  showSidebar: true,
};

export const useChat = (initialConversationId?: string): UseChatReturn => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Conversation state
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Pagination state
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [conversationsPage, setConversationsPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // UI state
  const [mode, setMode] = useState<ChatMode>('chat');
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Typing and animations
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [showModeChangeAnimation, setShowModeChangeAnimation] = useState(false);
  const [hasFirstUserMessage, setHasFirstUserMessage] = useState(false);


  // Artifacts
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);

  // Voice input
  const [voiceInputState, setVoiceInputState] = useState<VoiceInputState>('idle');

  // Focus and loading states
  const [isInputFocused, setInputFocused] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  // Progressive document
  const [showProgressiveDoc, setShowProgressiveDoc] = useState(false);
  const [docGenEnabled, setDocGenEnabled] = useState(false);

  // Tools
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize mobile detection
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
    }
  }, [initialConversationId]);

  // Load conversations list
  useEffect(() => {
    loadConversations(true); // Reset to first page on initial load
  }, []);

  const loadConversations = useCallback(async (reset = false, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000 * Math.pow(2, retryCount); // Exponential backoff
    const PAGE_SIZE = 20;

    try {
      if (reset) {
        setConversationsLoading(true);
        setConversationsPage(0);
      } else {
        setIsLoadingMore(true);
      }
      setConversationsError(null);

      const currentPage = reset ? 0 : conversationsPage;
      console.log('🔄 [Conversations] Loading conversations...', { retryCount, page: currentPage, reset });

      const response = await apiClient.getConversations({
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE
      });

      console.log('📡 [Conversations] API Response:', response);

      if (response.success && response.data) {
        const conversationsData = Array.isArray(response.data) ? response.data : response.data.conversations || [];
        const totalCount = (response as any).pagination?.total || conversationsData.length;

        console.log('✅ [Conversations] Successfully loaded:', conversationsData.length, 'conversations');

        if (reset) {
          setConversations(conversationsData as Conversation[]);
        } else {
          setConversations(prev => [...prev, ...conversationsData as Conversation[]]);
        }

        // Update pagination state
        setConversationsPage(prev => reset ? 1 : prev + 1);
        setHasMoreConversations(conversationsData.length === PAGE_SIZE && conversations.length + conversationsData.length < totalCount);
        setConversationsError(null);
      } else {
        const errorMsg = response.error || 'Failed to load conversations';
        console.warn('⚠️ [Conversations] API returned error:', errorMsg);
        setConversationsError(errorMsg);

        // If this is our first attempt and we got an API error, try again
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 [Conversations] Retrying in ${RETRY_DELAY}ms...`);
          setTimeout(() => loadConversations(reset, retryCount + 1), RETRY_DELAY);
          return;
        }
      }
    } catch (error: any) {
      console.error('❌ [Conversations] Error loading conversations:', error);
      const errorMessage = error.message || 'Failed to connect to server';
      setConversationsError(errorMessage);

      // Retry on network errors
      if (retryCount < MAX_RETRIES && !error.name?.includes('AbortError')) {
        console.log(`🔄 [Conversations] Retrying in ${RETRY_DELAY}ms due to error...`);
        setTimeout(() => loadConversations(reset, retryCount + 1), RETRY_DELAY);
        return;
      }

      // After max retries, set empty array to show empty state only on reset
      if (reset) {
        setConversations([]);
      }
    } finally {
      if (reset) {
        setConversationsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [conversationsPage, conversations.length]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      console.log('🔍 [useChat] Loading conversation:', conversationId);
      setIsLoading(true);
      setMessages([]); // Clear messages first like mobile app

      // Use same API call as mobile app with pagination parameters
      const response = await apiClient.getConversationMessages(conversationId, { limit: 100, offset: 0 });
      console.log('📡 [useChat] API response:', response);

      if (response.success && response.data) {
        const messageList = Array.isArray(response.data) ? response.data : [];
        console.log('📋 [useChat] Raw messages:', messageList);

        // Use same message mapping as mobile app
        const loadedMessages: Message[] = messageList.map((msg: any, index: number) => ({
          id: msg.id || generateUniqueId(),
          text: msg.text || msg.content || '', // Try both fields like mobile app
          isUser: msg.is_user === true, // Use is_user field like mobile app
          type: msg.type || 'chat',
          isTypingComplete: true,
          artifacts: msg.artifacts || []
        }));

        console.log('✅ [useChat] Formatted messages:', loadedMessages);
        setMessages(loadedMessages);
        setCurrentConversationId(conversationId);
        setHasFirstUserMessage(loadedMessages.some(msg => msg.isUser));
      } else {
        console.warn('❌ [useChat] Failed to load conversation messages:', response.error);
        setMessages([]); // Clear messages on failure
      }
    } catch (error) {
      console.error('❌ [useChat] Error loading conversation:', error);
      setMessages([]); // Clear messages on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    console.log('🚀 [Chat Debug] Starting sendMessage with text:', text);

    if (!text.trim() || isLoading) {
      console.log('❌ [Chat Debug] Message blocked - empty text or loading:', { text: text.trim(), isLoading });
      return;
    }

    const userMessage: Message = {
      id: generateUniqueId(),
      text: text.trim(),
      isUser: true,
      isTypingComplete: true,
    };

    console.log('👤 [Chat Debug] Created user message:', userMessage);

    // Add user message
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      console.log('📝 [Chat Debug] Updated messages with user message. Total count:', newMessages.length);
      return newMessages;
    });

    setIsLoading(true);
    setIsGenerating(true);
    setHasFirstUserMessage(true);

    console.log('⏳ [Chat Debug] Set loading states and first user message flag');

    // Check if this is a command
    if (isCommand(text.trim())) {
      console.log('🔧 [Chat Debug] Processing command:', text.trim());

      try {
        const commandResponse = await processCommand(text.trim());
        console.log('✅ [Chat Debug] Command processed successfully:', commandResponse);

        // Create command response message
        const commandMessage: Message = {
          id: generateUniqueId(),
          text: '', // Empty text, will use commandResponse for rendering
          isUser: false,
          type: 'chat',
          isTypingComplete: true,
          commandResponse // Add the command response data
        };

        setMessages(prev => [...prev, commandMessage]);
        setIsLoading(false);
        setIsGenerating(false);
        return;

      } catch (error: any) {
        console.error('❌ [Chat Debug] Command processing failed:', error);

        // Add error message
        const errorMessage: Message = {
          id: generateUniqueId(),
          text: error.message || 'Command failed. Please try again.',
          isUser: false,
          type: 'chat',
          isTypingComplete: true,
        };

        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        setIsGenerating(false);
        return;
      }
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Save user message immediately to create/update conversation
      console.log('💾 [Chat Debug] Saving user message immediately:', {
        text: text.trim(),
        conversationId: currentConversationId
      });

      const userMessageResponse = await apiClient.sendMessage(
        text.trim(),
        currentConversationId || undefined
      );

      console.log('📝 [Chat Debug] User message saved:', userMessageResponse);

      // Update conversation ID if this was a new conversation
      let workingConversationId = currentConversationId;
      if (userMessageResponse.success && userMessageResponse.data && (userMessageResponse.data as any).conversation_id) {
        workingConversationId = (userMessageResponse.data as any).conversation_id;
        if (!currentConversationId) {
          console.log('🆕 [Chat Debug] New conversation created:', workingConversationId);
          setCurrentConversationId(workingConversationId);

          // Refresh conversations list immediately to show the new conversation
          await refreshConversations();
        }
      }

      // Step 2: Generate AI response
      console.log('🌐 [Chat Debug] Sending AI generation request with:', {
        text: text.trim(),
        conversationId: workingConversationId,
        mode
      });

      const response = await apiClient.generateAIResponse(
        text.trim(),
        workingConversationId || undefined,
        mode
      );

      console.log('📡 [Chat Debug] API Response received:', response);

      if (response.success && response.data) {
        // Debug the full API response structure
        console.log('🔍 [Chat Debug] Full API response structure:', JSON.stringify(response.data, null, 2));

        // Use standardized response field (API now consistently returns 'response')
        const aiMessageText = (response.data as any).response || '';

        console.log('🤖 [Chat Debug] Extracted AI message text:', aiMessageText);
        console.log('🔍 [Chat Debug] API metadata:', (response.data as any).metadata);

        // Simplified validation - should always have response field now
        let finalMessageText = aiMessageText;
        if (!finalMessageText || finalMessageText.trim() === '') {
          console.log('⚠️ [Chat Debug] No response text found in standardized field');

          // Fallback search only as backup (should not be needed with standardized API)
          const searchForMessage = (obj: any, path: string = ''): string => {
            if (typeof obj === 'string' && obj.trim().length > 10) {
              console.log('🔍 [Chat Debug] Found potential message at path:', path, '=', obj.substring(0, 100) + '...');
              return obj;
            }
            if (typeof obj === 'object' && obj !== null) {
              for (const [key, value] of Object.entries(obj)) {
                const result = searchForMessage(value, path ? `${path}.${key}` : key);
                if (result) return result;
              }
            }
            return '';
          };

          finalMessageText = searchForMessage(response.data) ||
                           'I received your message but encountered an issue processing the response. Please try again.';

          console.log('🔍 [Chat Debug] Final extracted message:', finalMessageText);
        }

        // Process message content and detect artifacts
        const { content, artifacts } = processMessageContent(finalMessageText);
        console.log('🔧 [Chat Debug] Processed message content:', { content, artifacts });

        const aiMessage: Message = {
          id: generateUniqueId(),
          text: content,
          isUser: false,
          type: mode,
          isTypingComplete: false,
          artifacts: artifacts || []
        };

        console.log('🤖 [Chat Debug] Created AI message:', aiMessage);

        setMessages(prev => {
          const newMessages = [...prev, aiMessage];
          console.log('📝 [Chat Debug] Updated messages with AI message. Total count:', newMessages.length);
          console.log('📝 [Chat Debug] All messages:', newMessages);
          return newMessages;
        });

        // Set up typing effect
        if (settings.showTypingEffect) {
          console.log('⌨️ [Chat Debug] Setting up typing effect for message:', aiMessage.id);
          setTypingMessageId(aiMessage.id);
        } else {
          console.log('⚡ [Chat Debug] Marking message as complete immediately');
          // Mark as complete immediately if typing effect is disabled
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessage.id
                ? { ...msg, isTypingComplete: true }
                : msg
            )
          );
        }

        // Generate title for new conversations (we now have the conversation ID from earlier)
        if (workingConversationId && !currentConversationId) {
          try {
            const generatedTitle = formatConversationTitle(text.trim());
            console.log('🏷️ [Chat Debug] Generated title for new conversation:', generatedTitle);

            // Update the conversation title via API
            await apiClient.updateConversationTitle(workingConversationId, generatedTitle);
            console.log('✅ [Chat Debug] Successfully saved conversation title');

            // Refresh conversations list to show the new title
            await refreshConversations();
          } catch (titleError) {
            console.warn('⚠️ [Chat Debug] Failed to update conversation title:', titleError);
            // Still refresh conversations even if title update failed
            await refreshConversations();
          }
        } else {
          // For existing conversations, still refresh the list to update last message
          await refreshConversations();
        }
      } else {
        console.error('❌ [Chat Debug] API response failed:', response);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);

        // Add error message
        const errorMessage: Message = {
          id: generateUniqueId(),
          text: 'Sorry, I encountered an error processing your message. Please try again.',
          isUser: false,
          type: 'chat',
          isTypingComplete: true,
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, mode, currentConversationId, settings.showTypingEffect, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setHasFirstUserMessage(false);
    setTypingMessageId(null);
  }, []);

  const createNewConversation = useCallback(() => {
    clearMessages();
    setInput('');
  }, [clearMessages]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await apiClient.deleteConversation(conversationId);
      if (response.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // If deleted conversation was current, clear it
        if (currentConversationId === conversationId) {
          clearMessages();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [currentConversationId, clearMessages]);

  const updateConversation = useCallback((updatedConversation: Conversation) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === updatedConversation.id
          ? { ...conv, ...updatedConversation }
          : conv
      )
    );
  }, []);

  const loadMoreConversations = useCallback(async () => {
    if (!hasMoreConversations || isLoadingMore) return;
    await loadConversations(false); // Load next page
  }, [hasMoreConversations, isLoadingMore, loadConversations]);

  const refreshConversations = useCallback(async () => {
    await loadConversations(true); // Reset and reload from first page
  }, [loadConversations]);


  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const startVoiceInput = useCallback(() => {
    setVoiceInputState('listening');
  }, []);

  const stopVoiceInput = useCallback(() => {
    setVoiceInputState('idle');
  }, []);

  const toggleProgressiveDoc = useCallback(() => {
    setShowProgressiveDoc(prev => !prev);
  }, []);

  const toggleExportModal = useCallback(() => {
    setShowExportModal(prev => !prev);
  }, []);

  const handleTypingComplete = useCallback((messageId: number) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isTypingComplete: true }
          : msg
      )
    );

    if (typingMessageId === messageId) {
      setTypingMessageId(null);
    }
  }, [typingMessageId]);

  const handleExportConversations = useCallback(async (
    conversationIds: string[],
    format: 'text' | 'markdown' | 'json',
    includeMetadata: boolean
  ) => {
    try {
      // Get the conversations to export
      const conversationsToExport = conversations.filter(conv =>
        conversationIds.includes(conv.id)
      );

      if (conversationsToExport.length === 0) {
        throw new Error('No conversations found to export');
      }

      // For each conversation, ensure we have the full message data
      const conversationsWithMessages = await Promise.all(
        conversationsToExport.map(async (conv) => {
          if (!conv.messages || conv.messages.length === 0) {
            // Load messages for this conversation if not already loaded
            try {
              const response = await apiClient.get(`/conversations/${conv.id}/messages`);
              if (response.success && response.data) {
                return {
                  ...conv,
                  messages: response.data
                };
              }
            } catch (error) {
              console.warn(`Failed to load messages for conversation ${conv.id}:`, error);
            }
          }
          return conv;
        })
      );

      // Use the export utility to generate and download the file
      await exportConversations(conversationsWithMessages, format, includeMetadata);
    } catch (error: any) {
      console.error('Export error:', error);
      throw new Error(error.message || 'Failed to export conversations');
    }
  }, [conversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    messages,
    input,
    isLoading,
    isGenerating,
    currentConversationId,
    conversations,
    conversationsLoading,
    conversationsError,
    hasMoreConversations,
    isLoadingMore,
    mode,
    settings,
    showSidebar,
    isSidebarCollapsed,
    profileMenuOpen,
    typingMessageId,
    showModeChangeAnimation,
    hasFirstUserMessage,
    selectedArtifact,
    voiceInputState,
    isInputFocused,
    showLoader,
    showProgressiveDoc,
    docGenEnabled,
    showToolsMenu,
    showExportModal,
    isMobile,

    // Actions
    sendMessage,
    setInput,
    clearMessages,
    createNewConversation,
    loadConversation,
    deleteConversation,
    updateConversation,
    loadMoreConversations,
    refreshConversations,
    setMode,
    toggleSidebar,
    toggleSidebarCollapse,
    setProfileMenuOpen,
    updateSettings,
    toggleDarkMode,
    setSelectedArtifact,
    startVoiceInput,
    stopVoiceInput,
    setVoiceInputState,
    setInputFocused,
    toggleProgressiveDoc,
    setDocGenEnabled,
    setShowToolsMenu,
    toggleExportModal,
    setShowExportModal,

    // Export functions
    exportConversations: handleExportConversations,

    // Additional utility functions would go here
  };
};