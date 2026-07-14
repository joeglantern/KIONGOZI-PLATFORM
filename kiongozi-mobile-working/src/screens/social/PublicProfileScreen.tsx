import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { PostCard } from '../../components/social/PostCard';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { EditPostModal } from '../../components/social/EditPostModal';
import ReportModal from './ReportModal';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
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
    apiClient.deletePost(postId).then(() => {
      setPosts(prev => prev.filter(p => p.id !== postId));
      deleteFromStore(postId);
    }).catch(() => {});
  }, [deleteFromStore]);

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

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#5CB85C" /></View>;
  }

  if (notFound) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerName}>Profile</Text>
        </View>
        <View style={styles.notFound}>
          <Ionicons name="person-outline" size={56} color="#e2e8f0" />
          <Text style={styles.notFoundTitle}>User not found</Text>
          <Text style={styles.notFoundSub}>@{username} doesn't exist or may have been removed.</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Go back</Text>
          </TouchableOpacity>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerName}>@{profile?.username}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.blockedWall}>
          <Ionicons name="ban" size={52} color="#e2e8f0" />
          <Text style={styles.blockedTitle}>You've blocked this user</Text>
          <Text style={styles.blockedSub}>Unblock to see their profile and posts.</Text>
          <TouchableOpacity
            style={styles.unblockBtn}
            onPress={() => setUnblockConfirmSheet(true)}
          >
            <Text style={styles.unblockText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Blocked-by state — viewer is blocked by this user (Instagram-style: neutral message, no hint)
  if (!isOwnProfile && profile?.isBlockedBy) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerName}>@{profile.username}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.blockedWall}>
          <View style={styles.blockedByIconWrap}>
            <Ionicons name="lock-closed-outline" size={36} color="#94a3b8" />
          </View>
          <Text style={styles.blockedByName}>{profile.full_name}</Text>
          <Text style={styles.blockedByUsername}>@{profile.username}</Text>
          <Text style={styles.blockedByMsg}>This account's content isn't available.</Text>
        </View>
      </View>
    );
  }

  // Determine follow button label
  const getFollowLabel = () => {
    if (profile?.isFollowing) return 'Following';
    if (profile?.followRequestStatus === 'pending') return 'Requested';
    return 'Follow';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerName}>{profile?.full_name}</Text>
        {!isOwnProfile ? (
          <TouchableOpacity onPress={handleMoreOptions} style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
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
          postsLoadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#5CB85C" /> : null
        }
        ListHeaderComponent={
          <View>
            {/* Banner */}
            {profile?.banner_url ? (
              <Image source={{ uri: profile.banner_url }} style={styles.banner} />
            ) : (
              <View style={[styles.banner, { backgroundColor: T.surface }]} />
            )}

            {/* Profile info */}
            <View style={styles.profileSection}>
              <View style={styles.avatarRow}>
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  size={72}
                  isBot={profile?.is_bot}
                  isVerified={profile?.is_verified}
                />
                <View style={styles.actionButtons}>
                  {!isOwnProfile && (
                    <>
                      <TouchableOpacity
                        onPress={handleMessage}
                        disabled={messageLoading}
                        style={styles.messageBtn}
                      >
                        <Ionicons name="mail-outline" size={18} color="#5CB85C" />
                        <Text style={styles.messageBtnText}>
                          {messageLoading ? '...' : 'Message'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleFollowToggle}
                        style={[
                          styles.followBtn,
                          profile?.isFollowing && styles.followingBtn,
                          profile?.followRequestStatus === 'pending' && styles.requestedBtn,
                        ]}
                      >
                        <Text style={[
                          styles.followText,
                          (profile?.isFollowing || profile?.followRequestStatus === 'pending') && styles.followingText,
                        ]}>
                          {getFollowLabel()}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {isOwnProfile && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('EditProfile')}
                      style={styles.editBtn}
                    >
                      <Text style={styles.editText}>Edit profile</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.fullName}>{profile?.full_name}</Text>
              <Text style={styles.username}>@{profile?.username}</Text>
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              <View style={styles.statsRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab: 'following' })}
                >
                  <Text style={styles.stat}>
                    <Text style={styles.statNum}>{profile?.following_count}</Text> Following
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('FollowList', { userId: profile.id, username: profile.username, initialTab: 'followers' })}
                >
                  <Text style={styles.stat}>
                    <Text style={styles.statNum}>{profile?.follower_count}</Text> Followers
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {profile?.is_private && !profile?.isFollowing && !isOwnProfile ? (
              <View style={styles.privateWall}>
                <View style={styles.privateIconWrap}>
                  <Ionicons name="lock-closed" size={28} color="#5CB85C" />
                </View>
                <Text style={styles.privateTitle}>This account is private</Text>
                <Text style={styles.privateSub}>
                  Follow this account to see their posts.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.divider} />
                <Text style={styles.postsHeader}>Posts</Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          !(profile?.is_private && !profile?.isFollowing && !isOwnProfile)
            ? <Text style={styles.noPosts}>No posts yet</Text>
            : null
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
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 52,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
      backgroundColor: T.bg,
      justifyContent: 'space-between',
    },
    headerName: { fontSize: 17, fontWeight: '700', color: T.text, flex: 1, textAlign: 'center' },
    moreBtn: { padding: 4 },
    banner: { width: '100%', height: 120 },
    profileSection: { padding: 16 },
    avatarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 12,
      marginTop: -36,
    },
    actionButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    messageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: T.accent,
    },
    messageBtnText: { color: T.accent, fontWeight: '600', fontSize: 14 },
    fullName: { fontSize: 20, fontWeight: '800', color: T.text },
    username: { color: T.textSub, fontSize: 15, marginBottom: 6 },
    bio: { color: T.text, fontSize: 15, lineHeight: 22, marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 16 },
    stat: { fontSize: 14, color: T.textSub },
    statNum: { fontWeight: '700', color: T.text },
    followBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: T.text,
    },
    followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.border },
    requestedBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.textMuted },
    followText: { color: T.bg, fontWeight: '700', fontSize: 14 },
    followingText: { color: T.text },
    editBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: T.border },
    editText: { fontWeight: '700', fontSize: 14, color: T.text },
    divider: { height: 1, backgroundColor: T.borderLight, marginVertical: 8 },
    postsHeader: { fontSize: 16, fontWeight: '700', color: T.text, paddingHorizontal: 16, paddingBottom: 8 },
    noPosts: { padding: 24, textAlign: 'center', color: T.textMuted },
    privateWall: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
      gap: 10,
    },
    privateIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: T.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    privateTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    privateSub: { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 21 },
    blockedWall: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    blockedTitle: { fontSize: 20, fontWeight: '700', color: T.text },
    blockedSub: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    unblockBtn: {
      marginTop: 8,
      paddingHorizontal: 28,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: T.accent,
    },
    unblockText: { color: T.accent, fontWeight: '700', fontSize: 15 },
    blockedByIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: T.surface,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 4,
    },
    blockedByName: { fontSize: 18, fontWeight: '700', color: T.text },
    blockedByUsername: { fontSize: 14, color: T.textMuted, marginBottom: 6 },
    blockedByMsg: { fontSize: 15, color: T.textMuted, textAlign: 'center' },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    notFoundTitle: { fontSize: 20, fontWeight: '700', color: T.text },
    notFoundSub: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    goBackBtn: {
      marginTop: 8,
      paddingHorizontal: 28,
      paddingVertical: 10,
      backgroundColor: T.accent,
      borderRadius: 20,
    },
    goBackText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
