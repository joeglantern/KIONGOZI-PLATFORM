import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore, SocialNotification } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabaseClient';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  like:           { icon: 'heart',               color: '#f43f5e' },
  comment:        { icon: 'chatbubble-ellipses', color: '#3b82f6' },
  repost:         { icon: 'repeat',              color: '#10b981' },
  mention:        { icon: 'at-circle',           color: '#8b5cf6' },
  follow:         { icon: 'person-add',          color: '#f59e0b' },
  follow_request: { icon: 'person-add',          color: '#f59e0b' },
  dm:             { icon: 'paper-plane',         color: '#3b82f6' },
  info:           { icon: 'information-circle',  color: '#3b82f6' },
  warning:        { icon: 'warning',             color: '#f59e0b' },
  error:          { icon: 'close-circle',        color: '#f43f5e' },
};

function splitMessage(message: string): { name: string; rest: string } | null {
  const actions = [
    'liked your post', 'replied to your post', 'replied in your thread',
    'reposted your post', 'followed you', 'sent you a message',
    'mentioned you in a post', '@kiongozi replied to your post',
    'wants to follow you', 'accepted your follow request',
  ];
  for (const action of actions) {
    const idx = message.indexOf(action);
    if (idx > 0) return { name: message.slice(0, idx).trim(), rest: action };
  }
  return null;
}

const NOTIF_AVATAR_SIZE = 52;

function FollowRequestButtons({ item, onRemove }: { item: SocialNotification; onRemove: (id: string) => void }) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const requestId = item.data?.request_id as string | undefined;
  const fromUserId = item.data?.from_user_id as string | undefined;

  const handleAccept = async () => {
    if (!requestId && !fromUserId) return;
    setLoading('accept');
    onRemove(item.id);
    try { await apiClient.acceptFollowRequest(requestId, fromUserId); } catch {}
    setLoading(null);
  };

  const handleDecline = async () => {
    if (!requestId && !fromUserId) return;
    setLoading('decline');
    try { await apiClient.declineFollowRequest(requestId, fromUserId); onRemove(item.id); } catch {}
    setLoading(null);
  };

  return (
    <View style={styles.frButtons}>
      <TouchableOpacity style={[styles.frBtn, styles.frAccept]} onPress={handleAccept} disabled={!!loading}>
        {loading === 'accept' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.frAcceptText}>Accept</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.frBtn, styles.frDecline]} onPress={handleDecline} disabled={!!loading}>
        {loading === 'decline' ? <ActivityIndicator size="small" color={T.accent} /> : <Text style={styles.frDeclineText}>Decline</Text>}
      </TouchableOpacity>
    </View>
  );
}

