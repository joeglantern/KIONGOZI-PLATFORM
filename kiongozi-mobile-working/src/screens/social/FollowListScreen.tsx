import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import apiClient from '../../utils/apiClient';
import { useTheme, AppTheme } from '../../hooks/useTheme';

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
  const insets = useSafeAreaInsets();
  const { userId, username, initialTab = 'followers', isOwnProfile = false } = route.params || {};

  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  // Track optimistic follow state for the following list (only used when isOwnProfile)
  const [followingState, setFollowingState] = useState<Map<string, boolean>>(new Map());
  const scrollX = useRef(new Animated.Value(initialTab === 'followers' ? 0 : SCREEN_WIDTH)).current;
  const scrollRef = useRef<ScrollView>(null);
  const activeTab = useRef<Tab>(initialTab === 'following' ? 'following' : 'followers');

  const fetchFollowers = useCallback(async () => {
    setLoadingFollowers(true);
    try {
      const res = await apiClient.getFollowers(userId);
      if (res.success && res.data) setFollowers(res.data as FollowUser[]);
    } catch {}
    setLoadingFollowers(false);
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    setLoadingFollowing(true);
    try {
      const res = await apiClient.getFollowing(userId);
      if (res.success && res.data) {
        const list = res.data as FollowUser[];
        setFollowing(list);
        // Seed all as followed (they're in the following list)
        const map = new Map<string, boolean>();
        list.forEach(u => map.set(u.id, true));
        setFollowingState(map);
      }
    } catch {}
    setLoadingFollowing(false);
  }, [userId]);

  const handleToggleFollow = useCallback(async (targetUserId: string) => {
    const currentlyFollowing = followingState.get(targetUserId) ?? true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Optimistic toggle
    setFollowingState(prev => new Map(prev).set(targetUserId, !currentlyFollowing));
    try {
      if (currentlyFollowing) {
        await apiClient.unfollowUser(targetUserId);
      } else {
        await apiClient.followUser(targetUserId);
      }
    } catch {
      // Revert on error
      setFollowingState(prev => new Map(prev).set(targetUserId, currentlyFollowing));
    }
  }, [followingState]);

  useEffect(() => {
    fetchFollowers();
    fetchFollowing();
    // Scroll to initialTab without animation on mount
    if (initialTab === 'following') {
      setTimeout(() => scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false }), 0);
    }
  }, [userId]);

  const switchTab = (tab: Tab) => {
    if (activeTab.current !== tab) Haptics.selectionAsync().catch(() => {});
    activeTab.current = tab;
    scrollRef.current?.scrollTo({ x: tab === 'followers' ? 0 : SCREEN_WIDTH, animated: true });
  };

  const underlineLeft = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0, SCREEN_WIDTH / 2],
    extrapolate: 'clamp',
  });
  const followersColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [T.text, T.textMuted],
    extrapolate: 'clamp',
  });
  const followingColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [T.textMuted, T.text],
    extrapolate: 'clamp',
  });

  const openProfile = (u: FollowUser) => navigation.navigate('PublicProfile', { username: u.username });

  const renderIdentity = (item: FollowUser) => (
    <>
      <UserAvatar avatarUrl={item.avatar_url} size={44} isVerified={item.is_verified} />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.fullName} numberOfLines={1}>{item.full_name || item.username}</Text>
          {item.is_verified && <VerifiedBadge size={14} />}
        </View>
        <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
      </View>
    </>
  );

  const renderFollower = ({ item }: { item: FollowUser }) => (
    <Pressable
      style={({ pressed }) => [styles.userRow, pressed && { backgroundColor: T.surface }]}
      onPress={() => openProfile(item)}
    >
      {renderIdentity(item)}
    </Pressable>
  );

  const renderFollowing = ({ item }: { item: FollowUser }) => {
    const isFollowed = followingState.get(item.id) ?? true;
    return (
      <Pressable
        style={({ pressed }) => [styles.userRow, pressed && { backgroundColor: T.surface }]}
        onPress={() => openProfile(item)}
      >
        {renderIdentity(item)}
        {isOwnProfile && (
          <Pressable
            onPress={() => handleToggleFollow(item.id)}
            hitSlop={6}
            style={({ pressed }) => [
              styles.pill,
              isFollowed ? styles.pillSecondary : styles.pillPrimary,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.pillText, { color: isFollowed ? T.text : T.bg }]}>
              {isFollowed ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderPage = (
    loading: boolean,
    data: FollowUser[],
    renderItem: ({ item }: { item: FollowUser }) => React.ReactElement,
    prefix: string,
    empty: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string },
  ) => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
      {loading && data.length === 0 ? (
        <PeopleSkeleton T={T} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => `${prefix}_${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={empty.icon} size={28} color={T.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              <Text style={styles.emptySub}>{empty.sub}</Text>
            </View>
          }
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{username ? `@${username}` : 'Connections'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable style={styles.tab} onPress={() => switchTab('followers')} accessibilityRole="tab">
          <Animated.Text style={[styles.tabText, { color: followersColor }]}>Followers</Animated.Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => switchTab('following')} accessibilityRole="tab">
          <Animated.Text style={[styles.tabText, { color: followingColor }]}>Following</Animated.Text>
        </Pressable>
        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: underlineLeft }] }]} />
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
        onMomentumScrollEnd={e => {
          const tab: Tab = e.nativeEvent.contentOffset.x >= SCREEN_WIDTH / 2 ? 'following' : 'followers';
          if (tab !== activeTab.current) Haptics.selectionAsync().catch(() => {});
          activeTab.current = tab;
        }}
        style={{ flex: 1 }}
      >
        {renderPage(loadingFollowers, followers, renderFollower, 'f', {
          icon: 'people-outline',
          title: 'No followers yet',
          sub: isOwnProfile ? 'When people follow you, they’ll show up here.' : 'When people follow this account, they’ll show up here.',
        })}
        {renderPage(loadingFollowing, following, renderFollowing, 'g', {
          icon: 'person-add-outline',
          title: 'Not following anyone yet',
          sub: isOwnProfile ? 'Accounts you follow will show up here.' : 'Accounts they follow will show up here.',
        })}
      </ScrollView>
    </View>
  );
}

function PeopleSkeleton({ T }: { T: AppTheme }) {
  return (
    <View style={{ paddingTop: 8 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: `${45 + ((i * 17) % 30)}%`, height: 12, borderRadius: 6, backgroundColor: T.surface2 }} />
            <View style={{ width: '30%', height: 10, borderRadius: 5, backgroundColor: T.surface2 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, backgroundColor: T.bg,
    },
    backBtn: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1, textAlign: 'center', fontSize: 17,
      fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text,
    },
    tabs: {
      flexDirection: 'row',
      height: 44,
      backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.border,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },
    tabIndicator: {
      position: 'absolute',
      left: 0,
      bottom: -StyleSheet.hairlineWidth,
      width: SCREEN_WIDTH / 2,
      height: 2,
      backgroundColor: T.text,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    userInfo: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    fullName: { fontSize: 15, fontWeight: '700', color: T.text, flexShrink: 1 },
    handle: { fontSize: 14, color: T.textMuted, marginTop: 1 },
    pill: {
      height: 32, borderRadius: 16, paddingHorizontal: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    pillPrimary: { backgroundColor: T.text },
    pillSecondary: { borderWidth: 1, borderColor: T.border },
    pillText: { fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 40 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  });
}
