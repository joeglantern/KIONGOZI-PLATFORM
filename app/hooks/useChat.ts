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

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'signup'>('login');

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
        const responseData = response.data as any;
        const conversationsData = Array.isArray(responseData) ? responseData : responseData.conversations || [];
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

          // Optimistically add the new conversation to the list immediately
          const newConversation: Conversation = {
            id: workingConversationId,
            title: text.trim().substring(0, 50) + (text.trim().length > 50 ? '...' : ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 1
          };

          // Add to conversations list at the top
          setConversations(prev => [newConversation, ...prev]);

          // Refresh conversations list in the background to get the real title from GPT
          refreshConversations();
        }
      }

      // Step 2: Generate AI response with streaming
      console.log('🌐 [Chat Debug] Sending streaming AI generation request with:', {
        text: text.trim(),
        conversationId: workingConversationId,
        mode
      });

      // Create AI message with empty text initially
      const aiMessageId = generateUniqueId();
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        isUser: false,
        type: mode,
        isTypingComplete: false,
        artifacts: []
      };

      // Add empty AI message to show streaming indicator
      setMessages(prev => [...prev, aiMessage]);

      let fullResponseText = '';

      // Use streaming API
      await apiClient.generateAIResponseStream(
        text.trim(),
        workingConversationId || undefined,
        mode,
        // onChunk - update message text progressively
        (chunk: string) => {
          fullResponseText += chunk;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, text: fullResponseText }
                : msg
            )
          );
        },
        // onComplete - finalize the message
        (metadata: any) => {
          console.log('✅ [Chat Debug] Streaming complete. Metadata:', metadata);

          // Process final message content for artifacts
          const { content, artifacts } = processMessageContent(fullResponseText);

          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    text: content,
                    isTypingComplete: true,
                    artifacts: artifacts || []
                  }
                : msg
            )
          );

          // Refresh conversations to update last message
          refreshConversations();
        },
        // onError - handle streaming errors
        (error: string) => {
          console.error('❌ [Chat Debug] Streaming error:', error);

          // Update the message to show error
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    text: fullResponseText || 'Sorry, I encountered an error processing your message. Please try again.',
                    isTypingComplete: true
                  }
                : msg
            )
          );
        },
        // Pass abort signal for cancellation
        abortControllerRef.current?.signal
      );

      // Generate title for new conversations
      if (workingConversationId && !currentConversationId) {
        try {
          const generatedTitle = formatConversationTitle(text.trim());
          console.log('🏷️ [Chat Debug] Generated title for new conversation:', generatedTitle);
          await apiClient.updateConversationTitle(workingConversationId, generatedTitle);
          console.log('✅ [Chat Debug] Successfully saved conversation title');
          await refreshConversations();
        } catch (titleError) {
          console.warn('⚠️ [Chat Debug] Failed to update conversation title:', titleError);
          await refreshConversations();
        }
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

  const openLoginModal = useCallback(() => {
    setAuthModalView('login');
    setShowAuthModal(true);
  }, []);

  const openSignupModal = useCallback(() => {
    setAuthModalView('signup');
    setShowAuthModal(true);
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

      // Filter out conversations without messages and use the export utility to generate and download the file
      const exportableConversations = conversationsWithMessages.filter(conv => {
        const messages = conv.messages as any[];
        return messages && Array.isArray(messages) && messages.length > 0;
      });
      if (exportableConversations.length === 0) {
        throw new Error('No conversations with messages found to export');
      }
      await exportConversations(exportableConversations as any, format, includeMetadata);
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
    showAuthModal,
    authModalView,
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

    // Auth modal actions
    setShowAuthModal,
    setAuthModalView,
    openLoginModal,
    openSignupModal,

    // Export functions
    exportConversations: handleExportConversations,

    // Additional utility functions would go here
  };
};