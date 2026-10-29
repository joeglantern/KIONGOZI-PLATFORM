// The minutes of a baraza: summary, key points with who said them, and the Ahadi checklist.
// Right after the end it waits (with a quiet "writing" state) until the server has them.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { barazaApi, BarazaMinutes } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { NoiseOverlay } from '../social/NoiseOverlay';
import { HONEY, INK, Stick, PillButton } from './barazaUi';

export function BarazaMinutesView({ roomId, onClose, justEnded }: { roomId: string; onClose: () => void; justEnded?: boolean }) {
  const insets = useSafeAreaInsets();
  const [m, setM] = useState<BarazaMinutes | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let t: any;
    const load = async () => {
      const res = await barazaApi<BarazaMinutes>(`/${roomId}/minutes`);
      if (!alive) return;
      if (res.success && res.data) {
        setM(res.data);
        if (['building', 'none'].includes(res.data.room.minutes_status) && res.data.room.status === 'ended') t = setTimeout(load, 4000);
        if (res.data.room.minutes_status === 'ready') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else setErr(res.error || 'Could not load the minutes');
    };
    load();
    return () => { alive = false; clearTimeout(t); };
  }, [roomId]);

  const status = m?.room.minutes_status;
  const toggle = async (id: string, done: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    setM(cur => cur && { ...cur, ahadi: cur.ahadi.map(a => (a.id === id ? { ...a, done } : a)) });
    const res = await barazaApi(`/ahadi/${id}`, 'PATCH', { done });
    if (!res.success) setM(cur => cur && { ...cur, ahadi: cur.ahadi.map(a => (a.id === id ? { ...a, done: !done } : a)) });
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.round} hitSlop={8} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headTitle}>Minutes</Text>
        <View style={{ width: 40 }} />
      </View>

      {!m ? (
        <View style={styles.center}>{err ? <Text style={styles.muted}>{err}</Text> : <ActivityIndicator color={HONEY} />}</View>
      ) : status !== 'ready' ? (
        <Writing ended={justEnded} failed={status === 'failed'} title={m.room.title} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.paper}>
            <NoiseOverlay opacity={0.05} />
            <Text style={styles.kicker}>BARAZA MINUTES</Text>
            <Text style={styles.title}>{m.room.title}</Text>
            <Text style={styles.date}>
              {new Date(m.room.created_at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · hosted by @{m.host?.username}
            </Text>

            {m.summary ? <Text style={styles.summary}>{m.summary}</Text> : null}

            {m.key_points.length > 0 && (
              <>
                <Text style={styles.section}>Key points</Text>
                {m.key_points.map((k, i) => (
                  <Animated.View key={i} entering={FadeIn.delay(80 + i * 50)} style={styles.point}>
                    <Text style={styles.pointNum}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointText}>{k.text}</Text>
                      {k.by ? (
                        <View style={styles.by}>
                          <UserAvatar avatarUrl={k.by.avatar_url} name={k.by.full_name || k.by.username} size={16} />
                          <Text style={styles.byText}>@{k.by.username}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Animated.View>
                ))}
              </>
            )}

            {m.ahadi.length > 0 && (
              <>
                <Text style={styles.section}>Ahadi · promises made</Text>
                {m.ahadi.map(a => (
                  <Pressable key={a.id} disabled={!a.can_check} onPress={() => toggle(a.id, !a.done)} style={styles.ahadi}
                    accessibilityRole="checkbox" accessibilityState={{ checked: a.done, disabled: !a.can_check }}
                    accessibilityLabel={`${a.user ? `@${a.user.username}` : a.who_name || 'Someone'}: ${a.text}`}>
                    <View style={[styles.box, a.done && styles.boxOn]}>
                      {a.done ? <Ionicons name="checkmark" size={15} color={INK} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ahadiText, a.done && styles.ahadiDone]}>{a.text}</Text>
                      <Text style={styles.byText}>{a.user ? `@${a.user.username}` : a.who_name || 'Someone'}{a.can_check && !a.done ? ' · tap when done' : ''}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
            {!m.key_points.length && !m.ahadi.length && !m.summary ? <Text style={styles.muted}>Nothing was recorded.</Text> : null}
          </Animated.View>
          {m.room.minutes_post_id ? <Text style={styles.foot}>Also posted as a thread on @{m.host?.username}'s profile.</Text> : null}
        </ScrollView>
      )}
      {status !== 'ready' && m ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}>
          <PillButton label="Close" onPress={onClose} />
        </View>
      ) : null}
    </View>
  );
}

function Writing({ ended, failed, title }: { ended?: boolean; failed?: boolean; title: string }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${-8 + r.value * 16}deg` }] }));
  return (
    <View style={[styles.center, { paddingHorizontal: 32 }]}>
      <Animated.View style={st}><Stick size={64} /></Animated.View>
      <Text style={styles.writeTitle}>{failed ? "Couldn't write the minutes" : ended ? 'The baraza has ended' : 'Writing the minutes'}</Text>
      <Text style={[styles.muted, { textAlign: 'center', marginTop: 6, lineHeight: 20 }]}>
        {failed
          ? 'Something went wrong on our side. The recording is safe; try again later.'
          : `Turning "${title}" into a summary, key points and Ahadi. Everyone who was here gets a notification when they're ready.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: '#fff', fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },
  muted: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  writeTitle: { color: '#fff', fontSize: 21, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 22, letterSpacing: -0.3 },

  // Warm paper card
  paper: { backgroundColor: '#F4ECDD', borderRadius: 22, padding: 22, overflow: 'hidden' },
  kicker: { color: '#8A5A2B', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#20160A', fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, marginTop: 6, lineHeight: 29 },
  date: { color: '#7A6A55', fontSize: 13, marginTop: 4 },
  summary: { color: '#2B2116', fontSize: 16, lineHeight: 24, marginTop: 16 },
  section: { color: '#8A5A2B', fontSize: 12.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  point: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(60,40,15,0.15)' },
  pointNum: { color: '#8A5A2B', fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', width: 18 },
  pointText: { color: '#2B2116', fontSize: 15, lineHeight: 21 },
  by: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  byText: { color: '#7A6A55', fontSize: 12.5, marginTop: 2 },
  ahadi: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#8A5A2B', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: HONEY, borderColor: HONEY },
  ahadiText: { color: '#2B2116', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  ahadiDone: { textDecorationLine: 'line-through', color: '#8C7F6C' },
  foot: { color: 'rgba(255,255,255,0.45)', fontSize: 12.5, textAlign: 'center', marginTop: 14 },
});
