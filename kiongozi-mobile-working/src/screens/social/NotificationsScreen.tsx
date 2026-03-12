import React, { useEffect } from 'react';
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

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  like:    { icon: 'heart',               color: '#e53e3e', label: 'liked'     },
  comment: { icon: 'chatbubble',          color: '#3182ce', label: 'commented' },
  repost:  { icon: 'repeat',              color: '#38a169', label: 'reposted'  },
  mention: { icon: 'at',                  color: '#805ad5', label: 'mentioned' },
  follow:  { icon: 'person-add',          color: '#d69e2e', label: 'followed'  },
  dm:      { icon: 'paper-plane',         color: '#3182ce', label: 'messaged'  },
  info:    { icon: 'information-circle',  color: '#3182ce', label: ''          },
  warning: { icon: 'warning',             color: '#d69e2e', label: ''          },
  error:   { icon: 'close-circle',        color: '#e53e3e', label: ''          },
};

function NotificationItem({ item, onPress }: { item: SocialNotification; onPress: () => void }) {
  const meta = TYPE_META[item.type] ?? { icon: 'notifications' as any, color: '#718096', label: '' };
  const isSocial = !!item.fromUsername;
  const isBot = item.fromUsername === 'kiongozi';

  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left accent bar for unread */}
      {!item.read && <View style={styles.unreadBar} />}

      {/* Avatar column */}
      <View style={styles.avatarWrap}>
        {isSocial ? (
          <>
            <UserAvatar
              avatarUrl={item.fromAvatar}
              size={46}
              isBot={isBot}
            />
            {/* Type icon badge overlapping avatar */}
            <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
              <Ionicons name={meta.icon} size={10} color="#fff" />
            </View>
          </>
        ) : (
          /* System notification — plain icon circle */
          <View style={[styles.systemIcon, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
        )}
      </View>

      {/* Text column */}
      <View style={styles.textCol}>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    notifications, unreadCount, isLoading, hasMore,
    fetchNotifications, markAllRead, markRead, addNotification,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 48 }} color="#1a365d" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handlePress(item)} />
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
              <Ionicons name="notifications-outline" size={56} color="#e2e8f0" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>
                Likes, follows, and mentions will show up here.
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoading && notifications.length > 0
              ? <ActivityIndicator style={{ marginVertical: 20 }} color="#1a365d" />
              : null
          }
        />
      )}
    </View>
  );
}

const AVATAR_SIZE = 46;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a202c', letterSpacing: -0.3 },
  markAllBtn: {
    backgroundColor: '#ebf8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  markAllText: { color: '#3182ce', fontSize: 13, fontWeight: '600' },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f4f8',
    gap: 12,
  },
  itemUnread: { backgroundColor: '#f0f7ff' },

  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#3182ce',
    borderRadius: 2,
  },

  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  systemIcon: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textCol: { flex: 1 },
  message: { fontSize: 14, color: '#2d3748', lineHeight: 20 },
  time: { color: '#a0aec0', fontSize: 12, marginTop: 3 },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3182ce',
    flexShrink: 0,
  },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#4a5568', marginTop: 8 },
  emptySubtext: { fontSize: 14, color: '#a0aec0', textAlign: 'center', lineHeight: 20 },
});
