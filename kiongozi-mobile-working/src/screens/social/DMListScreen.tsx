import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';

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

export default function DMListScreen() {
  const navigation = useNavigation<any>();
  const { conversations, conversationsLoading, fetchConversations } = useDMStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity>
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
                  participantUsername: other?.username
                })}
              >
                <UserAvatar
                  avatarUrl={other?.avatar_url}
                  size={50}
                  isBot={other?.is_bot}
                  isVerified={other?.is_verified}
                />
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
              <Text style={styles.emptySubtext}>Start a conversation with someone you follow</Text>
            </View>
          }
        />
      )}
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
});
