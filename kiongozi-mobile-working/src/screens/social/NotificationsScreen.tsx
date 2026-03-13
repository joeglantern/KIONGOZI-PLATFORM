import React, { useEffect, useState } from 'react';
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

// Extract sender name from message for bold display
// Message format: "John Doe liked your post" → name="John Doe", rest="liked your post"
function splitMessage(message: string): { name: string; rest: string } | null {
  const actions = [
    'liked your post', 'replied to your post', 'replied in your thread',
    'reposted your post', 'followed you', 'sent you a message',
    'mentioned you in a post', '@kiongozi replied to your post',
    'wants to follow you', 'accepted your follow request',
  ];
  for (const action of actions) {
    const idx = message.indexOf(action);
    if (idx > 0) {
      return { name: message.slice(0, idx).trim(), rest: action };
    }
  }
  return null;
}

function FollowRequestButtons({
  item,
  onRemove,
}: {
  item: SocialNotification;
  onRemove: (id: string) => void;
}) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const requestId = item.data?.request_id as string | undefined;

  const handleAccept = async () => {
    if (!requestId) return;
    setLoading('accept');
    try {
      const res = await apiClient.acceptFollowRequest(requestId);
      if (res.success) onRemove(item.id);
    } catch {}
    setLoading(null);
  };

  const handleDecline = async () => {
    if (!requestId) return;
    setLoading('decline');
    try {
      const res = await apiClient.declineFollowRequest(requestId);
      if (res.success) onRemove(item.id);
    } catch {}
    setLoading(null);
  };

  return (
    <View style={styles.frButtons}>
      <TouchableOpacity
        style={[styles.frBtn, styles.frAccept]}
        onPress={handleAccept}
        disabled={!!loading}
      >
        {loading === 'accept'
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.frAcceptText}>Accept</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.frBtn, styles.frDecline]}
        onPress={handleDecline}
        disabled={!!loading}
      >
        {loading === 'decline'
          ? <ActivityIndicator size="small" color="#1a365d" />
          : <Text style={styles.frDeclineText}>Decline</Text>}
      </TouchableOpacity>
    </View>
  );
}

function NotificationItem({
  item,
  onPress,
  onRemove,
}: {
  item: SocialNotification;
  onPress: () => void;
  onRemove: (id: string) => void;
}) {
  const meta = TYPE_META[item.type] ?? { icon: 'notifications' as any, color: '#94a3b8' };
  const isSocial = !!item.fromUsername;
  const isBot = item.fromUsername === 'kiongozi';
  const split = splitMessage(item.message);
  const isFollowRequest = item.type === 'follow_request';

  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Avatar with type badge */}
      <View style={styles.avatarWrap}>
        {isSocial ? (
          <>
            <UserAvatar avatarUrl={item.fromAvatar} size={52} isBot={isBot} />
            <View style={[styles.badge, { backgroundColor: meta.color }]}>
              <Ionicons name={meta.icon} size={11} color="#fff" />
            </View>
          </>
        ) : (
          <View style={[styles.systemBubble, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon} size={26} color={meta.color} />
          </View>
        )}
      </View>

      {/* Text + optional follow request buttons */}
      <View style={styles.textWrap}>
        <View style={styles.nameRow}>
          <Text style={styles.nameTime} numberOfLines={1}>
            {split ? (
              <>
                <Text style={styles.name}>{split.name}</Text>
                <Text style={styles.dot}> · </Text>
                <Text style={styles.timeInline}>{timeAgo(item.created_at)}</Text>
              </>
            ) : (
              <Text style={styles.timeInline}>{timeAgo(item.created_at)}</Text>
            )}
          </Text>
        </View>
        <Text style={styles.messageText} numberOfLines={3}>
          {split ? split.rest : item.message}
        </Text>
        {isFollowRequest && (
          <FollowRequestButtons item={item} onRemove={onRemove} />
        )}
      </View>

      {/* Unread dot */}
      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    notifications, unreadCount, isLoading, hasMore,
    fetchNotifications, markAllRead, markRead, addNotification, removeNotification,
  } = useNotificationStore();

  useEffect(() => { fetchNotifications(true); }, []);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'social_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) addNotification(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    return () => { markAllRead(); };
  }, []);

  const handlePress = (item: SocialNotification) => {
    markRead(item.id);
    if (item.type === 'dm' && item.conversationId) {
      navigation.navigate('DMConversation', {
        conversationId: item.conversationId,
        participantName: item.fromUsername || 'Message',
        participantUsername: item.fromUsername,
        participantAvatar: item.fromAvatar,
      });
    } else if (item.postId) {
      navigation.navigate('PostDetail', { postId: item.postId });
    } else if (item.fromUsername) {
      navigation.navigate('PublicProfile', { username: item.fromUsername });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn} activeOpacity={0.7}>
            <Ionicons name="checkmark-done" size={14} color="#3b82f6" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#1a365d" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={() => handlePress(item)}
              onRemove={(id) => { markRead(id); removeNotification?.(id); }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && notifications.length > 0}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#1a365d"
            />
          }
          onEndReached={() => { if (hasMore) fetchNotifications(false); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={36} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySubtext}>
                Likes, follows, replies and mentions will appear here.
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoading && notifications.length > 0
              ? <ActivityIndicator style={{ marginVertical: 24 }} color="#1a365d" />
              : <View style={{ height: 32 }} />
          }
        />
      )}
    </View>
  );
}

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  markAllText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    gap: 13,
  },
  itemUnread: { backgroundColor: '#fafbff' },

  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: 'relative',
    flexShrink: 0,
  },
  badge: {
    position: 'absolute',
    bottom: -3,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  systemBubble: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textWrap: { flex: 1, paddingTop: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  nameTime: { fontSize: 14, flexShrink: 1 },
  name: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  dot: { color: '#94a3b8', fontSize: 14 },
  timeInline: { color: '#94a3b8', fontSize: 13 },
  messageText: { fontSize: 14, color: '#475569', lineHeight: 20 },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 6,
    flexShrink: 0,
  },

  frButtons: { flexDirection: 'row', gap: 8, marginTop: 10 },
  frBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  frAccept: { backgroundColor: '#1a365d' },
  frAcceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  frDecline: { borderWidth: 1, borderColor: '#e2e8f0' },
  frDeclineText: { color: '#4a5568', fontWeight: '600', fontSize: 14 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 21 },
});
