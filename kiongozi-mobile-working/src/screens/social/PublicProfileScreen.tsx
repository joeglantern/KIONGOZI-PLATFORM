import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { deletePostWithUndo, hideFromList } from '../../utils/deletePost';
import {
  View, Text, StyleSheet, Pressable,
  ActivityIndicator, Animated, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ProfileHeader, ProfileChrome, Mutuals } from '../../components/social/ProfileHeader';
import { PostCard, isShowable } from '../../components/social/PostCard';
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
  const [tabsY, setTabsY] = useState(0);
  const [mutuals, setMutuals] = useState<Mutuals | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );

  // "Followed by": people you follow who follow them. Shows nothing if the API doesn't have it yet.
  const mutualsFor = profile && user?.id && profile.id !== user.id && !profile.isBlockedBy ? profile.id : null;
  useEffect(() => {
    setMutuals(null);
    if (!mutualsFor) return;
    let live = true;
    apiClient.getMutuals(mutualsFor)
      .then((r: any) => {
        if (live && r?.success && r.data && r.data.total > 0 && Array.isArray(r.data.users) && r.data.users.length) setMutuals(r.data);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [mutualsFor]);

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

    // Follow / request: flip the button at once (like the big apps), settle with the server after
    const willRequest = !!profile.is_private;
    if (willRequest) setProfile((p: any) => p ? { ...p, followRequestStatus: 'pending' } : p);
    else {
      setProfile((p: any) => p ? { ...p, isFollowing: true, follower_count: (p.follower_count || 0) + 1, followRequestStatus: null } : p);
      updateFollowState(username, true);
    }
    const undo = () => {
      setProfile((p: any) => p ? {
        ...p, isFollowing: false, followRequestStatus: null,
        follower_count: willRequest ? p.follower_count : Math.max(0, (p.follower_count || 0) - 1),
      } : p);
      if (!willRequest) updateFollowState(username, false);
    };
    try {
      const res = await apiClient.followUser(profile.id);
      if (!res.success) { undo(); return; }
      const requested = (res as any).status === 'requested';
      if (requested && !willRequest) {
        // it turned out to need approval: show Requested and take back the count
        setProfile((p: any) => p ? { ...p, isFollowing: false, followRequestStatus: 'pending', follower_count: Math.max(0, (p.follower_count || 0) - 1) } : p);
        updateFollowState(username, false);
      } else if (!requested && willRequest) {
        setProfile((p: any) => p ? { ...p, isFollowing: true, followRequestStatus: null, follower_count: (p.follower_count || 0) + 1 } : p);
        updateFollowState(username, true);
      }
    } catch { undo(); }
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

  const openFollowList = (initialTab: 'followers' | 'following') =>
    navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab });

  const ListHeader = (
    <ProfileHeader
      scrollY={scrollY}
      profile={profile}
      isOwn={isOwnProfile}
      onShare={handleShareProfile}
      onEditProfile={() => navigation.navigate('EditProfile')}
      follow={isOwnProfile ? undefined : {
        label: getFollowLabel(),
        primary: followIsPrimary,
        pending: isPending,
        onPress: handleFollowToggle,
        accessibilityLabel: isPending ? 'Cancel follow request' : getFollowLabel(),
      }}
      onMessage={isOwnProfile ? undefined : handleMessage}
      messageLoading={messageLoading}
      onOpenFollowList={openFollowList}
      mutuals={isOwnProfile ? null : mutuals}
      hasTabs={!isLocked}
      onTabsLayout={setTabsY}
      below={isLocked ? (
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
      ) : null}
    />
  );

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={isLocked ? [] : displayPosts.filter(isShowable)}
        keyExtractor={(item: any) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }: { item: any }) => (
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

      <ProfileChrome
        scrollY={scrollY}
        insetTop={insets.top}
        title={profile?.full_name || profile?.username}
        verified={profile?.is_verified}
        left={[{ key: 'back', icon: 'chevron-back', label: 'Go back', onPress: () => navigation.goBack() }]}
        right={isOwnProfile ? [] : [{ key: 'more', icon: 'ellipsis-horizontal', label: 'More options', onPress: handleMoreOptions }]}
        tabs={isLocked ? undefined : TABS}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        tabsY={tabsY}
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
