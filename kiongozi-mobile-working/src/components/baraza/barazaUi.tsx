// Small shared pieces for Baraza: colours, the Kijiti (talking stick) mark, the bead ring
// that fills as a turn runs, and the tree-shade backdrop.
import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NoiseOverlay } from '../social/NoiseOverlay';

export const HONEY = '#F2B544';
export const EMBER = '#E8743B';
export const EARTH = '#3A2A16';
export const LEAF = '#1E2214';
export const INK = '#1A1206';

/** The Kijiti: a carved stick with three bands, on a dark disc. */
export function Stick({ size = 28, color = HONEY }: { size?: number; color?: string }) {
  const w = Math.max(3, size * 0.16);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(242,181,68,0.12)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: w, height: size * 0.72, borderRadius: w / 2, backgroundColor: '#8A5A2B', transform: [{ rotate: '-35deg' }], overflow: 'hidden', alignItems: 'center' }}>
        {[0.18, 0.3, 0.42].map(t => (
          <View key={t} style={{ position: 'absolute', top: `${t * 100}%`, width: '100%', height: Math.max(1.5, size * 0.04), backgroundColor: color }} />
        ))}
        <View style={{ position: 'absolute', top: 0, width: '100%', height: '12%', backgroundColor: color, opacity: 0.85 }} />
      </View>
    </View>
  );
}

/**
 * Beads around the speaker. `progress` is how much of the turn has gone (0..1); null = untimed
 * (host's turn), shown as a soft breathing ring.
 */
export function BeadRing({ size, progress, beads = 44 }: { size: number; progress: number | null; beads?: number }) {
  const r = size / 2;
  const breathe = useSharedValue(0.4);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);
  const glow = useAnimatedStyle(() => ({ opacity: progress === null ? breathe.value : 1 }));
  const filled = progress === null ? beads : Math.round(progress * beads);
  const late = progress !== null && progress > 0.85;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, glow]}>
      {Array.from({ length: beads }).map((_, i) => {
        const a = (i / beads) * Math.PI * 2 - Math.PI / 2;
        // Hand-made feel: beads are not all the same size
        const d = 6 + ((i * 7) % 3) * 0.9;
        const on = progress === null ? true : i >= filled; // time left is shown lit, used time goes dark
        const color = progress === null ? 'rgba(242,181,68,0.55)' : on ? (late ? EMBER : HONEY) : 'rgba(255,255,255,0.12)';
        return (
          <View key={i} style={{
            position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: color,
            left: r + Math.cos(a) * (r - 6) - d / 2, top: r + Math.sin(a) * (r - 6) - d / 2,
          }} />
        );
      })}
    </Animated.View>
  );
}

/** Warm dusk under a tree: a dark canopy on top, a pool of honey light where the speaker sits. */
export function TreeShade({ cy }: { cy: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#0B0A07', '#17120B', '#0D0A06']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.pool, { top: cy - 210 }]} />
      <View style={[styles.poolInner, { top: cy - 120 }]} />
      {/* canopy: overlapping leaf masses, a little uneven like paint */}
      <View style={[styles.leaf, { width: 340, height: 200, top: -120, left: -60, opacity: 0.95 }]} />
      <View style={[styles.leaf, { width: 300, height: 180, top: -110, right: -70, opacity: 0.9 }]} />
      <View style={[styles.leaf, { width: 260, height: 150, top: -70, left: 70, opacity: 0.8, backgroundColor: '#232614' }]} />
      <View style={[styles.leaf, { width: 120, height: 80, top: 20, left: 20, opacity: 0.45 }]} />
      <View style={[styles.leaf, { width: 140, height: 90, top: 10, right: 10, opacity: 0.4 }]} />
      <NoiseOverlay opacity={0.075} />
    </View>
  );
}

export function PillButton({ label, icon, onPress, tone = 'plain', style, disabled, a11y }: {
  label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void;
  tone?: 'honey' | 'plain' | 'danger'; style?: StyleProp<ViewStyle>; disabled?: boolean; a11y?: string;
}) {
  const bg = tone === 'honey' ? HONEY : tone === 'danger' ? 'rgba(232,116,59,0.16)' : 'rgba(255,255,255,0.09)';
  const fg = tone === 'honey' ? INK : tone === 'danger' ? '#FF9A73' : '#fff';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y || label}
      style={({ pressed }) => [styles.pill, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }, pressed && { transform: [{ scale: 0.97 }] }, style]}>
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <Text style={[styles.pillText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  pool: { position: 'absolute', alignSelf: 'center', width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(242,181,68,0.06)' },
  poolInner: { position: 'absolute', alignSelf: 'center', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(242,181,68,0.06)' },
  leaf: { position: 'absolute', borderRadius: 200, backgroundColor: LEAF },
  pill: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  pillText: { fontSize: 16, fontWeight: '700' },
});
