import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore, SocialNotification } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabaseClient';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: '#e53e3e' },
  comment: { name: 'chatbubble', color: '#3182ce' },
  repost: { name: 'repeat', color: '#38a169' },
  mention: { name: 'at', color: '#805ad5' },
  follow: { name: 'person-add', color: '#d69e2e' },
  dm: { name: 'mail', color: '#3182ce' },
  info: { name: 'information-circle', color: '#3182ce' },
  warning: { name: 'warning', color: '#d69e2e' },
  error: { name: 'close-circle', color: '#e53e3e' },
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAllRead, markRead, addNotification } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Supabase Realtime: listen for new notifications for this user
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) addNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Mark all read when leaving the screen
  useEffect(() => {
    return () => { markAllRead(); };
  }, []);

  const renderNotification = ({ item }: { item: SocialNotification }) => {
    const icon = ICON_MAP[item.type] ?? { name: 'notifications' as any, color: '#718096' };
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.unread]}
        onPress={() => {
          markRead(item.id);
          if (item.type === 'dm' && item.conversationId) {
            navigation.navigate('DMConversation', { conversationId: item.conversationId, participantName: item.fromUsername || 'Message' });
          } else if (item.postId) {
            navigation.navigate('PostDetail', { postId: item.postId });
          } else if (item.fromUsername) {
            navigation.navigate('PublicProfile', { username: item.fromUsername });
          }
        }}
      >
        <View style={[styles.iconBadge, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={18} color={icon.color} />
        </View>
        <View style={styles.content}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a365d" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  markAll: { color: '#3182ce', fontSize: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  unread: { backgroundColor: '#ebf8ff' },
  iconBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  message: { fontSize: 14, color: '#2d3748', lineHeight: 20 },
  time: { color: '#a0aec0', fontSize: 12, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3182ce', marginTop: 4 },
  empty: { alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { color: '#a0aec0', fontSize: 16 },
});
