import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
// LinearGradient removed for compatibility
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/apiClient';
import LoadingDots from '../components/LoadingDots';
import MobileMenu from '../components/MobileMenu';
import CustomToast from '../components/CustomToast';
import ModernMessageInput from '../components/ModernMessageInput';
import ProfileScreen from './ProfileScreen';
import ExportModal from '../components/ExportModal';
import AIMessage from '../components/AIMessage';
import UserMessage from '../components/UserMessage';
import EnhancedAIMessage from '../components/EnhancedAIMessage';
import WelcomeScreen from '../components/WelcomeScreen';
import QuickActionsMenu from '../components/QuickActionsMenu';
import ModuleDetailModal from '../components/ModuleDetailModal';
import TutorialOverlay from '../components/TutorialOverlay';
import { ChatSuggestion } from '../components/SmartSuggestions';
import { useChatStore } from '../stores/chatStore';
import { isCommand, processCommand } from '../utils/messageProcessor';
import { processCommand as handleCommand } from '../utils/commandProcessor';
import { LearningModule, ModuleCategory } from '../types/lms';
import { hasSeenTutorial } from '../utils/tutorialStorage';

interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  reaction?: 'like' | 'dislike' | null;
  commandResponse?: any;
}

interface Conversation {
  id: string;
  title?: string;
  updated_at: string;
  created_at: string;
  user_id: string;
}

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const { user, signOut } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshingConversations, setRefreshingConversations] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;
  const [latestMessageId, setLatestMessageId] = useState<number | null>(null);
  const [useEnhancedMessages, setUseEnhancedMessages] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showModuleDetail, setShowModuleDetail] = useState(false);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const chatStore = useChatStore();

  useEffect(() => {
    // Start with empty messages - welcome screen handles the greeting
    setMessages([]);

    // Load saved dark mode preference
    loadDarkModePreference();

    // Check if user has seen tutorial
    checkTutorialStatus();

    // Force layout recalculation after mount to fix SafeAreaView on iOS
    if (Platform.OS === 'ios') {
      setTimeout(() => {
        setLayoutReady(true);
      }, 50);
    } else {
      setLayoutReady(true);
    }
  }, []);

  const checkTutorialStatus = async () => {
    const seen = await hasSeenTutorial();
    if (!seen) {
      // Show tutorial after a short delay
      setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const showTutorialManually = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTutorial(true);
  };

  // Keyboard handling - optimized for iOS
  useEffect(() => {
    if (Platform.OS === 'ios') {
      // On iOS, KeyboardAwareScrollView handles scrolling better
      // We only track keyboard height for layout adjustments
      const keyboardWillShowListener = Keyboard.addListener(
        'keyboardWillShow',
        (event) => {
          setKeyboardHeight(event.endCoordinates.height);
        }
      );

      const keyboardWillHideListener = Keyboard.addListener(
        'keyboardWillHide',
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    } else {
      // Android: Keep original behavior
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        (event) => {
          setKeyboardHeight(event.endCoordinates.height);
          setShouldAutoScroll(true);
          scrollToBottom();
        }
      );

      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

  // Load user's conversations from API
  const loadConversations = async () => {
    if (!user) return;

    setLoadingConversations(true);
    try {
      const response = await apiClient.getConversations({ limit: 50, offset: 0 });

      if (response.success && response.data) {
        const conversationList = Array.isArray(response.data) ? response.data : [];
        setConversations(conversationList);
        console.log('✅ Loaded conversations:', conversationList.length);
      } else {
        console.warn('❌ Failed to load conversations:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load conversations when user is available
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Load messages for a specific conversation
  const loadConversationMessages = async (selectedConversationId: string) => {
    // Clear current messages first to prevent showing old messages during loading
    setMessages([]);
    setLoadingMessages(true);
    try {
      const response = await apiClient.getConversationMessages(selectedConversationId, { limit: 100, offset: 0 });

      if (response.success && response.data) {
        const messageList = Array.isArray(response.data) ? response.data : [];

        // Convert API messages to our Message format
        const formattedMessages: Message[] = messageList.map((msg: any, index: number) => ({
          id: msg.id || Date.now() + index,
          text: msg.text || msg.content || '',
          isUser: msg.is_user === true,
          type: msg.type || 'chat'
        }));

        setMessages(formattedMessages);
        setConversationId(selectedConversationId);

        // Set the current conversation for header display
        const selectedConversation = conversations.find(c => c.id === selectedConversationId);
        setCurrentConversation(selectedConversation || null);

        console.log('✅ Loaded conversation messages:', formattedMessages.length);

        // Scroll to bottom after loading messages
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.warn('❌ Failed to load conversation messages:', response.error);
        // If failed to load, show empty state instead of keeping loading
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading conversation messages:', error);
      // On error, show empty state and alert
      setMessages([]);
      Alert.alert('Error', 'Failed to load conversation messages');
    } finally {
      // Always clear loading state
      setLoadingMessages(false);
    }
  };

  // Start a new chat conversation
  const startNewChat = () => {
    // Clear all states first
    setLoadingMessages(false);
    setLoading(false);
    setConversationId(null);
    setCurrentConversation(null);
    setInputText('');

    // Start with empty messages - welcome screen will show
    setMessages([]);
    console.log('✅ Started new chat');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const copyMessage = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Message copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy message:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to copy message', 'error');
    }
  };

  const shareConversation = async () => {
    try {
      if (!currentConversation?.title && messages.length <= 1) {
        showToast('No conversation to share', 'info');
        return;
      }

      // Update chat store with current conversation data for export
      if (conversationId && messages.length > 0) {
        const conversationForExport = {
          id: conversationId,
          title: currentConversation?.title || 'Current Conversation',
          messages: messages.map(msg => ({
            id: msg.id.toString(),
            text: msg.text,
            isUser: msg.isUser,
            timestamp: new Date().toISOString(),
            type: msg.type
          })),
          created_at: currentConversation?.created_at || new Date().toISOString(),
          updated_at: currentConversation?.updated_at || new Date().toISOString()
        };

        chatStore.setCurrentConversation(conversationForExport);
        chatStore.setConversations([conversationForExport]); // Just current conversation for now
      }

      // Open export modal with enhanced options
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowExportModal(true);
    } catch (error) {
      console.error('Failed to open export modal:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to open export options', 'error');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await apiClient.deleteConversation(conversationId);

      if (response.success) {
        // Remove the deleted conversation from the local state
        setConversations(prev => prev.filter(c => c.id !== conversationId));

        // If the current conversation was deleted, start a new chat
        if (conversationId === currentConversation?.id) {
          startNewChat();
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Conversation deleted successfully', 'success');
        console.log('✅ Conversation deleted:', conversationId);
      } else {
        console.error('❌ Failed to delete conversation:', response.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast('Failed to delete conversation', 'error');
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Error deleting conversation', 'error');
    }
  };

  // Separate refresh function for pull-to-refresh
  const refreshConversations = async () => {
    if (!user) return;

    setRefreshingConversations(true);
    try {
      const response = await apiClient.getConversations({ limit: 50, offset: 0 });

      if (response.success && response.data) {
        const conversationList = Array.isArray(response.data) ? response.data : [];
        setConversations(conversationList);
        showToast('Conversations refreshed', 'success');
        console.log('✅ Refreshed conversations:', conversationList.length);
      } else {
        console.warn('❌ Failed to refresh conversations:', response.error);
        showToast('Failed to refresh conversations', 'error');
      }
    } catch (error) {
      console.error('❌ Error refreshing conversations:', error);
      showToast('Failed to refresh conversations', 'error');
    } finally {
      setRefreshingConversations(false);
    }
  };

  // Load dark mode preference from secure storage
  const loadDarkModePreference = async () => {
    try {
      const savedDarkMode = await SecureStore.getItemAsync('darkModeEnabled');
      if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === 'true');
      }
    } catch (error) {
      console.log('Failed to load dark mode preference:', error);
      // Fallback to default (light mode) - no action needed
    }
  };

  // Save dark mode preference to secure storage
  const saveDarkModePreference = async (isDarkMode: boolean) => {
    try {
      await SecureStore.setItemAsync('darkModeEnabled', isDarkMode.toString());
    } catch (error) {
      console.log('Failed to save dark mode preference:', error);
      // Continue without saving - won't persist but won't break the app
    }
  };

  const scrollToBottom = (animated: boolean = true, force: boolean = false) => {
    if (scrollViewRef.current && (shouldAutoScroll || force)) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setIsGenerating(false);
  };

  const regenerateLastResponse = async () => {
    if (messages.length < 2 || loading || isGenerating) return;

    // Find the last AI message and the user message before it
    let lastAiIndex = -1;
    let lastUserMessage = '';

    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].isUser && lastAiIndex === -1) {
        lastAiIndex = i;
      } else if (messages[i].isUser && lastAiIndex !== -1) {
        lastUserMessage = messages[i].text;
        break;
      }
    }

    if (lastAiIndex === -1 || !lastUserMessage) return;

    // Remove the last AI message
    setMessages(prev => prev.slice(0, lastAiIndex));

    setLoading(true);
    setIsGenerating(true);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Create new AI message placeholder
      const aiMessageId = Date.now() + 1;
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        isUser: false,
        type: 'chat',
      };

      setLatestMessageId(aiMessageId);
      setMessages(prev => [...prev, aiMessage]);

      let fullResponseText = '';

      // Generate new AI response
      await apiClient.generateAIResponseStream(
        lastUserMessage,
        conversationId || undefined,
        'chat',
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
        (metadata: any) => {
          console.log('Regeneration complete. Metadata:', metadata);
          loadConversations();
        },
        (error: string) => {
          console.error('Regeneration error:', error);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    text: fullResponseText || 'Sorry, I encountered an error. Please try again.'
                  }
                : msg
            )
          );
        },
        abortControllerRef.current?.signal
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error regenerating response:', error);
      }
    } finally {
      setLoading(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50; // Increased threshold for better UX
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    // Update auto-scroll state based on user's scroll position
    // Only disable auto-scroll if user actively scrolled up
    if (!isCloseToBottom && contentOffset.y > 0) {
      setShouldAutoScroll(false);
    } else if (isCloseToBottom) {
      setShouldAutoScroll(true);
    }
  };

  // Animate button appearance
  useEffect(() => {
    Animated.timing(scrollButtonOpacity, {
      toValue: shouldAutoScroll ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [shouldAutoScroll]);

  const reactToMessage = (messageId: number, reaction: 'like' | 'dislike') => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, reaction: msg.reaction === reaction ? null : reaction }
          : msg
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSuggestionPress = (suggestion: ChatSuggestion) => {
    setInputText(suggestion.action);
    // Auto-send the suggestion
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const sendModuleDescriptionRequest = async (module: LearningModule) => {
    // Create a message requesting AI to describe the module
    const moduleInfo = `Tell me about the "${module.title}" module. It's a ${module.difficulty_level} level module in the ${module.category?.name || 'General'} category that takes about ${module.estimated_duration_minutes} minutes. Here's the description: ${module.description}`;

    // Create user message showing they clicked the module
    const userMessage: Message = {
      id: Date.now(),
      text: `Tell me more about: ${module.title}`,
      isUser: true,
      type: 'chat'
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setShouldAutoScroll(true);

    try {
      // Save user message to backend
      const userResponse = await apiClient.sendMessage(userMessage.text, conversationId || undefined);

      if (userResponse.success) {
        // Handle conversation ID
        if (!conversationId && userResponse.data?.conversation_id) {
          setConversationId(userResponse.data.conversation_id);

          const newConversation = {
            id: userResponse.data.conversation_id,
            title: userMessage.text.substring(0, 50) + (userMessage.text.length > 50 ? '...' : ''),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          };

          setConversations(prev => [newConversation, ...prev]);
          setCurrentConversation(newConversation);

          chatStore.addConversation({
            id: newConversation.id,
            title: newConversation.title,
            messages: messages,
            created_at: newConversation.created_at,
            updated_at: newConversation.updated_at
          });
        }

        // Generate AI response with module context
        const currentConvId = conversationId || userResponse.data?.conversation_id;
        const aiResponse = await apiClient.generateAIResponse(moduleInfo, currentConvId, 'chat');

        if (!aiResponse.success) {
          throw new Error(aiResponse.error || 'Failed to generate AI response');
        }

        const aiResponseText = aiResponse.data?.response || aiResponse.data?.message || 'Sorry, I could not generate a response about this module.';

        // Display AI response
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: aiResponseText,
          isUser: false,
          type: 'chat',
        };

        setLatestMessageId(aiMessage.id);
        setMessages(prev => [...prev, aiMessage]);

        loadConversations();
      } else {
        throw new Error(userResponse.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error requesting module description:', error);

      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error describing this module. Please try again.',
        isUser: false,
        type: 'chat',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleModulePress = (module: LearningModule) => {
    // Send AI message request for module description
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    console.log('Module pressed:', {
      id: module.id,
      title: module.title,
      category: module.category?.name,
      difficulty: module.difficulty_level
    });

    // Send request to AI for description
    sendModuleDescriptionRequest(module);

    showToast(`📚 Getting info about ${module.title}...`, 'info');
  };

  const sendCourseDescriptionRequest = async (course: any) => {
    // Create a message requesting AI to describe the course
    const courseInfo = `Tell me about the "${course.title}" course. It's a ${course.difficulty_level} level course in the ${course.category?.name || 'General'} category that takes about ${course.estimated_duration_hours} hours. Here's the description: ${course.description}${course.learning_outcomes ? ` Learning outcomes: ${course.learning_outcomes.join(', ')}` : ''}`;

    // Create user message showing they clicked the course
    const userMessage: Message = {
      id: Date.now(),
      text: `Tell me more about: ${course.title}`,
      isUser: true,
      type: 'chat'
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setShouldAutoScroll(true);

    try {
      // Save user message to backend
      const userResponse = await apiClient.sendMessage(userMessage.text, conversationId || undefined);

      if (userResponse.success) {
        // Handle conversation ID
        if (!conversationId && userResponse.data?.conversation_id) {
          setConversationId(userResponse.data.conversation_id);

          const newConversation = {
            id: userResponse.data.conversation_id,
            title: userMessage.text.substring(0, 50) + (userMessage.text.length > 50 ? '...' : ''),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          };

          setConversations(prev => [newConversation, ...prev]);
          setCurrentConversation(newConversation);

          chatStore.addConversation({
            id: newConversation.id,
            title: newConversation.title,
            messages: messages,
            created_at: newConversation.created_at,
            updated_at: newConversation.updated_at
          });
        }

        // Generate AI response with course context
        const currentConvId = conversationId || userResponse.data?.conversation_id;
        const aiResponse = await apiClient.generateAIResponse(courseInfo, currentConvId, 'chat');

        if (!aiResponse.success) {
          throw new Error(aiResponse.error || 'Failed to generate AI response');
        }

        const aiResponseText = aiResponse.data?.response || aiResponse.data?.message || 'Sorry, I could not generate a response about this course.';

        // Display AI response
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: aiResponseText,
          isUser: false,
          type: 'chat',
        };

        setLatestMessageId(aiMessage.id);
        setMessages(prev => [...prev, aiMessage]);

        loadConversations();
      } else {
        throw new Error(userResponse.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error requesting course description:', error);

      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error describing this course. Please try again.',
        isUser: false,
        type: 'chat',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCoursePress = (course: any) => {
    // Send AI message request for course description
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    console.log('Course pressed:', {
      id: course.id,
      title: course.title,
      category: course.category?.name,
      difficulty: course.difficulty_level
    });

    // Send request to AI for description
    sendCourseDescriptionRequest(course);

    showToast(`📚 Getting info about ${course.title}...`, 'info');
  };

  const handleCategoryPress = (category: ModuleCategory) => {
    // Handle category press by searching for courses in that category
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const searchQuery = `/courses ${category.name}`;
    setInputText(searchQuery);

    // Auto-send the command
    setTimeout(() => {
      sendMessage();
    }, 100);

    showToast(`🔍 Searching courses in ${category.name}`, 'info');
  };

  const handleQuickActionSelect = async (command: string) => {
    // Handle quick action selection from the menu - execute immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (command === 'What would you like to search for?') {
      // For search action, just set the input text and let user type
      setInputText('');
      showToast('💭 Type what you\'d like to search for', 'info');
    } else {
      // Execute command immediately without setting input text
      try {
        // Check if it's a command and process it directly
        if (isCommand(command)) {
          setLoading(true);
          
          // Add user message to show what action was selected
          const userMessage: Message = {
            text: command,
            isUser: true,
            id: Date.now(),
          };
          setMessages(prev => [...prev, userMessage]);

          // Process the command
          const commandResult = await handleCommand(command);
          
          // Add AI response with command result
          const aiMessage: Message = {
            text: commandResult.content,
            isUser: false,
            id: Date.now() + 1,
            commandResponse: commandResult,
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setLatestMessageId(aiMessage.id);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          
        } else {
          // For non-command actions, treat as regular message
          setInputText(command);
          setTimeout(() => {
            sendMessage();
          }, 100);
        }
      } catch (error: any) {
        console.error('Quick action error:', error);
        showToast('Sorry, there was an error processing that action.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuickActionsPress = () => {
    setShowQuickActions(true);
  };

  const handleStartLearning = (module: LearningModule) => {
    // Handle starting a learning module
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // For now, show a toast - Phase 4 will add full learning interface
    showToast(
      `🚀 Starting "${module.title}"\nThis will open the full learning experience in Phase 4!`,
      'info'
    );
    
    console.log('Starting learning for module:', module.title);
  };

  const handleModuleBookmark = async (module: LearningModule, bookmarked: boolean) => {
    // Handle bookmarking a module
    try {
      if (bookmarked) {
        showToast(`📚 Bookmarked "${module.title}"`, 'success');
      } else {
        showToast(`📚 Removed bookmark from "${module.title}"`, 'info');
      }
      
      console.log(`Module ${bookmarked ? 'bookmarked' : 'unbookmarked'}:`, module.title);
    } catch (error) {
      showToast('Failed to update bookmark', 'error');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      type: 'chat'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setLoading(true);
    setIsGenerating(true);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Ensure user is at the bottom for new messages
    setShouldAutoScroll(true);

    // Check if this is a command
    if (isCommand(messageText)) {
      try {
        const commandResponse = await handleCommand(messageText);
        
        const commandMessage: Message = {
          id: Date.now() + 1,
          text: commandResponse.success ? '' : commandResponse.content,
          isUser: false,
          type: 'chat',
          commandResponse: commandResponse.success ? commandResponse : undefined
        };

        setMessages(prev => [...prev, commandMessage]);
        setLatestMessageId(commandMessage.id);
        setLoading(false);
        setIsGenerating(false);
        return;
      } catch (error: any) {
        console.error('Command processing failed:', error);

        const errorMessage: Message = {
          id: Date.now() + 1,
          text: error.message || 'Command failed. Please try again.',
          isUser: false,
          type: 'chat',
        };

        setMessages(prev => [...prev, errorMessage]);
        setLoading(false);
        setIsGenerating(false);
        return;
      }
    }

    try {
      // Step 1: Save user message to backend
      const userResponse = await apiClient.sendMessage(messageText, conversationId || undefined);

      if (userResponse.success) {
        // Handle conversation ID from the user message response
        if (!conversationId && userResponse.data?.conversation_id) {
          setConversationId(userResponse.data.conversation_id);

          // Create new conversation object
          const newConversation = {
            id: userResponse.data.conversation_id,
            title: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''), // Temporary title
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          };

          // Immediately add to conversations list
          setConversations(prev => [newConversation, ...prev]);

          // Update current conversation for header display
          setCurrentConversation(newConversation);

          // Also update the chat store for other components
          chatStore.addConversation({
            id: newConversation.id,
            title: newConversation.title,
            messages: messages,
            created_at: newConversation.created_at,
            updated_at: newConversation.updated_at
          });
        }

        // Step 2: Generate AI response with streaming
        const currentConvId = conversationId || userResponse.data?.conversation_id;

        // Create AI message with empty text initially for streaming
        const aiMessageId = Date.now() + 1;
        const aiMessage: Message = {
          id: aiMessageId,
          text: '',
          isUser: false,
          type: 'chat',
        };

        setLatestMessageId(aiMessageId);
        setMessages(prev => [...prev, aiMessage]);

        let fullResponseText = '';

        // Use streaming API
        await apiClient.generateAIResponseStream(
          messageText,
          currentConvId,
          'chat',
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
            console.log('Streaming complete. Metadata:', metadata);
            // Refresh conversations list to show updated conversation
            loadConversations();
          },
          // onError - handle streaming errors
          (error: string) => {
            console.error('Streaming error:', error);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      text: fullResponseText || 'Sorry, I encountered an error. Please try again.'
                    }
                  : msg
              )
            );
          },
          // Pass abort signal for cancellation
          abortControllerRef.current?.signal
        );
      } else {
        throw new Error(userResponse.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');

      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        type: 'chat',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, darkMode && styles.containerDark]}
      edges={['top', 'left', 'right']}
      key={layoutReady ? 'ready' : 'initial'}
    >

      {/* Header - matching web app */}
      <View
        style={[styles.header, darkMode ? styles.headerDark : styles.headerLight]}
        collapsable={false}
      >
        <View style={styles.headerContent}>
          {/* Left section - Menu & Logo */}
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMenu(true);
              }}
              style={[styles.menuButton, darkMode && styles.menuButtonDark]}
            >
              <View style={[styles.sidebarIcon, darkMode && styles.sidebarIconDark]}>
                <View style={[styles.sidebarRect, styles.sidebarRectLarge, darkMode && styles.sidebarRectDark]} />
                <View style={[styles.sidebarRect, styles.sidebarRectSmall, darkMode && styles.sidebarRectDark]} />
              </View>
            </TouchableOpacity>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          {/* Center section - Title (flexible) */}
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]} numberOfLines={1}>
              Kiongozi<Text style={styles.platformText}>Platform</Text>
            </Text>
            <Text style={[styles.headerSubtitle, darkMode && styles.headerSubtitleDark]} numberOfLines={1}>
              {currentConversation?.title || 'AI Assistant'}
            </Text>
          </View>

          {/* Right section - Actions */}
          <View style={styles.headerRight}>
            {/* Help Button */}
            <TouchableOpacity
              onPress={showTutorialManually}
              style={[styles.actionButton, darkMode && styles.actionButtonDark]}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={darkMode ? '#d1d5db' : '#6b7280'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const newDarkMode = !darkMode;
                setDarkMode(newDarkMode);
                saveDarkModePreference(newDarkMode);
              }}
              style={[styles.actionButton, darkMode && styles.actionButtonDark]}
            >
              <Text style={[styles.actionButtonText, darkMode && styles.actionButtonTextDark]}>
                {darkMode ? '☀️' : '🌙'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages Container */}
{/* Show welcome screen if no messages */}
        {!loadingMessages && messages.length === 0 && !loading ? (
          <WelcomeScreen
            onSuggestionPress={handleSuggestionPress}
            darkMode={darkMode}
            userName={user?.first_name || user?.full_name || 'there'}
          />
        ) : (
          <KeyboardAwareScrollView
            style={[styles.messagesContainer, darkMode ? styles.messagesContainerDark : styles.messagesContainerLight]}
            contentContainerStyle={styles.messagesContent}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollToBottom()}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 150}
            extraHeight={Platform.OS === 'ios' ? 20 : 120}
            enableAutomaticScroll={Platform.OS === 'ios'}
            enableResetScrollToCoords={false}
            keyboardOpeningTime={Platform.OS === 'ios' ? 0 : 250}
            viewIsInsideTabBar={false}
            innerRef={ref => {
              scrollViewRef.current = ref;
            }}
          >
            {loadingMessages && (
              <View style={styles.conversationLoadingWrapper}>
                <View style={[styles.conversationLoadingContainer, darkMode && styles.conversationLoadingContainerDark]}>
                  <ActivityIndicator size="small" color={darkMode ? '#3b82f6' : '#3b82f6'} />
                  <Text style={[styles.conversationLoadingText, darkMode && styles.conversationLoadingTextDark]}>
                    Loading conversation...
                  </Text>
                </View>
              </View>
            )}

{!loadingMessages && messages.map((message, index) => (
              <View
                key={message.id}
                style={[
                  !message.isUser && styles.aiMessageBackground,
                  !message.isUser && darkMode && styles.aiMessageBackgroundDark
                ]}
              >
                {message.isUser ? (
                  <UserMessage
                    message={message}
                    darkMode={darkMode}
                    onCopy={copyMessage}
                  />
                ) : useEnhancedMessages ? (
                  <EnhancedAIMessage
                    message={message}
                    darkMode={darkMode}
                    onCopy={copyMessage}
                    onReact={reactToMessage}
                    showTypewriter={message.id === latestMessageId}
                    onTypewriterComplete={() => setLatestMessageId(null)}
                    onModulePress={handleModulePress}
                    onCoursePress={handleCoursePress}
                    onCategoryPress={handleCategoryPress}
                    isLastAiMessage={index === messages.length - 1 && !message.isUser}
                    onRegenerate={regenerateLastResponse}
                  />
                ) : (
                  <AIMessage
                    message={message}
                    darkMode={darkMode}
                    onCopy={copyMessage}
                    onReact={reactToMessage}
                  />
                )}
              </View>
            ))}

            {loading && (
              <View style={styles.loadingWrapper}>
                <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
                  <LoadingDots />
                </View>
              </View>
            )}
          </KeyboardAwareScrollView>
        )}

        {/* Scroll to Bottom Button */}
        <Animated.View
          style={[
            styles.scrollToBottomButton,
            darkMode && styles.scrollToBottomButtonDark,
            {
              opacity: scrollButtonOpacity,
              transform: [{
                scale: scrollButtonOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]}
          pointerEvents={shouldAutoScroll ? 'none' : 'auto'}
        >
          <TouchableOpacity
            style={styles.scrollToBottomTouchable}
            onPress={() => {
              setShouldAutoScroll(true);
              scrollToBottom(true, true); // Force scroll even if shouldAutoScroll was false
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={darkMode ? "#60a5fa" : "#3b82f6"}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Modern Input Container */}
        <View
          style={[
            styles.modernInputContainer,
            Platform.OS === 'android' && keyboardHeight > 0 && {
              paddingBottom: Math.max(keyboardHeight * 0.1, 10),
            },
            Platform.OS === 'ios' && {
              paddingBottom: 8,
            }
          ]}
        >
          <ModernMessageInput
            value={inputText}
            onChangeText={setInputText}
            onSend={sendMessage}
            placeholder="Ask me anything..."
            darkMode={darkMode}
            loading={loading}
            isGenerating={isGenerating}
            onStopGenerating={stopGenerating}
            disabled={false}
            maxLength={1000}
            onQuickActionsPress={handleQuickActionsPress}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Mobile Menu */}
      <MobileMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        darkMode={darkMode}
        onToggleDarkMode={() => {
          const newDarkMode = !darkMode;
          setDarkMode(newDarkMode);
          saveDarkModePreference(newDarkMode);
        }}
        onSignOut={handleSignOut}
        conversations={conversations}
        loadingConversations={loadingConversations}
        refreshingConversations={refreshingConversations}
        onSelectConversation={(selectedConversationId) => {
          setShowMenu(false);
          loadConversationMessages(selectedConversationId);
        }}
        onNewChat={() => {
          setShowMenu(false);
          startNewChat();
          // Refresh conversations list to potentially show the new chat once user sends a message
          loadConversations();
        }}
        onRefreshConversations={refreshConversations}
        onOpenProfile={() => {
          setShowMenu(false);
          setShowProfile(true);
        }}
        onShareConversation={shareConversation}
        onDeleteConversation={deleteConversation}
        onShowTutorial={showTutorialManually}
        currentConversationId={currentConversation?.id}
      />

      {/* Profile Screen */}
      <ProfileScreen
        visible={showProfile}
        darkMode={darkMode}
        onToggleDarkMode={() => {
          const newDarkMode = !darkMode;
          setDarkMode(newDarkMode);
          saveDarkModePreference(newDarkMode);
        }}
        onClose={() => setShowProfile(false)}
        onSignOut={handleSignOut}
      />

      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        darkMode={darkMode}
        onClose={() => setShowExportModal(false)}
        conversations={chatStore.conversations}
        currentConversation={chatStore.currentConversation}
      />

      {/* Quick Actions Menu */}
      <QuickActionsMenu
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onActionSelect={handleQuickActionSelect}
        darkMode={darkMode}
      />

      {/* Module Detail Modal */}
      <ModuleDetailModal
        visible={showModuleDetail}
        module={selectedModule}
        onClose={() => {
          setShowModuleDetail(false);
          setSelectedModule(null);
        }}
        darkMode={darkMode}
        onStartLearning={handleStartLearning}
        onBookmark={handleModuleBookmark}
      />

      {/* Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        onComplete={handleTutorialComplete}
        darkMode={darkMode}
      />

      {/* Custom Toast */}
      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        darkMode={darkMode}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  chatContainer: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerLight: {
    backgroundColor: '#f8fafc',
  },
  headerDark: {
    backgroundColor: '#111827',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarIcon: {
    width: 16,
    height: 12,
    justifyContent: 'space-between',
  },
  sidebarIconDark: {
    // No additional styling needed for dark mode - handled by rect styles
  },
  sidebarRect: {
    borderRadius: 2,
    backgroundColor: '#374151',
  },
  sidebarRectDark: {
    backgroundColor: '#d1d5db',
  },
  sidebarRectLarge: {
    width: 16,
    height: 4,
  },
  sidebarRectSmall: {
    width: 12,
    height: 4,
  },
  headerLogo: {
    width: 45,
    height: 30,
    marginLeft: 8,
  },
  aiIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  platformText: {
    color: '#3b82f6',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    flexShrink: 1,
  },
  headerSubtitleDark: {
    color: '#9ca3af',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  actionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4b5563',
  },
  actionButtonTextDark: {
    color: '#d1d5db',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContainerLight: {
    backgroundColor: '#f8fafc',
  },
  messagesContainerDark: {
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 8, // Reduced from 16 for wider messages
    paddingTop: 20,
    paddingBottom: 20,
  },
  loadingWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainerDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  loadingTextDark: {
    color: '#9ca3af',
  },
  modernInputContainer: {
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 12,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 120, // Moved higher to avoid input field
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollToBottomButtonDark: {
    backgroundColor: 'rgba(55, 65, 81, 0.95)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
    shadowColor: '#60a5fa',
  },
  scrollToBottomTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationLoadingWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  conversationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  conversationLoadingContainerDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  conversationLoadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  conversationLoadingTextDark: {
    color: '#9ca3af',
  },
  aiMessageBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  aiMessageBackgroundDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
});