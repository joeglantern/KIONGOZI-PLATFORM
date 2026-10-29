// The way into Mzinga from Explore: a small live hive of the top clips, and a line of text.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useClipStore, clipVideo } from '../../stores/clipStore';
import type { Post } from '../../stores/socialStore';
import { useVideoThumb } from '../social/media';
import { NoiseOverlay } from '../social/NoiseOverlay';

const HONEY = '#F2B544';
const SPOTS = [[0, 0], [1, 0], [0.5, -0.866], [-0.5, -0.866], [-1, 0], [-0.5, 0.866], [0.5, 0.866]];
const R = 22; // cell radius

export function MzingaStrip() {
  const clips = useClipStore(s => s.clips);
  const seen = useClipStore(s => s.seen);
  useEffect(() => { useClipStore.getState().fetch(); }, []);
  const fresh = clips.filter(c => !seen[c.id]).length;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); useClipStore.getState().openHive(); }}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }] }]}
      accessibilityRole="button"
      accessibilityLabel="Open Mzinga, short clips"
    >
      <LinearGradient colors={['#17120A', '#0C0A07']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <NoiseOverlay opacity={0.07} />
      <View style={styles.hive}>
        {SPOTS.map(([x, y], i) => (
          <Spot key={i} post={clips[i]} x={x} y={y} lit={!!clips[i] && !seen[clips[i].id]} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Mzinga</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {clips.length ? (fresh ? `${fresh} new clip${fresh === 1 ? '' : 's'} buzzing` : 'Short clips, from the centre out') : 'Short clips. Be the first in the hive'}
        </Text>
      </View>
      <View style={styles.go}><Ionicons name="arrow-forward" size={18} color="#1A1206" /></View>
    </Pressable>
  );
}

function Spot({ post, x, y, lit }: { post?: Post; x: number; y: number; lit: boolean }) {
  const v = post ? clipVideo(post) : undefined;
  const thumb = useVideoThumb(v?.url, v?.thumbnail_url);
  const size = x === 0 && y === 0 ? R * 2 : R * 1.6;
  const step = R * 1.82;
  return (
    <View style={[styles.spot, {
      width: size, height: size, borderRadius: size / 2,
      left: 58 + x * step - size / 2, top: 52 + y * step - size / 2,
      borderColor: lit ? HONEY : 'rgba(255,255,255,0.12)',
    }]}>
      {thumb ? <Image source={{ uri: thumb }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 10, height: 112, borderRadius: 24, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', paddingRight: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.25)',
  },
  hive: { width: 116, height: 104, marginLeft: 8, marginRight: 10 },
  spot: { position: 'absolute', borderWidth: 2, backgroundColor: '#241C10', overflow: 'hidden' },
  title: { color: '#fff', fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4 },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 13.5, marginTop: 2, lineHeight: 18 },
  go: { width: 34, height: 34, borderRadius: 17, backgroundColor: HONEY, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
