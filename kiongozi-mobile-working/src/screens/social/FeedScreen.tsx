import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, ScrollView, Dimensions, Image, Modal, Animated, FlatList, Platform,
} from 'react-native';
import CreatePostScreen from './CreatePostScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useSocialStore, Post } from '../../stores/socialStore';
import { useDMStore } from '../../stores/dmStore';
import { PostCard } from '../../components/social/PostCard';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { EditPostModal } from '../../components/social/EditPostModal';
import ReportModal from './ReportModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { StoryRail, StoryStack } from '../../components/stories/StoryRail';
import { FeedSkeleton } from '../../components/social/Skeleton';
import { useStoryStore } from '../../stores/storyStore';

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { conversations, fetchConversations } = useDMStore();
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const unreadDMs = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const scrollRef = useRef<ScrollView>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string; displayName: string } | null>(null);
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('public-feed-realtime')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload: any) => {
        if (payload.new?.user_id !== user.id) {
          try {
            const res = await apiClient.getPost(payload.new.id);
            if (res.success && res.data) prependPost(res.data as Post);
          } catch {}
        }
      })
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
    navigation.navigate('Explore', { screen: 'ExploreMain', params: { initialQuery: `#${tag}` } });
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
      onReportPress={(postId) => setReportTarget({ type: 'post', id: postId, displayName: 'this post' })}
    />
  ), [handlePostPress, handleProfilePress, handleHashtagPress, user?.id, handleDeletePost]);

  const [activeTab, setActiveTab] = useState(0);

  // ── Folding header ──
  // The header floats over both feeds. Scrolling the first `railH` px folds the story rail
  // away under the logo bar (tabs ride up and stay pinned) while a mini avatar stack rises
  // into the bar. All driven on the native thread from the active list's scroll position.
  const [railH, setRailH] = useState(118);
  const [topH, setTopH] = useState(102);   // status bar + logo row
  const [tabsH, setTabsH] = useState(58);
  const headerH = topH + railH + tabsH;
  const scrollYs = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const offsets = useRef([0, 0]);
  const listRefs = useRef<(FlatList | null)[]>([null, null]);
  // The mini stack only takes taps once the rail has folded (it's invisible before that)
  const [folded, setFolded] = useState(false);
  const activeRef = useRef(0);
  const railRef = useRef(railH);
  railRef.current = railH;
  const checkFolded = (value: number) => {
    const f = value > railRef.current * 0.6;
    setFolded(prev => (prev === f ? prev : f));
  };
  useEffect(() => {
    const ids = scrollYs.map((v, i) => v.addListener(({ value }) => {
      offsets.current[i] = value;
      if (i === activeRef.current) checkFolded(value);
    }));
    return () => scrollYs.forEach((v, i) => v.removeListener(ids[i]));
  }, []);
  useEffect(() => { activeRef.current = activeTab; checkFolded(offsets.current[activeTab]); }, [activeTab]);

  const y = scrollYs[activeTab];
  const R = Math.max(1, railH);
  // iOS pull-to-refresh: the header follows the pull so the spinner shows above it
  const headerShift = y.interpolate({ inputRange: [-400, 0, R, R + 1], outputRange: [400, 0, -R, -R] });
  const barHold = y.interpolate({ inputRange: [0, R, R + 1], outputRange: [0, R, R], extrapolateLeft: 'clamp' });
  const fold = y.interpolate({ inputRange: [0, R], outputRange: ['0deg', '-72deg'], extrapolate: 'clamp' });
  const railScale = y.interpolate({ inputRange: [0, R], outputRange: [1, 0.82], extrapolate: 'clamp' });
  const railFade = y.interpolate({ inputRange: [0, R * 0.75], outputRange: [1, 0], extrapolate: 'clamp' });
  const stackIn = y.interpolate({ inputRange: [R * 0.55, R], outputRange: [0, 1], extrapolate: 'clamp' });
  const stackRise = y.interpolate({ inputRange: [R * 0.55, R], outputRange: [14, 0], extrapolate: 'clamp' });
  const stackScale = y.interpolate({ inputRange: [R * 0.55, R], outputRange: [0.6, 1], extrapolate: 'clamp' });

  const onScrollFor = (i: number) => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollYs[i] } } }],
    { useNativeDriver: true },
  );

  // Switching tabs keeps the header as it is: if it's folded, the other list is nudged
  // just past the fold so nothing jumps.
  const syncTab = (to: number) => {
    const from = 1 - to;
    const folded = offsets.current[from] >= railH;
    if (folded && offsets.current[to] < railH) listRefs.current[to]?.scrollToOffset({ offset: railH, animated: false });
    if (!folded && offsets.current[to] > 0 && offsets.current[from] < railH) {
      listRefs.current[to]?.scrollToOffset({ offset: Math.min(offsets.current[from], offsets.current[to]), animated: false });
    }
  };

  const switchTabWithState = (index: number) => {
    syncTab(index);
    setActiveTab(index);
    switchTab(index);
  };

  const refreshOffset = Platform.OS === 'android' ? headerH : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => syncTab(1 - activeTab)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveTab(idx);
        }}
        style={{ flex: 1 }}
      >
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <Animated.FlatList
            ref={(r: any) => { listRefs.current[0] = r; }}
            data={forYouPosts}
            renderItem={renderPost}
            keyExtractor={(item: Post) => `fy_${item.id}`}
            onScroll={onScrollFor(0)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingTop: headerH }}
            scrollIndicatorInsets={{ top: headerH }}
            onEndReached={() => { if (hasMoreForYou) fetchForYouFeed(false); }}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl progressViewOffset={refreshOffset} refreshing={forYouRefreshing} onRefresh={() => { setForYouError(null); useStoryStore.getState().fetchFeed(); fetchForYouFeed(true).catch(() => setForYouError('Failed to load. Check your connection.')); }} tintColor={T.accent} />}
            ListEmptyComponent={
              forYouLoading ? <FeedSkeleton /> :
              forYouError ? (
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
            ListFooterComponent={forYouLoading && forYouPosts.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color={T.accent} /> : null}
          />
        </View>

        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <Animated.FlatList
            ref={(r: any) => { listRefs.current[1] = r; }}
            data={feedPosts}
            renderItem={renderPost}
            keyExtractor={(item: Post) => `fw_${item.id}`}
            onScroll={onScrollFor(1)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingTop: headerH }}
            scrollIndicatorInsets={{ top: headerH }}
            onEndReached={() => { if (feedCursor) fetchFeed(false); }}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl progressViewOffset={refreshOffset} refreshing={feedRefreshing} onRefresh={() => { setFeedError(null); useStoryStore.getState().fetchFeed(); fetchFeed(true).catch(() => setFeedError('Failed to load. Check your connection.')); }} tintColor={T.accent} />}
            ListEmptyComponent={
              feedLoading ? <FeedSkeleton /> :
              feedError ? (
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
            ListFooterComponent={feedLoading && feedPosts.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color={T.accent} /> : null}
          />
        </View>
      </ScrollView>

      {/* Floating header: logo bar (stays), story rail (folds away), tabs (pin under the bar) */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerShift }] }]} pointerEvents="box-none">
        <Animated.View
          style={{ marginTop: topH, transform: [{ perspective: 900 }, { rotateX: fold }, { scale: railScale }], opacity: railFade }}
          onLayout={e => setRailH(Math.round(e.nativeEvent.layout.height))}
        >
          <StoryRail />
        </Animated.View>

        <View style={styles.tabs} onLayout={e => setTabsH(Math.round(e.nativeEvent.layout.height))}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 0 && styles.tabPillOn]}
            onPress={() => switchTabWithState(0)}
          >
            <Text style={[styles.tabLabel, activeTab === 0 ? styles.tabLabelOn : styles.tabLabelOff]}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 1 && styles.tabPillOn]}
            onPress={() => switchTabWithState(1)}
          >
            <Text style={[styles.tabLabel, activeTab === 1 ? styles.tabLabelOn : styles.tabLabelOff]}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Logo bar: drawn last so the folding rail slides underneath it */}
        <Animated.View
          style={[styles.topBar, { paddingTop: insets.top + 6, transform: [{ translateY: barHold }] }]}
          onLayout={e => setTopH(Math.round(e.nativeEvent.layout.height))}
        >
          <View style={styles.headerRow}>
            <Image source={require('../../../assets/kchat-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setCreatePostVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="add-outline" size={28} color={T.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('DMList')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={T.text} />
                {unreadDMs > 0 && (
                  <View style={[styles.iconBadge, { borderColor: T.bg }]}>
                    <Text style={styles.iconBadgeText}>{unreadDMs > 99 ? '99+' : String(unreadDMs)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* Mini story stack rises into the bar as the rail folds */}
          <Animated.View
            style={[styles.stackSlot, { top: insets.top + 6, opacity: stackIn, transform: [{ translateY: stackRise }, { scale: stackScale }] }]}
            pointerEvents={folded ? 'box-none' : 'none'}
          >
            <StoryStack />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />

      {editTarget && (
        <EditPostModal
          visible
          postId={editTarget.id}
          initialContent={editTarget.content}
          initialVisibility={editTarget.visibility}
          onClose={() => setEditTarget(null)}
        />
      )}

      <Modal
        visible={createPostVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCreatePostVisible(false)}
      >
        <CreatePostScreen onClose={() => setCreatePostVisible(false)} />
      </Modal>
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      position: 'absolute', top: 0, left: 0, right: 0,
      backgroundColor: T.bg,
    },
    topBar: {
      position: 'absolute', top: 0, left: 0, right: 0,
      paddingTop: 52, paddingHorizontal: 16, paddingBottom: 8,
      backgroundColor: T.bg, zIndex: 2,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stackSlot: {
      position: 'absolute', left: 0, right: 0, top: 52, bottom: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    headerLogo: {
      width: 120, height: 42, flexShrink: 0,
    },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerIconBtn: { position: 'relative', padding: 6 },
    iconBadge: {
      position: 'absolute', top: 2, right: 2,
      minWidth: 17, height: 17, borderRadius: 9,
      backgroundColor: '#e53e3e',
      justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 3, borderWidth: 1.5,
    },
    iconBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 11 },
    // Equal-width underline tabs (Threads-style)
    tabs: { flexDirection: 'row', backgroundColor: T.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
    tabPill: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabPillOn: { borderBottomColor: T.text },
    tabLabel: { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },
    tabLabelOn: { color: T.text },
    tabLabelOff: { color: T.textMuted },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { fontSize: 17, fontWeight: '600', color: T.textSub, marginBottom: 8, textAlign: 'center' },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center' },
    retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: T.accent, borderRadius: 20 },
    retryText: { color: '#000', fontWeight: '700', fontSize: 14 },
    accent: { color: T.accent },
  });
}
