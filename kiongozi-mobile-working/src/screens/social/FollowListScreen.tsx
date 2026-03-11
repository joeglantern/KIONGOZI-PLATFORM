import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';

type Tab = 'followers' | 'following';

interface FollowUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
}

export default function FollowListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, username, initialTab = 'followers' } = route.params || {};

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const fetchFollowers = useCallback(async () => {
    if (loadingFollowers) return;
    setLoadingFollowers(true);
    try {
      const res = await apiClient.getFollowers(userId);
      if (res.success && res.data) setFollowers(res.data);
    } catch {}
    setLoadingFollowers(false);
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    if (loadingFollowing) return;
    setLoadingFollowing(true);
    try {
      const res = await apiClient.getFollowing(userId);
      if (res.success && res.data) setFollowing(res.data);
    } catch {}
    setLoadingFollowing(false);
  }, [userId]);

  useEffect(() => {
    fetchFollowers();
    fetchFollowing();
  }, [userId]);

  const data = activeTab === 'followers' ? followers : following;
  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;

  const renderUser = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
      activeOpacity={0.7}
    >
      <UserAvatar avatarUrl={item.avatar_url} size={46} isVerified={item.is_verified} />
      <View style={styles.userInfo}>
        <Text style={styles.fullName} numberOfLines={1}>{item.full_name}</Text>
        <Text style={styles.handle}>@{item.username}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{username}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            Followers
          </Text>
          {activeTab === 'followers' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
          {activeTab === 'following' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading && data.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  activeTab: {},
  tabText: { fontSize: 15, fontWeight: '600', color: '#a0aec0' },
  activeTabText: { color: '#1a365d' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#1a365d',
    borderRadius: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  userInfo: { flex: 1 },
  fullName: { fontSize: 15, fontWeight: '700', color: '#1a202c' },
  handle: { fontSize: 13, color: '#718096', marginTop: 1 },
  bio: { fontSize: 13, color: '#4a5568', marginTop: 2 },
  empty: { alignItems: 'center', padding: 48 },
  emptyText: { color: '#a0aec0', fontSize: 15 },
});
