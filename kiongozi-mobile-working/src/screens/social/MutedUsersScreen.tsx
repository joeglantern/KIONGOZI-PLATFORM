import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';

export default function MutedUsersScreen() {
  const navigation = useNavigation<any>();
  const { unmuteUser } = useSocialStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMuted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getMutedUsers();
      if (res.success) setUsers(res.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadMuted(); }, []);

  const handleUnmute = useCallback(async (user: any) => {
    Alert.alert(
      'Unmute User',
      `Unmute @${user.username}? Their posts will reappear in your feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: async () => {
            await unmuteUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
          },
        },
      ]
    );
  }, [unmuteUser]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muted Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#1a365d" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <UserAvatar avatarUrl={item.avatar_url} size={44} isVerified={item.is_verified} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              <TouchableOpacity
                style={styles.unmuteBtn}
                onPress={() => handleUnmute(item)}
              >
                <Text style={styles.unmuteText}>Unmute</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="volume-mute-outline" size={48} color="#e2e8f0" />
              <Text style={styles.emptyTitle}>No muted users</Text>
              <Text style={styles.emptySub}>You haven't muted anyone.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1a202c' },
  username: { fontSize: 13, color: '#718096', marginTop: 1 },
  unmuteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  unmuteText: { color: '#4a5568', fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a202c' },
  emptySub: { fontSize: 14, color: '#718096', textAlign: 'center' },
});
