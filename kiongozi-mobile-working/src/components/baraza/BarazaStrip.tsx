// The way into Baraza from Explore: a living painting of a baraza under the acacia (painted, then
// animated in Higgsfield as a seamless loop), barazas happening now, and "Start a baraza".
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBarazaStore, LiveBaraza } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { ART } from './barazaArt';

const LOOP = require('../../../assets/baraza/cover.mp4');

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
      <Pressable onPress={start} accessibilityRole="button" accessibilityLabel="Start a baraza">
        <Cover />
        {/* soft shade so the words read on the bright sky */}
        <LinearGradient colors={['rgba(28,14,4,0.55)', 'rgba(28,14,4,0.15)', 'rgba(28,14,4,0)']}
          start={{ x: 0, y: 0.2 }} end={{ x: 0.75, y: 0.7 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.copy} pointerEvents="box-none">
          <View style={styles.kickerRow}>
            {live.length > 0 ? <LiveDot /> : null}
            <Text style={styles.kicker}>{live.length ? `${live.length} GATHERING${live.length === 1 ? '' : 'S'} NOW` : 'BARAZA'}</Text>
          </View>
          <Text style={styles.title}>Pull up a chair</Text>
          <Text style={styles.sub}>One voice at a time. The stick decides who speaks.</Text>
          <View style={styles.startBtn}>
            <Ionicons name="add" size={17} color="#1A1206" />
            <Text style={styles.startText}>Start a baraza</Text>
          </View>
        </View>
      </Pressable>

      {live.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {live.map(b => <LiveCard key={b.id} b={b} />)}
        </ScrollView>
      )}
    </View>
  );
}

/** The painting, alive: the still shows first, the loop fades in once it plays. */
function Cover() {
  const focused = useIsFocused();
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(LOOP, p => { p.loop = true; p.muted = true; p.play(); });
  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => { if (isPlaying) setReady(true); });
    return () => sub.remove();
  }, [player]);
  useEffect(() => { try { if (focused) player.play(); else player.pause(); } catch {} }, [focused, player]);

  // a slow drift so the still is alive too, before (or without) the video
  const d = useSharedValue(0);
  useEffect(() => { d.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true); }, [d]);
  const drift = useAnimatedStyle(() => ({ transform: [{ scale: 1.06 }, { translateX: -8 + d.value * 16 }] }));

  return (
    <View style={styles.cover}>
      <Animated.Image source={ART.cover} style={[StyleSheet.absoluteFill, drift]} resizeMode="cover" fadeDuration={0} />
      <VideoView player={player} style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]} contentFit="cover"
        nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />
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
        <Image source={ART.iconLive} style={styles.icon} />
        <Text style={styles.liveTag}>LIVE</Text>
        <Image source={ART.iconListen} style={[styles.icon, { marginLeft: 'auto' }]} />
        <Text style={styles.count}>{b.count}</Text>
      </View>
      <Text style={styles.liveTitle} numberOfLines={2}>{b.title}</Text>
      <View style={styles.liveHost}>
        <UserAvatar avatarUrl={who?.avatar_url ?? undefined} name={who?.full_name || who?.username} size={22} />
        <Text style={styles.hostName} numberOfLines={1}>
          {b.speaker && b.speaker.id !== b.host?.id ? `@${b.speaker.username} has the stick` : `@${b.host?.username || ''}`}
        </Text>
      </View>
      <Text style={styles.join}>Join</Text>
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
    marginHorizontal: 16, marginBottom: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF7EA',
    shadowColor: '#8A4A12', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  cover: { height: 196, overflow: 'hidden', backgroundColor: '#F4B860' },
  copy: { ...StyleSheet.absoluteFillObject, padding: 16, justifyContent: 'flex-end' },
  kickerRow: { flexDirection: 'row', alignItems: 'center' },
  kicker: { color: 'rgba(255,255,255,0.92)', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1 },
  title: {
    color: '#fff', fontSize: 25, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.6, marginTop: 2,
    textShadowColor: 'rgba(40,18,0,0.35)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 },
  },
  sub: {
    color: 'rgba(255,255,255,0.92)', fontSize: 13.5, marginTop: 2, maxWidth: '62%',
    textShadowColor: 'rgba(40,18,0,0.35)', textShadowRadius: 6,
  },
  startBtn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12,
    backgroundColor: '#FFFFFF', borderRadius: 19, height: 38, paddingHorizontal: 14,
  },
  startText: { color: '#1A1206', fontSize: 14.5, fontWeight: '800' },
  row: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  live: {
    width: 204, borderRadius: 18, padding: 12, backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(120,70,20,0.14)',
  },
  liveTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icon: { width: 18, height: 18 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B4A', marginRight: 6 },
  liveTag: { color: '#E2492F', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  count: { color: '#5E574F', fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  liveTitle: { color: '#16130F', fontSize: 15, fontWeight: '700', marginTop: 8, lineHeight: 19, minHeight: 38 },
  liveHost: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingRight: 34 },
  hostName: { color: '#5E574F', fontSize: 12.5, flex: 1 },
  join: { position: 'absolute', right: 12, bottom: 12, color: '#3FA845', fontSize: 13, fontWeight: '800' },
});
