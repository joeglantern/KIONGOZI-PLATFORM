import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../utils/apiClient';

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const { explorePosts, exploreLoading, exploreCursor, fetchExploreFeed } = useSocialStore();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ posts: any[]; users: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trending, setTrending] = useState<{ hashtags: any[]; posts: any[] } | null>(null);

  useEffect(() => {
    fetchExploreFeed(true);
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      const res = await apiClient.getTrending();
      if (res.success) setTrending(res.data);
    } catch {}
  };

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await apiClient.searchSocial(text.trim());
      if (res.success) setSearchResults(res.data);
    } catch {}
    setSearchLoading(false);
  }, []);

  const isSearching = query.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, people, hashtags..."
            placeholderTextColor="#a0aec0"
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearchResults(null); }}>
              <Ionicons name="close-circle" size={18} color="#a0aec0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
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
          ListHeaderComponent={
            trending?.hashtags?.length ? (
              <View style={styles.trendingSection}>
                <Text style={styles.sectionTitle}>Trending in Kenya</Text>
                {trending.hashtags.map((h: any) => (
                  <TouchableOpacity key={h.id} style={styles.hashtagRow}>
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
            />
          )}
          ListFooterComponent={
            exploreLoading ? <ActivityIndicator style={{ margin: 16 }} color="#1a365d" /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1a202c' },
  trendingSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  hashtagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  hashtagText: { fontSize: 15, fontWeight: '600', color: '#1a202c' },
  hashtagCount: { fontSize: 13, color: '#718096' },
  userRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  userInfo: { flex: 1 },
  userName: { fontWeight: '700', fontSize: 15, color: '#1a202c' },
  userHandle: { color: '#718096', fontSize: 14 },
  userBio: { color: '#4a5568', fontSize: 13, marginTop: 2 },
});
