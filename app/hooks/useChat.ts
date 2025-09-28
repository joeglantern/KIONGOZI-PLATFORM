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
import { generateUniqueId, isMobileDevice } from '../utils/chatUtils';
import { processMessageContent } from '../utils/messageProcessing';
import { detectArtifacts } from '../utils/artifact-detector';
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
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'sample-1',
      title: 'Learning Management System Overview',
      lastMessage: 'Can you explain how the LMS modules work?',
      updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      messageCount: 5
    },
    {
      id: 'sample-2',
      title: 'Digital Transition Strategies',
      lastMessage: 'What are the best practices for digital transformation?',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      messageCount: 8
    },
    {
      id: 'sample-3',
      title: 'Green Technologies Research',
      lastMessage: 'How can we implement sustainable practices in our organization?',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      messageCount: 12
    }
  ]);

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
    loadConversations();
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const response = await apiClient.getConversations();
      if (response.success && response.data) {
        setConversations(response.data as Conversation[]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversationMessages(conversationId);

      if (response.success && response.data) {
        const loadedMessages: Message[] = (response.data as any[]).map((msg: any) => ({
          id: generateUniqueId(),
          text: msg.content,
          isUser: msg.role === 'user',
          type: msg.type || 'chat',
          isTypingComplete: true,
          artifacts: msg.artifacts || []
        }));

        setMessages(loadedMessages);
        setCurrentConversationId(conversationId);
        setHasFirstUserMessage(loadedMessages.some(msg => msg.isUser));
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
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

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      console.log('🌐 [Chat Debug] Sending API request with:', {
        text: text.trim(),
        conversationId: currentConversationId,
        mode
      });

      // Send message to API
      const response = await apiClient.generateAIResponse(
        text.trim(),
        currentConversationId || undefined,
        mode
      );

      console.log('📡 [Chat Debug] API Response received:', response);

      if (response.success && response.data) {
        // Debug the full API response structure
        console.log('🔍 [Chat Debug] Full API response structure:', JSON.stringify(response.data, null, 2));

        // Try different possible field names based on common API response patterns
        const aiMessageText = (response.data as any).content ||
                              (response.data as any).text ||
                              (response.data as any).message ||
                              (response.data as any).response ||
                              (response.data as any).answer ||
                              (response.data as any).reply ||
                              (response.data as any).data ||
                              (response.data as any).result ||
                              (response.data as any).output ||
                              (response.data as any).choices?.[0]?.message?.content ||
                              (response.data as any).choices?.[0]?.text ||
                              '';

        console.log('🤖 [Chat Debug] Extracted AI message text:', aiMessageText);
        console.log('🔍 [Chat Debug] Available response data keys:', Object.keys(response.data));

        // If we still don't have message text, try a more aggressive search
        let finalMessageText = aiMessageText;
        if (!finalMessageText || finalMessageText.trim() === '') {
          console.log('⚠️ [Chat Debug] No message text found, searching response recursively...');

          // Recursively search for any string value that looks like a message
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

        // Update conversation ID if new conversation
        if ((response.data as any).conversation_id && !currentConversationId) {
          console.log('🆕 [Chat Debug] Setting new conversation ID:', (response.data as any).conversation_id);
          setCurrentConversationId((response.data as any).conversation_id);
          await loadConversations(); // Refresh conversations list
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
    isMobile,

    // Actions
    sendMessage,
    setInput,
    clearMessages,
    createNewConversation,
    loadConversation,
    deleteConversation,
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

    // Additional utility functions would go here
  };
};