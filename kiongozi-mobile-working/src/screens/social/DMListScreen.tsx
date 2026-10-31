import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { usePresence } from '../../stores/presenceStore';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useDMStore, attachTypingInbox, DMConversation } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { RowsSkeleton } from '../../components/social/Skeleton';
import { BottomSheet } from '../../components/social/BottomSheet';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

const KIONGOZI_AI_ID = '00000000-0000-0000-0000-000000000001';

type Filter = 'all' | 'unread' | 'groups';

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

/** Group chat = more than one other person in it */
const isGroup = (c: DMConversation) => (c.participants?.length ?? 0) > 1;

/** What a group chat is called: the other people's first names */
function groupName(c: DMConversation) {
  return c.participants.map(p => (p.full_name || p.username || '').split(' ')[0]).filter(Boolean).join(', ');
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
    archivedIds, pinnedIds, mutedIds, showArchived, typing,
    archiveConversation, unarchiveConversation, deleteConversation, setShowArchived,
    togglePin, toggleMute, loadPersistedDMState, drafts,
  } = useDMStore();
  const online = usePresence(s => s.online);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [listQuery, setListQuery] = useState('');

  const [newDMVisible, setNewDMVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<UserRow[]>([]);
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startingFor, setStartingFor] = useState<string | null>(null);
  const [convSheet, setConvSheet] = useState<{ convId: string; isArchived: boolean } | null>(null);

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

  // "typing…" in the rows: one inbox channel for the whole list (see dmStore)
  useEffect(() => {
    if (!user?.id) return;
    return attachTypingInbox(user.id);
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

  // Filter conversations for main / archived views; pinned chats float to the top
  const visibleConversations = useMemo(() => {
    let list = showArchived
      ? conversations.filter(c => archivedIds.includes(c.id))
      : conversations.filter(c => !archivedIds.includes(c.id));
    if (!showArchived && filter === 'unread') list = list.filter(c => c.unread_count > 0);
    if (!showArchived && filter === 'groups') list = list.filter(isGroup);
    const q = listQuery.trim().toLowerCase();
    if (q) list = list.filter(c => {
      const hit = c.participants?.some((o: any) => o?.full_name?.toLowerCase().includes(q) || o?.username?.toLowerCase().includes(q));
      return hit || c.last_message?.content?.toLowerCase().includes(q);
    });
    if (pinnedIds.length) {
      const pinned = list.filter(c => pinnedIds.includes(c.id));
      if (pinned.length) list = [...pinned, ...list.filter(c => !pinnedIds.includes(c.id))];
    }
    return list;
  }, [conversations, archivedIds, pinnedIds, showArchived, filter, listQuery]);

  const unreadChats = useMemo(
    () => conversations.filter(c => !archivedIds.includes(c.id) && c.unread_count > 0).length,
    [conversations, archivedIds]
  );

  const archivedCount = useMemo(
    () => conversations.filter(c => archivedIds.includes(c.id)).length,
    [conversations, archivedIds]
  );

  const handleSelectUser = useCallback(async (person: UserRow) => {
    const open = (conversationId: string) => {
      setNewDMVisible(false);
      navigation.navigate('DMConversation', {
        conversationId,
        participantName: person.full_name,
        participantUsername: person.username,
        participantAvatar: person.avatar_url,
      });
    };
    // A chat with them already on the phone opens straight away
    const existing = useDMStore.getState().conversations.find(c => c.participants?.some(p => p.id === person.id));
    if (existing) { open(existing.id); return; }
    setStartingFor(person.id);
    try {
      const convRes: any = await apiClient.startDMConversation(person.id);
      if (convRes.success && convRes.data?.id) open(convRes.data.id);
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

  const renderConversation = useCallback(({ item }: { item: DMConversation }) => {
    const other: any = item.participants[0];
    const group = isGroup(item);
    const draft = drafts[item.id];
    const active = !group && !!(other?.id && online[other.id]);
    const isArchived = archivedIds.includes(item.id);
    const pinned = pinnedIds.includes(item.id);
    const muted = mutedIds.includes(item.id);
    const isTyping = !!typing[item.id];
    const unread = item.unread_count > 0;
    const last = item.last_message;
    const mine = last?.sender_id && last.sender_id === user?.id;
    const title = group ? groupName(item) : (other?.full_name || other?.username);
    const body = last?.content
      ? last.content
      : last?.media_type === 'video' ? 'Sent a video'
      : last?.media_type === 'image' ? 'Sent a photo'
      : last?.media_type === 'audio' ? 'Voice note'
      : 'Say hello';
    // Swipe left: Read (when unread), Pin, Archive, like WhatsApp and Mail
    const actions = () => (
      <View style={{ flexDirection: 'row' }}>
        {unread && (
          <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); useDMStore.getState().markRead(item.id); }}
            style={[styles.swipeBtn, { backgroundColor: '#007AFF' }]} accessibilityRole="button" accessibilityLabel="Mark as read">
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            <Text style={styles.swipeText}>Read</Text>
          </Pressable>
        )}
        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); togglePin(item.id); }}
          style={[styles.swipeBtn, { backgroundColor: '#FF9500' }]} accessibilityRole="button" accessibilityLabel={pinned ? 'Unpin' : 'Pin'}>
          <Ionicons name={pinned ? 'pin-outline' : 'pin'} size={20} color="#fff" />
          <Text style={styles.swipeText}>{pinned ? 'Unpin' : 'Pin'}</Text>
        </Pressable>
        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); isArchived ? unarchiveConversation(item.id) : archiveConversation(item.id); }}
          style={[styles.swipeBtn, { backgroundColor: '#8E8E93' }]} accessibilityRole="button" accessibilityLabel={isArchived ? 'Unarchive' : 'Archive'}>
          <Ionicons name="archive" size={20} color="#fff" />
          <Text style={styles.swipeText}>{isArchived ? 'Unarchive' : 'Archive'}</Text>
        </Pressable>
      </View>
    );
    const a11y = [
      group ? `Group chat with ${title}` : `Chat with ${title}`,
      unread ? `${item.unread_count} unread` : '',
      pinned ? 'pinned' : '',
      muted ? 'muted' : '',
      isTyping ? 'typing' : '',
    ].filter(Boolean).join(', ');
    return (
      <ReanimatedSwipeable renderRightActions={actions} friction={1.6} rightThreshold={40} overshootRight={false}>
      <Pressable
        style={({ pressed }) => [styles.convRow, pressed && { backgroundColor: T.surface }]}
        // Load the saved messages the moment a finger lands, so the chat opens already filled
        onPressIn={() => { useDMStore.getState().hydrateMessages(item.id); }}
        onPress={() => navigation.navigate('DMConversation', {
          conversationId: item.id,
          participantName: title,
          participantUsername: group ? undefined : other?.username,
          participantAvatar: other?.avatar_url,
          participantIsVerified: group ? false : other?.is_verified,
        })}
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLongPress(item.id, isArchived); }}
        delayLongPress={400}
        accessibilityLabel={a11y}
      >
        <View>
          {group && item.participants[1] ? (
            <View style={{ width: 54, height: 54 }}>
              <View style={[styles.groupTop, { borderColor: T.bg }]}><UserAvatar avatarUrl={other?.avatar_url} size={36} name={other?.full_name || other?.username} /></View>
              <View style={[styles.groupBottom, { borderColor: T.bg }]}><UserAvatar avatarUrl={item.participants[1].avatar_url} size={36} name={item.participants[1].full_name || item.participants[1].username} /></View>
            </View>
          ) : (
            <UserAvatar avatarUrl={other?.avatar_url} size={54} isBot={other?.is_bot} name={other?.full_name || other?.username} />
          )}
          {active && <View style={styles.activeDot} accessibilityLabel="Active now" />}
        </View>
        <View style={styles.convInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.convName, unread && styles.convNameUnread]} numberOfLines={1}>{title}</Text>
            {!group && other?.is_verified && <VerifiedBadge size={14} />}
            {pinned && <Ionicons name="pin" size={12} color={T.textMuted} style={{ marginLeft: 1 }} accessibilityLabel="Pinned" />}
            {muted && <Ionicons name="volume-mute" size={13} color={T.textMuted} accessibilityLabel="Muted" />}
          </View>
          {isTyping ? (
            <Text style={[styles.convLastMsg, { color: T.accent, fontWeight: '600' }]} numberOfLines={1}>typing…</Text>
          ) : draft ? (
            <Text style={styles.convLastMsg} numberOfLines={1}>
              <Text style={styles.draftLabel}>Draft: </Text>{draft.replace(/\s+/g, ' ')}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {mine ? (
                <Ionicons name={last?.is_read ? 'checkmark-done' : 'checkmark'} size={16}
                  color={last?.is_read ? '#34B7F1' : T.textMuted} accessibilityLabel={last?.is_read ? 'Read' : 'Sent'} />
              ) : null}
              <Text style={[styles.convLastMsg, { flex: 1 }, unread && styles.unreadMsg]} numberOfLines={1}>
                {active && !unread && !mine ? <Text style={{ color: T.accent }}>Active now · </Text> : null}
                {group && last?.sender && !mine ? `${(last.sender.full_name || last.sender.username || '').split(' ')[0]}: ` : ''}{body}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.rightCol}>
          <Text style={[styles.rowTime, unread && !muted && { color: T.accent, fontWeight: '600' }]}>{timeAgo(item.last_message_at)}</Text>
          {unread ? (
            <View style={[styles.badge, { backgroundColor: muted ? T.textMuted : T.accent }]} accessibilityLabel={`${item.unread_count} unread`}>
              <Text style={styles.badgeText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
            </View>
          ) : <View style={{ height: 20 }} />}
        </View>
      </Pressable>
      </ReanimatedSwipeable>
    );
  }, [navigation, archivedIds, pinnedIds, mutedIds, typing, handleLongPress, user?.id, styles, T, drafts, online, archiveConversation, unarchiveConversation, togglePin]);

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: unreadChats ? `Unread ${unreadChats}` : 'Unread' },
    { id: 'groups', label: 'Groups' },
  ];

  const emptyText = showArchived ? 'No archived chats'
    : listQuery ? `No chats match "${listQuery}"`
    : filter === 'unread' ? "You're all caught up"
    : filter === 'groups' ? 'No group chats yet'
    : 'No messages yet';

  return (
    <View style={styles.container}>
      {/* Large title header, same shape as Explore */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => { if (showArchived) { setShowArchived(false); } else { navigation.goBack(); } }}
            hitSlop={10}
            style={{ marginRight: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color={T.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            {showArchived ? 'Archived' : 'Messages'}
          </Text>
          {showArchived ? (
            <View style={{ width: 36 }} />
          ) : (
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]} onPress={openNewDM} accessibilityRole="button" accessibilityLabel="New message">
              <Ionicons name="create-outline" size={18} color={T.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={T.textSub} />
          <TextInput
            style={styles.searchInput}
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
      </View>

      {!showArchived && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
          {chips.map(({ id, label }) => {
            const on = filter === id;
            return (
              <Pressable key={id} onPress={() => { Haptics.selectionAsync(); setFilter(id); }}
                style={[styles.chip, on ? { backgroundColor: T.text, borderColor: T.text } : { borderColor: T.border }]}
                accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, { color: on ? T.bg : T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {conversationsLoading && conversations.length === 0 ? (
        <RowsSkeleton count={8} avatar={52} label="Loading chats" />
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={item => item.id}
          renderItem={renderConversation}
          ListHeaderComponent={!showArchived && !listQuery && filter === 'all' ? (
            <>
              {archivedCount > 0 && (
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setShowArchived(true); }}
                  style={({ pressed }) => [styles.archivedRow, pressed && { backgroundColor: T.surface }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Archived, ${archivedCount} ${archivedCount === 1 ? 'chat' : 'chats'}`}
                >
                  <View style={[styles.archivedIcon, { backgroundColor: T.surface2 }]}>
                    <Ionicons name="archive-outline" size={22} color={T.textSub} />
                  </View>
                  <Text style={styles.archivedText}>Archived</Text>
                  <Text style={styles.archivedCount}>{archivedCount}</Text>
                  <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
                </Pressable>
              )}
              {!hasAIChat && (
                <TouchableOpacity style={styles.aiRow} onPress={openAI} disabled={startingFor === KIONGOZI_AI_ID} accessibilityRole="button" accessibilityLabel="Chat with Kiongozi AI">
                  <UserAvatar avatarUrl={null} size={54} isBot name="Kiongozi AI" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.aiTitle}>Kiongozi AI</Text>
                    <Text style={styles.aiSub} numberOfLines={1}>Ask anything, any time</Text>
                  </View>
                  {startingFor === KIONGOZI_AI_ID ? <ActivityIndicator color={T.accent} /> : <Ionicons name="sparkles" size={20} color={T.accent} />}
                </TouchableOpacity>
              )}
            </>
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={showArchived ? 'archive-outline' : listQuery || filter === 'unread' ? 'search-outline' : filter === 'groups' ? 'people-outline' : 'chatbubbles-outline'}
                  size={30} color={T.textSub}
                />
              </View>
              <Text style={styles.emptyText}>{emptyText}</Text>
              {!showArchived && !listQuery && filter === 'all' && (
                <>
                  <Text style={styles.emptySubtext}>Start a conversation with someone you follow.</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={openNewDM}>
                    <Text style={styles.emptyBtnText}>New message</Text>
                  </TouchableOpacity>
                </>
              )}
              {!showArchived && !listQuery && filter === 'groups' && (
                <Text style={styles.emptySubtext}>Chats with more than one person will show up here.</Text>
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

            <View style={styles.pickerSearch}>
              <Ionicons name="search" size={16} color={T.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
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
            icon: pinnedIds.includes(convSheet.convId) ? 'pin-outline' : 'pin',
            label: pinnedIds.includes(convSheet.convId) ? 'Unpin' : 'Pin',
            onPress: () => togglePin(convSheet.convId),
          },
          {
            icon: mutedIds.includes(convSheet.convId) ? 'volume-high-outline' : 'volume-mute-outline',
            label: mutedIds.includes(convSheet.convId) ? 'Unmute' : 'Mute',
            onPress: () => toggleMute(convSheet.convId),
          },
          {
            icon: 'archive-outline',
            label: convSheet.isArchived ? 'Unarchive' : 'Archive',
            onPress: () => convSheet.isArchived
              ? unarchiveConversation(convSheet.convId)
              : archiveConversation(convSheet.convId),
          },
          {
            icon: 'trash-outline',
            label: 'Delete conversation',
            destructive: true,
            // Goes at once with "Chat deleted · Undo" (no "Are you sure?")
            onPress: () => deleteConversation(convSheet.convId),
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
    header: { paddingHorizontal: 20, paddingBottom: 10, backgroundColor: T.bg, gap: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 },
    headerTitle: { flex: 1, fontSize: 34, lineHeight: 41, color: T.text, letterSpacing: 0.37, fontWeight: '800' },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface2, borderRadius: 11, height: 38, paddingHorizontal: 10, gap: 6 },
    searchInput: { flex: 1, fontSize: 17, color: T.text, paddingVertical: 0 },
    chips: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 6, gap: 8 },
    chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
    chipText: { fontSize: 14, fontWeight: '600' },
    archivedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    archivedIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
    archivedText: { flex: 1, fontSize: 16, fontWeight: '600', color: T.text },
    archivedCount: { fontSize: 15, color: T.textMuted, fontVariant: ['tabular-nums'] },
    convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, backgroundColor: T.bg },
    convInfo: { flex: 1, minWidth: 0, gap: 3 },
    rightCol: { alignItems: 'flex-end', gap: 6, minWidth: 44 },
    rowTime: { fontSize: 13, color: T.textMuted },
    badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
    badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    swipeBtn: { width: 76, alignItems: 'center', justifyContent: 'center', gap: 4 },
    swipeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    convName: { fontSize: 16, color: T.text, fontWeight: '500', flexShrink: 1 },
    convNameUnread: { fontWeight: '700' },
    convLastMsg: { color: T.textSub, fontSize: 14 },
    unreadMsg: { fontWeight: '600', color: T.text },
    draftLabel: { color: T.error, fontWeight: '600' },
    groupTop: { position: 'absolute', left: 0, top: 0, borderWidth: 2, borderRadius: 20 },
    groupBottom: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2, borderRadius: 20 },
    activeDot: {
      position: 'absolute', right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7,
      backgroundColor: '#34C759', borderWidth: 2.5, borderColor: T.bg,
    },
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
    pickerSearch: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 14, height: 42, backgroundColor: T.surface2, borderRadius: 21, gap: 8 },
    pickerSearchInput: { flex: 1, fontSize: 15, color: T.text },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontWeight: '600', fontSize: 15, color: T.text, flexShrink: 1 },
    userHandle: { color: T.textSub, fontSize: 13, marginTop: 1 },
    emptySearch: { alignItems: 'center', padding: 32 },
    emptySearchText: { color: T.textMuted, fontSize: 14, textAlign: 'center' },
  });
}
