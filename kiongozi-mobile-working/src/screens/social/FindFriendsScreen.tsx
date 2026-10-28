import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  Pressable, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { useTheme, AppTheme } from '../../hooks/useTheme';

export default function FindFriendsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
  const inputRef = useRef<TextInput>(null);

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
      const p: any = post.profiles ?? post;
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

  const clearSearch = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setQuery('');
    setResults(null);
  };

  const handleFollowToggle = useCallback(async (targetId: string, currentlyFollowing: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
  const isLoading = isSearching ? (searchLoading || results === null) : exploreLoading;

  const renderUser = ({ item }: { item: any }) => {
    const isFollowing = following[item.id] ?? item.is_following ?? false;
    return (
      <Pressable
        style={({ pressed }) => [styles.userRow, pressed && { backgroundColor: T.surface }]}
        onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
      >
        <UserAvatar
          avatarUrl={item.avatar_url}
          size={44}
          isVerified={item.is_verified}
          isBot={item.is_bot}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{item.full_name || item.username}</Text>
            {item.is_verified && <VerifiedBadge size={14} />}
          </View>
          <Text style={styles.userHandle} numberOfLines={1}>@{item.username}</Text>
          {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
        </View>
        <Pressable
          onPress={() => handleFollowToggle(item.id, isFollowing)}
          hitSlop={6}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.pill,
            isFollowing ? styles.pillSecondary : styles.pillPrimary,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.pillText, { color: isFollowing ? T.text : T.bg }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  const ListHeader = !isSearching ? (
    displayList.length > 0 ? <Text style={styles.sectionLabel}>Suggested for you</Text> : null
  ) : results !== null && results.length > 0 ? (
    <Text style={styles.sectionLabel}>People</Text>
  ) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Find friends</Text>
        <Pressable
          onPress={() => navigation.navigate('Invite')}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Invite friends"
        >
          <Ionicons name="person-add-outline" size={22} color={T.text} />
        </Pressable>
      </View>

      {/* Search */}
      <Pressable style={styles.searchWrap} onPress={() => inputRef.current?.focus()}>
        <Ionicons name="search" size={18} color={T.textMuted} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search people"
          placeholderTextColor={T.textMuted}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && doSearch(query)}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={clearSearch} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={T.textMuted} />
          </Pressable>
        )}
      </Pressable>

      {isLoading && displayList.length === 0 ? (
        <PeopleSkeleton T={T} />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={
            !isSearching ? (
              <RefreshControl
                refreshing={exploreLoading && suggestedUsers.length > 0}
                onRefresh={() => fetchExploreFeed(true)}
                tintColor={T.textMuted}
                colors={[T.accent]}
              />
            ) : undefined
          }
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name={isSearching ? 'search-outline' : 'people-outline'} size={28} color={T.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isSearching ? 'No matches' : 'No suggestions yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {isSearching
                    ? `Nobody found for “${query.trim()}”. Check the spelling or try a username.`
                    : 'Search for people you know by name or username.'}
                </Text>
                {!isSearching && (
                  <Pressable
                    onPress={() => inputRef.current?.focus()}
                    style={({ pressed }) => [styles.pill, styles.pillSecondary, { marginTop: 20 }, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.pillText, { color: T.text }]}>Search people</Text>
                  </Pressable>
                )}
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function PeopleSkeleton({ T }: { T: AppTheme }) {
  return (
    <View style={{ paddingTop: 12 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: `${45 + ((i * 17) % 30)}%`, height: 12, borderRadius: 6, backgroundColor: T.surface2 }} />
            <View style={{ width: '30%', height: 10, borderRadius: 5, backgroundColor: T.surface2 }} />
          </View>
          <View style={{ width: 76, height: 32, borderRadius: 16, backgroundColor: T.surface2 }} />
        </View>
      ))}
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, backgroundColor: T.bg,
    },
    backBtn: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1, textAlign: 'center', fontSize: 17,
      fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text,
    },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      height: 42, borderRadius: 21, backgroundColor: T.surface2,
      marginHorizontal: 16, marginTop: 4, marginBottom: 8, paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontSize: 15, color: T.text, paddingVertical: 0 },
    sectionLabel: {
      fontSize: 13, color: T.textMuted,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    userRow: {
      flexDirection: 'row', alignItems: 'center',
      minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    },
    userInfo: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    userName: { fontSize: 15, fontWeight: '700', color: T.text, flexShrink: 1 },
    userHandle: { fontSize: 14, color: T.textMuted, marginTop: 1 },
    userBio: { fontSize: 14, color: T.textSub, marginTop: 3 },
    pill: {
      height: 32, borderRadius: 16, paddingHorizontal: 14,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    pillPrimary: { backgroundColor: T.text },
    pillSecondary: { borderWidth: 1, borderColor: T.border },
    pillText: { fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  });
}
