import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  ScrollView, Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
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
    setSearchResults(null);
    searchTimer.current = setTimeout(() => doSearch(text), 400);
  }, [doSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults(null);
    setSearchError(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const isSearching = query.length > 0;
  const isSuggesting = isSearching && searchResults === null && !searchLoading && !searchError;
  const isResults = isSearching && (searchResults !== null || !!searchError);

  const suggestedTags = useMemo(() => {
    if (!isSearching || !trending?.hashtags) return [];
    const q = query.toLowerCase().replace(/^#/, '');
    return trending.hashtags.filter((h: any) => h.tag.toLowerCase().includes(q)).slice(0, 6);
  }, [query, trending, isSearching]);

  // ── Default header (trending chips) ───────────────────────────────────────
  const DefaultHeader = (
    <>
      {trending?.hashtags?.length ? (
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending in Kenya</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {trending.hashtags.map((h: any) => (
              <TouchableOpacity key={h.id} style={styles.chip} onPress={() => handleSearch(`#${h.tag}`)}>
                <Text style={styles.chipTag}>#{h.tag}</Text>
                {h.use_count > 0 && <Text style={styles.chipCount}> {h.use_count}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {explorePosts.length > 0 ? (
        <Text style={styles.sectionTitle2}>For You</Text>
      ) : null}
    </>
  );

  // ── Search result items ─────────────────────────────────────────────────
  const resultItems = useMemo(() => {
    if (!searchResults) return [];
    const items: any[] = [];
    if (searchResults.users?.length) {
      items.push({ _type: 'section', _label: 'People', id: '__people' });
      searchResults.users.forEach(u => items.push({ ...u, _type: 'user' }));
    }
    if (searchResults.posts?.length) {
      items.push({ _type: 'section', _label: 'Posts', id: '__posts' });
      searchResults.posts.forEach(p => items.push({ ...p, _type: 'post' }));
    }
    return items;
  }, [searchResults]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Explore</Text>
          <TouchableOpacity
            style={styles.findFriendsIcon}
            onPress={() => navigation.navigate('FindFriends')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="person-add-outline" size={22} color={T.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={T.textSub} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, people, hashtags..."
            placeholderTextColor={T.placeholder}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={() => query.trim() && doSearch(query)}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={T.placeholder} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions — show while typing, before debounce fires */}
      {isSuggesting ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {suggestedTags.length > 0 && (
            <View>
              <Text style={styles.suggSectionLabel}>TAGS</Text>
              {suggestedTags.map((h: any) => (
                <TouchableOpacity
                  key={h.id}
                  style={styles.suggRow}
                  onPress={() => doSearch(`#${h.tag}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggIconWrap}>
                    <Ionicons name="pricetag" size={15} color={T.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggName}>#{h.tag}</Text>
                    {h.use_count > 0 && <Text style={styles.suggSub}>{h.use_count} posts</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.searchAllRow}
            onPress={() => doSearch(query)}
            activeOpacity={0.7}
          >
            <View style={styles.suggIconWrap}>
              <Ionicons name="search" size={15} color={T.accent} />
            </View>
            <Text style={styles.searchAllText}>
              Search for <Text style={{ color: T.accent, fontWeight: '600' }}>"{query}"</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : searchLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      ) : isResults && searchError ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={44} color={T.border} />
          <Text style={styles.errorText}>{searchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => doSearch(query)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isResults ? (
        // ── Search results: users + posts ─────────────────────────────
        <FlatList
          data={resultItems}
          keyExtractor={(item) => `${item._type}_${item.id}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item._type === 'section') {
              return <Text style={styles.resultsSection}>{item._label}</Text>;
            }
            if (item._type === 'user') {
              return (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() => navigation.navigate('PublicProfile', { username: item.username })}
                >
                  <UserAvatar avatarUrl={item.avatar_url} size={46} isVerified={item.is_verified} isBot={item.is_bot} />
                  <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={styles.userName}>{item.full_name}</Text>
                      {item.is_verified && (
                        <VerifiedBadge size={15} />
                      )}
                    </View>
                    <Text style={styles.userHandle}>@{item.username}</Text>
                    {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
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
          ListEmptyComponent={
            searchResults ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={44} color={T.border} />
                <Text style={styles.emptySearchText}>No results for "{query}"</Text>
              </View>
            ) : null
          }
        />
      ) : (
        // ── Default: full-width feed ──────────────────────────────────
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
          ListHeaderComponent={DefaultHeader}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              onProfilePress={(username) => navigation.navigate('PublicProfile', { username })}
              onHashtagPress={(tag) => handleSearch(`#${tag}`)}
            />
          )}
          ListFooterComponent={
            exploreLoading && explorePosts.length > 0 ? (
              <ActivityIndicator style={{ margin: 16 }} color={T.accent} />
            ) : null
          }
          ListEmptyComponent={
            exploreLoading ? null : (
              <View style={styles.emptySearch}>
                <Ionicons name="globe-outline" size={44} color={T.border} />
                <Text style={styles.emptySearchText}>Nothing to explore yet</Text>
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
      paddingTop: 52,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.borderLight,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 26, fontWeight: '700', color: T.text,
      letterSpacing: -0.6, fontFamily: 'SpaceGrotesk_700Bold',
    },
    findFriendsIcon: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
      alignItems: 'center', justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.inputBg, borderRadius: 14,
      paddingHorizontal: 13, paddingVertical: 11,
      gap: 8, borderWidth: 1, borderColor: T.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: T.text },

    // Trending
    trendingSection: { paddingTop: 16, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 16, fontWeight: '700', color: T.text,
      marginBottom: 10, fontFamily: 'SpaceGrotesk_700Bold',
    },
    sectionTitle2: {
      fontSize: 16, fontWeight: '700', color: T.text,
      paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2,
      fontFamily: 'SpaceGrotesk_700Bold',
    },
    chipsRow: { gap: 8, paddingBottom: 12 },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 16, backgroundColor: T.acc10,
      borderWidth: 1, borderColor: T.acc25,
    },
    chipTag: { color: T.accent, fontWeight: '700', fontSize: 14 },
    chipCount: { color: T.textMuted, fontSize: 11 },

    // Suggestions panel
    suggSectionLabel: {
      fontSize: 11, fontWeight: '800', color: T.textMuted,
      letterSpacing: 0.9, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    },
    suggRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    suggIconWrap: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: T.acc10, alignItems: 'center', justifyContent: 'center',
    },
    suggName: { fontSize: 15, fontWeight: '600', color: T.text },
    suggSub: { fontSize: 13, color: T.textMuted, marginTop: 1 },
    searchAllRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    searchAllText: { fontSize: 15, color: T.textSub },

    // Results
    resultsSection: {
      fontSize: 11, fontWeight: '800', color: T.textMuted,
      letterSpacing: 0.9, paddingHorizontal: 16, paddingVertical: 10,
    },
    userRow: {
      flexDirection: 'row', padding: 14, gap: 12,
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
      backgroundColor: T.bg,
    },
    userInfo: { flex: 1 },
    userName: { fontWeight: '700', fontSize: 15, color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    userHandle: { color: T.textSub, fontSize: 14 },
    userBio: { color: T.textSub, fontSize: 13, marginTop: 2 },

    // Empty / error
    emptySearch: { alignItems: 'center', padding: 48, gap: 12 },
    emptySearchText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    errorText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 28, paddingVertical: 10, backgroundColor: T.accent, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
