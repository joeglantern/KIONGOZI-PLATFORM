import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Animated
} from 'react-native';
import { FlatList } from 'react-native';
import { useSocialStore, Post } from '../../stores/socialStore';
import { PostCard } from '../../components/social/PostCard';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';

type FeedTab = 'for-you' | 'following';

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const {
    feedPosts, feedLoading, feedRefreshing, feedCursor,
    forYouPosts, forYouLoading, forYouRefreshing, hasMoreForYou,
    fetchFeed, fetchForYouFeed, prependPost, deletePost,
  } = useSocialStore();

  useEffect(() => {
    fetchForYouFeed(true);
    fetchFeed(true);
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

  const switchTab = (tab: FeedTab) => {
    setActiveTab(tab);
    Animated.timing(underlineAnim, {
      toValue: tab === 'for-you' ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

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

  // Sliding underline position
  const tabWidth = 50; // percent
  const underlineLeft = underlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab} onPress={() => switchTab('for-you')}>
            <Text style={[styles.tabLabel, activeTab === 'for-you' && styles.tabLabelActive]}>
              For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => switchTab('following')}>
            <Text style={[styles.tabLabel, activeTab === 'following' && styles.tabLabelActive]}>
              Following
            </Text>
          </TouchableOpacity>
          <Animated.View style={[styles.tabUnderline, { left: underlineLeft, width: `${tabWidth}%` }]} />
        </View>
      </View>

      {/* For You FlatList */}
      <View style={{ flex: 1, display: activeTab === 'for-you' ? 'flex' : 'none' }}>
        <FlatList
          data={forYouPosts}
          renderItem={renderPost}
          keyExtractor={(item) => `fy_${item.id}`}
          onEndReached={() => { if (hasMoreForYou) fetchForYouFeed(false); }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={forYouRefreshing}
              onRefresh={() => fetchForYouFeed(true)}
              tintColor="#1a365d"
            />
          }
          ListEmptyComponent={
            forYouLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No posts yet.</Text>
                <Text style={styles.emptySubtext}>Check back soon for personalized content.</Text>
              </View>
            )
          }
          ListFooterComponent={
            forYouLoading && forYouPosts.length > 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color="#1a365d" />
            ) : null
          }
        />
      </View>

      {/* Following FlatList */}
      <View style={{ flex: 1, display: activeTab === 'following' ? 'flex' : 'none' }}>
        <FlatList
          data={feedPosts}
          renderItem={renderPost}
          keyExtractor={(item) => `fw_${item.id}`}
          onEndReached={() => { if (feedCursor) fetchFeed(false); }}
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c', marginBottom: 8 },
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
  emptyText: { fontSize: 17, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#a0aec0', textAlign: 'center' },
});
