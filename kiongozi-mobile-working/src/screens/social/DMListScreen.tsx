import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';

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
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const {
    conversations, conversationsLoading, fetchConversations,
    archivedIds, showArchived,
    archiveConversation, unarchiveConversation, deleteConversation, setShowArchived,
    loadPersistedDMState,
  } = useDMStore();
  const { user } = useAuthStore();

  const [newDMVisible, setNewDMVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<UserRow[]>([]);
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startingFor, setStartingFor] = useState<string | null>(null);
  const [convSheet, setConvSheet] = useState<{ convId: string; isArchived: boolean } | null>(null);
  const [deleteConfirmSheet, setDeleteConfirmSheet] = useState<string | null>(null);

  useEffect(() => {
    loadPersistedDMState().then(() => fetchConversations());
  }, []);

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

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
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

  const displayList = useMemo((): UserRow[] => {
    if (!searchQuery.trim()) return following;
    if (searchResults.length > 0) return searchResults;
    const q = searchQuery.toLowerCase();
    return following.filter(u =>
      u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    );
  }, [searchQuery, following, searchResults]);

  // Filter conversations for main / archived views
  const visibleConversations = useMemo(() => {
    if (showArchived) {
      return conversations.filter(c => archivedIds.includes(c.id));
    }
    return conversations.filter(c => !archivedIds.includes(c.id));
  }, [conversations, archivedIds, showArchived]);

  const archivedCount = useMemo(
    () => conversations.filter(c => archivedIds.includes(c.id)).length,
    [conversations, archivedIds]
  );

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

  const handleLongPress = useCallback((convId: string, isArchived: boolean) => {
    setConvSheet({ convId, isArchived });
  }, []);

  const renderConversation = useCallback(({ item }: { item: any }) => {
    const other = item.participants[0];
    const isArchived = archivedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.convRow}
        onPress={() => navigation.navigate('DMConversation', {
          conversationId: item.id,
          participantName: other?.full_name,
          participantUsername: other?.username,
          participantAvatar: other?.avatar_url,
        })}
        onLongPress={() => handleLongPress(item.id, isArchived)}
        delayLongPress={400}
      >
        <UserAvatar avatarUrl={other?.avatar_url} size={52} isBot={other?.is_bot} isVerified={other?.is_verified} />
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.convName}>{other?.full_name}</Text>
            <Text style={styles.convTime}>{timeAgo(item.last_message_at)}</Text>
          </View>
          <View style={styles.convPreview}>
            <View style={styles.previewRow}>
              {item.last_message?.media_type === 'image' && (
                <Ionicons name="camera-outline" size={14} color={item.unread_count > 0 ? T.text : T.textSub} style={{ marginRight: 3 }} />
              )}
              {item.last_message?.media_type === 'video' && (
                <Ionicons name="videocam-outline" size={14} color={item.unread_count > 0 ? T.text : T.textSub} style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.convLastMsg, item.unread_count > 0 && styles.unreadMsg]} numberOfLines={1}>
                {item.last_message?.content
                  ? item.last_message.content
                  : item.last_message?.media_type === 'video'
                    ? 'Video'
                    : item.last_message?.media_type === 'image'
                      ? 'Photo'
                      : 'Media message'}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, archivedIds, handleLongPress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (showArchived) { setShowArchived(false); } else { navigation.goBack(); }
        }}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {showArchived ? 'Archived' : 'Messages'}
        </Text>
        {showArchived ? (
          <View style={{ width: 24 }} />
        ) : (
          <TouchableOpacity onPress={openNewDM}>
            <Ionicons name="create-outline" size={24} color="#5CB85C" />
          </TouchableOpacity>
        )}
      </View>

      {conversationsLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#5CB85C" />
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={item => item.id}
          renderItem={renderConversation}
          ListHeaderComponent={
            !showArchived && archivedCount > 0 ? (
              <TouchableOpacity style={styles.archivedRow} onPress={() => setShowArchived(true)}>
                <View style={styles.archivedIcon}>
                  <Ionicons name="archive-outline" size={20} color="#718096" />
                </View>
                <Text style={styles.archivedLabel}>Archived</Text>
                <View style={styles.archivedRight}>
                  <Text style={styles.archivedCount}>{archivedCount}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#a0aec0" />
                </View>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={showArchived ? 'archive-outline' : 'mail-outline'} size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>
                {showArchived ? 'No archived conversations' : 'No conversations yet'}
              </Text>
              {!showArchived && (
                <Text style={styles.emptySubtext}>Tap the compose icon to start a conversation</Text>
              )}
            </View>
          }
        />
      )}

      {/* New DM picker */}
      <Modal visible={newDMVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Message</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#4a5568" />
              </TouchableOpacity>
            </View>

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

            {loadingFollowing ? (
              <ActivityIndicator style={{ marginTop: 32 }} color="#5CB85C" />
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
                    <UserAvatar avatarUrl={item.avatar_url} size={44} isVerified={item.is_verified} isBot={item.is_bot} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.full_name}</Text>
                      <Text style={styles.userHandle}>@{item.username}</Text>
                    </View>
                    {startingFor === item.id
                      ? <ActivityIndicator size="small" color="#5CB85C" />
                      : <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
                    }
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  !loadingFollowing ? (
                    <View style={styles.emptySearch}>
                      <Text style={styles.emptySearchText}>
                        {searchQuery.trim() ? `No results for "${searchQuery}"` : "You're not following anyone yet"}
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Conversation long-press sheet */}
      <BottomSheet
        visible={!!convSheet}
        onClose={() => setConvSheet(null)}
        actions={convSheet ? [
          {
            icon: convSheet.isArchived ? 'archive-outline' : 'archive-outline',
            label: convSheet.isArchived ? 'Unarchive' : 'Archive',
            onPress: () => convSheet.isArchived
              ? unarchiveConversation(convSheet.convId)
              : archiveConversation(convSheet.convId),
          },
          {
            icon: 'trash-outline',
            label: 'Delete conversation',
            destructive: true,
            onPress: () => setDeleteConfirmSheet(convSheet.convId),
          },
        ] : []}
      />

      {/* Delete confirmation sheet */}
      <BottomSheet
        visible={!!deleteConfirmSheet}
        onClose={() => setDeleteConfirmSheet(null)}
        title="Delete conversation?"
        subtitle="This removes it from your list. The other person will still have it."
        actions={deleteConfirmSheet ? [
          {
            icon: 'trash-outline',
            label: 'Delete',
            destructive: true,
            onPress: () => deleteConversation(deleteConfirmSheet!),
          },
        ] : []}
      />
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight, backgroundColor: T.bg },
    headerTitle: { fontSize: 18, fontWeight: '700', color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    archivedRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight, backgroundColor: T.surface },
    archivedIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: T.surface2, justifyContent: 'center', alignItems: 'center' },
    archivedLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: T.textSub },
    archivedRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    archivedCount: { fontSize: 14, color: T.textMuted, fontWeight: '500' },
    convRow: { flexDirection: 'row', padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight, backgroundColor: T.bg },
    convInfo: { flex: 1 },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    convName: { fontWeight: '700', fontSize: 15, color: T.text, fontFamily: 'SpaceGrotesk_700Bold' },
    convTime: { color: T.textMuted, fontSize: 13 },
    convPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    convLastMsg: { flex: 1, color: T.textSub, fontSize: 14 },
    unreadMsg: { fontWeight: '600', color: T.text },
    badge: { backgroundColor: T.accent, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', padding: 48, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: T.textSub },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center' },
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
    sheet: { backgroundColor: T.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 32 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.inputBg, borderRadius: 10, borderWidth: 1, borderColor: T.border, gap: 8 },
    searchInput: { flex: 1, fontSize: 15, color: T.text },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight },
    userInfo: { flex: 1 },
    userName: { fontWeight: '600', fontSize: 15, color: T.text },
    userHandle: { color: T.textSub, fontSize: 13, marginTop: 1 },
    emptySearch: { alignItems: 'center', padding: 32 },
    emptySearchText: { color: T.textMuted, fontSize: 14, textAlign: 'center' },
  });
}
