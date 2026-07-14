import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Image,
  PanResponder,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import apiClient from '../utils/apiClient';
import LoadingDots from '../components/LoadingDots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(300, SCREEN_WIDTH * 0.78);
const EDGE_HIT = 30; // px from left edge that starts the open gesture

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  isLoading?: boolean;
}

interface Conversation {
  id: string;
  title?: string;
  updated_at: string;
  created_at: string;
}

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ChatScreenProps {
  onClose?: () => void;
}

export default function ChatScreen({ onClose }: ChatScreenProps) {
  const { user } = useAuthStore();
  const isDark = useThemeStore(s => s.isDark);
  const insets = useSafeAreaInsets();

  // ─── Theme tokens ────────────────────────────────────────────────────────────
  const C = {
    bg:         isDark ? '#000000' : '#FFFFFF',
    surface:    isDark ? '#111111' : '#F2F2F7',
    surface2:   isDark ? '#1C1C1E' : '#E5E5EA',
    border:     isDark ? '#2C2C2E' : '#D1D1D6',
    text:       isDark ? '#FFFFFF' : '#000000',
    textSub:    isDark ? '#8E8E93' : '#6C6C70',
    userBubble: isDark ? '#1C1C1E' : '#E9E9EB',
    accent:     '#5CB85C',
    sidebar:    isDark ? '#0D0D0D' : '#F8F8F8',
  };

  // ─── Chat state ───────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ─── Sidebar state ────────────────────────────────────────────────────────────
  // sidebarAnim 0 = closed, 1 = open
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  // Tracks current value without triggering re-renders — used inside PanResponder
  const sidebarVal = useRef(0);
  // Boolean state used to conditionally render the tap-to-close overlay
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const id = sidebarAnim.addListener(({ value }) => {
      sidebarVal.current = value;
    });
    return () => sidebarAnim.removeListener(id);
  }, []);

  const openSidebar = useCallback((velocity = 0) => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSidebarOpen(true); // show overlay immediately so tap-to-close works
    Animated.spring(sidebarAnim, {
      toValue: 1,
      useNativeDriver: true,
      velocity,
      tension: 65,
      friction: 11,
    }).start();
  }, [sidebarAnim]);

  const closeSidebar = useCallback((velocity = 0) => {
    Animated.spring(sidebarAnim, {
      toValue: 0,
      useNativeDriver: true,
      velocity,
      tension: 65,
      friction: 11,
    }).start(({ finished }) => {
      if (finished) setSidebarOpen(false); // hide overlay only after animation ends
    });
  }, [sidebarAnim]);

  // Sidebar slides in from left; main content slides right by same amount (push effect)
  const sidebarTranslateX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });
  const contentTranslateX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SIDEBAR_WIDTH],
  });
  const overlayOpacity = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  // ─── PanResponder ─────────────────────────────────────────────────────────────
  // Attached to the root so both edge-drag (open) and content-drag (close) work.
  // The sidebar FlatList handles its own vertical scrolls independently.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gs) => {
        const { dx, dy } = gs;
        // Must be clearly more horizontal than vertical
        if (Math.abs(dx) < Math.abs(dy) * 1.4 || Math.abs(dx) < 6) return false;
        const isOpen = sidebarVal.current > 0.3;
        // Opening: swipe right starting from left edge, sidebar currently closed
        if (!isOpen && dx > 0 && evt.nativeEvent.pageX < EDGE_HIT) return true;
        // Closing: swipe left anywhere when sidebar is open
        if (isOpen && dx < 0) return true;
        return false;
      },
      onPanResponderGrant: () => {
        sidebarAnim.stopAnimation();
        // If just opening we need the overlay tap target to exist
        if (sidebarVal.current > 0.05) setSidebarOpen(true);
      },
      onPanResponderMove: (_, gs) => {
        const base = sidebarVal.current > 0.5 ? 1 : 0;
        const next = Math.max(0, Math.min(1, base + gs.dx / SIDEBAR_WIDTH));
        sidebarAnim.setValue(next);
        // setSidebarOpen(true) is a no-op when already true (hooks bail out on same value)
        if (next > 0.05) setSidebarOpen(true);
      },
      onPanResponderRelease: (_, gs) => {
        const cur = sidebarVal.current;
        const shouldOpen = gs.vx > 0.3 || (gs.vx >= -0.3 && cur > 0.4);
        if (shouldOpen) openSidebar(gs.vx);
        else closeSidebar(-gs.vx);
      },
      onPanResponderTerminate: (_, gs) => {
        if (sidebarVal.current > 0.5) openSidebar(gs.vx);
        else closeSidebar(-gs.vx);
      },
    })
  ).current;

  // ─── Data loading ─────────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const res = await apiClient.getConversations({ limit: 50, offset: 0 });
      if (res.success && Array.isArray(res.data)) setConversations(res.data);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => { if (user) loadConversations(); }, [user]);

  const loadConversationMessages = async (convId: string) => {
    closeSidebar();
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await apiClient.getConversationMessages(convId, { limit: 100, offset: 0 });
      if (res.success && Array.isArray(res.data)) {
        const formatted: Message[] = res.data.map((m: any, i: number) => ({
          id: m.id || Date.now() + i,
          text: m.text || m.content || '',
          isUser: m.is_user === true,
        }));
        setMessages(formatted);
        setConversationId(convId);
        setCurrentConversation(conversations.find(c => c.id === convId) || null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const startNewChat = () => {
    closeSidebar();
    setMessages([]);
    setConversationId(null);
    setCurrentConversation(null);
    setInputText('');
  };

  const deleteConversation = (convId: string) => {
    Alert.alert('Delete Chat', 'Delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await apiClient.deleteConversation(convId);
          setConversations(prev => prev.filter(c => c.id !== convId));
          if (conversationId === convId) startNewChat();
        },
      },
    ]);
  };

  // ─── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isGenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const aiId = Date.now() + 1;
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text, isUser: true },
      { id: aiId, text: '', isUser: false, isLoading: true },
    ]);
    setInputText('');
    setIsGenerating(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const savePromise = apiClient.sendMessage(text, conversationId || undefined);
      let fullText = '';

      apiClient.generateAIResponseStream(
        text,
        conversationId || '',
        'chat',
        (chunk: string) => {
          fullText += chunk;
          setMessages(prev =>
            prev.map(m => m.id === aiId ? { ...m, text: fullText, isLoading: false } : m)
          );
          flatListRef.current?.scrollToEnd({ animated: false });
        },
        async () => {
          setMessages(prev =>
            prev.map(m => m.id === aiId ? { ...m, text: fullText, isLoading: false } : m)
          );
          setIsGenerating(false);
          const saved = await savePromise;
          if (saved.success && !conversationId) {
            const newId = (saved.data as any)?.conversation_id;
            if (newId) setConversationId(newId);
          }
          loadConversations();
        },
        () => {
          setMessages(prev => prev.filter(m => m.id !== aiId));
          setIsGenerating(false);
          Alert.alert('Error', 'Failed to get a response. Please try again.');
        },
        abortControllerRef.current?.signal
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== aiId));
      setIsGenerating(false);
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setMessages(prev => prev.map(m => m.isLoading ? { ...m, isLoading: false } : m));
  };

  const copyMessage = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ─── Renderers ────────────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <View style={styles.userRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onLongPress={() => copyMessage(item.text)}
            style={[styles.userBubble, { backgroundColor: C.userBubble }]}
          >
            <Text style={[styles.userText, { color: C.text }]}>{item.text}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
        <Image source={require('../../assets/kchat-logo.png')} style={styles.aiAvatar} resizeMode="contain" />
        <View style={styles.aiContent}>
          {item.isLoading ? (
            <View style={{ paddingVertical: 6 }}><LoadingDots /></View>
          ) : (
            <TouchableOpacity activeOpacity={1} onLongPress={() => copyMessage(item.text)}>
              <Text style={[styles.aiText, { color: C.text }]}>{item.text}</Text>
              <TouchableOpacity
                onPress={() => copyMessage(item.text)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.copyBtn}
              >
                <Ionicons name="copy-outline" size={13} color={C.textSub} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [C]);

  const renderConversation = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.convItem, item.id === conversationId && { backgroundColor: C.surface2 }]}
      onPress={() => loadConversationMessages(item.id)}
      onLongPress={() => deleteConversation(item.id)}
      activeOpacity={0.65}
    >
      <Ionicons name="chatbubble-outline" size={15} color={C.textSub} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.convTitle, { color: C.text }]} numberOfLines={1}>
          {item.title || 'New conversation'}
        </Text>
        <Text style={[styles.convTime, { color: C.textSub }]}>{timeLabel(item.updated_at)}</Text>
      </View>
    </TouchableOpacity>
  ), [conversationId, C]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: C.sidebar }]} {...panResponder.panHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ── Sidebar (fixed, slides from left) ──────────────────────── */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            backgroundColor: C.sidebar,
            borderRightColor: C.border,
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateX: sidebarTranslateX }],
          },
        ]}
      >
        <View style={[styles.sidebarHeader, { borderBottomColor: C.border }]}>
          <Image source={require('../../assets/kchat-logo.png')} style={styles.sidebarLogo} resizeMode="contain" />
          <Text style={[styles.sidebarHeading, { color: C.text }]}>Chats</Text>
        </View>

        <TouchableOpacity
          style={[styles.newChatBtn, { borderColor: C.border }]}
          onPress={startNewChat}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={C.accent} />
          <Text style={[styles.newChatText, { color: C.accent }]}>New Chat</Text>
        </TouchableOpacity>

        {loadingConversations ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 28 }} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={c => c.id}
            renderItem={renderConversation}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.noChats, { color: C.textSub }]}>No chats yet</Text>
            }
          />
        )}
      </Animated.View>

      {/* ── Main content (pushed right when sidebar opens) ────────── */}
      <Animated.View
        style={[
          styles.main,
          {
            backgroundColor: C.bg,
            transform: [{ translateX: contentTranslateX }],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.border, paddingTop: insets.top + 6 }]}>
          <TouchableOpacity
            onPress={() => isSidebarOpen() ? closeSidebar() : openSidebar()}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={26} color={C.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Image source={require('../../assets/kchat-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
              {currentConversation?.title || 'Kiongozi AI'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={startNewChat}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={23} color={C.text} />
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-down" size={26} color={C.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Messages + Input */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {loadingMessages ? (
            <ActivityIndicator color={C.accent} style={{ flex: 1 }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => String(m.id)}
              renderItem={renderMessage}
              contentContainerStyle={[
                styles.messageList,
                messages.length === 0 && styles.messageListEmpty,
              ]}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Image source={require('../../assets/kchat-logo.png')} style={styles.emptyLogo} resizeMode="contain" />
                  <Text style={[styles.emptyTitle, { color: C.text }]}>How can I help?</Text>
                  <Text style={[styles.emptySub, { color: C.textSub }]}>
                    Ask me anything about your learning journey, green careers, or civic rights.
                  </Text>
                </View>
              }
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false });
              }}
            />
          )}

          {/* Input bar */}
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: C.bg,
                borderTopColor: C.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.inputRow, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => inputRef.current?.focus()}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: C.text }]}
                placeholder="Message Kiongozi AI…"
                placeholderTextColor={C.textSub}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={4000}
                returnKeyType="default"
                blurOnSubmit={false}
                scrollEnabled
              />
              {isGenerating ? (
                <TouchableOpacity
                  onPress={stopGeneration}
                  style={[styles.sendBtn, { backgroundColor: C.surface2 }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons name="stop" size={17} color={C.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
                  style={[styles.sendBtn, { backgroundColor: inputText.trim() ? C.accent : C.surface2 }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons name="arrow-up" size={17} color={inputText.trim() ? '#FFFFFF' : C.textSub} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Tap-to-close overlay — rendered inside main content so it never covers the sidebar */}
        {sidebarOpen && (
          <>
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: overlayOpacity }]}
              pointerEvents="none"
            />
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => closeSidebar()}
              activeOpacity={1}
            />
          </>
        )}
      </Animated.View>
    </View>
  );

  function isSidebarOpen() {
    return sidebarVal.current > 0.5;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  // Sidebar — absolute so it sits behind the translated main content
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sidebarLogo: { width: 26, height: 18 },
  sidebarHeading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  newChatText: { fontSize: 15, fontWeight: '600' },
  convItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: 6,
    marginVertical: 1,
    borderRadius: 10,
  },
  convTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  convTime: { fontSize: 12 },
  noChats: { textAlign: 'center', marginTop: 28, fontSize: 14 },

  // Main content — fills screen, pushed right by sidebar
  main: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerLogo: { width: 26, height: 18 },
  headerTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },

  // Messages
  messageList: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 },
  messageListEmpty: { flexGrow: 1 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22, gap: 10 },
  aiAvatar: { width: 22, height: 16, marginTop: 4 },
  aiContent: { flex: 1 },
  aiText: { fontSize: 15, lineHeight: 24 },
  copyBtn: { marginTop: 8 },
  userRow: { alignItems: 'flex-end', marginBottom: 22 },
  userBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { fontSize: 15, lineHeight: 22 },

  // Empty state
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingBottom: 60,
  },
  emptyLogo: { width: 72, height: 50, marginBottom: 22, opacity: 0.6 },
  emptyTitle: { fontSize: 22, fontWeight: '600', marginBottom: 10, textAlign: 'center', letterSpacing: -0.4 },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Input
  inputWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 130,
    paddingVertical: 7,
    lineHeight: 22,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
});
