import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';
import { toast } from '../../utils/alert';
import { useTheme, AppTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';

export default function MutedUsersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
      if (res.success) setUsers((res.data as any[]) || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadMuted(); }, []);

  const handleUnmute = useCallback((user: any) => setUnmuteTarget(user), []);

  // The row goes at once; it comes back with a toast if the server says no
  const doUnmute = async () => {
    if (!unmuteTarget) return;
    const target = unmuteTarget;
    const before = users;
    setUsers(prev => prev.filter(u => u.id !== target.id));
    await unmuteUser(target.id);
    if (useSocialStore.getState().mutedUserIds.includes(target.id)) {
      setUsers(before);
      toast(`Couldn't unmute @${target.username}`, { kind: 'error' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Muted accounts</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <PeopleSkeleton T={T} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            users.length > 0 ? (
              <Text style={styles.note}>You won’t see posts from these accounts in your feed. They aren’t notified.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: T.surface }]}
              onPress={() => item.username && navigation.navigate('PublicProfile', { username: item.username })}
            >
              <UserAvatar avatarUrl={item.avatar_url} size={44} isVerified={item.is_verified} />
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{item.full_name || item.username}</Text>
                  {item.is_verified && <VerifiedBadge size={14} />}
                </View>
                <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
              </View>
              <Pressable
                onPress={() => handleUnmute(item)}
                hitSlop={6}
                accessibilityRole="button"
                style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.pillText}>Unmute</Text>
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="volume-mute-outline" size={28} color={T.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No muted accounts</Text>
              <Text style={styles.emptySub}>When you mute someone, their posts stop showing in your feed. You can unmute them here anytime.</Text>
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
    </View>
  );
}

function PeopleSkeleton({ T }: { T: AppTheme }) {
  return (
    <View style={{ paddingTop: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: `${45 + ((i * 17) % 30)}%`, height: 12, borderRadius: 6, backgroundColor: T.surface2 }} />
            <View style={{ width: '30%', height: 10, borderRadius: 5, backgroundColor: T.surface2 }} />
          </View>
          <View style={{ width: 80, height: 32, borderRadius: 16, backgroundColor: T.surface2 }} />
        </View>
      ))}
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, backgroundColor: T.bg,
    },
    backBtn: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1, textAlign: 'center', fontSize: 17,
      fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text,
    },
    note: { fontSize: 13, color: T.textMuted, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, lineHeight: 18 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    },
    info: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    name: { fontSize: 15, fontWeight: '700', color: T.text, flexShrink: 1 },
    username: { fontSize: 14, color: T.textMuted, marginTop: 1 },
    pill: {
      height: 32, borderRadius: 16, paddingHorizontal: 14,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: T.border,
    },
    pillText: { fontSize: 14, fontWeight: '600', color: T.text },
    empty: { alignItems: 'center', paddingTop: 96, paddingHorizontal: 40 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  });
}
