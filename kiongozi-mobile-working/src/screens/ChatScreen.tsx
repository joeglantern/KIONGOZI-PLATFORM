// Kiongozi AI chat — clean, Apple-like: small living orb, time-aware greeting, compact suggestion
// pills, soft input card, and a ChatGPT-style history drawer that follows your finger (UI thread).
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, FlatList, SectionList, StyleSheet, Platform, Alert,
  ActivityIndicator, Dimensions, Keyboard, KeyboardAvoidingView, StatusBar, ScrollView, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Reanimated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolation, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useProfileStore } from '../stores/profileStore';
import apiClient from '../utils/apiClient';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { UserAvatar } from '../components/social/UserAvatar';
import { OrbVideo, OrbStill } from '../components/ai/OrbVideo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_W = Math.min(330, SCREEN_WIDTH * 0.84);
const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

const SUGGESTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; prompt: string }[] = [
  { icon: 'leaf-outline', label: 'Green careers', prompt: 'What green jobs can a young person in Kenya start preparing for this year?' },
  { icon: 'shield-checkmark-outline', label: 'Know my rights', prompt: 'Explain my key civic rights as a young Kenyan in simple terms.' },
  { icon: 'laptop-outline', label: 'Digital skills', prompt: 'Which digital skills should I learn first to get online work, and where can I start for free?' },
  { icon: 'people-outline', label: 'Community project', prompt: 'Give me a simple plan to start a climate action project in my community.' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

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
  const me = useProfileStore(s => s.currentUserProfile);
  const isDark = useThemeStore(s => s.isDark);
  const insets = useSafeAreaInsets();

  const C = {
    bg:         isDark ? '#000000' : '#FFFFFF',
    drawer:     isDark ? '#0B0B0B' : '#F7F7F8',
    surface:    isDark ? '#141414' : '#F2F2F5',
    surface2:   isDark ? '#1E1E1E' : '#E8E8ED',
    border:     isDark ? '#262626' : '#E2E2E7',
    text:       isDark ? '#FFFFFF' : '#0A0A0A',
    textSub:    isDark ? '#A1A1A6' : '#5E5E63',
    textMuted:  isDark ? '#6E6E73' : '#8E8E93',
    accent:     '#5CB85C',
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

  // ─── History drawer (Gesture Handler + Reanimated: follows the finger, springs) ──
  const progress = useSharedValue(0); // 0 closed → 1 open
  const startP = useSharedValue(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const setOpenJS = useCallback((o: boolean) => setDrawerOpen(o), []);
  const openSidebar = useCallback(() => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrawerOpen(true);
    progress.value = withSpring(1, SPRING);
  }, []);
  const closeSidebar = useCallback(() => {
    progress.value = withSpring(0, SPRING, done => { if (done) runOnJS(setOpenJS)(false); });
  }, []);

  const drawerPan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .hitSlop(drawerOpen ? undefined : { left: 0, width: 28 })
    .onStart(() => { startP.value = progress.value; runOnJS(setOpenJS)(true); })
    .onUpdate(e => { progress.value = Math.min(1, Math.max(0, startP.value + e.translationX / DRAWER_W)); })
    .onEnd(e => {
      const open = e.velocityX > 500 || (e.velocityX > -500 && progress.value > 0.5);
      progress.value = withSpring(open ? 1 : 0, { ...SPRING, velocity: e.velocityX / DRAWER_W }, done => {
        if (done && !open) runOnJS(setOpenJS)(false);
      });
    });

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * DRAWER_W }],
    borderRadius: interpolate(progress.value, [0, 1], [0, 24], Extrapolation.CLAMP),
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: progress.value * (isDark ? 0.5 : 0.18) }));
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-DRAWER_W * 0.25, 0]) }],
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.8, 1]),
  }));

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
  const sendMessage = async (override?: string) => {
    const text = (override ?? inputText).trim();
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

  // ─── Grouped, searchable history ──────────────────────────────────────────
  const sidebarSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupConversations(q ? conversations.filter(c => (c.title || 'New conversation').toLowerCase().includes(q)) : conversations);
  }, [conversations, search]);

  const firstName = ((me?.full_name || (user as any)?.user_metadata?.full_name || '') as string).trim().split(/\s+/)[0];
  const canSend = inputText.trim().length > 0;

  // ─── Renderers ────────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <Reanimated.View entering={FadeInDown.duration(220)} style={styles.userRow}>
          <TouchableOpacity activeOpacity={0.8} onLongPress={() => copyMessage(item.text)} style={[styles.userBubble, { backgroundColor: C.surface2 }]}>
            <Text style={[styles.userText, { color: C.text }]}>{item.text}</Text>
          </TouchableOpacity>
        </Reanimated.View>
      );
    }
    if (item.isLoading) {
      return (
        <Reanimated.View entering={FadeIn.duration(200)} style={styles.thinking}>
          <OrbVideo size={22} />
          <Text style={[styles.thinkingText, { color: C.textMuted }]}>Thinking…</Text>
        </Reanimated.View>
      );
    }
    return (
      <Reanimated.View entering={FadeIn.duration(240)} style={styles.aiRow}>
        <TouchableOpacity activeOpacity={1} onLongPress={() => copyMessage(item.text)}>
          <MarkdownRenderer content={item.text} darkMode={isDark} />
        </TouchableOpacity>
        <View style={styles.aiActions}>
          <TouchableOpacity onPress={() => copyMessage(item.text)} style={styles.aiAction} accessibilityLabel="Copy reply">
            <Ionicons name="copy-outline" size={17} color={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Share.share({ message: item.text }).catch(() => {})} style={styles.aiAction} accessibilityLabel="Share reply">
            <Ionicons name="share-outline" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </Reanimated.View>
    );
  }, [isDark]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.root, { backgroundColor: C.drawer }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* History drawer (sits under the chat, revealed as it slides) */}
        <Reanimated.View style={[styles.drawer, { width: DRAWER_W, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }, drawerStyle]}>
          <View style={styles.drawerTop}>
            <View style={[styles.search, { backgroundColor: C.surface2 }]}>
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search"
                placeholderTextColor={C.textMuted}
                style={[styles.searchInput, { color: C.text }]}
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity onPress={startNewChat} style={styles.iconBtn} accessibilityLabel="New chat">
              <Ionicons name="create-outline" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={startNewChat} style={styles.drawerRow} activeOpacity={0.6}>
            <OrbStill size={24} />
            <Text style={[styles.drawerRowText, { color: C.text }]}>Kiongozi AI</Text>
          </TouchableOpacity>

          {loadingConversations ? (
            <ActivityIndicator color={C.textMuted} style={{ marginTop: 28 }} />
          ) : sidebarSections.length === 0 ? (
            <Text style={[styles.noChats, { color: C.textMuted }]}>{search ? 'No chats found' : 'Your chats will show up here'}</Text>
          ) : (
            <SectionList
              sections={sidebarSections}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => loadConversationMessages(item.id)}
                  onLongPress={() => deleteConversation(item.id)}
                  style={({ pressed }) => [styles.convItem, (item.id === conversationId || pressed) && { backgroundColor: C.surface2 }]}
                >
                  <Text style={[styles.convTitle, { color: C.text }]} numberOfLines={1}>{item.title || 'New conversation'}</Text>
                </Pressable>
              )}
              renderSectionHeader={({ section }) => <Text style={[styles.sectionHeader, { color: C.textMuted }]}>{section.title}</Text>}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled={false}
            />
          )}

          <View style={[styles.profileRow, { borderTopColor: C.border }]}>
            <UserAvatar avatarUrl={me?.avatar_url} size={32} />
            <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>{me?.full_name || me?.username || 'You'}</Text>
          </View>
        </Reanimated.View>

        {/* Chat */}
        <GestureDetector gesture={drawerPan}>
          <Reanimated.View style={[styles.main, { backgroundColor: C.bg }, mainStyle]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
              <TouchableOpacity onPress={() => (drawerOpen ? closeSidebar() : openSidebar())} style={styles.iconBtn} accessibilityLabel="Chat history">
                <Ionicons name="reorder-two" size={26} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
                {isGenerating ? 'Thinking…' : 'Kiongozi AI'}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={startNewChat} style={styles.iconBtn} accessibilityLabel="New chat">
                  <Ionicons name="create-outline" size={22} color={C.text} />
                </TouchableOpacity>
                {onClose && (
                  <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close">
                    <View style={[styles.closeCircle, { backgroundColor: C.surface2 }]}>
                      <Ionicons name="chevron-down" size={18} color={C.text} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              {loadingMessages ? (
                <ActivityIndicator color={C.textMuted} style={{ flex: 1 }} />
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={m => String(m.id)}
                  renderItem={renderMessage}
                  contentContainerStyle={[styles.messageList, messages.length === 0 && { flexGrow: 1 }]}
                  ListEmptyComponent={
                    <Reanimated.View entering={FadeIn.duration(400)} style={styles.empty}>
                      <OrbVideo size={64} />
                      <Text style={[styles.greet, { color: C.textSub }]}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
                      <Text style={[styles.title, { color: C.text }]}>What can I help with?</Text>
                    </Reanimated.View>
                  }
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => { if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false }); }}
                />
              )}

              {messages.length === 0 && !loadingMessages && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pills}>
                  {SUGGESTIONS.map((sg, i) => (
                    <Reanimated.View key={sg.label} entering={FadeInDown.delay(120 + i * 60).duration(320)}>
                      <Pressable
                        onPress={() => { Haptics.selectionAsync(); sendMessage(sg.prompt); }}
                        style={({ pressed }) => [styles.pill, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.7 }]}
                      >
                        <Ionicons name={sg.icon} size={16} color={C.text} />
                        <Text style={[styles.pillText, { color: C.text }]}>{sg.label}</Text>
                      </Pressable>
                    </Reanimated.View>
                  ))}
                </ScrollView>
              )}

              <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <View style={[styles.inputCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: C.text }]}
                    placeholder="Ask anything"
                    placeholderTextColor={C.textMuted}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={4000}
                    scrollEnabled
                  />
                  {isGenerating ? (
                    <TouchableOpacity onPress={stopGeneration} style={[styles.sendBtn, { backgroundColor: C.text }]} accessibilityLabel="Stop">
                      <View style={[styles.stopSquare, { backgroundColor: C.bg }]} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => sendMessage()}
                      disabled={!canSend}
                      style={[styles.sendBtn, { backgroundColor: canSend ? C.text : C.surface2 }]}
                      accessibilityLabel="Send"
                    >
                      <Ionicons name="arrow-up" size={18} color={canSend ? C.bg : C.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.disclaimer, { color: C.textMuted }]}>Kiongozi AI can make mistakes. Check important info.</Text>
              </View>
            </KeyboardAvoidingView>

            {drawerOpen && (
              <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dimStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} accessibilityLabel="Close history" />
              </Reanimated.View>
            )}
          </Reanimated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  // Drawer
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  drawerTop: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  search: { flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8, paddingHorizontal: 10, height: 44, borderRadius: 12 },
  drawerRowText: { fontSize: 16, fontWeight: '600' },
  sectionHeader: { fontSize: 13, fontWeight: '600', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  convItem: { marginHorizontal: 8, paddingHorizontal: 10, height: 42, borderRadius: 12, justifyContent: 'center' },
  convTitle: { fontSize: 15.5 },
  noChats: { fontSize: 14, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12, marginTop: 'auto', borderTopWidth: StyleSheet.hairlineWidth },
  profileName: { fontSize: 15, fontWeight: '600', flex: 1 },

  // Chat
  main: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, minHeight: 48 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  messageList: { paddingTop: 12, paddingHorizontal: 18, paddingBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 },
  greet: { marginTop: 20, fontSize: 17, fontWeight: '500' },
  title: { marginTop: 4, fontSize: 26, fontWeight: '600', letterSpacing: -0.6, textAlign: 'center' },

  userRow: { alignItems: 'flex-end', marginBottom: 22 },
  userBubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10 },
  userText: { fontSize: 16, lineHeight: 22 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  thinkingText: { fontSize: 15 },
  aiRow: { marginBottom: 22 },
  aiActions: { flexDirection: 'row', gap: 2, marginTop: 6, marginLeft: -8 },
  aiAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  pills: { paddingHorizontal: 14, gap: 8, paddingBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontSize: 14.5, fontWeight: '500' },

  composer: { paddingHorizontal: 12, paddingTop: 4 },
  inputCard: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, minHeight: 52 },
  input: { flex: 1, fontSize: 16, lineHeight: 21, maxHeight: 140, paddingTop: Platform.OS === 'ios' ? 9 : 6, paddingBottom: Platform.OS === 'ios' ? 9 : 6 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  stopSquare: { width: 12, height: 12, borderRadius: 3 },
  disclaimer: { fontSize: 11.5, textAlign: 'center', marginTop: 8 },
});
