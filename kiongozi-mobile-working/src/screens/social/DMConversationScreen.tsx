import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Image,
  TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DMBubble } from '../../components/social/DMBubble';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useDMStore, DMMessage } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';

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
  const { messages, fetchMessages, appendMessage, replaceMessage, removeMessage, markRead } = useDMStore();

  const [text, setText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const conversationMessages = messages[conversationId] || [];

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
            appendMessage(conversationId, payload.new as any);
            apiClient.markDMRead(conversationId);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id]);

  const handleSend = useCallback(async () => {
    if (!text.trim() && !mediaUri) return;
    const content = text.trim();
    const attachedUri = mediaUri;
    setText('');
    setMediaUri(null);

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
    } as DMMessage);
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

      const res = await apiClient.sendDM(conversationId, content, uploadedUrl, uploadedUrl ? 'image' : undefined);
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
    return (
      <DMBubble
        message={item.message}
        isOwn={isOwn}
        isFirst={item.isFirst}
        isLast={item.isLast}
        avatarUrl={participantAvatar}
      />
    );
  }, [user?.id, participantAvatar]);

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
            <Ionicons name="arrow-back" size={24} color="#1a202c" />
          </TouchableOpacity>

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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={40} color="#e2e8f0" />
              <Text style={styles.emptyText}>Start the conversation</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          {/* Image attachment preview */}
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
              <Ionicons name="image-outline" size={22} color={uploading ? '#a0aec0' : '#1a365d'} />
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
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
  headerName: { fontSize: 16, fontWeight: '700', color: '#1a202c' },
  headerHandle: { fontSize: 13, color: '#718096', marginTop: 1 },
  headerRight: { width: 32 },

  messageList: { paddingVertical: 12, paddingBottom: 4 },

  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#e2e8f0' },
  dateLabel: { fontSize: 12, color: '#a0aec0', fontWeight: '500' },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#a0aec0', fontSize: 15 },

  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 6,
  },
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
    backgroundColor: '#f4f6f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#1a202c',
    maxHeight: 110,
    padding: 0,
  },
  sendBtn: {
    backgroundColor: '#1a365d',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1a365d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
});
