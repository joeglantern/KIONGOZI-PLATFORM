import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Image,
  TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Alert, Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DMBubble } from '../../components/social/DMBubble';
import { MediaViewerModal } from '../../components/social/MediaViewerModal';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useDMStore, DMMessage } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';
import { useTheme } from '../../hooks/useTheme';
import { useHideTabBar } from '../../hooks/useHideTabBar';

// ─── Date label helpers ───────────────────────────────────────────────────────

function dayKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

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
    const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id && dayKey(prev.created_at) === day;
    const sameSenderAsNext = next && next.sender_id === msg.sender_id && dayKey(next.created_at) === day;

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
  const { conversationId, participantName, participantUsername, participantAvatar } = route.params || {};
  const { user } = useAuthStore();
  const { messages, messageCursors, fetchMessages, appendMessage, replaceMessage, removeMessage, unsendMessage, updateMessageContent, markRead } = useDMStore();
  useHideTabBar();

  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const isBot = participantUsername === 'kiongozi';
  const [text, setText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerMessage, setViewerMessage] = useState<DMMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<DMMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: DMMessage; isOwn: boolean } | null>(null);
  const [unsendConfirm, setUnsendConfirm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DMMessage | null>(null);
  const sheetY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isSending = useRef(false); // guard against double-tap
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(0)).current;

  // Animate send button in/out when there's text or a media attachment
  const hasContent = text.trim().length > 0 || mediaUri !== null;
  React.useEffect(() => {
    Animated.spring(sendScale, {
      toValue: hasContent ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  }, [hasContent]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
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
      Alert.alert('Camera permission required', 'Please allow camera access in Settings to take photos.');
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

  const openContextMenu = useCallback((message: DMMessage, isOwn: boolean) => {
    setContextMenu({ message, isOwn });
    setUnsendConfirm(false);
    sheetY.setValue(300);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [sheetY, backdropOpacity]);

  const closeContextMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 300, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setContextMenu(null));
  }, [sheetY, backdropOpacity]);

  const conversationMessages = messages[conversationId] || [];

  const messageMap = useMemo(() => {
    const map: Record<string, DMMessage> = {};
    for (const m of conversationMessages) map[m.id] = m;
    return map;
  }, [conversationMessages]);

  const listItems = useMemo(
    () => buildList(conversationMessages, user?.id || ''),
    [conversationMessages, user?.id]
  );

  useEffect(() => {
    fetchMessages(conversationId, true);
    markRead(conversationId);
    apiClient.markDMRead(conversationId);
  }, [conversationId]);

  // Realtime: append incoming messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const channel = supabase
      .channel(`dm-conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.new && payload.new.sender_id !== user.id) {
            // User is actively viewing — skip unread increment, mark read immediately
            appendMessage(conversationId, payload.new as any, true);
            apiClient.markDMRead(conversationId);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id]);

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
    setMediaUri(null);
    setReplyingTo(null);

    const tempId = `temp_${Date.now()}`;
    appendMessage(conversationId, {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user!.id,
      content: content || undefined,
      media_url: attachedUri || undefined,
      media_type: attachedUri ? 'image' : undefined,
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    } as DMMessage, true); // own message — skip unread increment
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      let uploadedUrl: string | undefined;
      if (attachedUri) {
        setUploading(true);
        const ext = attachedUri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const storagePath = `dms/${user!.id}/${Date.now()}.${ext}`;
        const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', attachedUri);
          xhr.responseType = 'arraybuffer';
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new Error('Failed to read file'));
          xhr.send();
        });
        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
        setUploading(false);
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(storagePath);
        uploadedUrl = urlData.publicUrl;
      }

      const res = await apiClient.sendDM(conversationId, content, uploadedUrl, uploadedUrl ? 'image' : undefined, replyToId);
      if (res.success && res.data) {
        replaceMessage(conversationId, tempId, res.data);
      } else {
        removeMessage(conversationId, tempId);
        setText(content);
        if (attachedUri) setMediaUri(attachedUri);
      }
    } catch {
      setUploading(false);
      removeMessage(conversationId, tempId);
      setText(content);
      if (attachedUri) setMediaUri(attachedUri);
    } finally {
      isSending.current = false;
    }
  }, [text, mediaUri, conversationId, user, appendMessage, replaceMessage, removeMessage]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSep}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const isOwn = item.message.sender_id === user?.id;
    const repliedTo = item.message.reply_to_id ? messageMap[item.message.reply_to_id] : undefined;
    return (
      <DMBubble
        message={item.message}
        isOwn={isOwn}
        isFirst={item.isFirst}
        isLast={item.isLast}
        avatarUrl={participantAvatar}
        onMediaPress={item.message.media_url ? () => setViewerMessage(item.message) : undefined}
        onLongPress={() => openContextMenu(item.message, isOwn)}
        replyPreview={repliedTo ? {
          senderName: repliedTo.sender_id === user?.id ? 'You' : (participantName || 'Them'),
          content: repliedTo.content || (repliedTo.media_url ? '📷 Photo' : 'Message'),
        } : undefined}
      />
    );
  }, [user?.id, participantAvatar, participantName, styles, openContextMenu, messageMap]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
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
                <Text style={[styles.headerHandle, { color: T.accent }]}>Always online</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerCenter}
              activeOpacity={0.7}
              onPress={() => participantUsername && navigation.navigate('PublicProfile', { username: participantUsername })}
            >
              <UserAvatar avatarUrl={participantAvatar} size={36} />
              <View style={styles.headerNames}>
                <Text style={styles.headerName} numberOfLines={1}>{participantName || 'Message'}</Text>
                {participantUsername ? (
                  <Text style={styles.headerHandle}>@{participantUsername}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.headerRight} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={null}
          ListHeaderComponent={
            messageCursors[conversationId] ? (
              <TouchableOpacity
                style={styles.loadOlderBtn}
                onPress={() => fetchMessages(conversationId, false)}
              >
                <Text style={styles.loadOlderText}>Load older messages</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={40} color="#e2e8f0" />
              <Text style={styles.emptyText}>Start the conversation</Text>
            </View>
          }
        />

        {/* Input / Coming Soon */}
        {isBot ? (
          <View style={styles.comingSoonBar}>
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
            <Text style={styles.comingSoonSub}>AI replies in direct messages</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            {editingMessage && (
              <View style={[styles.replyPreviewBar, styles.editBar]}>
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.editBarLabel}>Editing message</Text>
                  <Text style={styles.replyPreviewText} numberOfLines={1}>
                    {editingMessage.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingMessage(null); setText(''); }} style={styles.replyDismiss}>
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
                    {replyingTo.content || (replyingTo.media_url ? '📷 Photo' : 'Message')}
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
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <Ionicons name="image-outline" size={22} color={uploading ? T.tabIconInactive : T.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handleCamera}
                disabled={uploading}
              >
                <Ionicons name="camera-outline" size={22} color={uploading ? T.tabIconInactive : T.accent} />
              </TouchableOpacity>

              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  placeholder="Message..."
                  placeholderTextColor="#b0bec5"
                  multiline
                  maxLength={1000}
                />
              </View>

              <Animated.View style={{ transform: [{ scale: sendScale }], opacity: sendScale }}>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!hasContent || uploading}
                  style={styles.sendBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </Animated.View>
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

      {/* Context menu bottom sheet */}
      {contextMenu && (
        <Modal transparent animationType="none" onRequestClose={closeContextMenu}>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeContextMenu} activeOpacity={1} />
            </Animated.View>

            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
              {/* Sheet handle */}
              <View style={styles.sheetHandle} />

              {!unsendConfirm ? (
                <>
                  {contextMenu.message.content ? (
                    <TouchableOpacity style={styles.sheetItem} onPress={() => { Clipboard.setStringAsync(contextMenu.message.content!); closeContextMenu(); }} activeOpacity={0.7}>
                      <Ionicons name="copy-outline" size={22} color={T.text} />
                      <Text style={styles.sheetItemText}>Copy</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity style={styles.sheetItem} onPress={() => { setReplyingTo(contextMenu.message); closeContextMenu(); }} activeOpacity={0.7}>
                    <Ionicons name="arrow-undo-outline" size={22} color={T.text} />
                    <Text style={styles.sheetItemText}>Reply</Text>
                  </TouchableOpacity>

                  {contextMenu.isOwn && !contextMenu.message._pending && contextMenu.message.content && (
                    <TouchableOpacity style={styles.sheetItem} onPress={() => { setEditingMessage(contextMenu.message); setText(contextMenu.message.content || ''); closeContextMenu(); }} activeOpacity={0.7}>
                      <Ionicons name="pencil-outline" size={22} color={T.text} />
                      <Text style={styles.sheetItemText}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  {contextMenu.isOwn && !contextMenu.message._pending && (
                    <TouchableOpacity style={styles.sheetItem} onPress={() => setUnsendConfirm(true)} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={22} color={T.error} />
                      <Text style={[styles.sheetItemText, { color: T.error }]}>Unsend</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.sheetConfirm}>
                    <Text style={styles.sheetConfirmTitle}>Unsend this message?</Text>
                    <Text style={styles.sheetConfirmSub}>This will be removed for everyone.</Text>
                  </View>
                  <TouchableOpacity style={styles.sheetItem} onPress={() => { unsendMessage(conversationId, contextMenu.message.id); closeContextMenu(); }} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={22} color={T.error} />
                    <Text style={[styles.sheetItemText, { color: T.error }]}>Confirm unsend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sheetItem} onPress={() => setUnsendConfirm(false)} activeOpacity={0.7}>
                    <Ionicons name="arrow-back-outline" size={22} color={T.text} />
                    <Text style={styles.sheetItemText}>Back</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.sheetDivider} />
              <TouchableOpacity style={styles.sheetItem} onPress={closeContextMenu} activeOpacity={0.7}>
                <Ionicons name="close-outline" size={22} color={T.textSub} />
                <Text style={[styles.sheetItemText, { color: T.textSub }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    container: { flex: 1, backgroundColor: T.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.borderLight,
      gap: 10,
    },
    backBtn: { padding: 4 },
    headerCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerNames: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '700', color: T.text },
    headerHandle: { fontSize: 13, color: T.textSub, marginTop: 1 },
    headerRight: { width: 32 },

    messageList: { paddingVertical: 12, paddingBottom: 4 },

    dateSep: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      paddingHorizontal: 16,
      gap: 10,
    },
    dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.border },
    dateLabel: { fontSize: 12, color: T.accent, fontWeight: '700' },

    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyText: { color: T.textMuted, fontSize: 15 },
    loadOlderBtn: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, marginTop: 8, marginBottom: 4 },
    loadOlderText: { color: T.accent, fontSize: 14, fontWeight: '600' },

    inputBar: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      backgroundColor: T.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: T.borderLight,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    replyPreviewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 10,
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
    editBar: { borderLeftColor: '#F59E0B' },
    editBarLabel: { fontSize: 12, fontWeight: '700', color: '#F59E0B', marginBottom: 2 },
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
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    attachBtn: {
      width: 36,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputWrap: {
      flex: 1,
      backgroundColor: T.inputBg,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      minHeight: 44,
      justifyContent: 'center',
    },
    input: {
      fontSize: 15,
      color: T.text,
      maxHeight: 110,
      padding: 0,
    },
    sendBtn: {
      backgroundColor: T.accent,
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: T.acc25,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 5,
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
      paddingBottom: Platform.OS === 'ios' ? 36 : 20,
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
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
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
