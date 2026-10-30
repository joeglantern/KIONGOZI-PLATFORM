// Kiongozi AI chat — clean, Apple-like: small living orb, time-aware greeting, compact suggestion
// pills, soft input card, and a ChatGPT-style history drawer that follows your finger (UI thread).
import { appAlert } from '../utils/alert';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, FlatList, SectionList, StyleSheet, Platform, ActivityIndicator, useWindowDimensions, Keyboard, KeyboardAvoidingView, StatusBar, Share, Image, Modal, ScrollView,
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
import { ShareCardSheet } from '../components/ai/ShareCardSheet';
import { ShineText, ReplyFx } from '../components/ai/StreamFx';

const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

// Flat topic art (one per area), shown on a soft cream tile so it reads in light and dark.
const ART = {
  careers: require('../../assets/ai/t_careers.png'),
  rights: require('../../assets/ai/t_rights.png'),
  digital: require('../../assets/ai/t_digital.png'),
  climate: require('../../assets/ai/t_climate.png'),
  money: require('../../assets/ai/t_money.png'),
  health: require('../../assets/ai/t_health.png'),
  learning: require('../../assets/ai/t_learning.png'),
  creative: require('../../assets/ai/t_creative.png'),
  writing: require('../../assets/ai/t_writing.png'),
  trending: require('../../assets/ai/t_trending.png'),
  community: require('../../assets/ai/t_community.png'),
  travel: require('../../assets/ai/t_travel.png'),
};
type Suggestion = { art: keyof typeof ART; label: string; hint: string; prompt: string };

// A new chat shows 4 of these (each from a different area), so the ideas change every time.
const POOL: Suggestion[] = [
  { art: 'careers', label: 'Green careers', hint: 'Jobs that grow', prompt: 'What green jobs can a young person in Kenya start preparing for this year?' },
  { art: 'careers', label: 'First job', hint: 'Get noticed', prompt: 'I am looking for my first job in Kenya. How do I stand out with little experience?' },
  { art: 'careers', label: 'Interview prep', hint: 'Practice with me', prompt: 'Run a short mock job interview with me. Ask one question at a time and give feedback.' },
  { art: 'rights', label: 'Know my rights', hint: 'Simply explained', prompt: 'Explain my key civic rights as a young Kenyan in simple terms.' },
  { art: 'rights', label: 'Public participation', hint: 'Have your say', prompt: 'How can I take part in public participation on a county budget or a new bill?' },
  { art: 'rights', label: 'Talk to my MCA', hint: 'Be heard', prompt: 'Help me write a short, respectful message to my MCA about a problem in my ward.' },
  { art: 'digital', label: 'Digital skills', hint: 'Where to start', prompt: 'Which digital skills should I learn first to get online work, and where can I start for free?' },
  { art: 'digital', label: 'Stay safe online', hint: 'Spot scams', prompt: 'What are the common online scams targeting young Kenyans and how do I avoid them?' },
  { art: 'digital', label: 'Learn to code', hint: 'A 30-day plan', prompt: 'Make me a simple 30-day plan to start learning to code on a phone or a cheap laptop.' },
  { art: 'climate', label: 'Climate action', hint: 'Start local', prompt: 'Give me a simple plan to start a climate action project in my community.' },
  { art: 'climate', label: 'Climate explained', hint: 'In plain words', prompt: 'Explain how climate change affects farmers and cities in Kenya, in plain words.' },
  { art: 'money', label: 'Side hustle', hint: 'Ideas that work', prompt: 'Suggest side hustles I can start in Kenya with less than KSh 5,000, with honest pros and cons.' },
  { art: 'money', label: 'Budget my money', hint: 'Make it last', prompt: 'Help me make a simple monthly budget. Ask me about my income and costs first.' },
  { art: 'money', label: 'Save smarter', hint: 'SACCOs and more', prompt: 'What are good ways for a young person in Kenya to save, like SACCOs, chamas or money market funds?' },
  { art: 'health', label: 'Mental health', hint: 'Check in', prompt: 'I have been feeling stressed lately. Can you share some simple ways to cope, and where to find support in Kenya?' },
  { art: 'health', label: 'Healthy habits', hint: 'Small wins', prompt: 'Suggest 5 small, cheap daily habits that improve health and energy.' },
  { art: 'learning', label: 'Study plan', hint: 'Stay on track', prompt: 'Help me make a realistic study plan for my exams. Ask me what I am studying first.' },
  { art: 'learning', label: 'Explain a topic', hint: 'Like I am 15', prompt: 'Explain how the Kenyan government is structured, like I am 15.' },
  { art: 'learning', label: 'Scholarships', hint: 'Find funding', prompt: 'How can a Kenyan student find and apply for scholarships and bursaries?' },
  { art: 'creative', label: 'Content ideas', hint: 'For your page', prompt: 'Give me 10 content ideas for a youth page about leadership and community in Kenya.' },
  { art: 'creative', label: 'Start a brand', hint: 'Name and vibe', prompt: 'Help me name and describe a small creative brand. Ask me what I make first.' },
  { art: 'writing', label: 'Fix my CV', hint: 'Make it shine', prompt: 'Help me improve my CV. I will paste it next; tell me what to change.' },
  { art: 'writing', label: 'Write a proposal', hint: 'For a grant', prompt: 'Help me write a short grant proposal for a youth community project.' },
  { art: 'community', label: 'Lead a team', hint: 'Bring people in', prompt: 'How do I get young people in my area to join and stay committed to a community group?' },
  { art: 'community', label: 'Plan an event', hint: 'Step by step', prompt: 'Help me plan a small community clean-up event, step by step.' },
  { art: 'travel', label: 'Explore Kenya', hint: 'On a budget', prompt: 'Suggest affordable weekend trips around Kenya for young people.' },
];

