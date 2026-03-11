import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { useSocialStore, Post } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';

export default function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    bookmarkPosts, bookmarkCursor, bookmarkLoading,
    fetchBookmarks, deletePost,
  } = useSocialStore();

  useEffect(() => {
    fetchBookmarks(true);
  }, []);

  const handlePostPress = useCallback((post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  }, [navigation]);

  const handleProfilePress = useCallback((username: string) => {
    navigation.navigate('PublicProfile', { username });
  }, [navigation]);

  const handleHashtagPress = useCallback((tag: string) => {
    navigation.navigate('Explore', {
      screen: 'ExploreMain',
      params: { initialQuery: `#${tag}` },
    });
  }, [navigation]);

  const handleDeletePost = useCallback((postId: string) => {
    apiClient.deletePost(postId).then(() => deletePost(postId)).catch(() => {});
  }, [deletePost]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={() => handlePostPress(item)}
      onProfilePress={handleProfilePress}
      onReplyPress={() => navigation.navigate('PostDetail', { postId: item.id, focusReply: true })}
      onMentionPress={(username) => navigation.navigate('PublicProfile', { username })}
      onHashtagPress={handleHashtagPress}
      currentUserId={user?.id}
      onDeletePress={() => handleDeletePost(item.id)}
    />
  ), [handlePostPress, handleProfilePress, handleHashtagPress, user?.id, handleDeletePost]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarks</Text>
      </View>

      <FlatList
        data={bookmarkPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={() => { if (bookmarkCursor) fetchBookmarks(false); }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          bookmarkLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={48} color="#cbd5e0" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No bookmarks yet.</Text>
              <Text style={styles.emptySubtext}>Tap the bookmark icon on any post.</Text>
            </View>
          )
        }
        ListFooterComponent={
          bookmarkLoading && bookmarkPosts.length > 0 ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#1a365d" />
          ) : null
        }
      />
    </View>
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
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#a0aec0', textAlign: 'center' },
});
