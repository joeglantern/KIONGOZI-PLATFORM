import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { initialQuery } = (route.params || {}) as any;
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const { explorePosts, exploreLoading, exploreCursor, fetchExploreFeed } = useSocialStore();
  const [query, setQuery] = useState(initialQuery || '');
  const [searchResults, setSearchResults] = useState<{ posts: any[]; users: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trending, setTrending] = useState<{ hashtags: any[]; posts: any[] } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchExploreFeed(true);
    loadTrending();
  }, []);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery]);

  const loadTrending = async () => {
    try {
      const res = await apiClient.getTrending();
      if (res.success) setTrending(res.data as any);
    } catch {}
  };

  const doSearch = useCallback(async (text: string) => {
    if (!text.trim()) { setSearchResults(null); setSearchError(null); return; }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const searchText = text.startsWith('#') ? text.slice(1) : text;
      const res = await apiClient.searchSocial(searchText.trim());
      if (res.success) setSearchResults(res.data as any);
      else setSearchError('Search failed. Please try again.');
    } catch {
      setSearchError('Network error — check your connection.');
    }
    setSearchLoading(false);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setSearchResults(null); setSearchError(null); return; }
    searchTimer.current = setTimeout(() => doSearch(text), 400);
  }, [doSearch]);

  const isSearching = query.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={T.textSub} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, people, hashtags..."
            placeholderTextColor={T.placeholder}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearchResults(null); }}>
              <Ionicons name="close-circle" size={18} color={T.placeholder} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      ) : isSearching && searchError ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={44} color={T.border} />
          <Text style={styles.errorText}>{searchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => doSearch(query)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isSearching && searchResults ? (
        <FlatList
          data={[
            ...searchResults.users.map(u => ({ ...u, _type: 'user' })),
            ...searchResults.posts.map(p => ({ ...p, _type: 'post' }))
          ]}
          keyExtractor={(item) => `${item._type}_${item.id}`}
          renderItem={({ item }) => {
            if (item._type === 'user') {
              return (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
                >
                  <UserAvatar avatarUrl={item.avatar_url} size={44} isVerified={item.is_verified} isBot={item.is_bot} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.full_name}</Text>
                    <Text style={styles.userHandle}>@{item.username}</Text>
                    {item.bio && <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>}
                  </View>
                </TouchableOpacity>
              );
            }
            return (
              <PostCard
                post={item}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                onProfilePress={(username) => navigation.navigate('PublicProfile', { username })}
                onHashtagPress={(tag) => handleSearch(`#${tag}`)}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={explorePosts}
          keyExtractor={(item) => item.id}
          onEndReached={() => { if (exploreCursor) fetchExploreFeed(); }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={exploreLoading && explorePosts.length === 0}
              onRefresh={() => { fetchExploreFeed(true); loadTrending(); }}
              tintColor={T.accent}
            />
          }
          ListHeaderComponent={
            trending?.hashtags?.length ? (
              <View style={styles.trendingSection}>
                <Text style={styles.sectionTitle}>Trending in Kenya</Text>
                {trending.hashtags.map((h: any) => (
                  <TouchableOpacity
                    key={h.id}
                    style={styles.hashtagRow}
                    onPress={() => handleSearch(`#${h.tag}`)}
                  >
                    <Text style={styles.hashtagText}>#{h.tag}</Text>
                    <Text style={styles.hashtagCount}>{h.use_count} posts</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              onProfilePress={(username) => navigation.navigate('PublicProfile', { username })}
              onHashtagPress={(tag) => handleSearch(`#${tag}`)}
            />
          )}
          ListFooterComponent={exploreLoading ? <ActivityIndicator style={{ margin: 16 }} color={T.accent} /> : null}
        />
      )}
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      paddingTop: 52,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.borderLight,
      gap: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: T.text },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.inputBg,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
      gap: 8, borderWidth: 1, borderColor: T.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: T.text },
    trendingSection: { padding: 16, backgroundColor: T.bg, marginBottom: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 12 },
    hashtagRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    hashtagText: { fontSize: 15, fontWeight: '600', color: T.text },
    hashtagCount: { fontSize: 13, color: T.textSub },
    userRow: {
      flexDirection: 'row', padding: 14, gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
      backgroundColor: T.bg,
    },
    userInfo: { flex: 1 },
    userName: { fontWeight: '700', fontSize: 15, color: T.text },
    userHandle: { color: T.textSub, fontSize: 14 },
    userBio: { color: T.textSub, fontSize: 13, marginTop: 2 },
    errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    errorText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 28, paddingVertical: 10, backgroundColor: T.accent, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
