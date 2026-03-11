import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId, focusReply } = route.params || {};
  const { user } = useAuthStore();
  const { deletePost } = useSocialStore();

  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const replyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  // Auto-focus reply input when focusReply=true
  useEffect(() => {
    if (focusReply) {
      setTimeout(() => replyInputRef.current?.focus(), 300);
    }
  }, []);

  const loadPost = async () => {
    setLoading(true);
    try {
      const [postRes, repliesRes] = await Promise.all([
        apiClient.getPost(postId),
        apiClient.getPostReplies(postId)
      ]);
      if (postRes.success) setPost(postRes.data);
      if (repliesRes.success) setReplies(repliesRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiClient.replyToPost(postId, replyText.trim());
      if (res.success) {
        setReplyText('');
        loadPost();
      }
    } catch {}
    setSending(false);
  }, [replyText, sending, postId]);

  const handleDeletePost = useCallback((pid: string) => {
    apiClient.deletePost(pid).then(() => {
      deletePost(pid);
      if (pid === postId) navigation.goBack();
      else loadPost();
    }).catch(() => {});
  }, [deletePost, postId, navigation]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      <FlatList
        data={replies}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          post ? (
            <PostCard
              post={post}
              onProfilePress={(username) => navigation.navigate('PublicProfile', { username })}
              onMentionPress={(username) => navigation.navigate('PublicProfile', { username })}
              onHashtagPress={(tag) => navigation.navigate('Explore', {
                screen: 'ExploreMain',
                params: { initialQuery: `#${tag}` },
              })}
              currentUserId={user?.id}
              onDeletePress={() => handleDeletePost(post.id)}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.push('PostDetail', { postId: item.id })}
            onProfilePress={(username) => navigation.navigate('PublicProfile', { username })}
            currentUserId={user?.id}
            onDeletePress={() => handleDeletePost(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.noReplies}>No replies yet. Start the conversation!</Text>
        }
      />

      {/* Reply compose bar */}
      <View style={styles.replyBar}>
        <TextInput
          ref={replyInputRef}
          style={styles.replyInput}
          placeholder="Write a reply..."
          placeholderTextColor="#a0aec0"
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={280}
          returnKeyType="default"
        />
        <TouchableOpacity
          onPress={handleSendReply}
          disabled={!replyText.trim() || sending}
          style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a202c' },
  noReplies: { padding: 24, textAlign: 'center', color: '#a0aec0' },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  replyInput: {
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
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#a0aec0' },
});
