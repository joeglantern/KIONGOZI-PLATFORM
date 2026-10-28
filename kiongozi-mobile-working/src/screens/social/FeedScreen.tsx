import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, ScrollView, useWindowDimensions, Image, Modal, Animated, FlatList, Platform,
} from 'react-native';
import CreatePostScreen from './CreatePostScreen';

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
import { useThemeStore } from '../../stores/themeStore';
import { StoryRail, StoryStack } from '../../components/stories/StoryRail';
import { FeedSkeleton } from '../../components/social/Skeleton';
import { useStoryStore } from '../../stores/storyStore';
import { FeedPill, PillState } from '../../components/social/FeedPill';
import { useNet } from '../../stores/netStore';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { AdCard, Ad } from '../../components/social/AdCard';
import { usePrefs } from '../../stores/prefsStore';
import { emitAppEvent } from '../../utils/appEvents';

// Ads: never in the first 4 posts, then one every 8 (the server also caps per person per day)
const FIRST_AD_AT = 4;
const AD_EVERY = 8;
const adSlotsFor = (n: number) => (n <= FIRST_AD_AT ? 0 : 1 + Math.floor((n - FIRST_AD_AT - 1) / AD_EVERY));

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { conversations, fetchConversations } = useDMStore();
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const styles = useMemo(() => makeStyles(T, isDark), [T, isDark]);

  const unreadDMs = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const scrollRef = useRef<ScrollView>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string; displayName: string } | null>(null);
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  // Logo bar: 16 pad + logo + [centred mini story stack ≈106 wide] + icons (2×44 + 4 gap) + 16 pad.
  // The stack must clear the logo: logoRight ≤ W/2 − 53 − 4 → logoW ≤ W/2 − 73 (120 @≥390, ~84 @320).
  const LOGO_W = Math.round(Math.min(120, Math.max(80, SCREEN_WIDTH / 2 - 76)));
  const STACK_INSET = Math.max(16 + LOGO_W, 16 + 92) + 2;
  const [forYouError, setForYouError] = useState<string | null>(null);

  const {
    feedPosts, feedLoading, feedRefreshing, feedCursor,
    forYouPosts, forYouLoading, forYouRefreshing, hasMoreForYou,
    fetchFeed, fetchForYouFeed, prependPost, deletePost,
  } = useSocialStore();

  useEffect(() => {
    // Last saved feed shows instantly; the fresh one replaces it when it arrives
    useSocialStore.getState().hydrateFromCache().catch(() => {});
    fetchForYouFeed(true).catch(() => setForYouError('Failed to load. Check your connection.'));
    fetchFeed(true).catch(() => setFeedError('Failed to load. Check your connection.'));
    fetchConversations().catch(() => {});
  }, []);

  // ── New posts (X / Instagram): never shove posts in while someone is reading. New ones wait
  // behind a "New posts" pill with the authors' faces; tapping it brings them in at the top.
  const [incoming, setIncoming] = useState<Post[]>([]);
  const freshPage = useRef<Post[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNoteRef = useRef<((t: string) => void) | null>(null);
  const showNote = useCallback((text: string) => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setNote(text);
    noteTimer.current = setTimeout(() => setNote(null), 1800);
  }, []);
  showNoteRef.current = showNote;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('public-feed-realtime')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload: any) => {
        const row = payload.new;
        // Others' top-level public posts only; replies and followers-only posts don't belong in For You
        if (!row || row.user_id === user.id || row.parent_post_id || row.visibility !== 'public') return;
        const { blockedUserIds, mutedUserIds } = useSocialStore.getState();
        if (blockedUserIds.includes(row.user_id) || mutedUserIds.includes(row.user_id)) return;
        try {
          const res = await apiClient.getPost(row.id);
          if (!(res.success && res.data)) return;
          const post = res.data as Post;
          if (useSocialStore.getState().forYouPosts.some(p => p.id === post.id)) return;
          setIncoming(prev => (prev.some(p => p.id === post.id) ? prev : [post, ...prev].slice(0, 30)));
        } catch {}
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

  // ── Ads (Instagram / X style) ─────────────────────────────────────────────
  const adsOn = usePrefs(s => s.features.ads);
  const [ads, setAds] = useState<Ad[]>([]);
  const [seenAds, setSeenAds] = useState<Record<string, true>>({});
  const adsLoading = useRef(false);
  const impressed = useRef(new Set<string>());
  const loadAds = useCallback(async (count: number, reset = false) => {
    if (!adsOn || adsLoading.current || count <= 0) return;
    adsLoading.current = true;
    try {
      const res: any = await apiClient.getAdSlots(Math.min(count, 4));
      if (res?.success && Array.isArray(res.data)) {
        setAds(prev => (reset ? res.data : [...prev, ...res.data.filter((a: Ad) => !prev.some(p => p.id === a.id))]));
      }
    } catch {} finally { adsLoading.current = false; }
  }, [adsOn]);
  // Ask for more ads as the feed grows
  useEffect(() => {
    const need = adSlotsFor(forYouPosts.length) - ads.length;
    if (need > 0) loadAds(need);
  }, [forYouPosts.length, ads.length, loadAds]);

  const forYouRows = useMemo(() => {
    if (!adsOn || !ads.length) return forYouPosts as any[];
    const out: any[] = [];
    let a = 0;
    forYouPosts.forEach((p, i) => {
      out.push(p);
      const pos = i + 1;
      if (pos >= FIRST_AD_AT && (pos - FIRST_AD_AT) % AD_EVERY === 0 && a < ads.length) {
        out.push({ __ad: ads[a], __slot: a });
        a++;
      }
    });
    return out;
  }, [forYouPosts, ads, adsOn]);

  const openAd = useCallback((ad: Ad) => {
    apiClient.sendAdEvent(ad.id, 'click').catch(() => {});
    const url = ad.cta_url || '';
    if (url === 'kchat://invite') navigation.navigate('Profile', { screen: 'Invite' });
    else if (url === 'kchat://ai') emitAppEvent('openAI');
    else if (url === 'kchat://recap') navigation.navigate('Profile', { screen: 'ProfileMain', params: { openRecap: Date.now() } });
    else if (url === 'kchat://story') useStoryStore.getState().setComposerOpen(true);
    else if (url.startsWith('kchat://profile/')) navigation.navigate('PublicProfile', { username: url.slice('kchat://profile/'.length) });
    else if (/^https?:\/\//.test(url)) WebBrowser.openBrowserAsync(url).catch(() => {});
  }, [navigation]);
  const dropAd = useCallback((ad: Ad, kind: 'hide' | 'report') => {
    apiClient.sendAdEvent(ad.id, kind).catch(() => {});
    setAds(prev => prev.filter(a => a.id !== ad.id));
  }, []);

  // An impression counts only when ≥50% of the ad is on screen for a full second (IAB rule)
  const adViewability = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 1000 }).current;
  const onAdViewable = useRef(({ viewableItems }: any) => {
    for (const v of viewableItems) {
      const ad: Ad | undefined = v.item?.__ad;
      if (!ad) continue;
      const k = `${ad.id}_${v.item.__slot}`;
      if (impressed.current.has(k)) continue;
      impressed.current.add(k);
      apiClient.sendAdEvent(ad.id, 'impression').catch(() => {});
      setSeenAds(prev => (prev[ad.id] ? prev : { ...prev, [ad.id]: true }));
    }
  }).current;

  const renderPost = useCallback(({ item }: { item: any }) => item.__ad ? (
    <AdCard
      ad={item.__ad}
      seen={!!seenAds[item.__ad.id]}
      onOpen={openAd}
      onHide={a => { dropAd(a, 'hide'); showNoteRef.current?.('Ad hidden. You won’t see it again.'); }}
      onReport={a => { dropAd(a, 'report'); showNoteRef.current?.('Thanks. We’ll review this ad.'); }}
    />
  ) : (
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
  ), [handlePostPress, handleProfilePress, handleHashtagPress, user?.id, handleDeletePost, seenAds, openAd, dropAd]);

  const [activeTab, setActiveTab] = useState(0);

  // ── Folding header ──
  // The header floats over both feeds. Scrolling the first `railH` px folds the story rail
  // away under the logo bar (tabs ride up and stay pinned) while a mini avatar stack rises
  // into the bar. All driven on the native thread from the active list's scroll position.
  const [railH, setRailH] = useState(118);
  const [topH, setTopH] = useState(() => insets.top + 6 + 44);   // status bar + logo row
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

  const scrollToTop = (i: number) => listRefs.current[i]?.scrollToOffset({ offset: 0, animated: true });

  const showIncoming = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const fresh = freshPage.current;
    const buffered = incoming;
    freshPage.current = null;
    setIncoming([]);
    useSocialStore.setState(s => {
      const base = fresh && fresh.length ? fresh : s.forYouPosts;
      const ids = new Set(base.map(p => p.id));
      const add = buffered.filter(p => !ids.has(p.id));
      return { forYouPosts: [...add, ...base] };
    });
    if (activeTab !== 0) switchTabWithState(0);
    setTimeout(() => scrollToTop(0), 30);
  };

  // Pull-to-refresh, done like the big apps: a tick when it fires, the list never blanks,
  // and a short note says what changed.
  const refreshForYou = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setForYouError(null);
    useStoryStore.getState().fetchFeed();
    const before = new Set(useSocialStore.getState().forYouPosts.map(p => p.id));
    setIncoming([]); freshPage.current = null;
    impressed.current.clear();
    loadAds(2, true);
    fetchForYouFeed(true)
      .then(() => {
        if (!useNet.getState().online) return;
        const n = useSocialStore.getState().forYouPosts.filter(p => !before.has(p.id)).length;
        showNote(n ? `${n} new post${n === 1 ? '' : 's'}` : 'You\u2019re up to date');
      })
      .catch(() => setForYouError('Failed to load. Check your connection.'));
  };
  const refreshFollowing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFeedError(null);
    useStoryStore.getState().fetchFeed();
    const before = new Set(useSocialStore.getState().feedPosts.map(p => p.id));
    fetchFeed(true)
      .then(() => {
        if (!useNet.getState().online) return;
        const n = useSocialStore.getState().feedPosts.filter(p => !before.has(p.id)).length;
        showNote(n ? `${n} new post${n === 1 ? '' : 's'}` : 'You\u2019re up to date');
      })
      .catch(() => setFeedError('Failed to load. Check your connection.'));
  };

  // Tap Home while on the feed: first tap scrolls to the top, a second tap refreshes (Instagram / X)
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const refreshRef = useRef({ refreshForYou, refreshFollowing });
  refreshRef.current = { refreshForYou, refreshFollowing };
  useEffect(() => {
    const parent = navigation.getParent?.();
    if (!parent) return;
    return parent.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      const i = activeTabRef.current;
      if (offsets.current[i] > 4) scrollToTop(i);
      else i === 0 ? refreshRef.current.refreshForYou() : refreshRef.current.refreshFollowing();
    });
  }, [navigation]);

  // Back after a while: fetch quietly. At the top, the feed just updates; further down, the
  // fresh posts wait behind the pill so nothing moves under the reader's thumb.
  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener('change', async st => {
      if (st !== 'active') { leftAt = Date.now(); return; }
      if (!leftAt || Date.now() - leftAt < 3 * 60 * 1000) return;
      leftAt = 0;
      useStoryStore.getState().fetchFeed();
      if (offsets.current[0] <= 4) { fetchForYouFeed(true).catch(() => {}); return; }
      try {
        const res: any = await apiClient.getForYouFeed(0);
        if (!res?.success || !Array.isArray(res.data)) return;
        const have = new Set(useSocialStore.getState().forYouPosts.slice(0, 30).map(p => p.id));
        const fresh = (res.data as Post[]).filter(p => !have.has(p.id));
        if (!fresh.length) return;
        freshPage.current = res.data;
        setIncoming(prev => [...fresh.filter(f => !prev.some(p => p.id === f.id)), ...prev].slice(0, 30));
      } catch {}
    });
    return () => sub.remove();
  }, []);

  const pillState: PillState = incoming.length
    ? {
        kind: 'new',
        count: incoming.length,
        avatars: Array.from(new Map(incoming.map(p => [p.user_id, { url: (p as any).profiles?.avatar_url, name: (p as any).profiles?.full_name || (p as any).profiles?.username }])).values()),
      }
    : note ? { kind: 'note', text: note } : null;

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
            data={forYouRows}
            renderItem={renderPost}
            keyExtractor={(item: any) => (item.__ad ? `ad_${item.__ad.id}_${item.__slot}` : `fy_${item.id}`)}
            viewabilityConfig={adViewability}
            onViewableItemsChanged={onAdViewable}
            onScroll={onScrollFor(0)}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingTop: headerH }}
            scrollIndicatorInsets={{ top: headerH }}
            onEndReached={() => { if (hasMoreForYou) fetchForYouFeed(false); }}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl progressViewOffset={refreshOffset} refreshing={forYouRefreshing} onRefresh={refreshForYou} tintColor={T.accent} colors={[T.accent]} progressBackgroundColor={T.surface} />}
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
            refreshControl={<RefreshControl progressViewOffset={refreshOffset} refreshing={feedRefreshing} onRefresh={refreshFollowing} tintColor={T.accent} colors={[T.accent]} progressBackgroundColor={T.surface} />}
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
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 0 }}
          >
            <Text style={[styles.tabLabel, activeTab === 0 ? styles.tabLabelOn : styles.tabLabelOff]} numberOfLines={1} maxFontSizeMultiplier={1.3}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 1 && styles.tabPillOn]}
            onPress={() => switchTabWithState(1)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 1 }}
          >
            <Text style={[styles.tabLabel, activeTab === 1 ? styles.tabLabelOn : styles.tabLabelOff]} numberOfLines={1} maxFontSizeMultiplier={1.3}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Logo bar: drawn last so the folding rail slides underneath it */}
        <Animated.View
          style={[styles.topBar, { paddingTop: insets.top + 6, transform: [{ translateY: barHold }] }]}
          onLayout={e => setTopH(Math.round(e.nativeEvent.layout.height))}
        >
          <View style={styles.headerRow}>
            <Image source={require('../../../assets/kchat-logo.png')} style={[styles.headerLogo, { width: LOGO_W, height: Math.round(LOGO_W * 0.35) }]} resizeMode="contain" />
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setCreatePostVisible(true)} accessibilityRole="button" accessibilityLabel="New post">
                {/* Rounded square with a plus (design: 18×18 rect rx6, 8px plus, 1.8 stroke) */}
                <View style={styles.newPostBox}>
                  <View style={styles.newPostH} />
                  <View style={styles.newPostV} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('DMList')} accessibilityRole="button" accessibilityLabel={unreadDMs > 0 ? `Messages, ${unreadDMs} unread` : 'Messages'}>
                <Ionicons name="paper-plane-outline" size={24} color={T.text} />
                {unreadDMs > 0 && (
                  <View style={styles.iconBadge}>
                    <Text style={styles.iconBadgeText} maxFontSizeMultiplier={1.15}>{unreadDMs > 99 ? '99+' : String(unreadDMs)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* Mini story stack rises into the bar as the rail folds */}
          <Animated.View
            style={[styles.stackSlot, { top: insets.top + 6, left: STACK_INSET, right: STACK_INSET, opacity: stackIn, transform: [{ translateY: stackRise }, { scale: stackScale }] }]}
            pointerEvents={folded ? 'box-none' : 'none'}
          >
            <StoryStack />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Sits just under the pinned tabs */}
      <FeedPill state={pillState} top={(folded ? topH + tabsH : headerH) + 10} onPress={showIncoming} />

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

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      position: 'absolute', top: 0, left: 0, right: 0,
      backgroundColor: T.bg,
    },
    topBar: {
      position: 'absolute', top: 0, left: 0, right: 0,
      paddingTop: 52, paddingHorizontal: 16, paddingBottom: 0,
      backgroundColor: T.bg, zIndex: 2,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stackSlot: {
      position: 'absolute', left: 0, right: 0, top: 52, bottom: 0,
      alignItems: 'center', justifyContent: 'center', overflow: 'visible',
    },
    headerLogo: {
      width: 120, height: 42, flexShrink: 0,
    },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerIconBtn: { position: 'relative', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    newPostBox: {
      width: 18, height: 18, borderRadius: 6, borderWidth: 1.8, borderColor: T.text,
      alignItems: 'center', justifyContent: 'center',
    },
    newPostH: { position: 'absolute', width: 8, height: 1.8, borderRadius: 0.9, backgroundColor: T.text },
    newPostV: { position: 'absolute', width: 1.8, height: 8, borderRadius: 0.9, backgroundColor: T.text },
    iconBadge: {
      position: 'absolute', top: 8, right: 7,
      minWidth: 16, height: 16, borderRadius: 8,
      backgroundColor: '#E53E3E',
      justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 4,
    },
    iconBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600', lineHeight: 12, includeFontPadding: false },
    // Left-aligned pills: active is solid (white on black in dark), inactive a quiet chip
    tabs: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: T.bg,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#1C1C1E' : T.borderLight,
    },
    tabPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: isDark ? '#1C1C1E' : T.surface },
    tabPillOn: { backgroundColor: T.text },
    tabLabel: { fontSize: 14, fontWeight: '600' },
    tabLabelOn: { color: T.bg },
    tabLabelOff: { color: isDark ? '#AEAEB2' : T.textSub },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { fontSize: 17, fontWeight: '600', color: T.textSub, marginBottom: 8, textAlign: 'center' },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center' },
    retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: T.accent, borderRadius: 20 },
    retryText: { color: '#000', fontWeight: '700', fontSize: 14 },
    accent: { color: T.accent },
  });
}
