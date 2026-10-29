import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { deletePostWithUndo, hideFromList } from '../../utils/deletePost';
import {
  View, Text, StyleSheet, Pressable,
  Image, ActivityIndicator, FlatList, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ProfileStoryAvatar } from '../../components/stories/ProfileStoryAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { PostCard } from '../../components/social/PostCard';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { EditPostModal } from '../../components/social/EditPostModal';
import ReportModal from './ReportModal';
import { useTheme } from '../../hooks/useTheme';
import { ProfileSkeleton } from '../../components/social/Skeleton';
import { BottomSheet } from '../../components/social/BottomSheet';

type Tab = 'posts' | 'reposts';
const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'reposts', label: 'Reposts' },
];
const BANNER_HEIGHT = 150;
const RING = 4;
const AVATAR_TOTAL = 88; // includes the 4px ring
const AVATAR_SIZE = AVATAR_TOTAL - RING * 2;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatCount(n?: number | null) {
  const v = typeof n === 'number' && isFinite(n) ? n : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 10_000) return `${Math.floor(v / 1000)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
}

function formatJoined(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `Joined ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { username } = route.params || {};
  const { user } = useAuthStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const { fetchProfile, updateFollowState } = useProfileStore();
  const { blockUser, muteUser, unblockUser, blockedUserIds } = useSocialStore();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string; displayName: string } | null>(null);
  const [moreSheet, setMoreSheet] = useState(false);
  const [blockConfirmSheet, setBlockConfirmSheet] = useState(false);
  const [muteConfirmSheet, setMuteConfirmSheet] = useState(false);
  const [unblockConfirmSheet, setUnblockConfirmSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const { deletePost: deleteFromStore } = useSocialStore();

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      // Always fetch fresh so isBlockedBy / isFollowing state is current
      const profRes = await apiClient.getPublicProfile(username);
      if (!profRes.success || !profRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const prof = profRes.data as any;
      setProfile(prof);

      // If blocked by this user, skip posts fetch
      if (prof.isBlockedBy) {
        setLoading(false);
        return;
      }

      // If private and viewer doesn't follow, skip posts fetch
      if (prof.is_private && !prof.isFollowing && user?.id !== prof.id) {
        setLoading(false);
        return;
      }

      const postsRes = await apiClient.getUserPosts(username);
      if (postsRes.success) {
        setPosts((postsRes as any).data || []);
        setPostsCursor((postsRes as any).nextCursor || null);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

  const loadMorePosts = useCallback(async () => {
    if (!postsCursor || postsLoadingMore) return;
    setPostsLoadingMore(true);
    try {
      const res = await apiClient.getUserPosts(username, postsCursor) as any;
      if (res.success && res.data) {
        setPosts(prev => [...prev, ...(res.data as any[])]);
        setPostsCursor(res.nextCursor || null);
      }
    } catch {}
    setPostsLoadingMore(false);
  }, [username, postsCursor, postsLoadingMore]);

  const handleDeletePost = useCallback((postId: string) => {
    deletePostWithUndo(postId, { hide: () => hideFromList(setPosts as any, postId) });
  }, []);

  const handleEditPress = useCallback((postId: string, content: string, visibility: 'public' | 'followers') => {
    setEditTarget({ id: postId, content, visibility });
  }, []);

  // Realtime: live-update follower count
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`follows-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${profile.id}` },
        () => setProfile((p: any) => p ? { ...p, follower_count: p.follower_count + 1 } : p)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'follows', filter: `following_id=eq.${profile.id}` },
        () => setProfile((p: any) => p ? { ...p, follower_count: Math.max(0, p.follower_count - 1) } : p)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If already following → unfollow
    if (profile.isFollowing) {
      setProfile((p: any) => p ? {
        ...p, isFollowing: false,
        follower_count: Math.max(0, p.follower_count - 1)
      } : p);
      updateFollowState(username, false);
      try {
        await apiClient.unfollowUser(profile.id);
      } catch {
        setProfile((p: any) => p ? {
          ...p, isFollowing: true,
          follower_count: p.follower_count + 1
        } : p);
        updateFollowState(username, true);
      }
      return;
    }

    // If request already sent → cancel (unfollow also cancels request)
    if (profile.followRequestStatus === 'pending') {
      setProfile((p: any) => p ? { ...p, followRequestStatus: null } : p);
      try {
        await apiClient.unfollowUser(profile.id);
      } catch {
        setProfile((p: any) => p ? { ...p, followRequestStatus: 'pending' } : p);
      }
      return;
    }

    // Follow / request
    try {
      const res = await apiClient.followUser(profile.id);
      if (res.success) {
        if ((res as any).status === 'requested') {
          setProfile((p: any) => p ? { ...p, followRequestStatus: 'pending' } : p);
        } else {
          setProfile((p: any) => p ? {
            ...p, isFollowing: true,
            follower_count: p.follower_count + 1,
            followRequestStatus: null
          } : p);
          updateFollowState(username, true);
        }
      }
    } catch {}
  }, [profile, username, updateFollowState]);

  const handleMessage = async () => {
    if (!profile || messageLoading) return;
    setMessageLoading(true);
    try {
      const res = await apiClient.startDMConversation(profile.id);
      if (res.success && res.data) {
        navigation.navigate('DMConversation', {
          conversationId: res.data.id,
          participantName: profile.full_name,
          participantUsername: profile.username,
          participantAvatar: profile.avatar_url,
        });
      }
    } catch {}
    setMessageLoading(false);
  };

  const handleMoreOptions = useCallback(() => { if (profile) setMoreSheet(true); }, [profile]);

  const doBlock = async () => {
    if (!profile) return;
    await blockUser(profile.id);
    navigation.goBack();
  };

  const doMute = async () => {
    if (!profile) return;
    await muteUser(profile.id);
  };

  const doUnblockProfile = async () => {
    if (!profile) return;
    await unblockUser(profile.id);
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `Follow ${profile.full_name ?? profile.username} on KChat\nhttps://api.kiongozi.org/u/${profile.username}`,
        url: `https://api.kiongozi.org/u/${profile.username}`,
      });
    } catch {}
  };

  const handleTabPress = (tab: Tab) => {
    if (tab === activeTab) return;
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const renderHeader = (title?: string, showMore = false) => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={T.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{title ?? ''}</Text>
      {showMore ? (
        <Pressable
          onPress={handleMoreOptions}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={T.text} />
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <ProfileSkeleton posts={2} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.container}>
        {renderHeader('Profile')}
        <View style={styles.wall}>
          <View style={styles.wallIcon}>
            <Ionicons name="person-outline" size={26} color={T.textMuted} />
          </View>
          <Text style={styles.wallTitle}>User not found</Text>
          <Text style={styles.wallSub}>@{username} doesn't exist or may have been removed.</Text>
          <Pressable
            style={({ pressed }) => [styles.wallPrimaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.wallPrimaryText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isOwnProfile = user?.id === profile?.id;
  const isBlocked = !isOwnProfile && blockedUserIds.includes(profile?.id ?? '');

  // Blocked state — show wall instead of profile
  if (isBlocked) {
    return (
      <View style={styles.container}>
        {renderHeader(profile?.username)}
        <View style={styles.wall}>
          <View style={styles.wallIcon}>
            <Ionicons name="ban-outline" size={26} color={T.textMuted} />
          </View>
          <Text style={styles.wallTitle}>You've blocked this user</Text>
          <Text style={styles.wallSub}>Unblock to see their profile and posts.</Text>
          <Pressable
            style={({ pressed }) => [styles.wallSecondaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setUnblockConfirmSheet(true)}
          >
            <Text style={styles.wallSecondaryText}>Unblock</Text>
          </Pressable>
        </View>

        <BottomSheet
          visible={unblockConfirmSheet}
          onClose={() => setUnblockConfirmSheet(false)}
          title={`Unblock @${profile?.username}?`}
          subtitle="They will be able to see your posts and interact with you again."
          actions={[
            { icon: 'shield-checkmark-outline', label: 'Unblock', onPress: doUnblockProfile },
          ]}
        />
      </View>
    );
  }

  // Blocked-by state — viewer is blocked by this user (Instagram-style: neutral message, no hint)
  if (!isOwnProfile && profile?.isBlockedBy) {
    return (
      <View style={styles.container}>
        {renderHeader(profile.username)}
        <View style={styles.wall}>
          <View style={styles.wallIcon}>
            <Ionicons name="lock-closed-outline" size={26} color={T.textMuted} />
          </View>
          <Text style={styles.wallTitle} numberOfLines={2}>{profile.full_name}</Text>
          <Text style={styles.wallHandle} numberOfLines={1}>@{profile.username}</Text>
          <Text style={styles.wallSub}>This account's content isn't available.</Text>
        </View>
      </View>
    );
  }

  const isPending = profile?.followRequestStatus === 'pending';
  const isLocked = !!(profile?.is_private && !profile?.isFollowing && !isOwnProfile);
  const hasBanner = !!profile?.banner_url;
  const joined = formatJoined(profile?.created_at);
  const displayPosts = activeTab === 'reposts'
    ? posts.filter(p => p.repost_of_id && p.repost_of)
    : posts;

  // Determine follow button label
  const getFollowLabel = () => {
    if (profile?.isFollowing) return 'Following';
    if (isPending) return 'Requested';
    return 'Follow';
  };
  const followIsPrimary = !profile?.isFollowing && !isPending;

  const ListHeader = (
    <View>
      {/* Cover — banner image, or a flat placeholder so the avatar always overlaps it */}
      {hasBanner ? (
        <Image source={{ uri: profile.banner_url }} style={styles.banner} resizeMode="cover" />
      ) : (
        <View style={styles.banner} />
      )}

      <View style={styles.body}>
        <View style={[styles.avatarRing, { marginTop: -(AVATAR_TOTAL / 2) }]}>
          <ProfileStoryAvatar
            userId={profile?.id}
            avatarUrl={profile?.avatar_url}
            size={AVATAR_SIZE}
            isBot={profile?.is_bot}
            isVerified={profile?.is_verified}
          />
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.fullName} numberOfLines={2} maxFontSizeMultiplier={1.3}>{profile?.full_name}</Text>
          {profile?.is_verified && <VerifiedBadge size={18} />}
        </View>
        <View style={styles.handleRow}>
          <Text style={styles.username} numberOfLines={1}>@{profile?.username}</Text>
          {profile?.is_private && (
            <Ionicons name="lock-closed" size={13} color={T.textMuted} />
          )}
        </View>
        {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {!!joined && (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={T.textMuted} />
            <Text style={styles.metaText}>{joined}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          {typeof profile?.post_count === 'number' && (
            <>
              <Text style={styles.statText} maxFontSizeMultiplier={1.3}>
                <Text style={styles.statNum}>{formatCount(profile.post_count)}</Text> posts
              </Text>
              <Text style={styles.statText} maxFontSizeMultiplier={1.3}>·</Text>
            </>
          )}
          <Pressable
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            onPress={() => navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab: 'followers' })}
          >
            <Text style={styles.statText} maxFontSizeMultiplier={1.3}>
              <Text style={styles.statNum}>{formatCount(profile?.follower_count)}</Text> followers
            </Text>
          </Pressable>
          <Text style={styles.statText} maxFontSizeMultiplier={1.3}>·</Text>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            onPress={() => navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab: 'following' })}
          >
            <Text style={styles.statText} maxFontSizeMultiplier={1.3}>
              <Text style={styles.statNum}>{formatCount(profile?.following_count)}</Text> following
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <>
              <Pressable
                onPress={() => navigation.navigate('EditProfile')}
                style={({ pressed }) => [styles.actionBtn, styles.actionSecondary, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.actionSecondaryText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Edit profile</Text>
              </Pressable>
              <Pressable
                onPress={handleShareProfile}
                style={({ pressed }) => [styles.actionBtn, styles.actionSecondary, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.actionSecondaryText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Share profile</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleFollowToggle}
                style={({ pressed }) => [
                  styles.actionBtn,
                  followIsPrimary ? styles.actionPrimary : styles.actionSecondary,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={isPending ? 'Cancel follow request' : getFollowLabel()}
              >
                <Text
                  style={[
                    followIsPrimary ? styles.actionPrimaryText : styles.actionSecondaryText,
                    isPending && { color: T.textMuted },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {getFollowLabel()}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleMessage}
                disabled={messageLoading}
                style={({ pressed }) => [styles.actionBtn, styles.actionSecondary, pressed && { opacity: 0.7 }]}
              >
                {messageLoading
                  ? <ActivityIndicator size="small" color={T.text} />
                  : <Text style={styles.actionSecondaryText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Message</Text>}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {isLocked ? (
        <View style={[styles.wall, styles.lockedWall]}>
          <View style={styles.wallIcon}>
            <Ionicons name="lock-closed-outline" size={26} color={T.textMuted} />
          </View>
          <Text style={styles.wallTitle}>This account is private</Text>
          <Text style={styles.wallSub}>
            {isPending
              ? 'Your follow request is pending. You’ll see their posts once it’s approved.'
              : 'Follow this account to see their posts.'}
          </Text>
        </View>
      ) : (
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
                  <Text style={[styles.tabLabel, { color: on ? T.text : T.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
                  {on && <View style={styles.tabUnderline} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader(profile?.username, !isOwnProfile)}

      <FlatList
        data={isLocked ? [] : displayPosts}
        keyExtractor={item => item.id}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onProfilePress={(u) => navigation.navigate('PublicProfile', { username: u })}
            currentUserId={user?.id}
            onDeletePress={isOwnProfile ? () => handleDeletePost(item.id) : undefined}
            onEditPress={isOwnProfile ? handleEditPress : undefined}
            onReportPress={!isOwnProfile ? (postId) => setReportTarget({
              type: 'post', id: postId, displayName: 'this post'
            }) : undefined}
          />
        )}
        ListFooterComponent={
          postsLoadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={T.accent} /> : null
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLocked ? (
            <View style={styles.emptyState}>
              <View style={styles.wallIcon}>
                <Ionicons name={activeTab === 'reposts' ? 'repeat' : 'document-text-outline'} size={26} color={T.textMuted} />
              </View>
              <Text style={styles.wallTitle}>{activeTab === 'reposts' ? 'No reposts yet' : 'No posts yet'}</Text>
              <Text style={styles.wallSub}>
                {activeTab === 'reposts'
                  ? `When @${profile?.username} reposts, it will show up here.`
                  : `When @${profile?.username} posts, it will show up here.`}
              </Text>
            </View>
          ) : null
        }
      />

      {editTarget && (
        <EditPostModal
          visible
          postId={editTarget.id}
          initialContent={editTarget.content}
          initialVisibility={editTarget.visibility}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />

      <BottomSheet
        visible={moreSheet}
        onClose={() => setMoreSheet(false)}
        title={profile?.full_name}
        actions={[
          {
            icon: 'flag-outline',
            label: `Report @${profile?.username}`,
            onPress: () => setReportTarget({ type: 'user', id: profile!.id, displayName: `@${profile!.username}` }),
          },
          {
            icon: 'ban-outline',
            label: `Block @${profile?.username}`,
            onPress: () => setBlockConfirmSheet(true),
            destructive: true,
          },
          {
            icon: 'volume-mute-outline',
            label: `Mute @${profile?.username}`,
            onPress: () => setMuteConfirmSheet(true),
          },
        ]}
      />

      <BottomSheet
        visible={blockConfirmSheet}
        onClose={() => setBlockConfirmSheet(false)}
        title={`Block @${profile?.username}?`}
        subtitle="They will no longer be able to see your posts or contact you."
        actions={[
          { icon: 'ban-outline', label: 'Block', onPress: doBlock, destructive: true },
        ]}
      />

      <BottomSheet
        visible={muteConfirmSheet}
        onClose={() => setMuteConfirmSheet(false)}
        title={`Mute @${profile?.username}?`}
        subtitle="Their posts will be hidden from your feed. They won't know they've been muted."
        actions={[
          { icon: 'volume-mute-outline', label: 'Mute', onPress: doMute },
        ]}
      />

      <BottomSheet
        visible={unblockConfirmSheet}
        onClose={() => setUnblockConfirmSheet(false)}
        title={`Unblock @${profile?.username}?`}
        subtitle="They will be able to see your posts and interact with you again."
        actions={[
          { icon: 'shield-checkmark-outline', label: 'Unblock', onPress: doUnblockProfile },
        ]}
      />
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 4, paddingBottom: 6, backgroundColor: T.bg,
    },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    iconBtn: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2, marginRight: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    headerSpacer: { width: 44, height: 44, marginRight: 8 },
    headerTitle: {
      flex: 1, textAlign: 'center', marginHorizontal: 8,
      fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text,
    },

    banner: { width: '100%', height: BANNER_HEIGHT, backgroundColor: T.surface2 },
    body: { paddingHorizontal: 16, paddingBottom: 16 },
    avatarRing: {
      alignSelf: 'flex-start', marginBottom: 8,
      borderWidth: RING, borderColor: T.bg, backgroundColor: T.bg,
      borderRadius: AVATAR_TOTAL / 2,
    },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fullName: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, color: T.text, flexShrink: 1 },
    handleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    username: { color: T.textMuted, fontSize: 15, flexShrink: 1 },
    bio: { color: T.text, fontSize: 15, lineHeight: 21, marginTop: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    metaText: { fontSize: 13, color: T.textMuted },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
    statText: { fontSize: 15, color: T.textMuted },
    statNum: { fontWeight: '700', color: T.text },

    actionRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    // Pair at 320pt: (320 − 32 − 8) / 2 = 140pt each; "Requested"/"Message" @15pt bold ≈ 75pt (≈100pt at 1.3×).
    actionBtn: { flex: 1, minHeight: 38, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
    actionPrimary: { backgroundColor: T.text },
    actionPrimaryText: { color: T.bg, fontWeight: '700', fontSize: 15 },
    actionSecondary: { borderWidth: 1, borderColor: T.border },
    actionSecondaryText: { color: T.text, fontWeight: '700', fontSize: 15 },

    tabBar: {
      flexDirection: 'row', backgroundColor: T.bg,
      borderBottomWidth: 1, borderBottomColor: T.bg === '#000000' ? '#1C1C1E' : '#E5E5EA',
    },
    tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
    tabInner: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },
    tabUnderline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: T.text },

    emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    wall: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 48 },
    lockedWall: {
      flex: 0, paddingVertical: 40,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border,
    },
    wallIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    wallTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4, textAlign: 'center' },
    wallHandle: { fontSize: 14, color: T.textMuted, marginBottom: 8 },
    wallSub: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
    wallPrimaryBtn: {
      marginTop: 20, height: 38, paddingHorizontal: 24, borderRadius: 20,
      backgroundColor: T.text, alignItems: 'center', justifyContent: 'center',
    },
    wallPrimaryText: { color: T.bg, fontWeight: '700', fontSize: 14 },
    wallSecondaryBtn: {
      marginTop: 20, height: 38, paddingHorizontal: 24, borderRadius: 20,
      borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center',
    },
    wallSecondaryText: { color: T.text, fontWeight: '700', fontSize: 14 },
  });
}
