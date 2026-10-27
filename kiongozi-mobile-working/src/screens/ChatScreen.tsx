import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SectionList,
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
import { TypingDots } from '../components/social/TypingDots';
import MarkdownRenderer from '../components/MarkdownRenderer';
import Reanimated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { AIOrb } from '../components/ai/AIOrb';
import { AIWelcome } from '../components/ai/Suggestions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(300, SCREEN_WIDTH * 0.78);
const EDGE_HIT = 30;

// ─── Glowing logo ────────────────────────────────────────────────────────────

function GlowingLogo() {
  const isDark = useThemeStore(s => s.isDark);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1300, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1300, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const shadowRadius = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });

  return (
    <Animated.View style={[
      glowStyles.circle,
      {
        backgroundColor: isDark ? '#0D1F0D' : '#EAF6EA',
        shadowRadius,
        shadowColor: '#5CB85C',
        shadowOpacity: 1,
        shadowOffset: { width: 0, height: 0 },
      },
    ]}>
      <Image source={require('../../assets/kchat-logo.png')} style={glowStyles.logo} resizeMode="contain" />
    </Animated.View>
  );
}

const glowStyles = StyleSheet.create({
  circle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A3A2A',
  },
  logo: { width: 26, height: 26 },
});

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ConvSection {
  title: string;
  data: Conversation[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupConversations(conversations: Conversation[]): ConvSection[] {
  const now = Date.now();
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of conversations) {
    const diffDays = Math.floor((now - new Date(c.updated_at).getTime()) / 86400000);
    if (diffDays === 0) today.push(c);
    else if (diffDays === 1) yesterday.push(c);
    else if (diffDays < 7) thisWeek.push(c);
    else older.push(c);
  }

  const sections: ConvSection[] = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (yesterday.length) sections.push({ title: 'Yesterday', data: yesterday });
  if (thisWeek.length) sections.push({ title: 'This Week', data: thisWeek });
  if (older.length) sections.push({ title: 'Older', data: older });
  return sections;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface ChatScreenProps {
  onClose?: () => void;
}

export default function ChatScreen({ onClose }: ChatScreenProps) {
  const { user } = useAuthStore();
  const isDark = useThemeStore(s => s.isDark);
  const insets = useSafeAreaInsets();

  const C = {
    bg:         isDark ? '#000000' : '#FFFFFF',
    surface:    isDark ? '#111111' : '#F2F2F7',
    surface2:   isDark ? '#1A1A1A' : '#E5E5EA',
    border:     isDark ? '#2A2A2A' : '#D1D1D6',
    borderLight: isDark ? '#1A1A1A' : '#E9E9EE',
    text:       isDark ? '#FFFFFF' : '#000000',
    textSub:    isDark ? '#8E8E93' : '#6C6C70',
    textMuted:  isDark ? '#7C7C80' : '#9A9AA0',
    userBubble: isDark ? '#1A1A1A' : '#E9E9EB',
    accent:     '#5CB85C',
    sidebar:    isDark ? '#000000' : '#F8F8F8',
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Keep ref in sync so async callbacks have the latest id
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const sidebarVal = useRef(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const id = sidebarAnim.addListener(({ value }) => { sidebarVal.current = value; });
    return () => sidebarAnim.removeListener(id);
  }, []);

  const openSidebar = useCallback((velocity = 0) => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSidebarOpen(true);
    Animated.spring(sidebarAnim, { toValue: 1, useNativeDriver: true, velocity, tension: 65, friction: 11 }).start();
  }, [sidebarAnim]);

  const closeSidebar = useCallback((velocity = 0) => {
    Animated.spring(sidebarAnim, { toValue: 0, useNativeDriver: true, velocity, tension: 65, friction: 11 })
      .start(({ finished }) => { if (finished) setSidebarOpen(false); });
  }, [sidebarAnim]);

  const sidebarTranslateX = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_WIDTH, 0] });
  const contentTranslateX = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SIDEBAR_WIDTH] });
  const overlayOpacity = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gs) => {
        const { dx, dy } = gs;
        if (Math.abs(dx) < Math.abs(dy) * 1.4 || Math.abs(dx) < 6) return false;
        const isOpen = sidebarVal.current > 0.3;
        if (!isOpen && dx > 0 && evt.nativeEvent.pageX < EDGE_HIT) return true;
        if (isOpen && dx < 0) return true;
        return false;
      },
      onPanResponderGrant: () => {
        sidebarAnim.stopAnimation();
        if (sidebarVal.current > 0.05) setSidebarOpen(true);
      },
      onPanResponderMove: (_, gs) => {
        const base = sidebarVal.current > 0.5 ? 1 : 0;
        const next = Math.max(0, Math.min(1, base + gs.dx / SIDEBAR_WIDTH));
        sidebarAnim.setValue(next);
        if (next > 0.05) setSidebarOpen(true);
      },
      onPanResponderRelease: (_, gs) => {
        const cur = sidebarVal.current;
        const shouldOpen = gs.vx > 0.3 || (gs.vx >= -0.3 && cur > 0.4);
        if (shouldOpen) openSidebar(gs.vx); else closeSidebar(-gs.vx);
      },
      onPanResponderTerminate: (_, gs) => {
        if (sidebarVal.current > 0.5) openSidebar(gs.vx); else closeSidebar(-gs.vx);
      },
    })
  ).current;

  // ─── Data loading ─────────────────────────────────────────────────────────
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
          text: m.text || m.content || m.message || '',
          isUser: m.is_user === true || m.role === 'user' || m.sender === 'user',
        }));
        setMessages(formatted);
        setConversationId(convId);
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

  // ─── Send message ─────────────────────────────────────────────────────────
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
      const currentConvId = conversationIdRef.current;
      const savePromise = apiClient.sendMessage(text, currentConvId || undefined);
      let fullText = '';

      apiClient.generateAIResponseStream(
        text,
        currentConvId || '',
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
          let activeConvId = conversationIdRef.current;
          if (saved.success && !activeConvId) {
            const newId = (saved.data as any)?.conversation_id;
            if (newId) {
              setConversationId(newId);
              activeConvId = newId;
            }
          }

          // Persist AI response so it loads when returning to this conversation
          if (fullText && activeConvId) {
            apiClient.saveAssistantMessage(fullText, activeConvId, 'chat').catch(() => {});
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
      setMessages(prev => prev.filter(m => m.isLoading !== true));
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

  // ─── Grouped sidebar sections ─────────────────────────────────────────────
  const sidebarSections = useMemo(() => groupConversations(conversations), [conversations]);

  // ─── Renderers ────────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <Reanimated.View entering={FadeInDown.duration(240)} style={styles.userRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onLongPress={() => copyMessage(item.text)}
            style={[styles.userBubble, { backgroundColor: C.userBubble }]}
          >
            <Text style={[styles.userText, { color: C.text }]}>{item.text}</Text>
          </TouchableOpacity>
        </Reanimated.View>
      );
    }
    return (
      <Reanimated.View entering={FadeIn.duration(260)} style={styles.aiRow}>
        <View style={styles.aiAvatarWrap}>
          <AIOrb size={28} state={item.isLoading ? 'thinking' : 'idle'} />
        </View>
        <View style={styles.aiContent}>
          <Text style={[styles.aiName, { color: C.textMuted }]}>Kiongozi AI</Text>
          {item.isLoading ? (
            <View style={styles.thinkingRow}>
              <TypingDots />
              <Text style={[styles.thinkingText, { color: C.textMuted }]}>Thinking…</Text>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={1} onLongPress={() => copyMessage(item.text)}>
              <MarkdownRenderer content={item.text} darkMode={isDark} />
              <View style={styles.aiActions}>
                <TouchableOpacity
                  onPress={() => copyMessage(item.text)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.aiActionBtn, { borderColor: C.border }]}
                  accessibilityLabel="Copy reply"
                >
                  <Ionicons name="copy-outline" size={14} color={C.textSub} />
                  <Text style={[styles.aiActionText, { color: C.textSub }]}>Copy</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Reanimated.View>
    );
  }, [C, isDark]);

  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.convItem, item.id === conversationId && { backgroundColor: C.surface2 }]}
      onPress={() => loadConversationMessages(item.id)}
      onLongPress={() => deleteConversation(item.id)}
      activeOpacity={0.65}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={15} color={C.textSub} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.convTitle, { color: C.text }]} numberOfLines={1}>
          {item.title || 'New conversation'}
        </Text>
        <Text style={[styles.convTime, { color: C.textSub }]}>{timeLabel(item.updated_at)}</Text>
      </View>
    </TouchableOpacity>
  ), [conversationId, C]);

  const renderSectionHeader = useCallback(({ section }: { section: ConvSection }) => (
    <Text style={[styles.sectionHeader, { color: C.textMuted, backgroundColor: C.sidebar }]}>
      {section.title.toUpperCase()}
    </Text>
  ), [C]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: C.sidebar }]} {...panResponder.panHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Sidebar */}
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
        {/* Sidebar header */}
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarLogoWrap}>
            <Image source={require('../../assets/kchat-logo.png')} style={styles.sidebarLogoImg} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sidebarHeading, { color: C.text }]}>Kiongozi AI</Text>
            <Text style={[styles.sidebarSubheading, { color: C.textSub }]}>Chat history</Text>
          </View>
          <TouchableOpacity
            onPress={startNewChat}
            style={[styles.newChatIconBtn, { borderColor: C.border, backgroundColor: 'transparent' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color={C.text} />
          </TouchableOpacity>
        </View>

        {loadingConversations ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 28 }} />
        ) : sidebarSections.length === 0 ? (
          <View style={styles.noChatsWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={C.border} />
            <Text style={[styles.noChats, { color: C.textSub }]}>No chats yet</Text>
            <Text style={[styles.noChatsHint, { color: C.textMuted }]}>Start a new conversation</Text>
          </View>
        ) : (
          <SectionList
            sections={sidebarSections}
            keyExtractor={c => c.id}
            renderItem={renderConversationItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
          />
        )}
      </Animated.View>

      {/* Main content */}
      <Animated.View
        style={[styles.main, { backgroundColor: C.bg, transform: [{ translateX: contentTranslateX }] }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            onPress={() => isSidebarOpen() ? closeSidebar() : openSidebar()}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="albums-outline" size={22} color={C.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <AIOrb size={22} state={isGenerating ? 'thinking' : 'idle'} />
            <View style={[styles.headerTitleBlock, { alignItems: 'flex-start' }]}>
              <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>Kiongozi AI</Text>
              <Text style={[styles.headerSub, { color: C.textMuted }]}>{isGenerating ? 'Thinking…' : 'Green & Digital Transition'}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={startNewChat}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={22} color={C.text} />
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-down" size={24} color={C.text} />
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
                <AIWelcome
                  name={(user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name}
                  C={C}
                  onPick={(prompt) => { setInputText(prompt); setTimeout(() => inputRef.current?.focus(), 50); }}
                />
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
              { backgroundColor: C.bg, paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.inputRow, { backgroundColor: 'transparent', borderColor: C.border }]}
              onPress={() => inputRef.current?.focus()}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: C.text }]}
                placeholder="Ask Kiongozi AI anything…"
                placeholderTextColor={C.textMuted}
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
                  <Ionicons name="stop" size={15} color={C.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
                  style={[styles.sendBtn, { backgroundColor: inputText.trim() ? C.accent : C.surface2 }]}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons name="arrow-up" size={18} color={inputText.trim() ? '#000000' : C.textMuted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Tap-to-close overlay */}
        {sidebarOpen && (
          <>
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: overlayOpacity }]}
              pointerEvents="none"
            />
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeSidebar()} activeOpacity={1} />
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

  // Sidebar
  sidebar: {
    position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 10,
    borderRightWidth: 1,
  },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
  },
  sidebarLogoWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  sidebarLogoImg: { width: 22, height: 22 },
  sidebarHeading: { fontSize: 17, fontWeight: '600', fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: -0.3 },
  sidebarSubheading: { fontSize: 13, marginTop: 2 },
  newChatIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  sectionHeader: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
  },
  convItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    marginHorizontal: 8, marginVertical: 1, borderRadius: 12,
  },
  convTitle: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  convTime: { fontSize: 12 },
  noChatsWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 8 },
  noChats: { fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk_600SemiBold' },
  noChatsHint: { fontSize: 14 },

  // Main
  main: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 6, paddingBottom: 2, minHeight: 50, borderBottomWidth: 0,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  headerTitleBlock: { flexDirection: 'column', alignItems: 'center', flexShrink: 1 },
  headerTitle: { fontSize: 17, fontWeight: '600', fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: -0.3, flexShrink: 1 },
  headerSub: { fontSize: 12, fontWeight: '400', marginTop: 1 },

  // Messages
  messageList: { paddingTop: 16, paddingHorizontal: 18, paddingBottom: 12 },
  messageListEmpty: { flexGrow: 1 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 26, gap: 12 },
  aiAvatarWrap: { marginTop: 1 },
  aiContent: { flex: 1, minWidth: 0 },
  aiName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  aiText: { fontSize: 16, lineHeight: 25 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  thinkingText: { fontSize: 14 },
  aiActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  aiActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth },
  aiActionText: { fontSize: 12.5, fontWeight: '600' },
  userRow: { alignItems: 'flex-end', marginBottom: 28 },
  userBubble: {
    maxWidth: '80%', borderRadius: 22, borderBottomRightRadius: 6,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  userText: { fontSize: 16, lineHeight: 23 },

  // Empty state
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, paddingBottom: 60,
  },
  emptyLogo: { width: 64, height: 44, marginBottom: 24 },
  emptyTitle: {
    fontSize: 32, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12, textAlign: 'center', letterSpacing: -0.8, lineHeight: 38,
  },
  emptySub: { fontSize: 16, textAlign: 'center', lineHeight: 24 },

  // Input
  inputWrap: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 0 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', borderRadius: 22, minHeight: 44,
    borderWidth: 1, paddingLeft: 16, paddingRight: 3, paddingVertical: 3, gap: 6,
  },
  input: { flex: 1, fontSize: 16, maxHeight: 130, paddingTop: 8, paddingBottom: 8, lineHeight: 21 },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
});
