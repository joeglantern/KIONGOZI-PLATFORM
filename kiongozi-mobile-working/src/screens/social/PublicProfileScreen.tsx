import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { PostCard } from '../../components/social/PostCard';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { username } = route.params || {};
  const { user } = useAuthStore();
  const { fetchProfile, updateFollowState } = useProfileStore();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [prof, postsRes] = await Promise.all([
        fetchProfile(username),
        apiClient.getUserPosts(username)
      ]);
      setProfile(prof);
      if (postsRes.success) setPosts(postsRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await apiClient.unfollowUser(profile.id);
      } else {
        await apiClient.followUser(profile.id);
      }
      updateFollowState(username, !profile.isFollowing);
      setProfile((p: any) => p ? { ...p, isFollowing: !p.isFollowing } : p);
    } catch {}
    setFollowLoading(false);
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#1a365d" /></View>;
  }

  const isOwnProfile = user?.id === profile?.id;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerName}>{profile?.full_name}</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onProfilePress={(u) => navigation.navigate('PublicProfile', { username: u })}
          />
        )}
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
                {!isOwnProfile && (
                  <TouchableOpacity
                    onPress={handleFollowToggle}
                    disabled={followLoading}
                    style={[styles.followBtn, profile?.isFollowing && styles.followingBtn]}
                  >
                    <Text style={[styles.followText, profile?.isFollowing && styles.followingText]}>
                      {followLoading ? '...' : profile?.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
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

              <Text style={styles.fullName}>{profile?.full_name}</Text>
              <Text style={styles.username}>@{profile?.username}</Text>
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              <View style={styles.statsRow}>
                <Text style={styles.stat}>
                  <Text style={styles.statNum}>{profile?.following_count}</Text> Following
                </Text>
                <Text style={styles.stat}>
                  <Text style={styles.statNum}>{profile?.follower_count}</Text> Followers
                </Text>
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
  },
  headerName: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  banner: { width: '100%', height: 120 },
  profileSection: { padding: 16 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, marginTop: -36 },
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
  followText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  followingText: { color: '#1a365d' },
  editBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  editText: { fontWeight: '700', fontSize: 14, color: '#1a202c' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  postsHeader: { fontSize: 16, fontWeight: '700', color: '#1a202c', paddingHorizontal: 16, paddingBottom: 8 },
  noPosts: { padding: 24, textAlign: 'center', color: '#a0aec0' },
});
