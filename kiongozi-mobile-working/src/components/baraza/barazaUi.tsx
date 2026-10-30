// Small shared pieces for Baraza: the painted Kijiti (talking stick) mark, the bead ring that
// empties as a turn runs, the room backdrop and buttons. All follow the chosen room style.
import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useBT } from './barazaTheme';
import { Backdrop, PaintedStick } from './barazaArt';

// Kept for places that still colour things by hand
export const HONEY = '#F2B544';
export const EMBER = '#E8743B';
export const EARTH = '#3A2A16';
export const LEAF = '#1E2214';
export const INK = '#1A1206';

/** The Kijiti: the painted stick on a soft disc in the room's accent. */
export function Stick({ size = 28 }: { size?: number; color?: string }) {
  const t = useBT();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.dark ? 'rgba(255,255,255,0.10)' : t.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <PaintedStick height={size * 0.92} tilt={-32} />
    </View>
  );
}

/**
 * Beads around the speaker. `progress` is how much of the turn has gone (0..1); null = untimed
 * (host's turn), shown as a soft breathing ring.
 */
export function BeadRing({ size, progress, beads = 44 }: { size: number; progress: number | null; beads?: number }) {
  const t = useBT();
  const r = size / 2;
  const breathe = useSharedValue(0.45);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);
  const glow = useAnimatedStyle(() => ({ opacity: progress === null ? breathe.value : 1 }));
  const filled = progress === null ? beads : Math.round(progress * beads);
  const late = progress !== null && progress > 0.85;
  // the bead colours of a Maasai collar, in order, so the ring reads as beadwork, not a loader
  const palette = [t.accent, '#D93A2B', '#1F7A8C', '#3FA845', '#F6EEDC'];
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, glow]}>
      {Array.from({ length: beads }).map((_, i) => {
        const a = (i / beads) * Math.PI * 2 - Math.PI / 2;
        const d = 7 + ((i * 7) % 3) * 0.9; // hand-made: beads are not all the same size
        const on = progress === null ? true : i >= filled; // time left is lit, used time goes quiet
        const color = !on ? t.line : late ? t.danger : palette[i % palette.length];
        return (
          <View key={i} style={{
            position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: color,
            borderWidth: color === '#F6EEDC' ? StyleSheet.hairlineWidth : 0, borderColor: t.line,
            left: r + Math.cos(a) * (r - 7) - d / 2, top: r + Math.sin(a) * (r - 7) - d / 2,
          }} />
        );
      })}
    </Animated.View>
  );
}

/** The room behind the baraza, in the chosen style. (`cy` kept for old callers.) */
export function TreeShade(_: { cy?: number }) {
  const t = useBT();
  return <Backdrop t={t} />;
}

export function PillButton({ label, icon, onPress, tone = 'plain', style, disabled, a11y, left }: {
  label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void;
  tone?: 'honey' | 'plain' | 'danger'; style?: StyleProp<ViewStyle>; disabled?: boolean; a11y?: string;
  /** optional art before the label (e.g. the painted hand) */
  left?: React.ReactNode;
}) {
  const t = useBT();
  const bg = tone === 'honey' ? t.accent : tone === 'danger' ? t.dangerSoft : t.soft;
  const fg = tone === 'honey' ? t.accentInk : tone === 'danger' ? t.danger : t.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y || label}
      style={({ pressed }) => [
        styles.pill, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 },
        tone === 'honey' && !disabled && { shadowColor: t.accent, shadowOpacity: t.dark ? 0.35 : 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
        pressed && { transform: [{ scale: 0.97 }] }, style,
      ]}>
      {left ?? (icon ? <Ionicons name={icon} size={19} color={fg} /> : null)}
      <Text style={[styles.pillText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  pill: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  pillText: { fontSize: 16, fontWeight: '700' },
});
