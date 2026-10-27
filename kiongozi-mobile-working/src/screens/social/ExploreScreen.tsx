// Explore: trending list, a photo/video mosaic, people to follow, then posts.
// Search keeps recent searches on the device and shows people first.
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl,
  ScrollView, Image, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/social/PostCard';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useSocialStore, Post } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

type Theme = ReturnType<typeof useTheme>;
const W = Dimensions.get('window').width;
const RECENTS_KEY = 'explore_recent_searches';
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n));

// ── Mosaic tile (photo, video thumbnail, or text) ──
const thumbCache = new Map<string, string>();
function Tile({ post, style, onPress, T }: { post: Post; style: any; onPress: () => void; T: Theme }) {
  const m = post.post_media?.[0];
  const isVideo = m?.media_type === 'video';
  const [thumb, setThumb] = useState<string | undefined>(
    m ? (isVideo ? (m.thumbnail_url || thumbCache.get(m.url)) : m.url) : undefined,
  );
  useEffect(() => {
    if (!m || !isVideo || thumb) return;
    VideoThumbnails.getThumbnailAsync(m.url, { time: 1000, quality: 0.5 })
      .then(t => { thumbCache.set(m.url, t.uri); setThumb(t.uri); }).catch(() => {});
  }, [m?.url]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, { overflow: 'hidden', backgroundColor: T.surface2 }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button" accessibilityLabel={`${isVideo ? 'Video' : m ? 'Photo' : 'Post'} by ${post.profiles?.username}`}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : !m ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#14653F', padding: 10 }]}>
          <Text style={tileStyles.text} numberOfLines={5}>{post.content}</Text>
        </View>
      ) : null}
      {isVideo && (
        <View style={tileStyles.views}>
          <Ionicons name="play" size={12} color="#fff" />
          {(post.view_count ?? 0) > 0 && <Text style={tileStyles.viewsText}>{fmt(post.view_count)}</Text>}
        </View>
      )}
      {(post.post_media?.length ?? 0) > 1 && (
        <Ionicons name="copy" size={14} color="#fff" style={tileStyles.multi} />
      )}
    </Pressable>
  );
}
const tileStyles = StyleSheet.create({
  text: { color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, lineHeight: 17 },
  views: { position: 'absolute', left: 8, bottom: 7, flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsText: { color: '#fff', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },
  multi: { position: 'absolute', right: 7, top: 7, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
});

function Mosaic({ posts, onOpen, T }: { posts: Post[]; onOpen: (p: Post) => void; T: Theme }) {
  const gap = 3;
  const col = (W - 32 - gap * 2) / 3;
  const h = 116;
  const [big, ...rest] = posts;
  return (
    <View style={{ flexDirection: 'row', gap, height: h * 2 + gap, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' }}>
      <Tile post={big} T={T} onPress={() => onOpen(big)} style={{ width: col, height: h * 2 + gap }} />
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {rest.slice(0, 4).map(p => <Tile key={p.id} post={p} T={T} onPress={() => onOpen(p)} style={{ width: col, height: h }} />)}
      </View>
    </View>
  );
}

function PersonCard({ person, T, onOpen }: { person: any; T: Theme; onOpen: () => void }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const follow = async () => {
    if (state !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState('busy');
    try { await apiClient.followUser(person.id); setState('done'); } catch { setState('idle'); }
  };
  const done = state === 'done';
  return (
    <Pressable onPress={onOpen} style={[cardStyles.card, { backgroundColor: T.surface, borderColor: T.border }]} accessibilityLabel={`${person.full_name || person.username}'s profile`}>
      <UserAvatar avatarUrl={person.avatar_url} size={60} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 112 }}>
        <Text style={[cardStyles.name, { color: T.text }]} numberOfLines={1}>{person.full_name || person.username}</Text>
        {person.is_verified && <VerifiedBadge size={13} />}
      </View>
      <Text style={[cardStyles.handle, { color: T.textMuted }]} numberOfLines={1}>@{person.username}</Text>
      <Pressable
        onPress={follow}
        style={({ pressed }) => [cardStyles.btn, done ? { borderWidth: 1, borderColor: T.border } : { backgroundColor: T.text }, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={done ? 'Following' : `Follow ${person.username}`}
      >
        {state === 'busy' ? <ActivityIndicator size="small" color={T.bg} /> : (
          <Text style={[cardStyles.btnText, { color: done ? T.text : T.bg }]}>{done ? 'Following' : 'Follow'}</Text>
        )}
      </Pressable>
    </Pressable>
  );
}
const cardStyles = StyleSheet.create({
  card: { width: 136, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 10, alignItems: 'center', gap: 5 },
  name: { fontSize: 14, fontWeight: '700' },
  handle: { fontSize: 12 },
  btn: { marginTop: 5, alignSelf: 'stretch', height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
});

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { initialQuery } = (route.params || {}) as any;
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const { user } = useAuthStore();

  const { explorePosts, exploreLoading, exploreCursor, fetchExploreFeed } = useSocialStore();
  const [query, setQuery] = useState(initialQuery || '');
  const [focused, setFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<{ posts: any[]; users: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trending, setTrending] = useState<{ hashtags: any[]; posts: any[] } | null>(null);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [following, setFollowing] = useState<Set<string> | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchExploreFeed(true);
    loadTrending();
    AsyncStorage.getItem(RECENTS_KEY).then(v => { try { if (v) setRecents(JSON.parse(v)); } catch {} }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    apiClient.getFollowing(user.id).then((r: any) => {
      if (r?.success && Array.isArray(r.data)) setFollowing(new Set(r.data.map((p: any) => p?.id).filter(Boolean)));
      else setFollowing(new Set());
    }).catch(() => setFollowing(new Set()));
  }, [user?.id]);

  useEffect(() => { if (initialQuery) { setQuery(initialQuery); doSearch(initialQuery); } }, [initialQuery]);

  const loadTrending = async () => {
    try {
      const res = await apiClient.getTrending();
      if (res.success) setTrending(res.data as any);
    } catch {}
  };

  const remember = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setRecents(prev => {
      const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const doSearch = useCallback(async (text: string) => {
    if (!text.trim()) { setSearchResults(null); setSearchError(null); return; }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const searchText = text.startsWith('#') ? text.slice(1) : text;
      const res = await apiClient.searchSocial(searchText.trim());
      if (res.success) { setSearchResults(res.data as any); remember(text); }
      else setSearchError('Search failed. Please try again.');
    } catch {
      setSearchError('Network error — check your connection.');
    }
    setSearchLoading(false);
  }, []);

  const runSearch = (text: string) => { setQuery(text); doSearch(text); inputRef.current?.blur(); };

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
  const showRecents = focused && !isSearching;
  const isSuggesting = isSearching && searchResults === null && !searchLoading && !searchError;
  const isResults = isSearching && (searchResults !== null || !!searchError);

  const suggestedTags = useMemo(() => {
    if (!isSearching || !trending?.hashtags) return [];
    const q = query.toLowerCase().replace(/^#/, '');
    return trending.hashtags.filter((h: any) => h.tag.toLowerCase().includes(q)).slice(0, 6);
  }, [query, trending, isSearching]);

  // Mosaic: newest posts with media first, topped up with text posts
  const mosaic = useMemo(() => {
    const withMedia = explorePosts.filter(p => !p.repost_of_id && p.post_media?.length);
    const text = explorePosts.filter(p => !p.repost_of_id && !p.post_media?.length && (p.content?.length ?? 0) > 20);
    const picked = [...withMedia, ...text].slice(0, 5);
    return picked.length >= 3 ? picked : [];
  }, [explorePosts]);
  const mosaicIds = useMemo(() => new Set(mosaic.map(p => p.id)), [mosaic]);
  const listPosts = useMemo(() => explorePosts.filter(p => !mosaicIds.has(p.id)), [explorePosts, mosaicIds]);

  // People to follow: authors in Explore you don't follow yet
  const people = useMemo(() => {
    if (!following) return [];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of explorePosts) {
      const a: any = p.profiles;
      if (!a?.id || a.id === user?.id || following.has(a.id) || seen.has(a.id) || a.is_bot) continue;
      seen.add(a.id);
      out.push({ ...a, id: a.id || p.user_id });
      if (out.length >= 10) break;
    }
    return out;
  }, [explorePosts, following, user?.id]);

  const openPost = (p: Post) => navigation.navigate('PostDetail', { postId: p.id });
  const openProfile = (username: string) => navigation.navigate('PublicProfile', { username });

  const trends = (trending?.hashtags || []).slice(0, showAllTrends ? 10 : 4);

  const DefaultHeader = (
    <View>
      {trends.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Trending in Kenya</Text>
          {trends.map((h: any, i: number) => (
            <Pressable key={h.id} onPress={() => runSearch(`#${h.tag}`)} style={({ pressed }) => [styles.trendRow, pressed && { opacity: 0.6 }]}
              accessibilityRole="button" accessibilityLabel={`Trending ${i + 1}: #${h.tag}`}>
              <Text style={styles.trendRank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trendTag}>#{h.tag}</Text>
                {h.use_count > 0 && <Text style={styles.trendMeta}>{fmt(h.use_count)} posts</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
            </Pressable>
          ))}
          {(trending?.hashtags?.length ?? 0) > 4 && (
            <Pressable onPress={() => setShowAllTrends(v => !v)} style={styles.moreBtn} accessibilityRole="button">
              <Text style={styles.moreText}>{showAllTrends ? 'Show less' : 'Show more'}</Text>
            </Pressable>
          )}
        </View>
      )}

      {mosaic.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={[styles.blockTitle, { marginHorizontal: 16 }]}>Watch & see</Text>
          <Mosaic posts={mosaic} onOpen={openPost} T={T} />
        </View>
      )}

      {people.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <Text style={[styles.blockTitle, { marginHorizontal: 16 }]}>People to follow</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {people.map(p => <PersonCard key={p.id} person={p} T={T} onOpen={() => openProfile(p.username)} />)}
          </ScrollView>
        </View>
      )}

      {listPosts.length > 0 && <Text style={[styles.blockTitle, { marginHorizontal: 16, marginTop: 24, marginBottom: 2 }]}>Posts for you</Text>}
    </View>
  );

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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Explore</Text>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation.navigate('FindFriends')} accessibilityLabel="Find friends">
            <Ionicons name="person-add-outline" size={20} color={T.text} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={T.textSub} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search people, posts, #tags"
              placeholderTextColor={T.placeholder}
              value={query}
              onChangeText={handleSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
              onSubmitEditing={() => query.trim() && doSearch(query)}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={10} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={T.placeholder} />
              </Pressable>
            )}
          </View>
          {(focused || isSearching) && (
            <Pressable onPress={() => { clearSearch(); inputRef.current?.blur(); }} hitSlop={8} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      {showRecents ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {recents.length > 0 ? (
            <>
              <View style={styles.recentHead}>
                <Text style={styles.blockTitle}>Recent</Text>
                <Pressable onPress={() => { setRecents([]); AsyncStorage.removeItem(RECENTS_KEY).catch(() => {}); }} hitSlop={8}>
                  <Text style={styles.moreText}>Clear all</Text>
                </Pressable>
              </View>
              {recents.map(r => (
                <Pressable key={r} onPress={() => runSearch(r)} style={({ pressed }) => [styles.suggRow, pressed && { backgroundColor: T.surface }]}>
                  <View style={styles.suggIconWrap}><Ionicons name={r.startsWith('#') ? 'pricetag-outline' : 'time-outline'} size={16} color={T.textSub} /></View>
                  <Text style={[styles.suggName, { flex: 1 }]}>{r}</Text>
                  <Pressable hitSlop={10} accessibilityLabel={`Remove ${r}`} onPress={() => setRecents(prev => {
                    const next = prev.filter(x => x !== r);
                    AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
                    return next;
                  })}>
                    <Ionicons name="close" size={18} color={T.textMuted} />
                  </Pressable>
                </Pressable>
              ))}
            </>
          ) : (
            <Text style={styles.hint}>Search for people, posts or #tags.</Text>
          )}
        </ScrollView>
      ) : isSuggesting ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {suggestedTags.map((h: any) => (
            <Pressable key={h.id} style={({ pressed }) => [styles.suggRow, pressed && { backgroundColor: T.surface }]} onPress={() => runSearch(`#${h.tag}`)}>
              <View style={styles.suggIconWrap}><Ionicons name="pricetag-outline" size={16} color={T.textSub} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggName}>#{h.tag}</Text>
                {h.use_count > 0 && <Text style={styles.suggSub}>{fmt(h.use_count)} posts</Text>}
              </View>
            </Pressable>
          ))}
          <Pressable style={({ pressed }) => [styles.suggRow, pressed && { backgroundColor: T.surface }]} onPress={() => runSearch(query)}>
            <View style={styles.suggIconWrap}><Ionicons name="search" size={16} color={T.textSub} /></View>
            <Text style={styles.searchAllText}>Search for <Text style={{ color: T.text, fontWeight: '700' }}>"{query}"</Text></Text>
          </Pressable>
        </ScrollView>
      ) : searchLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      ) : isResults && searchError ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={40} color={T.textMuted} />
          <Text style={styles.errorText}>{searchError}</Text>
          <Pressable style={styles.retryBtn} onPress={() => doSearch(query)}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : isResults ? (
        <FlatList
          data={resultItems}
          keyExtractor={(item) => `${item._type}_${item.id}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item._type === 'section') return <Text style={styles.resultsSection}>{item._label}</Text>;
            if (item._type === 'user') {
              return (
                <Pressable style={({ pressed }) => [styles.userRow, pressed && { backgroundColor: T.surface }]} onPress={() => openProfile(item.username)}>
                  <UserAvatar avatarUrl={item.avatar_url} size={46} isVerified={item.is_verified} isBot={item.is_bot} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={styles.userName} numberOfLines={1}>{item.full_name}</Text>
                      {item.is_verified && <VerifiedBadge size={15} />}
                    </View>
                    <Text style={styles.userHandle}>@{item.username}</Text>
                    {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
                </Pressable>
              );
            }
            return (
              <PostCard
                post={item}
                onPress={() => openPost(item)}
                onProfilePress={openProfile}
                onHashtagPress={(tag) => runSearch(`#${tag}`)}
                currentUserId={user?.id}
              />
            );
          }}
          ListEmptyComponent={searchResults ? (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={40} color={T.textMuted} />
              <Text style={styles.emptyTitle}>No results for "{query}"</Text>
              <Text style={styles.emptySub}>Check the spelling or try a #tag.</Text>
            </View>
          ) : null}
        />
      ) : (
        <FlatList
          data={listPosts}
          keyExtractor={(item) => item.id}
          onEndReached={() => { if (exploreCursor) fetchExploreFeed(); }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={exploreLoading && explorePosts.length > 0} onRefresh={() => { fetchExploreFeed(true); loadTrending(); }} tintColor={T.accent} />}
          ListHeaderComponent={DefaultHeader}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => openPost(item)}
              onProfilePress={openProfile}
              onHashtagPress={(tag) => runSearch(`#${tag}`)}
              currentUserId={user?.id}
            />
          )}
          ListFooterComponent={exploreLoading && explorePosts.length > 0 ? <ActivityIndicator style={{ margin: 16 }} color={T.accent} /> : <View style={{ height: 24 }} />}
          ListEmptyComponent={exploreLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} /> : (
            mosaic.length ? null : (
              <View style={styles.emptySearch}>
                <Ionicons name="compass-outline" size={40} color={T.textMuted} />
                <Text style={styles.emptyTitle}>Nothing to explore yet</Text>
              </View>
            )
          )}
        />
      )}
    </View>
  );
}

