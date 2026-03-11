import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, Animated, Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';

const SCREEN_WIDTH = Dimensions.get('window').width;
type Tab = 'followers' | 'following';

interface FollowUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
}

export default function FollowListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, username, initialTab = 'followers' } = route.params || {};

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const scrollX = useRef(new Animated.Value(initialTab === 'followers' ? 0 : SCREEN_WIDTH)).current;
  const scrollRef = useRef<ScrollView>(null);

  const fetchFollowers = useCallback(async () => {
    if (loadingFollowers) return;
    setLoadingFollowers(true);
    try {
      const res = await apiClient.getFollowers(userId);
      if (res.success && res.data) setFollowers(res.data);
    } catch {}
    setLoadingFollowers(false);
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    if (loadingFollowing) return;
    setLoadingFollowing(true);
    try {
      const res = await apiClient.getFollowing(userId);
      if (res.success && res.data) setFollowing(res.data);
    } catch {}
    setLoadingFollowing(false);
  }, [userId]);

  useEffect(() => {
    fetchFollowers();
    fetchFollowing();
    // Scroll to initialTab without animation on mount
    if (initialTab === 'following') {
      setTimeout(() => scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false }), 0);
    }
  }, [userId]);

  const switchTab = (tab: Tab) => {
    scrollRef.current?.scrollTo({ x: tab === 'followers' ? 0 : SCREEN_WIDTH, animated: true });
  };

  const underlineLeft = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: ['0%', '50%'],
    extrapolate: 'clamp',
  });
  const followersColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: ['#1a365d', '#a0aec0'],
    extrapolate: 'clamp',
  });
  const followingColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: ['#a0aec0', '#1a365d'],
    extrapolate: 'clamp',
  });

  const renderUser = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
      activeOpacity={0.7}
    >
      <UserAvatar avatarUrl={item.avatar_url} size={46} isVerified={item.is_verified} />
      <View style={styles.userInfo}>
        <Text style={styles.fullName} numberOfLines={1}>{item.full_name}</Text>
        <Text style={styles.handle}>@{item.username}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{username}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab} onPress={() => switchTab('followers')}>
          <Animated.Text style={[styles.tabText, { color: followersColor }]}>Followers</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => switchTab('following')}>
          <Animated.Text style={[styles.tabText, { color: followingColor }]}>Following</Animated.Text>
        </TouchableOpacity>
        <Animated.View style={[styles.tabIndicator, { left: underlineLeft }]} />
      </View>

      {/* Paged lists */}
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
        {/* Followers page */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          {loadingFollowers && followers.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
          ) : (
            <FlatList
              data={followers}
              keyExtractor={item => `f_${item.id}`}
              renderItem={renderUser}
              ListEmptyComponent={
                <View style={styles.empty}><Text style={styles.emptyText}>No followers yet</Text></View>
              }
            />
          )}
        </View>

        {/* Following page */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          {loadingFollowing && following.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
          ) : (
            <FlatList
              data={following}
              keyExtractor={item => `g_${item.id}`}
              renderItem={renderUser}
              ListEmptyComponent={
                <View style={styles.empty}><Text style={styles.emptyText}>Not following anyone yet</Text></View>
              }
            />
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: { fontSize: 15, fontWeight: '600' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: 2,
    backgroundColor: '#1a365d',
    borderRadius: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  userInfo: { flex: 1 },
  fullName: { fontSize: 15, fontWeight: '700', color: '#1a202c' },
  handle: { fontSize: 13, color: '#718096', marginTop: 1 },
  bio: { fontSize: 13, color: '#4a5568', marginTop: 2 },
  empty: { alignItems: 'center', padding: 48 },
  emptyText: { color: '#a0aec0', fontSize: 15 },
});
