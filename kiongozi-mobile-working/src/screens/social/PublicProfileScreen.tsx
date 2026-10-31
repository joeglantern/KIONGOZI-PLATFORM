import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { deletePostWithUndo, hideFromList } from '../../utils/deletePost';
import {
  StatusBar,
  View, Text, StyleSheet, Pressable,
  ActivityIndicator, Animated, Share,
} from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { haptic } from '../../utils/haptics';
import { ProfileHeader, ProfileChrome, Mutuals } from '../../components/social/ProfileHeader';
import { PostCard, isShowable } from '../../components/social/PostCard';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import { useDMStore } from '../../stores/dmStore';
import { useFollowState, toggleFollow, onRealtimeFollow } from '../../stores/followSync';
import { toast } from '../../utils/alert';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { EditPostModal } from '../../components/social/EditPostModal';
import ReportModal from './ReportModal';
import { useTheme } from '../../hooks/useTheme';
import { ProfileSkeleton } from '../../components/social/Skeleton';
import { BottomSheet } from '../../components/social/BottomSheet';
import { QRCardSheet } from '../../components/social/QRCardSheet';
import { useProfileExtraTabs, ExtraTabRow, isExtraTab, EXTRA_EMPTY } from '../../components/social/ProfileExtraTabs';
import { shareLink, kchatLink } from '../../utils/links';
import { usePinnedPost, hidePinned } from '../../stores/pinSync';

