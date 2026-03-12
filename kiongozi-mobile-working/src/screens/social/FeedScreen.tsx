import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Animated, ScrollView, Dimensions
} from 'react-native';
import { FlatList } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useSocialStore, Post } from '../../stores/socialStore';
import { useDMStore } from '../../stores/dmStore';
import { PostCard } from '../../components/social/PostCard';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { EditPostModal } from '../../components/social/EditPostModal';
import { Ionicons } from '@expo/vector-icons';

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { conversations, fetchConversations } = useDMStore();
  const scrollX = useRef(new Animated.Value(0)).current;

  // Total unread DM count across all conversations
  const unreadDMs = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const scrollRef = useRef<ScrollView>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [forYouError, setForYouError] = useState<string | null>(null);

  const {
    feedPosts, feedLoading, feedRefreshing, feedCursor,
    forYouPosts, forYouLoading, forYouRefreshing, hasMoreForYou,
    fetchFeed, fetchForYouFeed, prependPost, deletePost,
  } = useSocialStore();

  useEffect(() => {
    fetchForYouFeed(true).catch(() => setForYouError('Failed to load. Check your connection.'));
    fetchFeed(true).catch(() => setFeedError('Failed to load. Check your connection.'));
    fetchConversations().catch(() => {});
  }, []);

  // Supabase Realtime subscription — fetch full post on INSERT to get profiles/media
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public-feed-realtime')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload: any) => {
          if (payload.new?.user_id !== user.id) {
            try {
              const res = await apiClient.getPost(payload.new.id);
              if (res.success && res.data) {
                prependPost(res.data as Post);
              }
            } catch {}
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const switchTab = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handlePostPress = useCallback((post: Post) => {
    const targetId = (post.repost_of_id && post.repost_of?.id) ? post.repost_of.id : post.id;
    navigation.navigate('PostDetail', { postId: targetId });
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

  const handleEditPress = useCallback((postId: string, content: string, visibility: 'public' | 'followers') => {
    setEditTarget({ id: postId, content, visibility });
  }, []);

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
      onEditPress={handleEditPress}
    />
  ), [handlePostPress, handleProfilePress, handleHashtagPress, user?.id, handleDeletePost]);

  // Underline tracks scroll position in real time
  const underlineLeft = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: ['0%', '50%'],
    extrapolate: 'clamp',
  });

  // Active tab label colour tracks scroll
  const forYouColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: ['#1a202c', '#a0aec0'],
    extrapolate: 'clamp',
  });
  const followingColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: ['#a0aec0', '#1a202c'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Title row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity
            style={styles.dmBtn}
            onPress={() => navigation.navigate('DMList')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#1a202c" />
            {unreadDMs > 0 && (
              <View style={styles.dmBadge}>
                <Text style={styles.dmBadgeText}>
                  {unreadDMs > 99 ? '99+' : String(unreadDMs)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab} onPress={() => switchTab(0)}>
            <Animated.Text style={[styles.tabLabel, { color: forYouColor }]}>For You</Animated.Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => switchTab(1)}>
            <Animated.Text style={[styles.tabLabel, { color: followingColor }]}>Following</Animated.Text>
          </TouchableOpacity>
          <Animated.View style={[styles.tabUnderline, { left: underlineLeft, width: '50%' }]} />
        </View>
      </View>

      {/* Paged content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        style={{ flex: 1 }}
      >
        {/* For You */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <FlatList
            data={forYouPosts}
            renderItem={renderPost}
            keyExtractor={(item) => `fy_${item.id}`}
            onEndReached={() => { if (hasMoreForYou) fetchForYouFeed(false); }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={forYouRefreshing} onRefresh={() => { setForYouError(null); fetchForYouFeed(true).catch(() => setForYouError('Failed to load. Check your connection.')); }} tintColor="#1a365d" />
            }
            ListEmptyComponent={
              forYouLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
              ) : forYouError ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{forYouError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => { setForYouError(null); fetchForYouFeed(true).catch(() => setForYouError('Failed to load. Check your connection.')); }}>
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No posts yet.</Text>
                  <Text style={styles.emptySubtext}>Check back soon for personalized content.</Text>
                </View>
              )
            }
            ListFooterComponent={
              forYouLoading && forYouPosts.length > 0
                ? <ActivityIndicator style={{ marginVertical: 16 }} color="#1a365d" />
                : null
            }
          />
        </View>

        {/* Following */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <FlatList
            data={feedPosts}
            renderItem={renderPost}
            keyExtractor={(item) => `fw_${item.id}`}
            onEndReached={() => { if (feedCursor) fetchFeed(false); }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={feedRefreshing} onRefresh={() => { setFeedError(null); fetchFeed(true).catch(() => setFeedError('Failed to load. Check your connection.')); }} tintColor="#1a365d" />
            }
            ListEmptyComponent={
              feedLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
              ) : feedError ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{feedError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => { setFeedError(null); fetchFeed(true).catch(() => setFeedError('Failed to load. Check your connection.')); }}>
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Your feed is empty.</Text>
                  <Text style={styles.emptySubtext}>Follow people to see their posts here.</Text>
                </View>
              )
            }
            ListFooterComponent={
              feedLoading && feedPosts.length > 0
                ? <ActivityIndicator style={{ marginVertical: 16 }} color="#1a365d" />
                : null
            }
          />
        </View>
      </ScrollView>
      {editTarget && (
        <EditPostModal
          visible
          postId={editTarget.id}
          initialContent={editTarget.content}
          initialVisibility={editTarget.visibility}
          onClose={() => setEditTarget(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  dmBtn: {
    position: 'relative',
    padding: 4,
  },
  dmBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e53e3e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  dmBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  tabs: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a0aec0',
  },
  tabLabelActive: {
    color: '#1a202c',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#1a365d',
    borderRadius: 2,
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#4a5568', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#a0aec0', textAlign: 'center' },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1a365d', borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
