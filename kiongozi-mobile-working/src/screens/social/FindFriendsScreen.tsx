import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Image,
} from 'react-native';

import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

export default function FindFriendsScreen() {
  const navigation = useNavigation<any>();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const { explorePosts, exploreLoading, fetchExploreFeed } = useSocialStore();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load explore feed + current user's following list on mount
  useEffect(() => {
    fetchExploreFeed(true);
    if (user?.id) {
      apiClient.getFollowing(user.id).then(res => {
        if (res.success && Array.isArray(res.data)) {
          setFollowingIds(new Set((res.data as any[]).map((u: any) => u.id)));
        }
      }).catch(() => {});
    }
  }, []);

  // Derive suggested users: unique authors from explore posts, excluding self and already-followed
  const suggestedUsers = useMemo(() => {
    const seen = new Set<string>();
    const users: any[] = [];
    for (const post of explorePosts) {
      const p = post.profiles ?? post;
      const id = p.id ?? post.user_id;
      if (!id || seen.has(id)) continue;
      if (id === user?.id) continue;           // skip own profile
      if (followingIds.has(id)) continue;      // skip already-followed
      seen.add(id);
      users.push({
        id,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        is_verified: p.is_verified,
        is_bot: p.is_bot,
      });
    }
    return users.slice(0, 30);
  }, [explorePosts, followingIds, user?.id]);

  const doSearch = useCallback(async (text: string) => {
    if (!text.trim()) { setResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await apiClient.searchSocial(text.trim());
      if (res.success && res.data) {
        const users = ((res.data as any).users ?? []) as any[];
        setResults(users.filter((u: any) => u.id !== user?.id && !followingIds.has(u.id)));
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setSearchLoading(false);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setResults(null); return; }
    searchTimer.current = setTimeout(() => doSearch(text), 350);
  }, [doSearch]);

  const handleFollowToggle = useCallback(async (targetId: string, currentlyFollowing: boolean) => {
    setFollowing(prev => ({ ...prev, [targetId]: !currentlyFollowing }));
    try {
      if (currentlyFollowing) {
        await apiClient.unfollowUser(targetId);
        setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
      } else {
        await apiClient.followUser(targetId);
        setFollowingIds(prev => new Set([...prev, targetId]));
      }
    } catch {
      setFollowing(prev => ({ ...prev, [targetId]: currentlyFollowing }));
    }
  }, []);

  const isSearching = query.length > 0;
  const displayList = isSearching ? (results ?? []) : suggestedUsers;
  const isLoading = isSearching ? searchLoading : exploreLoading;

  const renderUser = ({ item }: { item: any }) => {
    const isFollowing = following[item.id] ?? item.is_following ?? false;
    return (
      <TouchableOpacity
        style={styles.userRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
      >
        <UserAvatar
          avatarUrl={item.avatar_url}
          size={48}
          isVerified={item.is_verified}
          isBot={item.is_bot}
        />
        <View style={styles.userInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={styles.userName} numberOfLines={1}>{item.full_name || item.username}</Text>
            {item.is_verified && (
              <VerifiedBadge size={15} />
            )}
          </View>
          <Text style={styles.userHandle}>@{item.username}</Text>
          {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={() => handleFollowToggle(item.id, isFollowing)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const ListHeader = !isSearching ? (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>PEOPLE TO FOLLOW</Text>
    </View>
  ) : results !== null ? (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>RESULTS</Text>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Find Friends</Text>
          {!isSearching && suggestedUsers.length > 0 && (
            <Text style={styles.headerSub}>Active people from your community</Text>
          )}
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={T.textSub} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor={T.placeholder}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && doSearch(query)}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }}>
            <Ionicons name="close-circle" size={18} color={T.placeholder} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && displayList.length === 0 ? (
        <View style={styles.loadingWrap}>
          <LottieView
            source={require('../../../assets/lottie/community.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.loadingText}>Finding people to follow…</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={ListHeader}
          refreshControl={
            !isSearching ? (
              <RefreshControl
                refreshing={exploreLoading && suggestedUsers.length > 0}
                onRefresh={() => fetchExploreFeed(true)}
                tintColor={T.accent}
              />
            ) : undefined
          }
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.emptyState}>
                <LottieView
                  source={require('../../../assets/lottie/community.json')}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
                <Text style={styles.emptyTitle}>
                  {isSearching ? `No results for "${query}"` : 'No suggestions yet'}
                </Text>
                {!isSearching && (
                  <Text style={styles.emptyHint}>Try searching for people you know</Text>
                )}
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.borderLight,
    },
    backBtn: { marginRight: 4 },
    headerTitle: {
      fontSize: 22, fontWeight: '700', color: T.text,
      letterSpacing: -0.5, fontFamily: 'SpaceGrotesk_700Bold',
    },
    headerSub: { fontSize: 13, color: T.textSub, marginTop: 1 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      margin: 16, marginBottom: 4,
      backgroundColor: T.inputBg, borderRadius: 14,
      paddingHorizontal: 13, paddingVertical: 11,
      gap: 8, borderWidth: 1, borderColor: T.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: T.text },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    },
    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: T.textMuted, letterSpacing: 0.9,
    },
    userRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12, gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '700', color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    userHandle: { fontSize: 13, color: T.textSub, marginTop: 1 },
    userBio: { fontSize: 13, color: T.textMuted, marginTop: 2 },
    followBtn: {
      paddingHorizontal: 16, paddingVertical: 7,
      borderRadius: 20, backgroundColor: T.accent,
    },
    followBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.border },
    followingBtnText: { color: T.text },
    lottie: { width: 200, height: 200 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 40 },
    loadingText: { fontSize: 14, color: T.textSub },
    emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
    emptyTitle: { fontSize: 15, color: T.textSub, textAlign: 'center', fontWeight: '600' },
    emptyHint: { fontSize: 13, color: T.textMuted, textAlign: 'center' },
  });
}
