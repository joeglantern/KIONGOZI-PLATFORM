import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlatList } from 'react-native';
import { useSocialStore, Post } from '../../stores/socialStore';
import { PostCard } from '../../components/social/PostCard';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    feedPosts, feedLoading, feedRefreshing,
    fetchFeed, prependPost
  } = useSocialStore();

  useEffect(() => {
    fetchFeed(true);
  }, []);

  // Supabase Realtime subscription for new posts from followed users
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public-feed-realtime')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload: any) => {
          // Only prepend if it's not our own post (already added optimistically)
          if (payload.new?.user_id !== user.id) {
            prependPost(payload.new as Post);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handlePostPress = useCallback((post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  }, [navigation]);

  const handleProfilePress = useCallback((username: string) => {
    navigation.navigate('PublicProfile', { username });
  }, [navigation]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={() => handlePostPress(item)}
      onProfilePress={handleProfilePress}
      onReplyPress={() => navigation.navigate('PostDetail', { postId: item.id, focusReply: true })}
      onMentionPress={(username) => navigation.navigate('PublicProfile', { username })}
    />
  ), [handlePostPress, handleProfilePress]);

  const { feedCursor } = useSocialStore();

  const handleLoadMore = useCallback(() => {
    if (feedCursor) fetchFeed(false);
  }, [fetchFeed, feedCursor]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>

      <FlatList
        data={feedPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={feedRefreshing}
            onRefresh={() => fetchFeed(true)}
            tintColor="#1a365d"
          />
        }
        ListEmptyComponent={
          feedLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Your feed is empty.</Text>
              <Text style={styles.emptySubtext}>Follow people to see their posts here.</Text>
            </View>
          )
        }
        ListFooterComponent={
          feedLoading && feedPosts.length > 0 ? (
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
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#a0aec0', textAlign: 'center' },
});
