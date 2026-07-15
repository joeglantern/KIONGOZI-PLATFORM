import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Animated, ActivityIndicator, RefreshControl, Dimensions, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

type Tab = 'posts' | 'reposts' | 'saved';
const { width: SCREEN_W } = Dimensions.get('window');
const COVER_HEIGHT = 158;
const AVATAR_SIZE = 88;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
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

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getBookmarks();
      if (res.success && res.data) setSavedPosts(res.data as any[]);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchPosts = useCallback(async (reset = false) => {
    if (!currentUserProfile?.username) return;
    if (reset) { setLoading(true); setCursor(null); setPosts([]); setHasMore(true); }
    try {
      const res = await apiClient.getUserPostsByType(
        currentUserProfile.username, 'posts',
        reset ? undefined : cursor ?? undefined
      );
      if (res.success && res.data) {
        let newPosts = res.data as any[];
        if (activeTab === 'reposts') newPosts = newPosts.filter((p: any) => p.repost_of_id);
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
    fetchCurrentUserProfile();
    if (activeTab === 'saved') fetchSaved();
    else fetchPosts(true);
  };
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading && activeTab !== 'saved') {
      setLoadingMore(true);
      fetchPosts(false);
    }
  };

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
  };

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

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const avatarUrl = localAvatarUri ?? profile?.avatar_url;
  const displayPosts = activeTab === 'saved' ? savedPosts : posts;

  const ListHeader = (
    <View>
      {/* Cover photo — tap to change; gradient shown when no photo */}
      <TouchableOpacity activeOpacity={0.85} onPress={handlePickBanner} style={styles.cover}>
        {/* Gradient fallback (always underneath) */}
        <LinearGradient
          colors={[T.accent, T.accentDeep]}
          start={{ x: 0.35, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Photo on top when available */}
        {(localBannerUri || profile?.banner_url) ? (
          <Image
            source={{ uri: localBannerUri ?? profile!.banner_url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        {/* Subtle dark tint overlay for readability */}
        <View style={styles.coverTint} />
        {/* Camera hint — top-left to avoid avatar overlap at bottom */}
        {!uploadingBanner && (
          <View style={styles.coverCameraHint}>
            <Ionicons name="camera-outline" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.coverCameraLabel}>Edit cover</Text>
          </View>
        )}
        {uploadingBanner && (
          <ActivityIndicator color="#fff" style={{ position: 'absolute', bottom: 12, left: 12 }} />
        )}
        <TouchableOpacity style={styles.gearBtn} onPress={handleGearPress}>
          <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.avatarRow}>
        <View style={[styles.avatarWrapper, { borderColor: T.bg }]}>
          <UserAvatar avatarUrl={avatarUrl} size={AVATAR_SIZE} editable uploading={uploadingAvatar} onPress={handlePickAvatar} />
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

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Text style={styles.actionBtnText}>Share Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pill tab switcher */}
      <View style={styles.tabBar}>
        {(['posts', 'reposts', 'saved'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, activeTab === t && styles.tabPillOn]}
            onPress={() => handleTabPress(t)}
          >
            <Text style={[styles.tabLabel, activeTab === t ? styles.tabLabelOn : styles.tabLabelOff]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Saved private banner */}
      {activeTab === 'saved' && (
        <View style={styles.savedBanner}>
          <Ionicons name="lock-closed" size={14} color={T.accent} />
          <Text style={styles.savedBannerText}>Only you can see this. Saved posts are private.</Text>
        </View>
      )}
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
                setPosts(prev => prev.filter(p => p.id !== item.id));
              }
            }}
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
    cover: { height: COVER_HEIGHT, overflow: 'hidden' },
    coverTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' } as any,
    coverCameraHint: {
      position: 'absolute', top: 14, left: 14,
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    coverCameraLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    gearBtn: { position: 'absolute', top: 16, right: 16, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
    avatarRow: { paddingLeft: 20, marginTop: -AVATAR_OVERLAP, marginBottom: 8 },
    avatarWrapper: { borderWidth: 4, borderRadius: (AVATAR_SIZE + 8) / 2, alignSelf: 'flex-start' },
    bioSection: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: T.bg },
    displayName: { fontSize: 23, fontWeight: '700', color: T.text, letterSpacing: -0.4, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
    handle: { fontSize: 14, color: T.textSub },
    tagline: { fontSize: 14, color: T.accent, fontWeight: '600' },
    bio: { fontSize: 14, color: T.textSub, marginTop: 8, lineHeight: 20 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.borderLight },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 19, fontWeight: '700', color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    statLabel: { fontSize: 12, color: T.textSub, marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: T.border },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    actionBtn: {
      flex: 1, paddingVertical: 9, alignItems: 'center',
      borderRadius: 22, borderWidth: 1, borderColor: T.border,
    },
    actionBtnText: { fontSize: 14, fontWeight: '700', color: T.text },
    tabBar: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: T.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    tabPill: {
      paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1, borderColor: T.borderLight, backgroundColor: T.surface,
    },
    tabPillOn: { backgroundColor: T.acc10, borderColor: T.acc25 },
    tabLabel: { fontSize: 14, fontWeight: '600' },
    tabLabelOn: { color: T.accent },
    tabLabelOff: { color: T.textSub },
    savedBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginBottom: 8,
      padding: 12, borderRadius: 12,
      backgroundColor: T.acc10, borderWidth: 1, borderColor: T.acc25,
    },
    savedBannerText: { fontSize: 13, color: T.accent, fontWeight: '600', flex: 1 },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyText: { fontSize: 15, color: T.textMuted },
  });
}
