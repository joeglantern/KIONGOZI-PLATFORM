import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { EditPostModal } from '../../components/social/EditPostModal';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId, focusReply } = route.params || {};
  const { user } = useAuthStore();
  const { deletePost } = useSocialStore();

  const [post, setPost]           = useState<any>(null);
  const [replies, setReplies]     = useState<any[]>([]);
  const [ancestors, setAncestors] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [replyText, setReplyText]  = useState('');
  const [sending, setSending]      = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const replyInputRef = useRef<TextInput>(null);
  const sendScale = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const hasText = replyText.trim().length > 0;
  useEffect(() => {
    Animated.spring(sendScale, { toValue: hasText ? 1 : 0, useNativeDriver: true, damping: 14, stiffness: 180 }).start();
  }, [hasText]);

  useEffect(() => { loadPost(); }, [postId]);

  useEffect(() => {
    if (focusReply) setTimeout(() => replyInputRef.current?.focus(), 300);
  }, []);

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const [postRes, repliesRes, ancestorsRes] = await Promise.all([
        apiClient.getPost(postId),
        apiClient.getPostReplies(postId),
        apiClient.getPostAncestors(postId),
      ]);
      if (postRes.success) setPost(postRes.data);
      else setError('Post not found');
      if (repliesRes.success) setReplies(repliesRes.data || []);
      if (ancestorsRes.success) setAncestors(ancestorsRes.data || []);
    } catch (e: any) {
      setError(e?.message?.includes('Network') ? 'Network error — check your connection' : 'Failed to load post');
    }
    setLoading(false);
  };

  // Realtime: append new replies as they arrive
  useEffect(() => {
    if (!postId) return;
    const repliesChannel = supabase
      .channel(`replies-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `parent_post_id=eq.${postId}` },
        async (payload) => {
          if (payload.new?.user_id === user?.id) return; // own reply already added optimistically
          try {
            const res = await apiClient.getPost(payload.new.id);
            if (res.success && res.data) {
              setReplies(prev => [...prev, res.data]);
            }
          } catch {}
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(repliesChannel); };
  }, [postId, user?.id]);

  // Realtime: update like count when others like/unlike this post
  useEffect(() => {
    if (!postId) return;
    const likesChannel = supabase
      .channel(`likes-${postId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        () => {
          setPost(p => p ? { ...p, like_count: p.like_count + 1 } : p);
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        () => {
          setPost(p => p ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(likesChannel); };
  }, [postId]);

  // Build flat thread array: ancestors → main post → replies
  const threadItems = useMemo(() => [
    ...ancestors.map(a  => ({ ...a, _role: 'ancestor' as const })),
    ...(post ? [{ ...post, _role: 'main' as const }] : []),
    ...replies.map(r => ({ ...r, _role: 'reply'  as const })),
  ], [ancestors, post, replies]);

  // After load, scroll so the focused (main) post is at the top when ancestors exist
  useEffect(() => {
    if (!loading && ancestors.length > 0 && threadItems.length > 0) {
      const mainIndex = ancestors.length;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: mainIndex, animated: false });
      }, 150);
    }
  }, [loading]);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    const content = replyText.trim();
    setReplyText('');

    // Optimistic
    const tempReply = {
      id: `temp_${Date.now()}`,
      user_id: user?.id,
      content,
      created_at: new Date().toISOString(),
      like_count: 0, comment_count: 0, repost_count: 0, view_count: 0,
      is_bot_reply: false, visibility: 'public', parent_post_id: postId,
      profiles: post?.profiles,
      _pending: true,
    };
    setReplies(prev => [...prev, tempReply]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const res = await apiClient.replyToPost(postId, content);
      if (res.success && res.data) {
        setReplies(prev => prev.map(r => r.id === tempReply.id ? res.data : r));
      } else {
        setReplies(prev => prev.filter(r => r.id !== tempReply.id));
        setReplyText(content);
      }
    } catch {
      setReplies(prev => prev.filter(r => r.id !== tempReply.id));
      setReplyText(content);
      Alert.alert('Failed to send', 'Your reply could not be sent. Please try again.');
    }
    setSending(false);
  }, [replyText, sending, postId, user, post]);

  const handleDeletePost = useCallback((pid: string) => {
    apiClient.deletePost(pid).then(() => {
      deletePost(pid);
      if (pid === postId) navigation.goBack();
      else setReplies(prev => prev.filter(r => r.id !== pid));
    }).catch(() => {});
  }, [deletePost, postId, navigation]);

  const handleEditPress = useCallback((pid: string, content: string, visibility: 'public' | 'followers') => {
    setEditTarget({ id: pid, content, visibility });
  }, []);

  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    loadPost();
  }, [loadPost]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1a365d" /></View>;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1a202c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#e2e8f0" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPost}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const parentAuthor = post?.profiles?.username;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1a202c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={threadItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isAncestor = item._role === 'ancestor';
            const isMain     = item._role === 'main';
            const isReply    = item._role === 'reply';
            const hasConnectorBelow = isAncestor || (isMain && replies.length > 0);

            return (
              <PostCard
                post={item}
                hasConnectorBelow={hasConnectorBelow}
                style={isAncestor ? { opacity: 0.72 } : undefined}
                onPress={isReply ? () => navigation.push('PostDetail', { postId: item.id }) : undefined}
                onProfilePress={(u) => navigation.navigate('PublicProfile', { username: u })}
                onMentionPress={(u) => navigation.navigate('PublicProfile', { username: u })}
                onHashtagPress={(tag) => navigation.navigate('Explore', {
                  screen: 'ExploreMain', params: { initialQuery: `#${tag}` }
                })}
                currentUserId={user?.id}
                onDeletePress={() => handleDeletePost(item.id)}
                onEditPress={handleEditPress}
              />
            );
          }}
          ListEmptyComponent={
            !loading ? <Text style={styles.noReplies}>No replies yet — be the first!</Text> : null
          }
          onScrollToIndexFailed={() => {}}
          contentContainerStyle={{ paddingBottom: 8 }}
        />

        {/* Reply compose bar */}
        <View style={styles.replyBar}>
          <View style={styles.replyInputWrap}>
            <TextInput
              ref={replyInputRef}
              style={styles.replyInput}
              placeholder={`Reply to @${parentAuthor || 'post'}…`}
              placeholderTextColor="#b0bec5"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={280}
            />
          </View>
          <Animated.View style={{ transform: [{ scale: sendScale }], opacity: sendScale }}>
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!hasText || sending}
              style={styles.sendBtn}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 2 }} />}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {editTarget && (
        <EditPostModal
          visible
          postId={editTarget.id}
          initialContent={editTarget.content}
          initialVisibility={editTarget.visibility}
          onClose={handleEditSaved}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a202c' },
  errorText: { fontSize: 15, color: '#718096', textAlign: 'center' },
  retryBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1a365d', borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700' },
  noReplies: { padding: 28, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8edf3',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 6,
  },
  replyInputWrap: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 42,
    justifyContent: 'center',
  },
  replyInput: { fontSize: 15, color: '#1a202c', maxHeight: 100, padding: 0 },
  sendBtn: {
    backgroundColor: '#1a365d',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1a365d', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
  },
});
