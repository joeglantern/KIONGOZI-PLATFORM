import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList,
  Animated, ActivityIndicator, RefreshControl, Image, Alert, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ProfileStoryAvatar } from '../../components/stories/ProfileStoryAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { PostCard } from '../../components/social/PostCard';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

type Tab = 'posts' | 'reposts' | 'saved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'saved', label: 'Saved' },
];
const EMPTY: Record<Tab, { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }> = {
  posts: { icon: 'create-outline', title: 'No posts yet', sub: 'When you post, it will show up here.' },
  reposts: { icon: 'repeat', title: 'No reposts yet', sub: 'Posts you repost will appear here.' },
  saved: { icon: 'bookmark-outline', title: 'Nothing saved', sub: 'Tap the bookmark on any post to keep it for later.' },
};
const COVER_HEIGHT = 150;
const AVATAR_SIZE = 88;
const RING = 4;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.floor(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function formatJoined(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `Joined ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

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

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchCurrentUserProfile(); }, []);

  useEffect(() => {
    if (currentUserProfile?.username) {
      if (activeTab === 'saved') {
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
        let newPosts = res.data as any[];
        if (activeTab === 'reposts') newPosts = newPosts.filter((p: any) => p.repost_of_id);
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
    if (activeTab === 'saved') fetchSaved(true);
    else fetchPosts(true, true);
  };
  const handleLoadMore = () => {
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
      await Share.share({
        message: `Check out ${profile.full_name ?? profile.username}'s profile on Kiongozi!\nhttps://kiongozi.app/profile/${profile.username}`,
        url: `https://kiongozi.app/profile/${profile.username}`,
      });
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
    if (status !== 'granted') { Alert.alert('Permission required', 'Please allow photo library access in Settings.'); return; }
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
        Alert.alert('Upload failed', res.error || 'Could not update cover photo.');
        setLocalBannerUri(null);
      }
    } catch {
      Alert.alert('Upload failed', 'Network error. Please try again.');
      setLocalBannerUri(null);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Please allow photo library access in Settings.'); return; }
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
        Alert.alert('Upload failed', res.error || 'Could not update photo.');
        setLocalAvatarUri(null);
      }
    } catch {
      Alert.alert('Upload failed', 'Network error. Please try again.');
      setLocalAvatarUri(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const profile = currentUserProfile;

  const avatarUrl = localAvatarUri ?? profile?.avatar_url;
  const bannerUri = localBannerUri ?? profile?.banner_url;
  const hasBanner = !!bannerUri;
  const joined = formatJoined(profile?.created_at);
  const displayPosts = activeTab === 'saved' ? savedPosts : posts;

  const openFollowList = (initialTab: 'followers' | 'following') => {
    if (!profile) return;
    navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab, isOwnProfile: true });
  };

  const ListHeader = (
    <View>
      {/* Cover photo — only rendered when one exists; tap to change */}
      {hasBanner && (
        <Pressable
          onPress={handlePickBanner}
          style={({ pressed }) => [styles.cover, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Change cover photo"
        >
          <Image source={{ uri: bannerUri! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={styles.coverBadge}>
            {uploadingBanner
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera-outline" size={16} color="#fff" />}
          </View>
        </Pressable>
      )}

      <View style={styles.body}>
        {/* Avatar — tap opens story if there is one, otherwise the photo picker */}
        <View style={[styles.avatarBlock, { marginTop: hasBanner ? -(AVATAR_SIZE / 2 + RING) : 4 }]}>
          <Pressable
            onPress={handlePickAvatar}
            style={styles.avatarRing}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <ProfileStoryAvatar
              userId={profile?.id}
              avatarUrl={avatarUrl}
              size={AVATAR_SIZE}
              isBot={profile?.is_bot}
              isVerified={profile?.is_verified}
            />
            {uploadingAvatar && (
              <View style={styles.avatarUploading}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={handlePickAvatar}
            hitSlop={10}
            style={({ pressed }) => [styles.cameraBadge, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <Ionicons name="camera" size={14} color={T.bg} />
          </Pressable>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={2}>
            {profile?.full_name || user?.user_metadata?.full_name || 'Your profile'}
          </Text>
          {profile?.is_verified && <VerifiedBadge size={18} />}
        </View>
        <Text style={styles.handle}>@{profile?.username || '—'}</Text>
        {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {(!!joined || !hasBanner) && (
          <View style={styles.metaRow}>
            {!!joined && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={T.textMuted} />
                <Text style={styles.metaText}>{joined}</Text>
              </View>
            )}
            {!hasBanner && (
              <Pressable
                onPress={handlePickBanner}
                disabled={uploadingBanner}
                hitSlop={8}
                style={({ pressed }) => [styles.metaItem, pressed && { opacity: 0.7 }]}
              >
                {uploadingBanner
                  ? <ActivityIndicator size="small" color={T.textMuted} />
                  : <Ionicons name="image-outline" size={14} color={T.textMuted} />}
                <Text style={styles.metaLink}>Add cover photo</Text>
              </Pressable>
            )}
          </View>
        )}

        {profile && (
          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              <Text style={styles.statNum}>{formatCount(profile.post_count ?? 0)}</Text> posts
            </Text>
            <Text style={styles.statDot}>·</Text>
            <Pressable onPress={() => openFollowList('followers')} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={styles.statText}>
                <Text style={styles.statNum}>{formatCount(profile.follower_count ?? 0)}</Text> followers
              </Text>
            </Pressable>
            <Text style={styles.statDot}>·</Text>
            <Pressable onPress={() => openFollowList('following')} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={styles.statText}>
                <Text style={styles.statNum}>{formatCount(profile.following_count ?? 0)}</Text> following
              </Text>
            </Pressable>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.actionBtnText}>Edit profile</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            onPress={handleShareProfile}
          >
            <Text style={styles.actionBtnText}>Share profile</Text>
          </Pressable>
        </View>
      </View>

      {/* Underline tabs */}
      <View style={styles.tabBar}>
        {TABS.map(({ key, label }) => {
          const on = activeTab === key;
          return (
            <Pressable
              key={key}
              style={styles.tab}
              onPress={() => handleTabPress(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <View style={styles.tabInner}>
                <Text style={[styles.tabLabel, { color: on ? T.text : T.textMuted }]}>{label}</Text>
                {on && <View style={styles.tabUnderline} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Saved private note */}
      {activeTab === 'saved' && (
        <View style={styles.savedNote}>
          <Ionicons name="lock-closed-outline" size={13} color={T.textMuted} />
          <Text style={styles.savedNoteText}>Only you can see your saved posts.</Text>
        </View>
      )}
    </View>
  );

  if (!profile) {
    return (
      <View style={styles.loadingContainer}><ActivityIndicator color={T.accent} size="large" /></View>
    );
  }

  const empty = EMPTY[activeTab];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          onPress={handleGearPress}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
            <Ionicons name="settings-outline" size={22} color={T.text} />
          </Animated.View>
        </Pressable>
      </View>

      <FlatList
        data={displayPosts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onProfilePress={(username: string) => navigation.navigate('PublicProfile', { username: username || item.profiles?.username })}
            onDeletePress={async () => {
              if (activeTab === 'saved') {
                setSavedPosts(prev => prev.filter((p: any) => p.id !== item.id));
              } else {
                await apiClient.deletePost(item.id);
                setPosts(prev => prev.filter(p => p.id !== item.id && p.repost_of_id !== item.id));
              }
            }}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}><ActivityIndicator color={T.accent} /></View>
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
        ListFooterComponent={loadingMore ? <View style={{ padding: 16 }}><ActivityIndicator color={T.accent} /></View> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={T.accent} colors={[T.accent]} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 8, backgroundColor: T.bg,
    },
    headerTitle: { fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.8, color: T.text },
    iconBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center',
    },

    cover: { height: COVER_HEIGHT, backgroundColor: T.surface, overflow: 'hidden' },
    coverBadge: {
      position: 'absolute', top: 12, right: 12,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    },

    body: { paddingHorizontal: 16, paddingBottom: 16 },
    avatarBlock: { alignSelf: 'flex-start', marginBottom: 12 },
    avatarRing: {
      borderWidth: RING, borderColor: T.bg, backgroundColor: T.bg,
      borderRadius: (AVATAR_SIZE + RING * 2) / 2, alignSelf: 'flex-start',
    },
    avatarUploading: {
      position: 'absolute', top: 0, left: 0, width: AVATAR_SIZE, height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2, backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center', justifyContent: 'center',
    },
    cameraBadge: {
      position: 'absolute', right: 0, bottom: 0,
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: T.text, borderWidth: 2, borderColor: T.bg,
      alignItems: 'center', justifyContent: 'center',
    },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    displayName: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, color: T.text, flexShrink: 1 },
    handle: { fontSize: 15, color: T.textMuted, marginTop: 2 },
    bio: { fontSize: 15, lineHeight: 21, color: T.text, marginTop: 10 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6, marginTop: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 13, color: T.textMuted },
    metaLink: { fontSize: 13, color: T.textMuted, fontWeight: '600', textDecorationLine: 'underline' },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
    statText: { fontSize: 14, color: T.textMuted },
    statNum: { fontWeight: '700', color: T.text },
    statDot: { fontSize: 14, color: T.textMuted },

    actionRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    actionBtn: {
      flex: 1, height: 38, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: T.border,
    },
    actionBtnText: { fontSize: 14, fontWeight: '700', color: T.text },

    tabBar: {
      flexDirection: 'row', backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border,
    },
    tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'flex-end' },
    tabInner: { paddingHorizontal: 6, paddingBottom: 11 },
    tabLabel: { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },
    tabUnderline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 1, backgroundColor: T.text },

    savedNote: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    savedNoteText: { fontSize: 13, color: T.textMuted },

    emptyState: { paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center' },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4 },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