function makeStyles(T: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: T.bg, gap: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 30, color: T.text, letterSpacing: -0.8, fontFamily: 'SpaceGrotesk_700Bold' },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface2, borderRadius: 22, height: 44, paddingHorizontal: 16, gap: 10 },
    searchInput: { flex: 1, fontSize: 15, color: T.text, paddingVertical: 0 },
    cancel: { color: T.text, fontSize: 15, fontWeight: '600' },

    block: { paddingHorizontal: 16, paddingTop: 10 },
    blockTitle: { fontSize: 18, color: T.text, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
    trendRank: { width: 18, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: T.textMuted },
    trendTag: { fontSize: 15, fontWeight: '700', color: T.text },
    trendMeta: { fontSize: 13, color: T.textMuted, marginTop: 2 },
    moreBtn: { paddingVertical: 10 },
    moreText: { color: T.accent, fontSize: 14, fontWeight: '600' },

    recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    hint: { color: T.textMuted, fontSize: 15, textAlign: 'center', marginTop: 40 },
    suggRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
    suggIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
    suggName: { fontSize: 15, fontWeight: '600', color: T.text },
    suggSub: { fontSize: 13, color: T.textMuted, marginTop: 1 },
    searchAllText: { fontSize: 15, color: T.textSub },

    resultsSection: { fontSize: 18, color: T.text, fontFamily: 'SpaceGrotesk_700Bold', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
    userRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 12, alignItems: 'center' },
    userName: { fontWeight: '700', fontSize: 15, color: T.text, flexShrink: 1 },
    userHandle: { color: T.textMuted, fontSize: 14 },
    userBio: { color: T.textSub, fontSize: 13, marginTop: 2 },

    emptySearch: { alignItems: 'center', padding: 48, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center' },
    errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    errorText: { fontSize: 15, color: T.textSub, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 24, height: 44, justifyContent: 'center', backgroundColor: T.accent, borderRadius: 22 },
    retryText: { color: '#000', fontWeight: '700', fontSize: 14 },
  });
}