/** 4 suggestions from different areas, shuffled; a live trending hashtag takes the first slot. */
function pickSuggestions(trend?: string | null): Suggestion[] {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  const out: Suggestion[] = [];
  const used = new Set<string>();
  if (trend) {
    out.push({ art: 'trending', label: `#${trend}`, hint: 'Trending now', prompt: `What is the conversation around #${trend} on KChat and in Kenya right now, and why does it matter for young people?` });
  }
  for (const sg of shuffled) {
    if (out.length >= 4) break;
    if (used.has(sg.art)) continue;
    used.add(sg.art);
    out.push(sg);
  }
  return out;
}

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
  if (thisWeek.length) sections.push({ title: 'This week', data: thisWeek });
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
  const { width: winW, height: winH } = useWindowDimensions();
  const DRAWER_W = Math.min(330, winW * 0.84);
  const narrow = winW < 360; // SE 1st gen (320) and small Androids
  const [suggestions, setSuggestions] = useState(() => pickSuggestions());
  // "Ask next" questions under the latest AI reply
  const [followups, setFollowups] = useState<{ forId: number; items: string[] } | null>(null);
  // "Share this answer" card sheet: the answer plus the question asked just before it
  const [shareCard, setShareCard] = useState<{ question: string; answer: string } | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const trendTag = useRef<string | null>(null);
  // A hashtag people are actually using takes one suggestion slot
  useEffect(() => {
    let live = true;
    apiClient.getTrending().then((r: any) => {
      const tag = (r?.data?.hashtags || []).find((h: any) => (h.use_count || 0) >= 2 && /^[a-z0-9_]{2,24}$/i.test(h.tag || ''))?.tag;
      if (!live || !tag) return;
      trendTag.current = tag;
      setSuggestions(pickSuggestions(tag));
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  // Track the keyboard so the 2×2 suggestion grid can step aside when it would squeeze the chat
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', e => setKbH(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const kbOpen = kbH > 0;
  // Height left for the empty state = window − top inset − header(48) − keyboard − composer(~90) − grid(2×60+8+10)
  const GRID_H = 2 * 60 + 8 + 10;
  const freeWithGrid = winH - insets.top - 48 - (kbOpen ? kbH : insets.bottom) - 90 - GRID_H;
  const showGrid = !kbOpen || freeWithGrid >= 150;
  const shortScreen = winH < 700;

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
  const [streamingId, setStreamingId] = useState<number | null>(null);
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
  const [historyOpen, setHistoryOpen] = useState(false);

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
      setFollowups(null);
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
    setSuggestions(pickSuggestions(trendTag.current));
    setFollowups(null);
    setMessages([]);
    setConversationId(null);
    setInputText('');
  };

  const deleteConversation = (convId: string) => {
    appAlert('Delete Chat', 'Delete this conversation?', [
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
    setFollowups(null);
    setIsGenerating(true);
    setStreamingId(aiId);

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
          setStreamingId(null);

          if (fullText.length > 40) {
            apiClient.getFollowups(text, fullText).then((r: any) => {
              const items = Array.isArray(r?.data) ? r.data.filter((q: any) => typeof q === 'string' && q.trim()).slice(0, 3) : [];
              if (items.length) setFollowups(f => (f === null || f.forId !== aiId ? { forId: aiId, items } : f));
            }).catch(() => {});
          }

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
          setStreamingId(null);
          appAlert('Error', 'Failed to get a response. Please try again.');
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
    setStreamingId(null);
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

  const recents = useMemo(() => [...conversations]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5), [conversations]);
  const openHistory = () => { setSearch(''); setHistoryOpen(true); };
  const pickConversation = (id: string) => { setHistoryOpen(false); loadConversationMessages(id); };

  const firstName = ((me?.full_name || (user as any)?.user_metadata?.full_name || '') as string).trim().split(/\s+/)[0];
  const canSend = inputText.trim().length > 0;

  // ─── Renderers ────────────────────────────────────────────────────────────
  messagesRef.current = messages;

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
          <ShineText text="Thinking…" style={styles.thinkingText} baseColor={C.textMuted} shineColor={C.text} />
        </Reanimated.View>
      );
    }
    return (
      <Reanimated.View entering={FadeIn.duration(240)} style={styles.aiRow}>
        <ReplyFx streaming={item.id === streamingId} bg={C.bg} shine={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(92,184,92,0.14)'}>
          <TouchableOpacity activeOpacity={1} onLongPress={() => copyMessage(item.text)}>
            <MarkdownRenderer content={item.text} darkMode={isDark} />
          </TouchableOpacity>
        </ReplyFx>
        {item.id !== streamingId && <View style={styles.aiActions}>
          <TouchableOpacity onPress={() => copyMessage(item.text)} style={styles.aiAction} accessibilityLabel="Copy reply">
            <Ionicons name="copy-outline" size={17} color={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const list = messagesRef.current;
              const i = list.findIndex(m => m.id === item.id);
              const q = [...list.slice(0, Math.max(0, i))].reverse().find(m => m.isUser)?.text || '';
              if (q) setShareCard({ question: q, answer: item.text });
              else Share.share({ message: item.text }).catch(() => {});
            }}
            style={styles.aiAction}
            accessibilityLabel="Share reply as a card"
          >
            <Ionicons name="share-outline" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>}
        {followups?.forId === item.id && !isGenerating && (
          <View style={styles.next} accessibilityRole="list" accessibilityLabel="Ask next">
            <View style={styles.nextHead}>
              <Ionicons name="return-down-forward" size={15} color="#5CB85C" />
              <Text style={[styles.nextTitle, { color: C.textSub }]}>Ask next</Text>
            </View>
            {followups.items.map((q, i) => (
              <Reanimated.View key={q} entering={FadeInDown.delay(i * 70).duration(260)}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); sendMessage(q); }}
                  style={({ pressed }) => [styles.nextRow, { borderTopColor: C.border }, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask: ${q}`}
                >
                  <Text style={[styles.nextText, { color: C.text }]} maxFontSizeMultiplier={1.3}>{q}</Text>
                  <View style={[styles.nextPlus, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Ionicons name="add" size={16} color={C.text} />
                  </View>
                </Pressable>
              </Reanimated.View>
            ))}
          </View>
        )}
      </Reanimated.View>
    );
  }, [isDark, streamingId, followups, isGenerating]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.root, { backgroundColor: C.drawer }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Drawer (sits under the chat, revealed as it slides): sectioned, recents only */}
        <Reanimated.View style={[styles.drawer, { width: DRAWER_W, paddingTop: insets.top + 6 }, drawerStyle]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.brandRow}>
              <OrbStill size={30} />
              <Text style={[styles.brandText, { color: C.text }]}>Kiongozi AI</Text>
            </View>

            <View style={styles.block}>
              <Pressable onPress={startNewChat} style={({ pressed }) => [styles.newChat, { backgroundColor: C.text }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <Ionicons name="add" size={20} color={C.bg} />
                <Text style={[styles.newChatText, { color: C.bg }]}>New chat</Text>
              </Pressable>
              <Pressable onPress={openHistory} style={({ pressed }) => [styles.searchRow, { backgroundColor: C.surface }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
                <Ionicons name="search" size={17} color={C.textMuted} />
                <Text style={[styles.searchRowText, { color: C.textMuted }]}>Search chats</Text>
              </Pressable>
            </View>

            <Text style={[styles.blockLabel, { color: C.textMuted }]}>Recents</Text>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              {loadingConversations ? (
                <ActivityIndicator color={C.textMuted} style={{ marginVertical: 18 }} />
              ) : recents.length === 0 ? (
                <Text style={[styles.cardEmpty, { color: C.textMuted }]}>No chats yet. Start one above.</Text>
              ) : recents.map((c, i) => (
                <Pressable
                  key={c.id}
                  onPress={() => loadConversationMessages(c.id)}
                  onLongPress={() => deleteConversation(c.id)}
                  style={({ pressed }) => [styles.recentRow, (c.id === conversationId || pressed) && { backgroundColor: C.surface2 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}
                >
                  <Text style={[styles.recentTitle, { color: C.text }]} numberOfLines={1}>{c.title || 'New conversation'}</Text>
                  <Text style={[styles.recentTime, { color: C.textMuted }]}>{timeLabel(c.updated_at)}</Text>
                </Pressable>
              ))}
            </View>
            {conversations.length > 5 && (
              <Pressable onPress={openHistory} style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                <Text style={[styles.seeAllText, { color: C.text }]}>See all chats</Text>
                <Text style={[styles.seeAllCount, { color: C.textMuted }]}>{conversations.length}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            )}
          </ScrollView>

          <View style={[styles.profileCard, { backgroundColor: C.surface, marginBottom: Math.max(insets.bottom, 12) }]}>
            <UserAvatar avatarUrl={me?.avatar_url} size={36} name={me?.full_name || me?.username} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>{me?.full_name || 'You'}</Text>
              {me?.username ? <Text style={[styles.profileHandle, { color: C.textMuted }]} numberOfLines={1}>@{me.username}</Text> : null}
            </View>
          </View>
        </Reanimated.View>

        {/* Full history: search + every chat, grouped by date */}
        <Modal visible={historyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistoryOpen(false)}>
          <View style={[styles.historyRoot, { backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? insets.top : 8 }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: C.text }]}>History</Text>
              <TouchableOpacity onPress={() => setHistoryOpen(false)} style={styles.iconBtn} accessibilityLabel="Close history">
                <View style={[styles.closeCircle, { backgroundColor: C.surface2 }]}>
                  <Ionicons name="close" size={18} color={C.text} />
                </View>
              </TouchableOpacity>
            </View>
            <View style={[styles.search, { backgroundColor: C.surface2, marginHorizontal: 16 }]}>
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search chats"
                placeholderTextColor={C.textMuted}
                style={[styles.searchInput, { color: C.text }]}
                autoCorrect={false}
                autoFocus
              />
            </View>
            {sidebarSections.length === 0 ? (
              <Text style={[styles.noChats, { color: C.textMuted }]}>{search ? 'No chats found' : 'No chats yet'}</Text>
            ) : (
              <SectionList
                sections={sidebarSections}
                keyExtractor={c => c.id}
                renderItem={({ item, index, section }) => (
                  <Pressable
                    onPress={() => pickConversation(item.id)}
                    onLongPress={() => deleteConversation(item.id)}
                    style={({ pressed }) => [
                      styles.historyRow,
                      { backgroundColor: pressed ? C.surface2 : C.surface },
                      index === 0 && styles.groupTop,
                      index === section.data.length - 1 && styles.groupBottom,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
                    ]}
                  >
                    <Text style={[styles.recentTitle, { color: C.text }]} numberOfLines={1}>{item.title || 'New conversation'}</Text>
                    <Text style={[styles.recentTime, { color: C.textMuted }]}>{timeLabel(item.updated_at)}</Text>
                  </Pressable>
                )}
                renderSectionHeader={({ section }) => <Text style={[styles.blockLabel, { color: C.textMuted, marginHorizontal: 20 }]}>{section.title}</Text>}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                stickySectionHeadersEnabled={false}
                automaticallyAdjustKeyboardInsets
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              />
            )}
          </View>
        </Modal>

        {/* Chat */}
        <GestureDetector gesture={drawerPan}>
          <Reanimated.View style={[styles.main, { backgroundColor: C.bg }, mainStyle]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
              <TouchableOpacity onPress={() => (drawerOpen ? closeSidebar() : openSidebar())} style={styles.iconBtn} accessibilityLabel="Chat history">
                <Ionicons name="reorder-two" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
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
                    <Reanimated.View entering={FadeIn.duration(400)} style={[styles.empty, shortScreen && { paddingBottom: 12, paddingHorizontal: 20 }]}>
                      <OrbVideo size={shortScreen ? 52 : 64} />
                      <Text style={[styles.greet, shortScreen && { marginTop: 12 }, { color: C.textSub }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
                      <Text style={[styles.title, shortScreen && { fontSize: 23 }, { color: C.text }]} maxFontSizeMultiplier={1.25}>What can I help with?</Text>
                    </Reanimated.View>
                  }
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => { if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false }); }}
                />
              )}

              {messages.length === 0 && !loadingMessages && showGrid && (
                // 2×2 grid: every suggestion fully visible, no sideways scrolling
                <View style={styles.grid}>
                  {suggestions.map((sg, i) => (
                    <Reanimated.View key={sg.label} entering={FadeInDown.delay(120 + i * 60).duration(320)} style={styles.gridCell}>
                      <Pressable
                        onPress={() => { Haptics.selectionAsync(); sendMessage(sg.prompt); }}
                        style={({ pressed }) => [styles.tile, narrow && styles.tileNarrow, { backgroundColor: C.surface, borderColor: C.border }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 }]}
                        accessibilityRole="button"
                        accessibilityLabel={sg.label}
                      >
                        <View style={[styles.tileArt, narrow && styles.tileArtNarrow]}>
                          <Image source={ART[sg.art]} style={styles.tileArtImg} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          {/* At 320pt a cell is ~145pt: 145 − pad 20 − border 2 − art 30 − gap 6 ≈ 87pt for text → allow 2 lines */}
                          <Text style={[styles.tileLabel, narrow && styles.tileLabelNarrow, { color: C.text }]} numberOfLines={narrow ? 2 : 1} maxFontSizeMultiplier={1.25}>{sg.label}</Text>
                          <Text style={[styles.tileHint, { color: C.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>{sg.hint}</Text>
                        </View>
                      </Pressable>
                    </Reanimated.View>
                  ))}
                </View>
              )}

              <View style={[styles.composer, { paddingBottom: kbOpen ? 8 : Math.max(insets.bottom, 10) }]}>
                <View style={[styles.inputCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: C.text, maxHeight: shortScreen ? 96 : 140 }]}
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
                {!(kbOpen && shortScreen) && (
                  <Text style={[styles.disclaimer, { color: C.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.2}>Kiongozi AI can make mistakes. Check important info.</Text>
                )}
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
      <ShareCardSheet
        visible={!!shareCard}
        question={shareCard?.question || ''}
        answer={shareCard?.answer || ''}
        onClose={() => setShareCard(null)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  // Drawer
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, height: 52 },
  brandText: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  block: { paddingHorizontal: 14, gap: 8, marginTop: 6 },
  newChat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 23 },
  newChatText: { fontSize: 16, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, paddingHorizontal: 14 },
  searchRowText: { fontSize: 15.5 },
  blockLabel: { fontSize: 13, fontWeight: '600', marginTop: 24, marginBottom: 8, marginHorizontal: 18 },
  card: { marginHorizontal: 14, borderRadius: 16, overflow: 'hidden' },
  cardEmpty: { fontSize: 14, paddingHorizontal: 14, paddingVertical: 16 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 48 },
  recentTitle: { flex: 1, fontSize: 15.5 },
  recentTime: { fontSize: 12.5, flexShrink: 0 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 18, marginTop: 10, height: 40 },
  seeAllText: { flex: 1, fontSize: 15, fontWeight: '600' },
  seeAllCount: { fontSize: 14 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginTop: 8, padding: 12, borderRadius: 16 },
  profileHandle: { fontSize: 13, marginTop: 1 },
  historyRoot: { flex: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, height: 56 },
  historyTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingHorizontal: 14, minHeight: 50 },
  groupTop: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  groupBottom: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
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

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  gridCell: { width: '49%' },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  next: { marginTop: 6 },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 4 },
  nextTitle: { fontSize: 13, fontWeight: '600' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  nextText: { flex: 1, minWidth: 0, fontSize: 15.5, lineHeight: 21 },
  nextPlus: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  tileArt: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center' },
  tileArtImg: { width: '76%', height: '76%' },
  tileLabel: { fontSize: 14.5, fontWeight: '600' },
  tileHint: { fontSize: 12.5, marginTop: 1 },
  tileNarrow: { gap: 6, paddingHorizontal: 8 },
  tileArtNarrow: { width: 32, height: 32, borderRadius: 10 },
  tileLabelNarrow: { fontSize: 13.5, lineHeight: 17 },

  composer: { paddingHorizontal: 12, paddingTop: 4 },
  inputCard: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 26, borderWidth: 1, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, minHeight: 52 },
  input: { flex: 1, fontSize: 16, lineHeight: 21, maxHeight: 140, paddingTop: Platform.OS === 'ios' ? 9 : 6, paddingBottom: Platform.OS === 'ios' ? 9 : 6 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  stopSquare: { width: 12, height: 12, borderRadius: 3 },
  disclaimer: { fontSize: 11.5, textAlign: 'center', marginTop: 8 },
});
