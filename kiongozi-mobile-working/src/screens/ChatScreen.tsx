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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import { useChatStore } from '../stores/chatStore';

interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  reaction?: 'like' | 'dislike' | null;
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const chatStore = useChatStore();

  useEffect(() => {
    // Add welcome message matching web app
    setMessages([
      {
        id: 1,
        text: "Habari! I'm your Kiongozi AI assistant. I'm here to help you learn about Kenyan civic education, government, and your rights as a citizen. What would you like to know about?",
        isUser: false,
        type: 'chat',
      }
    ]);

    // Load saved dark mode preference
    loadDarkModePreference();
  }, []);

  // Keyboard handling for production builds
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        // Ensure auto-scroll and scroll to bottom when keyboard opens
        setShouldAutoScroll(true);
        scrollToBottom();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
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

    // Set welcome message
    setMessages([
      {
        id: 1,
        text: "Habari! I'm your Kiongozi AI assistant. I'm here to help you learn about Kenyan civic education, government, and your rights as a citizen. What would you like to know about?",
        isUser: false,
        type: 'chat',
      }
    ]);
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

  const scrollToBottom = (animated: boolean = true) => {
    if (scrollViewRef.current && shouldAutoScroll) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    // Update auto-scroll state based on user's scroll position
    setShouldAutoScroll(isCloseToBottom);
  };

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

    // Ensure user is at the bottom for new messages
    setShouldAutoScroll(true);

    try {
      // Step 1: Save user message to backend
      const userResponse = await apiClient.sendMessage(messageText, conversationId || undefined);

      if (userResponse.success) {
        // Handle conversation ID from the user message response
        if (!conversationId && userResponse.data?.conversation_id) {
          setConversationId(userResponse.data.conversation_id);
          // Update current conversation for header display (will be updated when conversations reload)
          setCurrentConversation({
            id: userResponse.data.conversation_id,
            title: undefined, // Will be set when conversations are refreshed
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user_id: user?.id || ''
          });
        }

        // Step 2: Generate AI response via backend API
        const currentConvId = conversationId || userResponse.data?.conversation_id;
        const aiResponse = await apiClient.generateAIResponse(messageText, currentConvId, 'chat');

        if (!aiResponse.success) {
          throw new Error(aiResponse.error || 'Failed to generate AI response');
        }

        const aiResponseText = aiResponse.data?.response || aiResponse.data?.message || 'Sorry, I could not generate a response.';

        // Backend should automatically save the AI response, so no manual save needed

        // Step 4: Display AI response to user
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: aiResponseText,
          isUser: false,
          type: 'chat',
        };

        setMessages(prev => [...prev, aiMessage]);


        // Refresh conversations list to show updated conversation
        loadConversations();
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
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>

      {/* Header - matching web app */}
      <View
        style={[styles.header, darkMode ? styles.headerDark : styles.headerLight]}
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
            <View style={styles.aiIcon}>
              <Text style={styles.aiIconText}>AI</Text>
            </View>
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

            <TouchableOpacity
              onPress={handleSignOut}
              style={[styles.actionButton, styles.signOutButton]}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chat Content */}
      <View style={styles.chatContainer}>
        {/* Messages Container */}
        <KeyboardAwareScrollView
          style={[styles.messagesContainer, darkMode ? styles.messagesContainerDark : styles.messagesContainerLight]}
          contentContainerStyle={styles.messagesContent}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollToBottom()}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'android' ? 150 : 100}
          extraHeight={Platform.OS === 'android' ? 120 : 75}
          enableAutomaticScroll={false}
          enableResetScrollToCoords={false}
          keyboardOpeningTime={250}
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

          {!loadingMessages && messages.map((message) => (
            message.isUser ? (
              <UserMessage
                key={message.id}
                message={message}
                darkMode={darkMode}
                onCopy={copyMessage}
              />
            ) : (
              <AIMessage
                key={message.id}
                message={message}
                darkMode={darkMode}
                onCopy={copyMessage}
                onReact={reactToMessage}
              />
            )
          ))}

          {loading && (
            <View style={styles.loadingWrapper}>
              <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
                <LoadingDots />
                <Text style={[styles.loadingText, darkMode && styles.loadingTextDark]}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}
        </KeyboardAwareScrollView>

        {/* Scroll to Bottom Button */}
        {!shouldAutoScroll && (
          <TouchableOpacity
            style={[
              styles.scrollToBottomButton,
              darkMode && styles.scrollToBottomButtonDark
            ]}
            onPress={() => {
              setShouldAutoScroll(true);
              scrollToBottom();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.scrollToBottomIcon}>↓</Text>
          </TouchableOpacity>
        )}

        {/* Modern Input Container */}
        <View
          style={[
            styles.modernInputContainer,
            Platform.OS === 'android' && keyboardHeight > 0 && {
              paddingBottom: Math.max(keyboardHeight * 0.1, 10),
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
            disabled={false}
            maxLength={1000}
          />
        </View>
      </View>

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
    paddingTop: Platform.OS === 'android' ? 24 : 0,
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
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  aiIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
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
    paddingHorizontal: 16,
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
    right: 20,
    bottom: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scrollToBottomButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  scrollToBottomIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
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
});