import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

export default function FindFriendsScreen() {
  const navigation = useNavigation<any>();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const { explorePosts } = useSocialStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive suggested users from explore posts authors (unique, skip duplicates)
  const suggestedUsers = useMemo(() => {
    const seen = new Set<string>();
    const users: any[] = [];
    for (const post of explorePosts) {
      const p = post.profiles ?? post;
      const id = p.id ?? post.user_id;
      if (id && !seen.has(id)) {
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
    }
    return users.slice(0, 20);
  }, [explorePosts]);

  const doSearch = useCallback(async (text: string) => {
    if (!text.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await apiClient.searchSocial(text.trim());
      if (res.success && res.data) {
        setResults((res.data as any).users ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setResults(null); return; }
    searchTimer.current = setTimeout(() => doSearch(text), 350);
  }, [doSearch]);

  const handleFollowToggle = useCallback(async (userId: string, currentlyFollowing: boolean) => {
    setFollowing(prev => ({ ...prev, [userId]: !currentlyFollowing }));
    try {
      if (currentlyFollowing) {
        await apiClient.unfollowUser(userId);
      } else {
        await apiClient.followUser(userId);
      }
    } catch {
      // Revert on failure
      setFollowing(prev => ({ ...prev, [userId]: currentlyFollowing }));
    }
  }, []);

  const displayList = results ?? suggestedUsers;

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
          <Text style={styles.userName} numberOfLines={1}>{item.full_name || item.username}</Text>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
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

      {/* Section label */}
      {!results && !loading && suggestedUsers.length > 0 && (
        <Text style={styles.sectionLabel}>SUGGESTED</Text>
      )}
      {results && !loading && (
        <Text style={styles.sectionLabel}>RESULTS</Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={T.border} />
              <Text style={styles.emptyText}>
                {query ? `No people found for "${query}"` : 'No suggestions yet'}
              </Text>
            </View>
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
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      margin: 16, marginBottom: 4,
      backgroundColor: T.inputBg, borderRadius: 14,
      paddingHorizontal: 13, paddingVertical: 11,
      gap: 8, borderWidth: 1, borderColor: T.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: T.text },
    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: T.textMuted,
      letterSpacing: 0.9, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
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
    emptyState: { alignItems: 'center', paddingTop: 64, gap: 12 },
    emptyText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
  });
}
