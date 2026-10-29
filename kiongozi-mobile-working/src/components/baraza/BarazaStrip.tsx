// The way into Baraza from Explore: barazas happening now, and "Start a baraza".
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBarazaStore, LiveBaraza } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { NoiseOverlay } from '../social/NoiseOverlay';
import { HONEY, EARTH, Stick } from './barazaUi';

export function BarazaStrip() {
  const live = useBarazaStore(s => s.live);
  useEffect(() => {
    const { fetchLive } = useBarazaStore.getState();
    fetchLive();
    const t = setInterval(fetchLive, 30_000);
    return () => clearInterval(t);
  }, []);

  const start = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    useBarazaStore.getState().openStart();
  };

  return (
    <View style={styles.card}>
      <LinearGradient colors={['#1A140C', '#0E0B07']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.canopy} />
      <NoiseOverlay opacity={0.07} />

      <View style={styles.head}>
        <Stick size={30} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title}>Baraza</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {live.length ? `${live.length} gathering${live.length === 1 ? '' : 's'} now · one voice at a time` : 'Talk it out, one voice at a time'}
          </Text>
        </View>
        <Pressable onPress={start} style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Start a baraza">
          <Ionicons name="add" size={16} color="#1A1206" />
          <Text style={styles.startText}>Start</Text>
        </Pressable>
      </View>

      {live.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {live.map(b => <LiveCard key={b.id} b={b} />)}
        </ScrollView>
      )}
    </View>
  );
}

function LiveCard({ b }: { b: LiveBaraza }) {
  const open = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    useBarazaStore.getState().open(b.id, b);
  };
  const who = b.speaker || b.host;
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.live, pressed && { transform: [{ scale: 0.98 }] }]}
      accessibilityRole="button" accessibilityLabel={`Join ${b.title}, hosted by ${b.host?.username}, ${b.count} listening`}>
      <View style={styles.liveTop}>
        <LiveDot />
        <Text style={styles.liveTag}>LIVE</Text>
        <Text style={styles.count}>{b.count} here</Text>
      </View>
      <Text style={styles.liveTitle} numberOfLines={2}>{b.title}</Text>
      <View style={styles.liveHost}>
        <UserAvatar avatarUrl={who?.avatar_url} name={who?.full_name || who?.username} size={22} />
        <Text style={styles.hostName} numberOfLines={1}>
          {b.speaker && b.speaker.id !== b.host?.id ? `@${b.speaker.username} has the stick` : `@${b.host?.username || ''}`}
        </Text>
      </View>
    </Pressable>
  );
}

function LiveDot() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, st]} />;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 24, overflow: 'hidden', paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.22)',
  },
  canopy: { position: 'absolute', top: -90, right: -40, width: 220, height: 160, borderRadius: 110, backgroundColor: EARTH, opacity: 0.35 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4 },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 13.5, marginTop: 1 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: HONEY, borderRadius: 17, height: 34, paddingHorizontal: 12, marginLeft: 8 },
  startText: { color: '#1A1206', fontSize: 14, fontWeight: '700' },
  row: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  live: {
    width: 196, borderRadius: 18, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
  },
  liveTop: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B4A', marginRight: 5 },
  liveTag: { color: '#FF8A6E', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  count: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  liveTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 6, lineHeight: 19, minHeight: 38 },
  liveHost: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  hostName: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, flex: 1 },
});
