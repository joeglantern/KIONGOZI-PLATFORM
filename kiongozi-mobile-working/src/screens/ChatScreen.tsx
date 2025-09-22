import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Keyboard,
} from 'react-native';
// LinearGradient removed for compatibility
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/apiClient';
import LoadingDots from '../components/LoadingDots';
import MobileMenu from '../components/MobileMenu';
import { generateAIResponse } from '../utils/openaiClient';

interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
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
  }, []);

  useEffect(() => {
    // Keyboard event listeners
    const keyboardWillShow = (event: any) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

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
              onPress={() => setShowMenu(true)}
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
                AI Assistant
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setDarkMode(!darkMode)}
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

      {/* Chat Content with Dynamic Keyboard Handling */}
      <View style={styles.chatContainer}>
        {/* Messages Container */}
        <View
          style={[
            styles.messagesContainer,
            darkMode ? styles.messagesContainerDark : styles.messagesContainerLight,
            isKeyboardVisible && { marginBottom: keyboardHeight - (Platform.OS === 'ios' ? 40 : 0) }
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper
                ]}
              >
                <View
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessage : styles.aiMessage,
                    darkMode && message.isUser && styles.userMessageDark,
                    darkMode && !message.isUser && styles.aiMessageDark,
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.aiMessageText,
                    darkMode && message.isUser && styles.userMessageTextDark,
                    darkMode && !message.isUser && styles.aiMessageTextDark,
                  ]}>
                    {message.text}
                  </Text>
                </View>
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
          </ScrollView>
        </View>

        {/* Input Container */}
        <View
          style={[
            styles.inputContainer,
            darkMode ? styles.inputContainerDark : styles.inputContainerLight,
            isKeyboardVisible && {
              position: 'absolute',
              bottom: keyboardHeight,
              left: 0,
              right: 0,
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
              onFocus={() => {
                // Scroll to bottom when input is focused to ensure visibility
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
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
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSignOut={handleSignOut}
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
    flexGrow: 1,
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
  },
  inputContainerLight: {
    backgroundColor: '#ffffff',
  },
  inputContainerDark: {
    backgroundColor: '#1f2937',
  },
  inputWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
});