function NotificationItem({ item, onPress, onRemove }: { item: SocialNotification; onPress: () => void; onRemove: (id: string) => void }) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const meta = TYPE_META[item.type] ?? { icon: 'notifications' as any, color: '#94a3b8' };
  const isSocial = !!item.fromUsername;
  const isBot = item.fromUsername === 'kiongozi';
  const split = splitMessage(item.message);
  const isFollowRequest = item.type === 'follow_request' && !item.read;

  return (
    <TouchableOpacity style={[styles.item, !item.read && styles.itemUnread]} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.avatarWrap}>
        {isSocial ? (
          <>
            <UserAvatar avatarUrl={item.fromAvatar} size={NOTIF_AVATAR_SIZE} isBot={isBot} />
            <View style={[styles.badge, { backgroundColor: meta.color, borderColor: T.bg }]}>
              <Ionicons name={meta.icon} size={11} color="#fff" />
            </View>
          </>
        ) : (
          <View style={[styles.systemBubble, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon} size={26} color={meta.color} />
          </View>
        )}
      </View>
      <View style={styles.textWrap}>
        <View style={styles.nameRow}>
          <Text style={styles.nameTime} numberOfLines={1}>
            {split ? (
              <><Text style={styles.name}>{split.name}</Text><Text style={styles.dot}> · </Text><Text style={styles.timeInline}>{timeAgo(item.created_at)}</Text></>
            ) : (
              <Text style={styles.timeInline}>{timeAgo(item.created_at)}</Text>
            )}
          </Text>
        </View>
        <Text style={styles.messageText} numberOfLines={3}>{split ? split.rest : item.message}</Text>
        {isFollowRequest && <FollowRequestButtons item={item} onRemove={onRemove} />}
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const {
    notifications, unreadCount, isLoading, hasMore,
    fetchNotifications, markAllRead, markRead, addNotification, removeNotification,
  } = useNotificationStore();

  useEffect(() => { fetchNotifications(true); }, []);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_notifications', filter: `user_id=eq.${user.id}` },
        (payload) => { if (payload.new) addNotification(payload.new); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => { return () => { markAllRead(); }; }, []);

  const handlePress = (item: SocialNotification) => {
    markRead(item.id);
    if (item.type === 'dm' && item.conversationId) {
      navigation.navigate('DMConversation', { conversationId: item.conversationId, participantName: item.fromUsername || 'Message', participantUsername: item.fromUsername, participantAvatar: item.fromAvatar });
    } else if (item.postId) {
      navigation.navigate('PostDetail', { postId: item.postId });
    } else if (item.fromUsername) {
      navigation.navigate('PublicProfile', { username: item.fromUsername });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn} activeOpacity={0.7}>
            <Ionicons name="checkmark-done" size={14} color="#3b82f6" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={T.accent} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handlePress(item)} onRemove={(id) => { markRead(id); removeNotification?.(id); }} />
          )}
          refreshControl={<RefreshControl refreshing={isLoading && notifications.length > 0} onRefresh={() => fetchNotifications(true)} tintColor={T.accent} />}
          onEndReached={() => { if (hasMore) fetchNotifications(false); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={36} color={T.textSub} />
              </View>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySubtext}>Likes, follows, replies and mentions will appear here.</Text>
            </View>
          }
          ListFooterComponent={isLoading && notifications.length > 0 ? <ActivityIndicator style={{ marginVertical: 24 }} color={T.accent} /> : <View style={{ height: 32 }} />}
        />
      )}
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 56, paddingHorizontal: 18, paddingBottom: 14,
      backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    headerTitle: { fontSize: 26, fontWeight: '700', color: T.text, letterSpacing: -0.6, fontFamily: 'SpaceGrotesk_700Bold' },
    markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
    markAllText: { color: T.accent, fontSize: 13, fontWeight: '600' },
    item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, paddingHorizontal: 18, backgroundColor: T.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight, gap: 13 },
    itemUnread: { backgroundColor: T.surface },
    avatarWrap: { width: NOTIF_AVATAR_SIZE, height: NOTIF_AVATAR_SIZE, position: 'relative', flexShrink: 0 },
    badge: { position: 'absolute', bottom: -3, right: -5, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5 },
    systemBubble: { width: NOTIF_AVATAR_SIZE, height: NOTIF_AVATAR_SIZE, borderRadius: NOTIF_AVATAR_SIZE / 2, justifyContent: 'center', alignItems: 'center' },
    textWrap: { flex: 1, paddingTop: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    nameTime: { fontSize: 14, flexShrink: 1 },
    name: { fontWeight: '700', color: T.text, fontSize: 14 },
    dot: { color: T.textMuted, fontSize: 14 },
    timeInline: { color: T.textMuted, fontSize: 13 },
    messageText: { fontSize: 14, color: T.textSub, lineHeight: 20 },
    unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6, flexShrink: 0 },
    frButtons: { flexDirection: 'row', gap: 8, marginTop: 10 },
    frBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minWidth: 72 },
    frAccept: { backgroundColor: T.accent },
    frAcceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    frDecline: { borderWidth: 1, borderColor: T.border },
    frDeclineText: { color: T.textSub, fontWeight: '600', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 21 },
  });
}
