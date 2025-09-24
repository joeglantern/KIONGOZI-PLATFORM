import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
// LinearGradient removed for compatibility
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/apiClient';
import LoadingDots from '../components/LoadingDots';
import MobileMenu from '../components/MobileMenu';
import CustomToast from '../components/CustomToast';
import ProfileScreen from './ProfileScreen';
import { generateAIResponse } from '../utils/openaiClient';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Add welcome message matching web app
    setMessages([
      {
        id: 1,
        text: "Habari! I'm your Kiongozi AI assistant. I'm here to help you learn about Kenyan civic education, government, and your rights as a citizen. What would you like to know about?",
        isUser: false,
        type: 'chat'
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
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
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
        type: 'chat'
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

    try {
      // Step 1: Save user message to backend
      const userResponse = await apiClient.sendMessage(messageText, conversationId || undefined);

      if (userResponse.success) {
        // Handle conversation ID from the user message response
        if (!conversationId && userResponse.data?.conversation_id) {
          setConversationId(userResponse.data.conversation_id);
        }

        // Step 2: Generate AI response using OpenAI
        // Create conversation history from current messages for context
        const conversationHistory = messages
          .slice(-10) // Only use last 10 messages for context
          .map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.text
          }));

        const aiResponseText = await generateAIResponse(messageText, conversationHistory);

        // Step 3: Save AI response to backend
        const currentConvId = conversationId || userResponse.data?.conversation_id;
        if (currentConvId) {
          try {
            await apiClient.saveAssistantMessage(aiResponseText, currentConvId, 'chat');
          } catch (saveError) {
            console.warn('Failed to save AI response to backend:', saveError);
            // Continue anyway - user will still see the response
          }
        }

        // Step 4: Display AI response to user
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: aiResponseText,
          isUser: false,
          type: 'chat'
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
        type: 'chat'
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      {/* Header - matching web app */}
      <View
        style={[styles.header, darkMode ? styles.headerDark : styles.headerLight]}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMenu(true);
              }}
              style={[styles.menuButton, darkMode && styles.menuButtonDark]}
            >
              <Text style={[styles.menuButtonText, darkMode && styles.menuButtonTextDark]}>
                ☰
              </Text>
            </TouchableOpacity>
            <View
              style={styles.aiIcon}
            >
              <Text style={styles.aiIconText}>AI</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
                Kiongozi<Text style={styles.platformText}>Platform</Text>
              </Text>
              <Text style={[styles.headerSubtitle, darkMode && styles.headerSubtitleDark]}>
                {currentConversation?.title || 'AI Assistant'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
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
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'android' ? 150 : 100}
          extraHeight={Platform.OS === 'android' ? 120 : 75}
          enableAutomaticScroll={true}
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
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage,
                  darkMode && message.isUser && styles.userMessageDark,
                  darkMode && !message.isUser && styles.aiMessageDark,
                ]}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  copyMessage(message.text);
                }}
                delayLongPress={500}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.aiMessageText,
                  darkMode && message.isUser && styles.userMessageTextDark,
                  darkMode && !message.isUser && styles.aiMessageTextDark,
                ]}>
                  {message.text}
                </Text>

                {/* Reaction buttons for AI messages */}
                {!message.isUser && (
                  <View style={styles.reactionContainer}>
                    <TouchableOpacity
                      style={[
                        styles.reactionButton,
                        message.reaction === 'like' && styles.reactionButtonActive,
                        darkMode && styles.reactionButtonDark
                      ]}
                      onPress={() => reactToMessage(message.id, 'like')}
                    >
                      <Text style={[
                        styles.reactionButtonText,
                        message.reaction === 'like' && styles.reactionButtonTextActive
                      ]}>
                        👍
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.reactionButton,
                        message.reaction === 'dislike' && styles.reactionButtonActive,
                        darkMode && styles.reactionButtonDark
                      ]}
                      onPress={() => reactToMessage(message.id, 'dislike')}
                    >
                      <Text style={[
                        styles.reactionButtonText,
                        message.reaction === 'dislike' && styles.reactionButtonTextActive
                      ]}>
                        👎
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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

        {/* Fixed Input Container */}
        <View
          style={[
            styles.inputContainer,
            darkMode ? styles.inputContainerDark : styles.inputContainerLight,
            Platform.OS === 'android' && keyboardHeight > 0 && {
              paddingBottom: Math.max(keyboardHeight * 0.1, 10),
            }
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={textInputRef}
              style={[
                styles.textInput,
                darkMode && styles.textInputDark
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about Kenyan civic education..."
              placeholderTextColor={darkMode ? '#9ca3af' : '#6b7280'}
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                sendMessage();
              }}
              disabled={!inputText.trim() || loading}
            >
              <View
                style={[styles.sendButtonGradient, (!inputText.trim() || loading) ? styles.sendButtonDisabledBg : styles.sendButtonEnabledBg]}
              >
                <Text style={styles.sendButtonText}>
                  {loading ? '⏳' : '🚀'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
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
  chatContainer: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  menuButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuButtonText: {
    fontSize: 16,
    color: '#4b5563',
  },
  menuButtonTextDark: {
    color: '#d1d5db',
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
  },
  headerSubtitleDark: {
    color: '#9ca3af',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageContainer: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMessage: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  userMessageDark: {
    backgroundColor: '#1d4ed8',
  },
  aiMessage: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  aiMessageDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  userMessageTextDark: {
    color: '#f9fafb',
  },
  aiMessageText: {
    color: '#1f2937',
  },
  aiMessageTextDark: {
    color: '#f3f4f6',
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
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 12,
  },
  inputContainerLight: {
    backgroundColor: '#ffffff',
  },
  inputContainerDark: {
    backgroundColor: '#1f2937',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    height: 44,
    backgroundColor: '#ffffff',
    color: '#1f2937',
    textAlignVertical: 'center',
  },
  textInputDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f3f4f6',
  },
  sendButton: {
    width: 44,
    height: 44,
    alignSelf: 'center',
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
  },
  sendButtonEnabledBg: {
    backgroundColor: '#3b82f6',
  },
  sendButtonDisabledBg: {
    backgroundColor: '#9ca3af',
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
  reactionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  reactionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  reactionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  reactionButtonActive: {
    backgroundColor: '#3b82f6',
  },
  reactionButtonText: {
    fontSize: 14,
  },
  reactionButtonTextActive: {
    transform: [{ scale: 1.2 }],
  },
});