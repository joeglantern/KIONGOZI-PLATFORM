import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  ScrollView, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 10;
const GRID_PADDING = 16;
const CARD_W = (SCREEN_W - GRID_PADDING * 2 - CARD_GAP) / 2;

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
  const featuredPost = !isSearching && explorePosts.length > 0 ? explorePosts[0] : null;
  const gridPosts = !isSearching && explorePosts.length > 1 ? explorePosts.slice(1) : [];

  const DefaultHeader = (
    <>
      {/* Trending chips */}
      {trending?.hashtags?.length ? (
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending in Kenya</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {trending.hashtags.map((h: any) => (
              <TouchableOpacity
                key={h.id}
                style={styles.chip}
                onPress={() => handleSearch(`#${h.tag}`)}
              >
                <Text style={styles.chipTag}>#{h.tag}</Text>
                {h.use_count > 0 && <Text style={styles.chipCount}>{h.use_count}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Top Posts label */}
      <Text style={styles.sectionTitle2}>Top Posts</Text>

      {/* Featured card */}
      {featuredPost && (
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => navigation.navigate('PostDetail', { postId: featuredPost.id })}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[T.accent, T.accentDeep]}
            start={{ x: 0.35, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredGradient}
          />
          <View style={styles.featuredBody}>
            <View style={styles.featuredAvatarRow}>
              <UserAvatar avatarUrl={featuredPost.profiles?.avatar_url} size={32} />
              <Text style={styles.featuredName}>{featuredPost.profiles?.full_name || 'Unknown'}</Text>
            </View>
            <Text style={styles.featuredContent} numberOfLines={3}>{featuredPost.content}</Text>
            <View style={styles.featuredMeta}>
              <Ionicons name="heart-outline" size={14} color={T.textSub} />
              <Text style={styles.featuredMetaText}>{featuredPost.like_count ?? 0}</Text>
              <Ionicons name="chatbubble-outline" size={14} color={T.textSub} />
              <Text style={styles.featuredMetaText}>{(featuredPost as any).reply_count ?? (featuredPost as any).replies_count ?? 0}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* 2-col grid label */}
      {gridPosts.length > 0 && (
        <Text style={[styles.sectionTitle2, { marginTop: 16 }]}>More Posts</Text>
      )}
    </>
  );

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
      ) : isSearching ? (
        <FlatList
          data={[
            ...(searchResults?.users || []).map((u: any) => ({ ...u, _type: 'user' })),
            ...(searchResults?.posts || []).map((p: any) => ({ ...p, _type: 'post' })),
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
        <FlatList
          data={gridPosts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          onEndReached={() => { if (exploreCursor) fetchExploreFeed(); }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl
              refreshing={exploreLoading && explorePosts.length === 0}
              onRefresh={() => { fetchExploreFeed(true); loadTrending(); }}
              tintColor={T.accent}
            />
          }
          ListHeaderComponent={DefaultHeader}
          renderItem={({ item }) => {
            const firstImage = item.post_media?.find((m: any) => m.media_type === 'image');
            return (
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                activeOpacity={0.82}
              >
                {firstImage ? (
                  <View style={styles.gridCardImage}>
                    <Image source={{ uri: firstImage.url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.45)']}
                      style={[StyleSheet.absoluteFillObject, { top: '40%' }]}
                    />
                  </View>
                ) : null}
                <View style={[styles.gridCardBody, !firstImage && styles.gridCardBodyOnly]}>
                  <Text style={styles.gridContent} numberOfLines={firstImage ? 2 : 4}>{item.content}</Text>
                  <View style={styles.gridMeta}>
                    <UserAvatar avatarUrl={item.profiles?.avatar_url} size={18} />
                    <Ionicons name="heart-outline" size={12} color={T.textMuted} />
                    <Text style={styles.gridMetaText}>{item.like_count ?? 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={exploreLoading && gridPosts.length > 0 ? <ActivityIndicator style={{ margin: 16 }} color={T.accent} /> : null}
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
    headerTitle: { fontSize: 26, fontWeight: '700', color: T.text, letterSpacing: -0.6, fontFamily: 'SpaceGrotesk_700Bold' },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.inputBg,
      borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11,
      gap: 8, borderWidth: 1, borderColor: T.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: T.text },
    trendingSection: { paddingTop: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 10, fontFamily: 'SpaceGrotesk_700Bold' },
    sectionTitle2: { fontSize: 16, fontWeight: '700', color: T.text, paddingHorizontal: 16, marginBottom: 8, fontFamily: 'SpaceGrotesk_700Bold' },
    chipsRow: { gap: 8, paddingBottom: 12 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 16, backgroundColor: T.acc10, borderWidth: 1, borderColor: T.acc25,
    },
    chipTag: { color: T.accent, fontWeight: '700', fontSize: 14 },
    chipCount: { color: T.textMuted, fontSize: 11 },
    featuredCard: {
      marginHorizontal: 16, marginBottom: 12,
      borderRadius: 20, borderWidth: 1, borderColor: T.borderLight,
      backgroundColor: T.card, overflow: 'hidden',
    },
    featuredGradient: { height: 100 },
    featuredBody: { padding: 14 },
    featuredAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    featuredName: { fontSize: 14, fontWeight: '700', color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    featuredContent: { fontSize: 14, color: T.text, lineHeight: 20, marginBottom: 10 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    featuredMetaText: { fontSize: 13, color: T.textSub },
    gridContainer: { paddingHorizontal: 16, paddingBottom: 20 },
    gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
    gridCard: { width: CARD_W, borderRadius: 16, borderWidth: 1, borderColor: T.borderLight, backgroundColor: T.card, overflow: 'hidden' },
    gridCardImage: { height: 90, overflow: 'hidden' },
    gridCardBody: { padding: 10 },
    gridCardBodyOnly: { paddingVertical: 14 },
    gridContent: { fontSize: 13, color: T.text, lineHeight: 18, marginBottom: 8 },
    gridMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    gridMetaText: { fontSize: 11, color: T.textMuted },
    userRow: {
      flexDirection: 'row', padding: 14, gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
      backgroundColor: T.bg,
    },
    userInfo: { flex: 1 },
    userName: { fontWeight: '700', fontSize: 15, color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    userHandle: { color: T.textSub, fontSize: 14 },
    userBio: { color: T.textSub, fontSize: 13, marginTop: 2 },
    emptySearch: { alignItems: 'center', padding: 48, gap: 12 },
    emptySearchText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    errorText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 28, paddingVertical: 10, backgroundColor: T.accent, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
