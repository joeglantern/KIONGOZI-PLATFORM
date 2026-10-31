import { appAlert, toast } from '../../utils/alert';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Image, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Keyboard, Pressable,
} from 'react-native';
import { VoiceRecorder, canRecordVoice } from '../../components/social/VoiceNote';
import { ChatSkeleton } from '../../components/social/Skeleton';
import { MessageMenu, QUICK_REACTIONS } from '../../components/social/MessageMenu';
import { SelectTextSheet } from '../../components/social/SelectTextSheet';
import type { BubbleRect } from '../../components/social/DMBubble';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DMBubble, formatTime } from '../../components/social/DMBubble';
import { BottomSheet } from '../../components/social/BottomSheet';
import ReportModal from './ReportModal';
import { useSocialStore } from '../../stores/socialStore';
import { MediaViewerModal } from '../../components/social/MediaViewerModal';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useDMStore, DMMessage, clearTyping } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';
import { useTheme } from '../../hooks/useTheme';
import { useHideTabBar } from '../../hooks/useHideTabBar';
import { TypingBubble } from '../../components/social/TypingBubble';
import { SwipeToReply } from '../../components/social/SwipeToReply';
import { useIsOnline } from '../../stores/presenceStore';
import { useThemeStore } from '../../stores/themeStore';
import { enqueue } from '../../utils/outbox';
import { ReplyChips } from '../../components/social/ReplyChips';
import * as Haptics from 'expo-haptics';

// ─── Date label helpers ───────────────────────────────────────────────────────

function dayKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "TODAY 9:40", "YESTERDAY 21:05", "TUESDAY 8:12", "OCT 3 10:20": the day plus when the first message landed */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const t = d.getTime(), day = 86400000;
  const name = t >= startOfToday.getTime() ? 'Today'
    : t >= startOfToday.getTime() - day ? 'Yesterday'
    : t >= startOfToday.getTime() - 6 * day ? WEEKDAYS[d.getDay()]
    : `${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : ''}`;
  return `${name.toUpperCase()} ${formatTime(dateStr).replace(/^0/, '')}`;
}

// More reactions behind the "+" in the long-press pill
const MORE_EMOJI = [
  '👍', '👎', '🙏', '💯', '🎉', '🥳', '😍', '🥰',
  '😘', '😊', '🤣', '😅', '😭', '🥺', '😡', '🤯',
  '😎', '🤔', '🙌', '💪', '👀', '✅', '💚', '🤝',
];

/** Messages that exist on the server can take a reaction */
const canReact = (m: DMMessage) => !m._pending && !m._failed && !m.id.startsWith('temp_');

// ─── List item types ──────────────────────────────────────────────────────────

type DateItem  = { type: 'date'; key: string; label: string };
type MsgItem   = {
  type: 'message';
  key: string;
  message: DMMessage;
  isFirst: boolean;
  isLast: boolean;
};
type ListItem  = DateItem | MsgItem;

