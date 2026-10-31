import { appAlert } from '../../utils/alert';
import { deletePostWithUndo, hideFromList } from '../../utils/deletePost';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TAB_LIST_INSET } from '../../navigation/tabInset';
import {
  View, Text, Pressable, StyleSheet,
  Animated, ActivityIndicator, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ProfileHeader, ProfileChrome } from '../../components/social/ProfileHeader';
import { PostCard, isShowable } from '../../components/social/PostCard';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { usePrefs } from '../../stores/prefsStore';
import { RecapSheet } from '../../components/social/RecapSheet';
import { ProfileSkeleton, FeedSkeleton } from '../../components/social/Skeleton';
import { useBubbleRefresh } from '../../components/social/RefreshBubble';
import { QRCardSheet } from '../../components/social/QRCardSheet';
import { useProfileExtraTabs, ExtraTabRow, isExtraTab, EXTRA_EMPTY } from '../../components/social/ProfileExtraTabs';
import { shareLink, kchatLink } from '../../utils/links';

type Tab = 'posts' | 'replies' | 'mitaa' | 'barazas' | 'saved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'mitaa', label: 'Mitaa' },
  { key: 'barazas', label: 'Barazas' },
  { key: 'saved', label: 'Saved' },
];
const EMPTY: Record<Tab, { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }> = {
  posts: { icon: 'create-outline', title: 'No posts yet', sub: 'When you post, it will show up here.' },
  replies: { icon: EXTRA_EMPTY.replies.icon, title: EXTRA_EMPTY.replies.title, sub: EXTRA_EMPTY.replies.sub(null) },
  mitaa: { icon: EXTRA_EMPTY.mitaa.icon, title: EXTRA_EMPTY.mitaa.title, sub: EXTRA_EMPTY.mitaa.sub(null) },
  barazas: { icon: EXTRA_EMPTY.barazas.icon, title: EXTRA_EMPTY.barazas.title, sub: EXTRA_EMPTY.barazas.sub(null) },
  saved: { icon: 'bookmark-outline', title: 'Nothing saved', sub: 'Tap the bookmark on any post to keep it for later.' },
};
export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { currentUserProfile, fetchCurrentUserProfile, updateCurrentUserProfile } = useProfileStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Per-tab post cache: show immediately on tab switch, refresh silently in background
  const postsCache = useRef<Partial<Record<Tab, any[]>>>({});
  const savedCache = useRef<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [localBannerUri, setLocalBannerUri] = useState<string | null>(null);
  const [tabsY, setTabsY] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const extra = useProfileExtraTabs(currentUserProfile?.username, currentUserProfile?.id, activeTab);
  const onExtraTab = isExtraTab(activeTab);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchCurrentUserProfile(); }, []);

  // Streak (Duolingo idea) + weekly recap entry
  const features = usePrefs(s => s.features);
  const [streak, setStreak] = useState<{ streak: number; today: boolean } | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  // Opened from the Monday "your week is ready" push
  const openRecapParam = (useRoute<any>().params as any)?.openRecap;
  useEffect(() => { if (openRecapParam) setRecapOpen(true); }, [openRecapParam]);
  useEffect(() => {
    if (!features.streaks) return;
    apiClient.getStreak().then((r: any) => { if (r?.success) setStreak(r.data); }).catch(() => {});
  }, [features.streaks, currentUserProfile?.post_count]);

  useEffect(() => {
    if (currentUserProfile?.username) {
      if (isExtraTab(activeTab)) {
        // loaded by useProfileExtraTabs
      } else if (activeTab === 'saved') {
        fetchSaved();
      } else {
        fetchPosts(true);
      }
    }
  }, [activeTab, currentUserProfile?.username]);

  const fetchSaved = async (forceRefresh = false) => {
    const hasCached = savedCache.current.length > 0;
    if (hasCached && !forceRefresh) {
      setSavedPosts(savedCache.current);
      setLoading(false);
      // Refresh silently in background
    } else {
      setLoading(true);
    }
    try {
      const res = await apiClient.getBookmarks();
      if (res.success && res.data) {
        savedCache.current = res.data as any[];
        setSavedPosts(res.data as any[]);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchPosts = useCallback(async (reset = false, forceRefresh = false) => {
    if (!currentUserProfile?.username) return;
    if (reset) {
      const cached = postsCache.current[activeTab];
      if (cached && cached.length > 0 && !forceRefresh) {
        // Show cached data immediately — only spinner on first visit to this tab
        setPosts(cached);
        setLoading(false);
      } else {
        setLoading(true);
        setPosts([]);
      }
      setCursor(null);
      setHasMore(true);
    }
    try {
      const res = await apiClient.getUserPostsByType(
        currentUserProfile.username, 'posts',
        reset ? undefined : cursor ?? undefined
      );
      if (res.success && res.data) {
        const newPosts = res.data as any[];
        if (reset) postsCache.current[activeTab] = newPosts;
        setPosts(prev => (reset ? newPosts : [...prev, ...newPosts]));
        const nc = (res as any).nextCursor ?? null;
        setCursor(nc);
        setHasMore(!!nc);
      }
    } catch (err) {
      console.error('fetchPosts error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeTab, currentUserProfile?.username, cursor]);

  const handleRefresh = () => {
    setRefreshing(true);
    // Clear cache so pull-to-refresh always fetches fresh data
    postsCache.current = {};
    savedCache.current = [];
    fetchCurrentUserProfile();
    extra.reset();
    if (activeTab === 'saved') fetchSaved(true);
    else if (!isExtraTab(activeTab)) fetchPosts(true, true);
    else setRefreshing(false);
  };
  const bubbleRefresh = useBubbleRefresh(async () => {
    postsCache.current = {};
    savedCache.current = [];
    await Promise.all([
      fetchCurrentUserProfile(),
      activeTab === 'saved' ? fetchSaved(true) : isExtraTab(activeTab) ? extra.refresh() : fetchPosts(true, true),
    ]);
  }, T.accent, T.surface);

  const handleLoadMore = () => {
    if (isExtraTab(activeTab)) { extra.loadMore(); return; }
    if (!loadingMore && hasMore && !loading && activeTab !== 'saved') {
      setLoadingMore(true);
      fetchPosts(false);
    }
  };

  const handleTabPress = (tab: Tab) => {
    if (tab === activeTab) return;
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleShareProfile = useCallback(async () => {
    const profile = currentUserProfile;
    if (!profile) return;
    try {
      await shareLink(kchatLink.profile(profile.username), `Follow ${profile.full_name ?? profile.username} on KChat`);
    } catch {}
  }, [currentUserProfile]);

  const handleGearPress = () => {
    Animated.timing(spinAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      spinAnim.setValue(0);
      navigation.navigate('Settings');
    });
  };

  const handlePickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { appAlert('Permission required', 'Please allow photo library access in Settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 1], quality: 0.85,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setLocalBannerUri(uri);
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('banner', { uri, type: 'image/jpeg', name: 'banner.jpg' } as any);
      const res = await apiClient.updateProfile(formData);
      if (res.success && res.data) {
        updateCurrentUserProfile({ ...(res.data.banner_url ? { banner_url: res.data.banner_url } : {}) });
        setLocalBannerUri(null);
      } else {
        appAlert('Upload failed', res.error || 'Could not update cover photo.');
        setLocalBannerUri(null);
      }
    } catch {
      appAlert('Upload failed', 'Network error. Please try again.');
      setLocalBannerUri(null);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { appAlert('Permission required', 'Please allow photo library access in Settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setLocalAvatarUri(uri);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', { uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
      const res = await apiClient.updateProfile(formData);
      if (res.success && res.data) {
        updateCurrentUserProfile({ ...(res.data.avatar_url ? { avatar_url: res.data.avatar_url } : {}) });
        setLocalAvatarUri(null);
      } else {
        appAlert('Upload failed', res.error || 'Could not update photo.');
        setLocalAvatarUri(null);
      }
    } catch {
      appAlert('Upload failed', 'Network error. Please try again.');
      setLocalAvatarUri(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const profile = currentUserProfile;
  const displayPosts = onExtraTab
    ? extra.data.filter((i: any) => i.__kind || isShowable(i))
    : (activeTab === 'saved' ? savedPosts : posts).filter(isShowable);

  const openFollowList = (initialTab: 'followers' | 'following') => {
    if (!profile) return;
    navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab, isOwnProfile: true });
  };

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 52 }]}><ProfileSkeleton posts={2} /></View>
    );
  }

  const chips = (features.recap || (features.streaks && !!streak?.streak)) ? (
    <View style={styles.chipRow}>
      {features.streaks && !!streak?.streak && (
        <View style={[styles.chip, streak.today ? styles.chipHot : null]} accessibilityLabel={`${streak.streak} day streak`}>
          <Ionicons name="flame" size={14} color="#F5A524" />
          <Text style={styles.chipText} maxFontSizeMultiplier={1.3}>
            {streak.streak}-day streak{streak.today ? '' : ', post today to keep it'}
          </Text>
        </View>
      )}
      {features.recap && (
        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setRecapOpen(true); }} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Ionicons name="stats-chart" size={13} color={T.accent} />
          <Text style={styles.chipText} maxFontSizeMultiplier={1.3}>Your week</Text>
        </Pressable>
      )}
    </View>
  ) : null;

  const ListHeader = (
    <ProfileHeader
      scrollY={bubbleRefresh.scrollY}
      profile={{ ...profile, full_name: profile.full_name || user?.user_metadata?.full_name || 'Your profile' }}
      avatarUrl={localAvatarUri ?? profile.avatar_url}
      bannerUrl={localBannerUri ?? profile.banner_url}
      isOwn
      onChangeAvatar={handlePickAvatar}
      avatarUploading={uploadingAvatar}
      onChangeCover={handlePickBanner}
      coverUploading={uploadingBanner}
      onShare={handleShareProfile}
      onQrCard={() => { Haptics.selectionAsync().catch(() => {}); setQrOpen(true); }}
      onEditProfile={() => navigation.navigate('EditProfile')}
      onOpenFollowList={openFollowList}
      extra={chips}
      hasTabs
      onTabsLayout={setTabsY}
      below={activeTab === 'saved' ? (
        <View style={styles.savedNote}>
          <Ionicons name="lock-closed-outline" size={13} color={T.textMuted} />
          <Text style={styles.savedNoteText} numberOfLines={2}>Only you can see your saved posts.</Text>
        </View>
      ) : null}
    />
  );

  const empty = EMPTY[activeTab];

  return (
    <View style={styles.container}>
      <Animated.FlatList
        {...TAB_LIST_INSET}
        data={displayPosts}
        keyExtractor={(item: any) => item.id}
        onScroll={bubbleRefresh.onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }: { item: any }) => item.__kind ? (
          <ExtraTabRow item={item} onOpenPost={(postId) => navigation.navigate('PostDetail', { postId })} />
        ) : (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onProfilePress={(username: string) => navigation.navigate('PublicProfile', { username: username || item.profiles?.username })}
            onDeletePress={() => {
              if (activeTab === 'saved') {
                setSavedPosts(prev => prev.filter((p: any) => p.id !== item.id));
              } else {
                deletePostWithUndo(item.id, { hide: () => hideFromList(setPosts as any, item.id) });
              }
            }}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          (onExtraTab ? extra.loading : loading) ? (
            <FeedSkeleton count={3} />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name={empty.icon} size={26} color={T.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              <Text style={styles.emptySub}>{empty.sub}</Text>
            </View>
          )
        }
        ListFooterComponent={(onExtraTab ? extra.loadingMore : loadingMore) ? <View style={{ padding: 16 }}><ActivityIndicator color={T.accent} /></View> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={bubbleRefresh.refreshControl}
        showsVerticalScrollIndicator={false}
      />

      <ProfileChrome
        scrollY={bubbleRefresh.scrollY}
        insetTop={insets.top}
        title={profile.full_name || profile.username}
        verified={profile.is_verified}
        right={[
          { key: 'share', icon: 'share-outline', label: 'Share profile', onPress: handleShareProfile },
          { key: 'settings', icon: 'settings-outline', label: 'Settings', onPress: handleGearPress, rotate: spinDeg },
        ]}
        tabs={TABS}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        tabsY={tabsY}
        onBarLayout={bubbleRefresh.onHeaderLayout}
      />
      {bubbleRefresh.bubble}
      <RecapSheet visible={recapOpen} onClose={() => setRecapOpen(false)} />
      <QRCardSheet visible={qrOpen} username={profile.username} onClose={() => setQrOpen(false)} />
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: T.surface2 },
    chipHot: { backgroundColor: 'rgba(245,184,61,0.16)' },
    chipText: { fontSize: 13, fontWeight: '600', color: T.text },

    savedNote: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    savedNoteText: { fontSize: 13, color: T.textMuted, flexShrink: 1 },

    emptyState: { paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center' },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4 },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
