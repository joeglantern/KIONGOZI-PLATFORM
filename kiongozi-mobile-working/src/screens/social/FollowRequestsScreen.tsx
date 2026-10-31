// Follow requests: everyone waiting for a yes, with Confirm / Delete on each row.
// Both flip at once (the row leaves); the store puts it back with a toast if the server says no.
import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useNotificationStore, SocialNotification } from '../../stores/notificationStore';
import { useTheme, AppTheme } from '../../hooks/useTheme';

/** Pending requests = follow_request notifications still in the list (accepted / declined ones are removed) */
export const selectFollowRequests = (list: SocialNotification[]) => {
  const seen = new Set<string>();
  return list.filter(n => {
    if (n.type !== 'follow_request') return false;
    const key = n.fromUserId || n.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function FollowRequestsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const notifications = useNotificationStore(s => s.notifications);
  const respond = useNotificationStore(s => s.respondToFollowRequest);
  const markRead = useNotificationStore(s => s.markRead);
  const requests = useMemo(() => selectFollowRequests(notifications), [notifications]);

  const act = (n: SocialNotification, kind: 'accept' | 'decline') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    respond(n, kind);
  };

  const openProfile = (n: SocialNotification) => {
    if (!n.read) markRead(n.id);
    if (n.fromUsername) navigation.navigate('PublicProfile', { username: n.fromUsername });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2} accessibilityRole="header">Follow requests</Text>
        <View style={{ width: 44 }} />
      </View>

      <Animated.FlatList
        data={requests}
        keyExtractor={n => n.id}
        itemLayoutAnimation={LinearTransition.springify().damping(20).stiffness(220)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={requests.length ? (
          <Text style={styles.note} maxFontSizeMultiplier={1.3}>Confirm to let them follow you. They are not told when you delete a request.</Text>
        ) : null}
        renderItem={({ item }) => {
          const name = (item.data?.from_full_name as string) || item.fromUsername || 'Someone';
          return (
            <Animated.View exiting={FadeOut.duration(160)} style={styles.row}>
              <Pressable onPress={() => openProfile(item)} style={styles.person} accessibilityRole="button" accessibilityLabel={`${name}'s profile`}>
                <UserAvatar avatarUrl={item.fromAvatar} size={50} name={name} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>{name}</Text>
                  {item.fromUsername ? <Text style={styles.handle} numberOfLines={1} maxFontSizeMultiplier={1.2}>@{item.fromUsername}</Text> : null}
                </View>
              </Pressable>
              <Pressable onPress={() => act(item, 'accept')} style={({ pressed }) => [styles.pill, { backgroundColor: T.text }, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`Confirm ${name}`}>
                <Text style={[styles.pillText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Confirm</Text>
              </Pressable>
              <Pressable onPress={() => act(item, 'decline')} style={({ pressed }) => [styles.pill, styles.pillOutline, { borderColor: T.border }, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`Delete request from ${name}`}>
                <Text style={[styles.pillText, { color: T.text }]} maxFontSizeMultiplier={1.2}>Delete</Text>
              </Pressable>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: T.surface }]}>
              <Ionicons name="person-add-outline" size={30} color={T.textSub} />
            </View>
            <Text style={styles.emptyTitle}>No requests right now</Text>
            <Text style={styles.emptySub}>When someone asks to follow you, they will show up here.</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 6 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: T.text },
    note: { fontSize: 13, lineHeight: 18, color: T.textMuted, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    person: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { fontSize: 15.5, fontWeight: '600', color: T.text },
    handle: { fontSize: 13, color: T.textSub, marginTop: 1 },
    pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    pillOutline: { borderWidth: 1, backgroundColor: 'transparent' },
    pillText: { fontSize: 14, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