function buildList(messages: DMMessage[], myId: string): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = '';

  messages.forEach((msg, i) => {
    // Date separator
    const day = dayKey(msg.created_at);
    if (day !== lastDay) {
      items.push({ type: 'date', key: `date_${i}`, label: dayLabel(msg.created_at) });
      lastDay = day;
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];
    // One group = same sender, same day, sent within 3 minutes of each other (Signal / iMessage)
    const close = (a: DMMessage, b: DMMessage) =>
      a.sender_id === b.sender_id && dayKey(a.created_at) === dayKey(b.created_at) &&
      Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 3 * 60 * 1000;
    const sameSenderAsPrev = !!prev && close(prev, msg);
    const sameSenderAsNext = !!next && close(next, msg);

    items.push({
      type: 'message',
      key: msg.id,
      message: msg,
      isFirst: !sameSenderAsPrev,
      isLast: !sameSenderAsNext,
    });
  });

  return items;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DMConversationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversationId, participantName, participantUsername, participantAvatar, participantIsVerified } = route.params || {};
  const { user } = useAuthStore();
  const { messages, messageCursors, fetchMessages, appendMessage, replaceMessage, removeMessage, unsendMessage, updateMessageContent, markRead, setDraft, hydrateMessages } = useDMStore();
  useHideTabBar();
  const participantId: string | undefined = useDMStore(s => s.conversations.find(c => c.id === conversationId)?.participants?.[0]?.id) || route.params?.participantId;
  const isOnline = useIsOnline(participantId);
  const isDark = useThemeStore(s => s.isDark);

  const T = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(T, insets.bottom), [T, insets.bottom]);
  const isBot = participantUsername === 'kiongozi';
  // Unsent text survives leaving the chat (and app restarts), like the WhatsApp "Draft:"
  const [text, setText] = useState(() => useDMStore.getState().drafts[conversationId] || '');
  const inputRef = useRef<TextInput>(null);
  // Typing indicator over the chat's realtime channel (broadcast, nothing stored)
  const channelRef = useRef<any>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerMessage, setViewerMessage] = useState<DMMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<DMMessage | null>(null);
  const [menu, setMenu] = useState<{ message: DMMessage; isOwn: boolean; rect: BubbleRect } | null>(null);
  const [selectText, setSelectText] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<DMMessage | null>(null);
  // Reactions: the "+" grid, and who reacted (by id, so it stays live while open)
  const [moreEmojiFor, setMoreEmojiFor] = useState<DMMessage | null>(null);
  const [whoForId, setWhoForId] = useState<string | null>(null);
  // Header ⋯: View profile / Mute / Block / Report
  const [moreSheet, setMoreSheet] = useState(false);
  const [blockSheet, setBlockSheet] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'user'; id: string; displayName: string } | null>(null);
  const chatMuted = useDMStore(s => s.mutedIds.includes(conversationId));
  const handleLabel = participantUsername ? `@${participantUsername}` : (participantName || 'them');
  const doBlock = useCallback(() => {
    if (!participantId) return;
    const id = participantId;
    // Leave at once; the block goes through in the background (same as the profile screen)
    navigation.goBack();
    const fail = () => toast(`Couldn't block ${handleLabel}`, { kind: 'error', message: 'Check your connection and try again.', duration: 5000 });
    useSocialStore.getState().blockUser(id).then(() => {
      if (!useSocialStore.getState().blockedUserIds.includes(id)) fail();
    }).catch(fail);
  }, [participantId, navigation, handleLabel]);
  const isSending = useRef(false); // guard against double-tap
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(0)).current;
  // The list is inverted (newest at offset 0), so "bottom" is offset 0: no jumps, no scrollToEnd
  const scrollToBottom = useCallback((animated = true) => flatListRef.current?.scrollToOffset({ offset: 0, animated }), []);

  // While the keyboard is up, the home-indicator gap under the input goes away (no double gap)
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Animate send button in/out when there's text or a media attachment
  const hasContent = text.trim().length > 0 || mediaUri !== null;
  React.useEffect(() => {
    Animated.spring(sendScale, {
      overshootClamping: true,
      toValue: hasContent ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  }, [hasContent]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      appAlert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  }, []);

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      appAlert('Camera permission required', 'Please allow camera access in Settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  }, []);

  const openContextMenu = useCallback((message: DMMessage, isOwn: boolean, rect: BubbleRect) => {
    Keyboard.dismiss();
    setMenu({ message, isOwn, rect });
  }, []);

  const conversationMessages = messages[conversationId] || [];

  // Reactions: mine shows at once; same emoji again removes it (see dmStore.reactToMessage)
  const react = useCallback((m: DMMessage, emoji: string | null) => {
    if (!user?.id || !canReact(m)) return;
    useDMStore.getState().reactToMessage(conversationId, m.id, user.id, emoji);
  }, [conversationId, user?.id]);
  /** Double-tap is always a heart, never takes one away (Instagram) */
  const heart = useCallback((m: DMMessage) => {
    const cur = (useDMStore.getState().messages[conversationId] || []).find(x => x.id === m.id);
    if (cur?.reactions?.some(r => r.user_id === user?.id && r.emoji === '❤️')) return;
    react(m, '❤️');
  }, [conversationId, user?.id, react]);

  const messageMap = useMemo(() => {
    const map: Record<string, DMMessage> = {};
    for (const m of conversationMessages) map[m.id] = m;
    return map;
  }, [conversationMessages]);

  const listItems = useMemo(
    () => buildList(conversationMessages, user?.id || '').reverse(),
    [conversationMessages, user?.id]
  );

  // iMessage "Seen 9:42": only under the newest message of mine that they have read
  const lastSeenMineId = useMemo(() => {
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const m = conversationMessages[i];
      if (m.sender_id !== user?.id || m._pending || m._failed) continue;
      return m.is_read ? m.id : null; // my newest delivered message decides: unread = no line at all
    }
    return null;
  }, [conversationMessages, user?.id]);

  // 'loading' until we know: shimmer bubbles, never the "new chat" wave for a chat that has messages
  const [ready, setReady] = useState(() => (useDMStore.getState().messages[conversationId]?.length ?? 0) > 0);
  useEffect(() => { if (conversationMessages.length) setReady(true); }, [conversationMessages.length]);

  useEffect(() => {
    // Saved messages show first (works offline). Only do a blocking full reload when nothing
    // was saved; the realtime SUBSCRIBED callback catches anything that arrived while away.
    hydrateMessages(conversationId).then(() => {
      if (useDMStore.getState().messages[conversationId]?.length) { setReady(true); return; }
      Promise.resolve(fetchMessages(conversationId, true)).finally(() => setReady(true));
    });
    markRead(conversationId); // clears the badge and tells the server
  }, [conversationId]);

  // Keep a ref to current messages for dedup checks inside the realtime callback
  // (avoids stale closure over `conversationMessages`)
  const msgsRef = useRef<DMMessage[]>([]);
  useEffect(() => { msgsRef.current = conversationMessages; }, [conversationMessages]);

  // Realtime: append incoming messages + re-fetch on subscription to catch any missed messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const channel = supabase
      .channel(`dm-conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (!payload.new) return;
          const msg = payload.new as DMMessage;

          // Skip own messages — already added optimistically in handleSend
          if (msg.sender_id === user.id) return;
          setPeerTyping(false);
          clearTyping(conversationId);

          // Dedup: skip if we already have this message in the list
          if (msgsRef.current.some(m => m.id === msg.id)) return;

          appendMessage(conversationId, msg, true);
          apiClient.markDMRead(conversationId);
          Haptics.selectionAsync().catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as DMMessage;
          if (!msg?.id) return;
          const cur = msgsRef.current.find(m => m.id === msg.id);
          if (cur) useDMStore.getState().replaceMessage(conversationId, msg.id, { ...cur, ...msg, sender: cur.sender });
        }
      )
      .on('broadcast', { event: 'reaction' }, ({ payload }: any) => {
        if (!payload?.message_id || !payload.user_id) return;
        useDMStore.getState().applyReaction(conversationId, String(payload.message_id), String(payload.user_id), payload.emoji || null);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (!payload || payload.user_id === user.id) return;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        setPeerTyping(!!payload.on);
        // If the "stopped" signal never comes (app closed), clear on our own
        if (payload.on) typingTimer.current = setTimeout(() => setPeerTyping(false), 5000);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Re-fetch on subscription connect to catch any messages
          // that arrived between the initial load and the subscription being established
          await fetchMessages(conversationId, true);
          setReady(true);
        }
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Their inbox channel: the chats list on their phone shows "typing…" from this (see dmStore attachTypingInbox).
  // Its own topic, never shared with the chat channel: realtime-js tears down all channels on a topic together.
  const inboxRef = useRef<any>(null);
  useEffect(() => {
    if (!participantId || isBot || participantId === user?.id) return;
    const ch = supabase.channel(`dm-inbox-${participantId}`).subscribe();
    inboxRef.current = ch;
    return () => { inboxRef.current = null; supabase.removeChannel(ch); };
  }, [participantId, isBot, user?.id]);

  const sendTyping = useCallback((on: boolean) => {
    if (!channelRef.current || !user?.id) return;
    Promise.resolve(channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, on } })).catch(() => {});
    if (inboxRef.current) {
      Promise.resolve(inboxRef.current.send({ type: 'broadcast', event: 'typing', payload: { conversation_id: conversationId, user_id: user.id, on } })).catch(() => {});
    }
  }, [user?.id, conversationId]);

  const handleChangeText = useCallback((t: string) => {
    setText(t);
    if (editingMessage) return;
    setDraft(conversationId, t);
    const now = Date.now();
    if (t.trim() && now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      sendTyping(true);
    } else if (!t.trim() && lastTypingSent.current) {
      lastTypingSent.current = 0;
      sendTyping(false);
    }
  }, [editingMessage, conversationId, setDraft, sendTyping]);

  // Leaving the chat stops our "typing…" on their side
  useEffect(() => () => { if (lastTypingSent.current) sendTyping(false); }, [sendTyping]);


  // Kiongozi AI answers on the server a few seconds later. The live channel usually brings it in,
  // but if it misses (new chat, flaky network) check for the answer for up to a minute.
  const botPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  const awaitBotReply = useCallback(() => {
    if (!isBot) return;
    if (botPoll.current) clearInterval(botPoll.current);
    const theirs = () => msgsRef.current.filter(m => m.sender_id !== user?.id).length;
    const before = theirs();
    let tries = 0;
    setPeerTyping(true);
    botPoll.current = setInterval(async () => {
      tries++;
      await Promise.resolve(fetchMessages(conversationId, true)).catch(() => {});
      if (theirs() > before || tries >= 20) {
        if (botPoll.current) clearInterval(botPoll.current);
        botPoll.current = null;
        setPeerTyping(false);
      }
    }, 3000);
  }, [isBot, conversationId, user?.id, fetchMessages]);
  useEffect(() => () => { if (botPoll.current) clearInterval(botPoll.current); }, []);

  const handleSend = useCallback(async () => {
    if (!text.trim() && !mediaUri) return;
    if (isSending.current) return; // prevent double-send

    // Edit mode — update existing message instead of creating a new one
    if (editingMessage) {
      const newContent = text.trim();
      setText('');
      setEditingMessage(null);
      await updateMessageContent(conversationId, editingMessage.id, newContent);
      return;
    }

    isSending.current = true;
    const content = text.trim();
    const attachedUri = mediaUri;
    const replyToId = replyingTo?.id;
    setText('');
    setDraft(conversationId, '');
    if (lastTypingSent.current) { lastTypingSent.current = 0; sendTyping(false); }
    setMediaUri(null);
    setReplyingTo(null);

    // The message shows straight away with a clock; the outbox uploads the photo, sends it and
    // swaps in the real message. With no connection it waits and sends when the connection is back.
    queueMessage({ content, mediaUri: attachedUri || undefined, replyToId });
    awaitBotReply();
    isSending.current = false;
  }, [text, mediaUri, conversationId, user, appendMessage, awaitBotReply]);

  const queueMessage = useCallback((m: { content: string; mediaUri?: string; replyToId?: string; mediaType?: 'image' | 'audio'; durationMs?: number }) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();
    appendMessage(conversationId, {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user!.id,
      content: m.content || undefined,
      media_url: m.mediaUri,
      media_type: m.mediaUri ? (m.mediaType || 'image') : undefined,
      duration_ms: m.durationMs,
      reply_to_id: m.replyToId,
      is_read: false,
      created_at: createdAt,
      _pending: true,
    } as DMMessage, true); // own message — skip unread increment
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => scrollToBottom(true), 30);
    enqueue({ t: 'dm', conversationId, tempId, senderId: user!.id, createdAt, content: m.content, mediaUri: m.mediaUri, replyToId: m.replyToId, mediaType: m.mediaType, durationMs: m.durationMs });
  }, [conversationId, user, appendMessage]);

  /** "Not sent · Tap to retry": send the same message again as a new one at the bottom */
  const retryMessage = useCallback((msg: DMMessage) => {
    Haptics.selectionAsync().catch(() => {});
    removeMessage(conversationId, msg.id);
    const local = msg.media_url && !/^https?:/i.test(msg.media_url) ? msg.media_url : undefined;
    queueMessage({ content: msg.content || '', mediaUri: local, replyToId: msg.reply_to_id, mediaType: msg.media_type === 'audio' ? 'audio' : undefined, durationMs: msg.duration_ms || undefined });
  }, [conversationId, removeMessage, queueMessage]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSep}>
          <Text style={styles.dateLabel}>{item.label}</Text>
        </View>
      );
    }

    const isOwn = item.message.sender_id === user?.id;
    const repliedTo = item.message.reply_to_id ? messageMap[item.message.reply_to_id] : undefined;
    return (
      <SwipeToReply
        enabled={!isBot && !item.message._pending}
        color={isDark ? '#3A3A3C' : '#AEAEB2'}
        onReply={() => { setReplyingTo(item.message); setTimeout(() => inputRef.current?.focus(), 60); }}
      >
      <DMBubble
        message={item.message}
        isOwn={isOwn}
        isFirst={item.isFirst}
        isLast={item.isLast}
        avatarUrl={participantAvatar}
        avatarName={participantName || participantUsername}
        onMediaPress={item.message.media_url ? () => setViewerMessage(item.message) : undefined}
        onLongPress={(rect) => openContextMenu(item.message, isOwn, rect)}
        onRetry={item.message._failed ? () => retryMessage(item.message) : undefined}
        seenAt={item.message.id === lastSeenMineId ? (item.message.read_at || '') : undefined}
        myId={user?.id}
        onDoubleTap={canReact(item.message) ? () => heart(item.message) : undefined}
        onReactionsPress={() => setWhoForId(item.message.id)}
        replyPreview={repliedTo ? {
          senderName: repliedTo.sender_id === user?.id ? 'You' : (participantName || 'Them'),
          content: repliedTo.content || (repliedTo.media_url ? '📷 Photo' : 'Message'),
        } : undefined}
      />
      </SwipeToReply>
    );
  }, [user?.id, participantAvatar, participantName, participantUsername, styles, openContextMenu, messageMap, isBot, isDark, retryMessage, lastSeenMineId, heart]);

  // Who reacted: names and photos from the chat's people (me from my profile)
  const me: any = useProfileStore(s => s.currentUserProfile);
  const people = useDMStore(s => s.conversations.find(c => c.id === conversationId)?.participants);
  const whoMessage = whoForId ? messageMap[whoForId] : undefined;
  const whoRows = useMemo(() => {
    const list = whoMessage?.reactions || [];
    return list
      .map(r => {
        const mine = r.user_id === user?.id;
        const p = people?.find(x => x.id === r.user_id);
        const isPeer = r.user_id === participantId;
        const name: string = mine ? 'You' : (p?.full_name || p?.username || (isPeer ? participantName || participantUsername : '') || 'Someone');
        const avatar: string | undefined = mine ? me?.avatar_url : (p?.avatar_url || (isPeer ? participantAvatar : undefined));
        const avatarName: string | undefined = mine ? (me?.full_name || me?.username) : name;
        return { ...r, mine, name, avatar, avatarName };
      })
      .sort((a, b) => Number(b.mine) - Number(a.mine));
  }, [whoMessage, people, user?.id, me, participantId, participantName, participantUsername, participantAvatar]);
  // The last reaction went (theirs removed live, or mine): nothing left to show
  useEffect(() => { if (whoForId && !whoRows.length) setWhoForId(null); }, [whoForId, whoRows.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TouchableOpacity>

          {isBot ? (
            <View style={styles.headerCenter}>
              <View style={styles.botAvatarWrap}>
                <Image
                  source={require('../../../assets/kchat-logo.png')}
                  style={styles.botAvatar}
                  resizeMode="contain"
                />
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.headerNames}>
                <Text style={styles.headerName} numberOfLines={1}>Kiongozi AI</Text>
                <Text style={[styles.headerHandle, { color: T.accent }]} numberOfLines={1}>Always online</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerCenter}
              activeOpacity={0.7}
              onPress={() => participantUsername && navigation.navigate('PublicProfile', { username: participantUsername })}
            >
              <View>
                <UserAvatar avatarUrl={participantAvatar} size={32} name={participantName || participantUsername} />
                {isOnline && <View style={styles.activeDot} />}
              </View>
              <View style={styles.headerNames}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={styles.headerName} numberOfLines={1}>{participantName || 'Message'}</Text>
                  {participantIsVerified && <VerifiedBadge size={15} />}
                </View>
                {peerTyping ? (
                  <Text style={[styles.headerHandle, { color: T.accent }]} numberOfLines={1}>typing…</Text>
                ) : isOnline ? (
                  <Text style={[styles.headerHandle, { color: T.accent }]} numberOfLines={1}>Active now</Text>
                ) : participantUsername ? (
                  <Text style={styles.headerHandle} numberOfLines={1}>@{participantUsername}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}

          {!isBot && participantUsername ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); Keyboard.dismiss(); setMoreSheet(true); }}
              accessibilityLabel="More options"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
            </TouchableOpacity>
          ) : <View style={styles.headerRight} />}
        </View>

        {/* Messages */}
        {!ready && !listItems.length ? (
          <ChatSkeleton />
        ) : !listItems.length ? (
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.empty}>
              <UserAvatar avatarUrl={participantAvatar} size={84} name={participantName || participantUsername} />
              <Text style={styles.emptyName}>{participantName || 'Say hello'}</Text>
              {participantUsername ? <Text style={styles.emptyText}>@{participantUsername}</Text> : null}
              {!isBot && (
                <TouchableOpacity style={styles.waveBtn} onPress={() => setText('👋')} accessibilityLabel="Wave">
                  <Text style={styles.waveText}>👋  Wave</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        ) : (
          <FlatList
            ref={flatListRef}
            inverted
            data={listItems}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 120 }}
            initialNumToRender={18}
            windowSize={11}
            // Inverted: the header sits at the bottom (typing), the footer at the top (older)
            ListHeaderComponent={peerTyping ? <TypingBubble avatarUrl={participantAvatar} name={participantName || participantUsername} /> : null}
            ListFooterComponent={messageCursors[conversationId] ? <ActivityIndicator style={{ marginVertical: 14 }} color={T.textMuted} /> : <View style={{ height: 8 }} />}
            onEndReached={() => { if (messageCursors[conversationId]) fetchMessages(conversationId, false); }}
            onEndReachedThreshold={0.4}
          />
        )}

        {/* Input (Kiongozi AI chats too: it replies right here) */}
        {(
          <View style={[styles.inputBar, { paddingBottom: kbOpen ? 8 : Math.max(insets.bottom, 12) + 4 }]}>
            <ReplyChips
              conversationId={conversationId}
              last={(messages[conversationId] || [])[(messages[conversationId] || []).length - 1]}
              myId={user?.id}
              hidden={!!text.trim() || !!editingMessage || !!mediaUri}
              onPick={t => { setText(t); setDraft(conversationId, t); setTimeout(() => inputRef.current?.focus(), 30); }}
            />
            {editingMessage && (
              <View style={[styles.replyPreviewBar, styles.editBar]}>
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.editBarLabel}>Editing message</Text>
                  <Text style={styles.replyPreviewText} numberOfLines={1}>
                    {editingMessage.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingMessage(null); setText(useDMStore.getState().drafts[conversationId] || ''); }} style={styles.replyDismiss}>
                  <Ionicons name="close" size={18} color={T.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {replyingTo && (
              <View style={styles.replyPreviewBar}>
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.replyPreviewLabel}>
                    Replying to {replyingTo.sender_id === user?.id ? 'yourself' : participantName}
                  </Text>
                  <Text style={styles.replyPreviewText} numberOfLines={1}>
                    {replyingTo.content || (replyingTo.media_type === 'audio' ? 'Voice note' : replyingTo.media_url ? 'Photo' : 'Message')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyDismiss}>
                  <Ionicons name="close" size={18} color={T.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {mediaUri && (
              <View style={styles.mediaPreviewWrap}>
                <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
                <TouchableOpacity style={styles.mediaRemove} onPress={() => setMediaUri(null)}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <Pressable
                style={({ pressed }) => [styles.plusBtn, pressed && { transform: [{ scale: 0.92 }], opacity: 0.8 }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); handlePickImage(); }}
                disabled={uploading}
                accessibilityLabel="Send a photo"
              >
                <Ionicons name="add" size={22} color={T.text} />
              </Pressable>
              <View style={styles.inputPill}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={text}
                  onChangeText={handleChangeText}
                  placeholder="Message…"
                  placeholderTextColor={T.placeholder}
                  multiline
                  maxLength={1000}
                />
                {hasContent ? (
                  <Animated.View style={{ transform: [{ scale: sendScale.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }], opacity: sendScale }}>
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={!hasContent || uploading}
                      style={styles.sendBtn}
                      activeOpacity={0.8}
                      accessibilityLabel={editingMessage ? 'Save edit' : 'Send'}
                    >
                      {uploading ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name={editingMessage ? 'checkmark' : 'arrow-up'} size={18} color="#000" />}
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  <TouchableOpacity style={styles.pillIcon} onPress={handleCamera} disabled={uploading} accessibilityLabel="Take a photo">
                    <Ionicons name="camera-outline" size={21} color={T.textSub} />
                  </TouchableOpacity>
                )}
              </View>
              {!hasContent && !editingMessage && canRecordVoice && (
                <VoiceRecorder
                  accent={T.accent}
                  textColor={T.text}
                  subColor={T.textSub}
                  barBg={T.surface}
                  onSend={v => {
                    const replyToId = replyingTo?.id;
                    setReplyingTo(null);
                    queueMessage({ content: '', mediaUri: v.uri, mediaType: 'audio', durationMs: v.durationMs, replyToId });
                    awaitBotReply();
                  }}
                />
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <MediaViewerModal
        visible={!!viewerMessage}
        onClose={() => setViewerMessage(null)}
        media={
          viewerMessage?.media_url
            ? [{ url: viewerMessage.media_url, media_type: (viewerMessage.media_type as 'image' | 'video') || 'image' }]
            : []
        }
        caption={viewerMessage?.content}
      />

      {menu && (
        <MessageMenu
          rect={menu.rect}
          isOwn={menu.isOwn}
          onClose={() => setMenu(null)}
          reactions={canReact(menu.message) ? {
            mine: menu.message.reactions?.find(r => r.user_id === user?.id)?.emoji ?? null,
            onPick: (e) => react(menu.message, e),
            onMore: () => setMoreEmojiFor(menu.message),
          } : undefined}
          preview={
            <DMBubble
              floating
              message={menu.message}
              isOwn={menu.isOwn}
              isFirst
              isLast
              avatarUrl={participantAvatar}
              avatarName={participantName || participantUsername}
              replyPreview={(() => {
                const r = menu.message.reply_to_id ? messageMap[menu.message.reply_to_id] : undefined;
                return r ? { senderName: r.sender_id === user?.id ? 'You' : (participantName || 'Them'), content: r.content || (r.media_url ? '📷 Photo' : 'Message') } : undefined;
              })()}
            />
          }
          actions={[
            ...(!isBot && !menu.message._pending ? [{ key: 'reply', label: 'Reply', icon: 'arrow-undo-outline', onPress: () => { setReplyingTo(menu.message); setTimeout(() => inputRef.current?.focus(), 80); } }] : []),
            ...(menu.message.content ? [
              { key: 'copy', label: 'Copy', icon: 'copy-outline', onPress: () => { Clipboard.setStringAsync(menu.message.content!); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } },
              { key: 'select', label: 'Select text', icon: 'text-outline', onPress: () => setSelectText(menu.message.content!) },
            ] : []),
            ...(menu.isOwn && !menu.message._pending && menu.message.content ? [{ key: 'edit', label: 'Edit', icon: 'pencil-outline', onPress: () => { setEditingMessage(menu.message); setText(menu.message.content || ''); setTimeout(() => inputRef.current?.focus(), 80); } }] : []),
            ...(menu.isOwn && !menu.message._pending ? [{
              key: 'unsend', label: 'Unsend', icon: 'trash-outline', danger: true,
              onPress: () => {
                const m = menu.message;
                appAlert('Unsend this message?', 'It will be removed for everyone in this chat.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Unsend', style: 'destructive', onPress: () => unsendMessage(conversationId, m.id) },
                ]);
              },
            }] : []),
          ]}
        />
      )}

      <SelectTextSheet text={selectText} onClose={() => setSelectText(null)} />

      <BottomSheet visible={!!moreEmojiFor} onClose={() => setMoreEmojiFor(null)} title="React" actions={[]}>
        <View style={styles.emojiGrid}>
          {[...QUICK_REACTIONS, ...MORE_EMOJI].map(e => {
            const on = !!moreEmojiFor?.reactions?.some(r => r.user_id === user?.id && r.emoji === e);
            return (
              <Pressable
                key={e}
                onPress={() => {
                  const m = moreEmojiFor;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setMoreEmojiFor(null);
                  if (m) react(m, e);
                }}
                style={({ pressed }) => [styles.emojiCell, on && styles.emojiCellOn, pressed && { transform: [{ scale: 1.15 }] }]}
                accessibilityRole="button"
                accessibilityLabel={on ? `Remove ${e}` : `React ${e}`}
              >
                <Text style={styles.emojiCellText}>{e}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet visible={!!whoForId && whoRows.length > 0} onClose={() => setWhoForId(null)} title="Reactions" actions={[]}>
        <View style={{ paddingBottom: 4 }}>
          {whoRows.map(r => (
            <Pressable
              key={r.user_id}
              disabled={!r.mine}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setWhoForId(null);
                if (whoMessage) react(whoMessage, null);
              }}
              style={({ pressed }) => [styles.whoRow, pressed && { backgroundColor: T.surface2 }]}
              accessibilityRole={r.mine ? 'button' : undefined}
              accessibilityLabel={r.mine ? `Your reaction ${r.emoji}. Tap to remove.` : `${r.name} reacted ${r.emoji}`}
            >
              <UserAvatar avatarUrl={r.avatar} size={38} name={r.avatarName} />
              <View style={{ flex: 1 }}>
                <Text style={styles.whoName} numberOfLines={1}>{r.name}</Text>
                {r.mine ? <Text style={styles.whoSub}>Tap to remove</Text> : null}
              </View>
              <Text style={styles.whoEmoji}>{r.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={moreSheet}
        onClose={() => setMoreSheet(false)}
        title={participantName || handleLabel}
        actions={[
          ...(participantUsername ? [{
            icon: 'person-circle-outline' as const, label: 'View profile',
            onPress: () => navigation.navigate('PublicProfile', { username: participantUsername }),
          }] : []),
          {
            icon: chatMuted ? 'volume-high-outline' as const : 'volume-mute-outline' as const,
            label: chatMuted ? 'Unmute' : 'Mute',
            onPress: () => {
              useDMStore.getState().toggleMute(conversationId);
              toast(chatMuted ? 'Chat unmuted' : 'Chat muted', { icon: chatMuted ? 'volume-high' : 'volume-mute' });
            },
          },
          ...(participantId ? [
            { icon: 'ban-outline' as const, label: `Block ${handleLabel}`, onPress: () => setBlockSheet(true), destructive: true },
            { icon: 'flag-outline' as const, label: `Report ${handleLabel}`, onPress: () => setReportTarget({ type: 'user', id: participantId, displayName: handleLabel }), destructive: true },
          ] : []),
        ]}
      />

      <BottomSheet
        visible={blockSheet}
        onClose={() => setBlockSheet(false)}
        title={`Block ${handleLabel}?`}
        subtitle="They will no longer be able to see your posts or contact you."
        actions={[{ icon: 'ban-outline', label: 'Block', onPress: doBlock, destructive: true }]}
      />

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
    </SafeAreaView>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>, bottomInset: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 2,
      paddingVertical: 0,
      // minHeight (not height) so a 1.3× system font can't clip the name + handle stack
      minHeight: 50,
      backgroundColor: T.bg,
      gap: 4,
    },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    headerNames: { flex: 1 },
    headerName: { fontSize: 16, color: T.text, fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 },
    headerHandle: { fontSize: 12, color: T.textMuted, marginTop: 0 },
    headerRight: { width: 44 },

    messageList: { paddingVertical: 12, paddingBottom: 4 },

    dateSep: { alignItems: 'center', marginTop: 16, marginBottom: 6 },

    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8, justifyContent: 'center' },
    emojiCell: { width: 46, height: 46, margin: 2, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    emojiCellOn: { backgroundColor: T.accent + '33' },
    emojiCellText: { fontSize: 27, lineHeight: 34 },
    whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 9 },
    whoName: { fontSize: 16, fontWeight: '600', color: T.text },
    whoSub: { fontSize: 13, color: T.textMuted, marginTop: 1 },
    whoEmoji: { fontSize: 26, lineHeight: 32 },
    dateLabel: { fontSize: 12, color: T.textMuted, fontWeight: '600' },

    empty: { alignItems: 'center', marginTop: 90, gap: 6 },
    emptyName: { color: T.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
    emptyText: { color: T.textMuted, fontSize: 15 },
    waveBtn: { marginTop: 14, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: T.surface2, justifyContent: 'center' },
    waveText: { color: T.text, fontSize: 15, fontWeight: '600' },
    loadOlderBtn: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, marginTop: 8, marginBottom: 4 },
    loadOlderText: { color: T.accent, fontSize: 14, fontWeight: '600' },

    inputBar: {
      paddingHorizontal: 10,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: T.border,
      // SafeAreaView adds the home-indicator / nav-bar inset below this; when Android
      // reports 0 there, give the pill a little more room off the screen edge.
      backgroundColor: T.bg,
    },
    replyPreviewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 14,
      borderLeftWidth: 3,
      borderLeftColor: T.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
    },
    replyPreviewContent: { flex: 1 },
    replyPreviewLabel: { fontSize: 12, fontWeight: '700', color: T.accent, marginBottom: 2 },
    replyPreviewText: { fontSize: 13, color: T.textSub },
    replyDismiss: { padding: 4, marginLeft: 8 },
    editBar: { borderLeftColor: T.text },
    editBarLabel: { fontSize: 12, fontWeight: '700', color: T.text, marginBottom: 2 },
    mediaPreviewWrap: {
      position: 'relative',
      alignSelf: 'flex-start',
      marginBottom: 8,
      marginLeft: 36,
    },
    mediaPreview: {
      width: 80,
      height: 80,
      borderRadius: 10,
    },
    mediaRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    plusBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface2, marginBottom: 1 },
    inputPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      minHeight: 38,
      borderRadius: 19,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.border,
      paddingLeft: 14,
      paddingRight: 3,
      paddingVertical: 3,
      backgroundColor: T.surface,
    },
    pillIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    attachBtn: {
      width: 38,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputWrap: {
      flex: 1,
      backgroundColor: T.surface2,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      minHeight: 44,
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      fontSize: 16,
      lineHeight: 21,
      color: T.text,
      maxHeight: 132,
      paddingHorizontal: 0,
      paddingTop: Platform.OS === 'ios' ? 6 : 4,
      paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    },
    sendBtn: {
      backgroundColor: T.accent,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },

    botAvatarWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#0D1F0D',
      overflow: 'visible',
      position: 'relative',
    },
    botAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    activeDot: {
      position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6,
      backgroundColor: '#34C759', borderWidth: 2, borderColor: T.bg,
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: T.accent,
      borderWidth: 2,
      borderColor: T.bg,
    },
    comingSoonBar: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      backgroundColor: T.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: T.borderLight,
    },
    comingSoonTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: T.text,
      letterSpacing: 0.3,
    },
    comingSoonSub: {
      fontSize: 13,
      color: T.textMuted,
      marginTop: 3,
    },

    // ─── Context menu bottom sheet ──────────────────────────────────
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: T.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? 20 : 8) + 12,
      paddingTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: T.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    sheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    sheetItemText: {
      fontSize: 16,
      color: T.text,
      fontWeight: '500',
    },
    sheetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: T.border,
      marginHorizontal: 16,
      marginVertical: 4,
    },
    sheetConfirm: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
    },
    sheetConfirmTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: T.text,
      marginBottom: 4,
    },
    sheetConfirmSub: {
      fontSize: 13,
      color: T.textSub,
    },
  });
}
