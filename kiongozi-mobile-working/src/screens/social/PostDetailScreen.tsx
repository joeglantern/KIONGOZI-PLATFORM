import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import apiClient from '../../utils/apiClient';

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId, focusReply } = route.params || {};

  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [postId]);

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

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#1a365d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            />
          ) : null
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.push('PostDetail', { postId: item.id })}
            onProfilePress={(username) => navigation.navigate('PublicProfile', { username })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.noReplies}>No replies yet. Start the conversation!</Text>
        }
      />
    </View>
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
});
