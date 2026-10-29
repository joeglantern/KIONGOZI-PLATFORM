import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Image, Pressable, ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { usePresence } from '../../stores/presenceStore';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { RowsSkeleton } from '../../components/social/Skeleton';
import { BottomSheet } from '../../components/social/BottomSheet';

const KIONGOZI_AI_ID = '00000000-0000-0000-0000-000000000001';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    loadPersistedDMState, drafts,
  } = useDMStore();
  const online = usePresence(s => s.online);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [listQuery, setListQuery] = useState('');

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
    let list = showArchived
      ? conversations.filter(c => archivedIds.includes(c.id))
      : conversations.filter(c => !archivedIds.includes(c.id));
    if (!showArchived && filter === 'unread') list = list.filter(c => c.unread_count > 0);
    const q = listQuery.trim().toLowerCase();
    if (q) list = list.filter(c => {
      const o: any = c.participants?.[0];
      return o?.full_name?.toLowerCase().includes(q) || o?.username?.toLowerCase().includes(q)
        || c.last_message?.content?.toLowerCase().includes(q);
    });
    return list;
  }, [conversations, archivedIds, showArchived, filter, listQuery]);

  const unreadChats = useMemo(
    () => conversations.filter(c => !archivedIds.includes(c.id) && c.unread_count > 0).length,
    [conversations, archivedIds]
  );

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

  // Kiongozi AI is always one tap away, until you already have a chat with it
  const hasAIChat = conversations.some(c => c.participants?.[0]?.id === KIONGOZI_AI_ID);
  const openAI = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    handleSelectUser({ id: KIONGOZI_AI_ID, username: 'kiongozi', full_name: 'Kiongozi AI', avatar_url: null, is_bot: true } as any);
  }, [handleSelectUser]);

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
    const draft = drafts[item.id];
    const active = !!(other?.id && online[other.id]);
    const isArchived = archivedIds.includes(item.id);
    const unread = item.unread_count > 0;
    const last = item.last_message;
    const mine = last?.sender_id && last.sender_id === user?.id;
    const body = last?.content
      ? last.content
      : last?.media_type === 'video' ? 'Sent a video'
      : last?.media_type === 'image' ? 'Sent a photo'
      : 'Say hello';
    return (
      <Pressable
        style={({ pressed }) => [styles.convRow, pressed && { backgroundColor: T.surface }]}
        // Load the saved messages the moment a finger lands, so the chat opens already filled
        onPressIn={() => { useDMStore.getState().hydrateMessages(item.id); }}
        onPress={() => navigation.navigate('DMConversation', {
          conversationId: item.id,
          participantName: other?.full_name,
          participantUsername: other?.username,
          participantAvatar: other?.avatar_url,
          participantIsVerified: other?.is_verified,
        })}
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLongPress(item.id, isArchived); }}
        delayLongPress={400}
        accessibilityLabel={`Chat with ${other?.full_name || other?.username}${unread ? `, ${item.unread_count} unread` : ''}`}
      >
        <View>
          <UserAvatar avatarUrl={other?.avatar_url} size={54} isBot={other?.is_bot} name={other?.full_name || other?.username} />
          {active && <View style={styles.activeDot} accessibilityLabel="Active now" />}
        </View>
        <View style={styles.convInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.convName, unread && styles.convNameUnread]} numberOfLines={1}>{other?.full_name || other?.username}</Text>
            {other?.is_verified && <VerifiedBadge size={14} />}
          </View>
          {draft ? (
            <Text style={styles.convLastMsg} numberOfLines={1}>
              <Text style={styles.draftLabel}>Draft: </Text>{draft.replace(/\s+/g, ' ')}
            </Text>
          ) : (
            <Text style={[styles.convLastMsg, unread && styles.unreadMsg]} numberOfLines={1}>
              {mine ? 'You: ' : ''}{body}
              <Text style={styles.convTime}>{` · ${active && !unread ? 'Active now' : timeAgo(item.last_message_at)}`}</Text>
            </Text>
          )}
        </View>
        {unread && <View style={styles.unreadDot} accessibilityLabel="Unread" />}
      </Pressable>
    );
  }, [navigation, archivedIds, handleLongPress, user?.id, styles, T, drafts, online]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { if (showArchived) { setShowArchived(false); } else { navigation.goBack(); } }}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{showArchived ? 'Archived' : 'Messages'}</Text>
        {showArchived ? (
          <View style={{ width: 44 }} />
        ) : (
          <TouchableOpacity style={styles.composeBtn} onPress={openNewDM} accessibilityLabel="New message">
            <Ionicons name="create-outline" size={21} color={T.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listSearch}>
        <Ionicons name="search" size={17} color={T.textSub} />
        <TextInput
          style={styles.listSearchInput}
          placeholder="Search"
          placeholderTextColor={T.placeholder}
          value={listQuery}
          onChangeText={setListQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {listQuery.length > 0 && (
          <TouchableOpacity onPress={() => setListQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={17} color={T.placeholder} />
          </TouchableOpacity>
        )}
      </View>

      {!showArchived && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
          {([['all', 'All'], ['unread', unreadChats ? `Unread ${unreadChats}` : 'Unread']] as const).map(([id, label]) => {
            const on = filter === id;
            return (
              <Pressable key={id} onPress={() => { Haptics.selectionAsync(); setFilter(id); }}
                style={[styles.chip, on ? { backgroundColor: T.text, borderColor: T.text } : { borderColor: T.border }]}>
                <Text style={[styles.chipText, { color: on ? T.bg : T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowArchived(true); }}
            style={[styles.chip, { borderColor: T.border }]}
            accessibilityRole="button"
            accessibilityLabel={archivedCount > 0 ? `Archived, ${archivedCount} chats` : 'Archived'}
          >
            <Text style={[styles.chipText, { color: T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>Archived</Text>
          </Pressable>
        </ScrollView>
      )}

      {conversationsLoading && conversations.length === 0 ? (
        <RowsSkeleton count={8} avatar={52} label="Loading chats" />
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={item => item.id}
          renderItem={renderConversation}
          ListHeaderComponent={!hasAIChat && !showArchived && !listQuery ? (
            <TouchableOpacity style={styles.aiRow} onPress={openAI} disabled={startingFor === KIONGOZI_AI_ID} accessibilityRole="button" accessibilityLabel="Chat with Kiongozi AI">
              <UserAvatar avatarUrl={null} size={54} isBot name="Kiongozi AI" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aiTitle}>Kiongozi AI</Text>
                <Text style={styles.aiSub} numberOfLines={1}>Ask anything, any time</Text>
              </View>
              {startingFor === KIONGOZI_AI_ID ? <ActivityIndicator color={T.accent} /> : <Ionicons name="sparkles" size={20} color={T.accent} />}
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={showArchived ? 'archive-outline' : listQuery || filter === 'unread' ? 'search-outline' : 'chatbubbles-outline'} size={30} color={T.textSub} />
              </View>
              <Text style={styles.emptyText}>
                {showArchived ? 'No archived chats' : listQuery ? `No chats match "${listQuery}"` : filter === 'unread' ? "You're all caught up" : 'No messages yet'}
              </Text>
              {!showArchived && !listQuery && filter === 'all' && (
                <>
                  <Text style={styles.emptySubtext}>Start a conversation with someone you follow.</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={openNewDM}>
                    <Text style={styles.emptyBtnText}>New message</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
        />
      )}

      {/* New DM picker */}
      {/* statusBarTranslucent: Android modal window starts at y=0, so KAV's local frame and
          the keyboard's screenY share one coordinate space (else it under-pads by ~24dp). */}
      <Modal visible={newDMVisible} transparent statusBarTranslucent animationType="slide" onRequestClose={closeModal}>
        {/* Modals get their own window, so the screen never resizes for the keyboard:
            pad the sheet up by the keyboard overlap on both platforms (KAV measures the
            overlap against its own frame, so a resizing window yields 0, not double). */}
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior="padding"
        >
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New message</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={T.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={T.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people..."
                placeholderTextColor={T.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color={T.textMuted} />}
              {searchQuery.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={16} color={T.placeholder} />
                </TouchableOpacity>
              )}
            </View>

            {loadingFollowing ? (
              <RowsSkeleton count={5} avatar={44} label="Loading people" />
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={styles.userName} numberOfLines={1}>{item.full_name}</Text>
                        {item.is_verified && (
                          <VerifiedBadge size={15} />
                        )}
                      </View>
                      <Text style={styles.userHandle} numberOfLines={1}>@{item.username}</Text>
                    </View>
                    {startingFor === item.id
                      ? <ActivityIndicator size="small" color={T.accent} />
                      : <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
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
        </KeyboardAvoidingView>
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
    aiRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    aiTitle: { fontSize: 16, fontWeight: '700', color: T.text },
    aiSub: { fontSize: 14, color: T.textSub, marginTop: 2 },
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 4, backgroundColor: T.bg },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, marginLeft: 4, fontSize: 28, color: T.text, letterSpacing: -0.7, fontFamily: 'SpaceGrotesk_700Bold' },
    composeBtn: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
    listSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 6, height: 42, borderRadius: 21, paddingHorizontal: 16, backgroundColor: T.surface2 },
    listSearchInput: { flex: 1, fontSize: 15, color: T.text, paddingVertical: 0 },
    chips: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 8 },
    chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
    chipText: { fontSize: 14, fontWeight: '600' },
    convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, backgroundColor: T.bg },
    convInfo: { flex: 1, minWidth: 0, gap: 3 },
    convName: { fontSize: 16, color: T.text, fontWeight: '500', flexShrink: 1 },
    convNameUnread: { fontWeight: '700' },
    convTime: { color: T.textMuted, fontWeight: '400' },
    convLastMsg: { color: T.textSub, fontSize: 14 },
    unreadMsg: { fontWeight: '600', color: T.text },
    draftLabel: { color: T.error, fontWeight: '600' },
    activeDot: {
      position: 'absolute', right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7,
      backgroundColor: '#34C759', borderWidth: 2.5, borderColor: T.bg,
    },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.accent },
    empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40, gap: 10 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyText: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center' },
    emptyBtn: { marginTop: 10, height: 40, paddingHorizontal: 20, borderRadius: 20, backgroundColor: T.text, justifyContent: 'center' },
    emptyBtnText: { color: T.bg, fontWeight: '700', fontSize: 14 },
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
    // flexShrink: when the keyboard pads the overlay, the sheet (and its list) shrink
    // to the space left instead of overflowing off the top of short screens.
    sheet: { backgroundColor: T.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', flexShrink: 1 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 14, height: 42, backgroundColor: T.surface2, borderRadius: 21, gap: 8 },
    searchInput: { flex: 1, fontSize: 15, color: T.text },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontWeight: '600', fontSize: 15, color: T.text, flexShrink: 1 },
    userHandle: { color: T.textSub, fontSize: 13, marginTop: 1 },
    emptySearch: { alignItems: 'center', padding: 32 },
    emptySearchText: { color: T.textMuted, fontSize: 14, textAlign: 'center' },
  });
}
