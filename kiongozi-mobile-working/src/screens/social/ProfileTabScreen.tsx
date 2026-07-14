import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Animated, ActivityIndicator, RefreshControl, Dimensions, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { UserAvatar } from '../../components/social/UserAvatar';
import { PostCard } from '../../components/social/PostCard';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

type Tab = 'posts' | 'replies' | 'media';
const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'media', label: 'Media' },
];
const TAB_COUNT = TABS.length;
const { width: SCREEN_W } = Dimensions.get('window');
const TAB_W = SCREEN_W / TAB_COUNT;
const COVER_HEIGHT = 180;
const AVATAR_SIZE = 84;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { currentUserProfile, fetchCurrentUserProfile, updateCurrentUserProfile } = useProfileStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [localBannerUri, setLocalBannerUri] = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchCurrentUserProfile(); }, []);

  useEffect(() => {
    if (currentUserProfile?.username) fetchPosts(true);
  }, [activeTab, currentUserProfile?.username]);

  const fetchPosts = useCallback(async (reset = false) => {
    if (!currentUserProfile?.username) return;
    if (reset) { setLoading(true); setCursor(null); setPosts([]); setHasMore(true); }
    try {
      const res = await apiClient.getUserPostsByType(
        currentUserProfile.username, activeTab,
        reset ? undefined : cursor ?? undefined
      );
      if (res.success && res.data) {
        const newPosts = res.data as any[];
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

  const handleRefresh = () => { setRefreshing(true); fetchCurrentUserProfile(); fetchPosts(true); };
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) { setLoadingMore(true); fetchPosts(false); }
  };

  const handleTabPress = (tab: Tab, index: number) => {
    setActiveTab(tab);
    Animated.spring(tabIndicatorX, { toValue: index * TAB_W, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  const handleGearPress = () => {
    Animated.timing(spinAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      spinAnim.setValue(0);
      navigation.navigate('Settings');
    });
  };

  const handlePickPhoto = async (field: 'avatar' | 'banner') => {
    const isAvatar = field === 'avatar';
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Please allow photo library access in Settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: isAvatar ? [1, 1] : [16, 9], quality: 0.85,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    if (isAvatar) { setLocalAvatarUri(uri); setUploadingAvatar(true); }
    else { setLocalBannerUri(uri); setUploadingBanner(true); }
    try {
      const formData = new FormData();
      formData.append(field, { uri, type: 'image/jpeg', name: `${field}.jpg` } as any);
      const res = await apiClient.updateProfile(formData);
      if (res.success && res.data) {
        updateCurrentUserProfile({
          ...(res.data.avatar_url ? { avatar_url: res.data.avatar_url } : {}),
          ...(res.data.banner_url ? { banner_url: res.data.banner_url } : {}),
        });
        if (isAvatar) setLocalAvatarUri(null);
        else setLocalBannerUri(null);
      } else {
        Alert.alert('Upload failed', res.error || 'Could not update photo.');
        if (isAvatar) setLocalAvatarUri(null);
        else setLocalBannerUri(null);
      }
    } catch {
      Alert.alert('Upload failed', 'Network error. Please try again.');
      if (isAvatar) setLocalAvatarUri(null);
      else setLocalBannerUri(null);
    } finally {
      if (isAvatar) setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const profile = currentUserProfile;

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const bannerSource = localBannerUri ? { uri: localBannerUri } : profile?.banner_url ? { uri: profile.banner_url } : null;
  const avatarUrl = localAvatarUri ?? profile?.avatar_url;

  const ListHeader = (
    <View>
      <TouchableOpacity activeOpacity={0.85} onPress={() => handlePickPhoto('banner')} style={styles.cover}>
        {bannerSource ? <Image source={bannerSource} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> : null}
        <View style={styles.coverTint} />
        {uploadingBanner && (
          <View style={styles.coverUploadOverlay}><ActivityIndicator color="#fff" size="large" /></View>
        )}
        {!uploadingBanner && (
          <View style={styles.coverCameraHint}>
            <Ionicons name="camera-outline" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.coverCameraText}>Change cover</Text>
          </View>
        )}
        <TouchableOpacity style={styles.gearBtn} onPress={handleGearPress}>
          <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.avatarRow}>
        <View style={[styles.avatarWrapper, { borderColor: T.bg }]}>
          <UserAvatar avatarUrl={avatarUrl} size={AVATAR_SIZE} editable uploading={uploadingAvatar} onPress={() => handlePickPhoto('avatar')} />
        </View>
      </View>

      <View style={styles.bioSection}>
        <Text style={styles.displayName}>{profile?.full_name || user?.user_metadata?.full_name || 'Your Profile'}</Text>
        <Text style={styles.handle}>
          @{profile?.username || '—'}
          {'  ·  '}
          <Text style={styles.tagline}>#KiongoziCivics</Text>
        </Text>
        {!!profile?.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}
        {profile && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{formatCount(profile.post_count ?? 0)}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab: 'followers', isOwnProfile: true })}>
              <Text style={styles.statNum}>{formatCount(profile.follower_count ?? 0)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab: 'following', isOwnProfile: true })}>
              <Text style={styles.statNum}>{formatCount(profile.following_count ?? 0)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t.key} style={styles.tabBtn} onPress={() => handleTabPress(t.key, i)}>
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: tabIndicatorX }] }]} />
      </View>
    </View>
  );

  if (!profile) {
    return (
      <View style={styles.loadingContainer}><ActivityIndicator color="#5CB85C" size="large" /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onProfilePress={(username: string) => navigation.navigate('PublicProfile', { username: username || item.profiles?.username })}
            onDeletePress={async () => { await apiClient.deletePost(item.id); setPosts(prev => prev.filter(p => p.id !== item.id)); }}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={loading ? null : <View style={styles.emptyState}><Text style={styles.emptyText}>No {activeTab} yet</Text></View>}
        ListFooterComponent={loadingMore ? <View style={{ padding: 16 }}><ActivityIndicator color="#5CB85C" /></View> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5CB85C" />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },
    cover: { height: COVER_HEIGHT, backgroundColor: T.surface, overflow: 'hidden' },
    coverTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
    coverUploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    coverCameraHint: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
    coverCameraText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' },
    gearBtn: { position: 'absolute', top: 16, right: 16, padding: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    avatarRow: { paddingLeft: 20, marginTop: -AVATAR_OVERLAP, marginBottom: 8 },
    avatarWrapper: { borderWidth: 3, borderRadius: (AVATAR_SIZE + 6) / 2, alignSelf: 'flex-start' },
    bioSection: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: T.bg },
    displayName: { fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 4 },
    handle: { fontSize: 14, color: T.textSub },
    tagline: { fontSize: 14, color: T.accent, fontWeight: '600' },
    bio: { fontSize: 14, color: T.textSub, marginTop: 8, lineHeight: 20 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.borderLight },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '800', color: T.text },
    statLabel: { fontSize: 12, color: T.textSub, marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: T.border },
    tabBar: { flexDirection: 'row', backgroundColor: T.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight, position: 'relative' },
    tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabLabel: { fontSize: 14, color: T.tabIconInactive, fontWeight: '500' },
    tabLabelActive: { color: T.text, fontWeight: '700' },
    tabIndicator: { position: 'absolute', bottom: 0, left: 0, width: TAB_W, height: 2, backgroundColor: T.text, borderRadius: 1 },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyText: { fontSize: 15, color: T.textMuted },
  });
}
