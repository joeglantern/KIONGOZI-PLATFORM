import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface UserRow {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_bot?: boolean;
}

export default function DMListScreen() {
  const navigation = useNavigation<any>();
  const { conversations, conversationsLoading, fetchConversations } = useDMStore();
  const { user } = useAuthStore();

  // New DM picker state
  const [newDMVisible, setNewDMVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<UserRow[]>([]);
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startingFor, setStartingFor] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Realtime: refresh conversation list when a new DM message arrives
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`dm-list-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Load following list when modal opens
  const openNewDM = useCallback(async () => {
    setNewDMVisible(true);
    setSearchQuery('');
    setSearchResults([]);
    if (!user?.id) return;
    setLoadingFollowing(true);
    try {
      const res = await apiClient.getFollowing(user.id);
      if (res.success && Array.isArray(res.data)) {
        setFollowing(res.data as UserRow[]);
      }
    } catch {}
    setLoadingFollowing(false);
  }, [user?.id]);

  // Search when query changes (debounced via useEffect)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.searchSocial(searchQuery.trim());
        if (res.success && Array.isArray(res.data?.users)) {
          setSearchResults(res.data.users as UserRow[]);
        }
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Show following list filtered by query, or search results if query is active
  const displayList = useMemo((): UserRow[] => {
    if (!searchQuery.trim()) return following;
    if (searchResults.length > 0) return searchResults;
    // Local filter while waiting for search
    const q = searchQuery.toLowerCase();
    return following.filter(u =>
      u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    );
  }, [searchQuery, following, searchResults]);

  const handleSelectUser = useCallback(async (person: UserRow) => {
    setStartingFor(person.id);
    try {
      const convRes = await apiClient.startDMConversation(person.id);
      if (convRes.success && convRes.data?.id) {
        setNewDMVisible(false);
        navigation.navigate('DMConversation', {
          conversationId: convRes.data.id,
          participantName: person.full_name,
          participantUsername: person.username,
          participantAvatar: person.avatar_url,
        });
      }
    } catch {}
    setStartingFor(null);
  }, [navigation]);

  const closeModal = useCallback(() => {
    setNewDMVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={openNewDM}>
          <Ionicons name="create-outline" size={24} color="#1a365d" />
        </TouchableOpacity>
      </View>

      {conversationsLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const other = item.participants[0];
            return (
              <TouchableOpacity
                style={styles.convRow}
                onPress={() => navigation.navigate('DMConversation', {
                  conversationId: item.id,
                  participantName: other?.full_name,
                  participantUsername: other?.username,
                  participantAvatar: other?.avatar_url,
                })}
              >
                <UserAvatar avatarUrl={other?.avatar_url} size={50} isBot={other?.is_bot} isVerified={other?.is_verified} />
                <View style={styles.convInfo}>
                  <View style={styles.convHeader}>
                    <Text style={styles.convName}>{other?.full_name}</Text>
                    <Text style={styles.convTime}>{timeAgo(item.last_message_at)}</Text>
                  </View>
                  <View style={styles.convPreview}>
                    <Text style={[styles.convLastMsg, item.unread_count > 0 && styles.unreadMsg]} numberOfLines={1}>
                      {item.last_message?.content || 'Media message'}
                    </Text>
                    {item.unread_count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Tap the compose icon to start a conversation</Text>
            </View>
          }
        />
      )}

      {/* New DM — user picker sheet */}
      <Modal
        visible={newDMVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={styles.sheet}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Message</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#a0aec0" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people..."
                placeholderTextColor="#a0aec0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color="#a0aec0" />}
              {searchQuery.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={16} color="#a0aec0" />
                </TouchableOpacity>
              )}
            </View>

            {/* User list */}
            {loadingFollowing ? (
              <ActivityIndicator style={{ marginTop: 32 }} color="#1a365d" />
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => handleSelectUser(item)}
                    disabled={startingFor === item.id}
                  >
                    <UserAvatar
                      avatarUrl={item.avatar_url}
                      size={44}
                      isVerified={item.is_verified}
                      isBot={item.is_bot}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.full_name}</Text>
                      <Text style={styles.userHandle}>@{item.username}</Text>
                    </View>
                    {startingFor === item.id
                      ? <ActivityIndicator size="small" color="#1a365d" />
                      : <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
                    }
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  !loadingFollowing ? (
                    <View style={styles.emptySearch}>
                      <Text style={styles.emptySearchText}>
                        {searchQuery.trim()
                          ? `No results for "${searchQuery}"`
                          : "You're not following anyone yet"}
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a202c' },
  convRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  convInfo: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { fontWeight: '700', fontSize: 15, color: '#1a202c' },
  convTime: { color: '#a0aec0', fontSize: 13 },
  convPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLastMsg: { flex: 1, color: '#718096', fontSize: 14 },
  unreadMsg: { fontWeight: '600', color: '#1a202c' },
  badge: {
    backgroundColor: '#1a365d',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#4a5568' },
  emptySubtext: { fontSize: 14, color: '#a0aec0', textAlign: 'center' },
  // Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1a202c' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f4f8',
  },
  userInfo: { flex: 1 },
  userName: { fontWeight: '600', fontSize: 15, color: '#1a202c' },
  userHandle: { color: '#718096', fontSize: 13, marginTop: 1 },
  emptySearch: { alignItems: 'center', padding: 32 },
  emptySearchText: { color: '#a0aec0', fontSize: 14, textAlign: 'center' },
});
