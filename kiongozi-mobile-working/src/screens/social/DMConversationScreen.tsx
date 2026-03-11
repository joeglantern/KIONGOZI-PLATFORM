import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DMBubble } from '../../components/social/DMBubble';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';

export default function DMConversationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversationId, participantName } = route.params || {};
  const { user } = useAuthStore();
  const { messages, fetchMessages, appendMessage, replaceMessage, removeMessage, markRead } = useDMStore();

  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversationMessages = messages[conversationId] || [];

  useEffect(() => {
    fetchMessages(conversationId, true);
    markRead(conversationId);
    apiClient.markDMRead(conversationId);
  }, [conversationId]);

  // Realtime: append incoming messages from the other participant
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`dm-conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new && payload.new.sender_id !== user.id) {
            appendMessage(conversationId, payload.new as any);
            apiClient.markDMRead(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');

    // Optimistic: show message immediately with pending state
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user!.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    appendMessage(conversationId, tempMsg as any);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await apiClient.sendDM(conversationId, content);
      if (res.success && res.data) {
        replaceMessage(conversationId, tempId, res.data);
      } else {
        removeMessage(conversationId, tempId);
        setText(content); // restore
      }
    } catch {
      removeMessage(conversationId, tempId);
      setText(content);
    }
  }, [text, conversationId, user, appendMessage, replaceMessage, removeMessage]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{participantName || 'Message'}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <DMBubble
            message={item}
            isOwn={item.sender_id === user?.id}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Start the conversation!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#a0aec0"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  messageList: { padding: 12, paddingBottom: 8 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#a0aec0' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1a202c',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#1a365d',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#a0aec0' },
});
