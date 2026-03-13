import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, FlatList, Alert
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

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { username } = route.params || {};
  const { user } = useAuthStore();
  const { fetchProfile, updateFollowState } = useProfileStore();
  const { blockUser, muteUser } = useSocialStore();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string; displayName: string } | null>(null);
  const { deletePost: deleteFromStore } = useSocialStore();

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [prof, postsRes] = await Promise.all([
        fetchProfile(username),
        apiClient.getUserPosts(username)
      ]);
      if (!prof) {
        setNotFound(true);
      } else {
        setProfile(prof);
        if (postsRes.success) {
          setPosts((postsRes as any).data || []);
          setPostsCursor((postsRes as any).nextCursor || null);
        }
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

  const handleMoreOptions = useCallback(() => {
    if (!profile) return;
    Alert.alert(
      profile.full_name,
      undefined,
      [
        {
          text: `Report @${profile.username}`,
          onPress: () => setReportTarget({ type: 'user', id: profile.id, displayName: `@${profile.username}` }),
        },
        {
          text: `Block @${profile.username}`,
          style: 'destructive',
          onPress: () => Alert.alert(
            `Block @${profile.username}?`,
            'They will no longer be able to see your posts or contact you.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: async () => {
                  await blockUser(profile.id);
                  navigation.goBack();
                },
              },
            ]
          ),
        },
        {
          text: `Mute @${profile.username}`,
          onPress: () => Alert.alert(
            `Mute @${profile.username}?`,
            'Their posts will be hidden from your feed. They won\'t know they\'ve been muted.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Mute',
                onPress: async () => {
                  await muteUser(profile.id);
                  Alert.alert('Muted', `@${profile.username} has been muted.`);
                },
              },
            ]
          ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [profile, blockUser, muteUser, navigation]);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#1a365d" /></View>;
  }

  if (notFound) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1a202c" />
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
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerName}>{profile?.full_name}</Text>
        {!isOwnProfile ? (
          <TouchableOpacity onPress={handleMoreOptions} style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#1a202c" />
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
          postsLoadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#1a365d" /> : null
        }
        ListHeaderComponent={
          <View>
            {/* Banner */}
            {profile?.banner_url ? (
              <Image source={{ uri: profile.banner_url }} style={styles.banner} />
            ) : (
              <View style={[styles.banner, { backgroundColor: '#1a365d' }]} />
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
                        <Ionicons name="mail-outline" size={18} color="#1a365d" />
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

            <View style={styles.divider} />
            <Text style={styles.postsHeader}>Posts</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.noPosts}>No posts yet</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  headerName: { fontSize: 17, fontWeight: '700', color: '#1a202c', flex: 1, textAlign: 'center' },
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
    borderColor: '#1a365d',
  },
  messageBtnText: { color: '#1a365d', fontWeight: '600', fontSize: 14 },
  fullName: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  username: { color: '#718096', fontSize: 15, marginBottom: 6 },
  bio: { color: '#2d3748', fontSize: 15, lineHeight: 22, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: 14, color: '#718096' },
  statNum: { fontWeight: '700', color: '#1a202c' },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a365d',
  },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a365d' },
  requestedBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#a0aec0' },
  followText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  followingText: { color: '#1a365d' },
  editBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  editText: { fontWeight: '700', fontSize: 14, color: '#1a202c' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  postsHeader: { fontSize: 16, fontWeight: '700', color: '#1a202c', paddingHorizontal: 16, paddingBottom: 8 },
  noPosts: { padding: 24, textAlign: 'center', color: '#a0aec0' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: '#1a202c' },
  notFoundSub: { fontSize: 15, color: '#718096', textAlign: 'center' },
  goBackBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: '#1a365d',
    borderRadius: 20,
  },
  goBackText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