type Tab = 'posts' | 'replies' | 'mitaa' | 'barazas';
const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'mitaa', label: 'Mitaa' },
  { key: 'barazas', label: 'Barazas' },
];
export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { username } = route.params || {};
  const { user } = useAuthStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const { fetchProfile } = useProfileStore();
  const { blockUser, muteUser, unblockUser, blockedUserIds } = useSocialStore();

  const [profile, setProfile] = useState<any>(null);
  // Follow state lives in followSync: the button flips at once and the counts move in one place
  const followState = useFollowState(profile?.id, profile ? {
    isFollowing: profile.isFollowing, followRequestStatus: profile.followRequestStatus,
    is_private: profile.is_private, follower_count: profile.follower_count, username: profile.username,
  } : null);
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
  const [qrOpen, setQrOpen] = useState(false);
  const extra = useProfileExtraTabs(username, profile?.id, activeTab);
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
    deletePostWithUndo(postId, {
      hide: () => {
        const back = hideFromList(setPosts as any, postId);
        const unpin = hidePinned(user?.id, postId);
        return () => { back(); unpin(); };
      },
    });
  }, [user?.id]);

  // Their pinned post leads the Posts tab (what you pin yourself shows here at once too)
  const pinnedPost = usePinnedPost(profile?.id, profile ? { id: profile.pinned_post_id, post: profile.pinned_post } : null, posts);

  const handleEditPress = useCallback((postId: string, content: string, visibility: 'public' | 'followers') => {
    setEditTarget({ id: postId, content, visibility });
  }, []);

  // Realtime: live-update follower count (my own follow echoing back is ignored, it already counted)
  useEffect(() => {
    if (!profile?.id) return;
    const id = profile.id;
    const channel = supabase
      .channel(`follows-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${id}` },
        (payload: any) => onRealtimeFollow(id, 1, payload?.new?.follower_id)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'follows', filter: `following_id=eq.${id}` },
        (payload: any) => onRealtimeFollow(id, -1, payload?.old?.follower_id)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Follow / Requested / Following flips at once; followSync settles it with the server
  const handleFollowToggle = useCallback(() => {
    if (!profile) return;
    haptic.like();
    toggleFollow(profile.id, {
      isFollowing: profile.isFollowing, followRequestStatus: profile.followRequestStatus,
      is_private: profile.is_private, follower_count: profile.follower_count, username: profile.username,
    });
  }, [profile]);

  const openChat = (conversationId: string) => navigation.navigate('DMConversation', {
    conversationId,
    participantName: profile.full_name,
    participantUsername: profile.username,
    participantAvatar: profile.avatar_url,
  });

  const handleMessage = async () => {
    if (!profile || messageLoading) return;
    // A chat with them already on the phone opens straight away
    const existing = useDMStore.getState().conversations.find(c => c.participants?.some(p => p.id === profile.id));
    if (existing) { openChat(existing.id); return; }
    setMessageLoading(true);
    try {
      const res = await apiClient.startDMConversation(profile.id);
      if (res.success && res.data) openChat((res.data as any).id);
      else toast("Couldn't open the chat", { kind: 'error' });
    } catch {}
    setMessageLoading(false);
  };

  const handleMoreOptions = useCallback(() => { if (profile) setMoreSheet(true); }, [profile]);

  const doBlock = () => {
    if (!profile) return;
    const { id, username: u } = profile;
    // Leave at once; the block goes through in the background
    navigation.goBack();
    blockUser(id).then(() => {
      if (!useSocialStore.getState().blockedUserIds.includes(id)) {
        toast(`Couldn't block @${u}`, { kind: 'error', message: 'Check your connection and try again.', duration: 5000 });
      }
    }).catch(() => toast(`Couldn't block @${u}`, { kind: 'error', message: 'Check your connection and try again.', duration: 5000 }));
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
      await shareLink(kchatLink.profile(profile.username), `Follow ${profile.full_name ?? profile.username} on KChat`);
    } catch {}
  };

  const handleTabPress = (tab: Tab) => {
    if (tab === activeTab) return;
    haptic.tap();
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

  const isFollowingNow = followState.status === 'following';
  const isPending = followState.status === 'requested';
  const isLocked = !!(profile?.is_private && !isFollowingNow && !isOwnProfile);
  const onExtraTab = isExtraTab(activeTab);
  const pinnedShown = !isLocked && !onExtraTab && pinnedPost && isShowable(pinnedPost) ? pinnedPost : null;
  const listData = isLocked ? [] : onExtraTab
    ? extra.data.filter((i: any) => i.__kind || isShowable(i))
    : pinnedShown
      ? [pinnedShown, ...posts.filter((p: any) => p.id !== pinnedShown.id && isShowable(p))]
      : posts.filter(isShowable);
  // What the header shows: the fetched profile with the live follow state and count laid over it
  const shownProfile = profile ? {
    ...profile,
    isFollowing: isFollowingNow,
    followRequestStatus: isPending ? 'pending' : null,
    follower_count: followState.followerCount ?? profile.follower_count,
  } : profile;

  // Determine follow button label
  const getFollowLabel = () => {
    if (isFollowingNow) return 'Following';
    if (isPending) return 'Requested';
    return 'Follow';
  };
  const followIsPrimary = !isFollowingNow && !isPending;

  const openFollowList = (initialTab: 'followers' | 'following') =>
    navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab });

  // Light clock and battery over a photo cover, dark once the solid bar has taken over
  const isFocusedForBar = useIsFocused();
  const [barDark, setBarDark] = useState(!profile?.banner_url);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => setBarDark(!profile?.banner_url || value > 150));
    return () => scrollY.removeListener(id);
  }, [scrollY, profile?.banner_url]);

  const ListHeader = (
    <ProfileHeader
      scrollY={scrollY}
      profile={shownProfile}
      isOwn={isOwnProfile}
      onShare={handleShareProfile}
      onQrCard={() => { Haptics.selectionAsync().catch(() => {}); setQrOpen(true); }}
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
        data={listData}
        keyExtractor={(item: any) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={onExtraTab ? extra.loadMore : loadMorePosts}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }: { item: any }) => item.__kind ? (
          <ExtraTabRow item={item} onOpenPost={(postId) => navigation.navigate('PostDetail', { postId })} />
        ) : (
          <PostCard
            post={item}
            pinned={!!pinnedShown && item.id === pinnedShown.id}
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
          (onExtraTab ? extra.loadingMore : postsLoadingMore) ? <ActivityIndicator style={{ marginVertical: 16 }} color={T.accent} /> : null
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isLocked ? null : onExtraTab && extra.loading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} color={T.accent} />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.wallIcon}>
                <Ionicons name={onExtraTab ? EXTRA_EMPTY[activeTab as 'replies'].icon : 'document-text-outline'} size={26} color={T.textMuted} />
              </View>
              <Text style={styles.wallTitle}>{onExtraTab ? EXTRA_EMPTY[activeTab as 'replies'].title : 'No posts yet'}</Text>
              <Text style={styles.wallSub}>
                {onExtraTab
                  ? EXTRA_EMPTY[activeTab as 'replies'].sub(isOwnProfile ? null : profile?.username)
                  : `When @${profile?.username} posts, it will show up here.`}
              </Text>
            </View>
          )
        }
      />

      {isFocusedForBar ? <StatusBar barStyle={barDark ? (T.bg === '#000000' ? 'light-content' : 'dark-content') : 'light-content'} animated /> : null}
      <ProfileChrome
        scrollY={scrollY}
        insetTop={insets.top}
        title={profile?.full_name || profile?.username}
        verified={profile?.is_verified}
        left={[{ key: 'back', icon: 'chevron-back', label: 'Go back', onPress: () => navigation.goBack() }]}
        right={[
          { key: 'share', icon: 'share-outline', label: 'Share profile', onPress: handleShareProfile },
          ...(isOwnProfile ? [] : [{ key: 'more', icon: 'ellipsis-horizontal' as const, label: 'More options', onPress: handleMoreOptions }]),
        ]}
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
          onSaved={(content, visibility) => {
            setPosts(prev => prev.map(p => (p.id === editTarget.id ? { ...p, content, visibility } : p)));
            setProfile((prev: any) => (prev?.pinned_post?.id === editTarget.id ? { ...prev, pinned_post: { ...prev.pinned_post, content, visibility } } : prev));
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />

      <QRCardSheet visible={qrOpen} username={profile?.username} onClose={() => setQrOpen(false)} />

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
