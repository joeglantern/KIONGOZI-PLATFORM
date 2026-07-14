import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';

export default function MutedUsersScreen() {
  const navigation = useNavigation<any>();
  const { unmuteUser } = useSocialStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmuteTarget, setUnmuteTarget] = useState<any | null>(null);
  const T = useTheme();
  const styles = React.useMemo(() => makeStyles(T), [T]);

  const loadMuted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getMutedUsers();
      if (res.success) setUsers(res.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadMuted(); }, []);

  const handleUnmute = useCallback((user: any) => setUnmuteTarget(user), []);

  const doUnmute = async () => {
    if (!unmuteTarget) return;
    await unmuteUser(unmuteTarget.id);
    setUsers(prev => prev.filter(u => u.id !== unmuteTarget.id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muted Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#5CB85C" />
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
              <Ionicons name="volume-mute-outline" size={48} color="#2A2A2A" />
              <Text style={styles.emptyTitle}>No muted users</Text>
              <Text style={styles.emptySub}>You haven't muted anyone.</Text>
            </View>
          }
        />
      )}

      <BottomSheet
        visible={!!unmuteTarget}
        onClose={() => setUnmuteTarget(null)}
        title={`Unmute @${unmuteTarget?.username}?`}
        subtitle="Their posts will reappear in your feed."
        actions={[
          { icon: 'volume-high-outline', label: 'Unmute', onPress: doUnmute },
        ]}
      />
    </SafeAreaView>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: T.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight, gap: 12 },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: T.text },
    username: { fontSize: 13, color: T.textSub, marginTop: 1 },
    unmuteBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: T.accent },
    unmuteText: { color: T.accent, fontWeight: '600', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text },
    emptySub: { fontSize: 14, color: T.textSub, textAlign: 'center' },
  });
}
