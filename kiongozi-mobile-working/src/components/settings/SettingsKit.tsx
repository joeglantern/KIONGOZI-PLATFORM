// Settings building blocks. Inset cards with a soft inner padding so a pressed row lights up as a
// rounded pill inside the card; icon tiles; every row says its current state in the subtitle
// ("On · silent 11pm to 7am") so you don't have to open things to know how they're set.
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolateColor, FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

type IconName = keyof typeof Ionicons.glyphMap;

export function useKitColors() {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  return {
    T,
    isDark,
    card: isDark ? '#0F0F10' : '#FFFFFF',
    cardBorder: isDark ? '#1F1F22' : '#E9E9EE',
    pressed: isDark ? '#1A1A1C' : '#F2F2F5',
    tile: isDark ? '#1C1C1E' : '#F2F2F5',
    page: isDark ? T.bg : '#F7F7F9',
  };
}

/** Staggered entrance, gentle (skipped when the system asks for less motion) */
export const rise = (order: number) => FadeInDown.delay(Math.min(order, 8) * 45).springify().damping(18).stiffness(180);

export function Section({ title, note, order = 0, children }: { title?: string; note?: string; order?: number; children: React.ReactNode }) {
  const C = useKitColors();
  return (
    <Animated.View entering={rise(order)} style={{ marginTop: title ? 22 : 14 }}>
      {title ? <Text style={[s.section, { color: C.T.text }]} maxFontSizeMultiplier={1.3}>{title}</Text> : null}
      {children}
      {note ? <Text style={[s.note, { color: C.T.textMuted }]} maxFontSizeMultiplier={1.3}>{note}</Text> : null}
    </Animated.View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const C = useKitColors();
  return <View style={[s.card, { backgroundColor: C.card, borderColor: C.cardBorder }]}>{children}</View>;
}

export function Row({
  icon, title, sub, onPress, right, chevron, external, danger, a11y,
}: {
  icon?: IconName; title: string; sub?: string; onPress?: () => void; right?: React.ReactNode;
  chevron?: boolean; external?: boolean; danger?: boolean; a11y?: string;
}) {
  const C = useKitColors();
  const tint = danger ? C.T.error : C.T.text;
  const body = (
    <>
      {icon ? (
        <View style={[s.tile, { backgroundColor: C.tile }]}>
          <Ionicons name={icon} size={19} color={tint} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: tint }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{title}</Text>
        {sub ? <Text style={[s.sub, { color: C.T.textMuted }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>{sub}</Text> : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={C.T.textMuted} /> : null}
      {external ? <Ionicons name="open-outline" size={16} color={C.T.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={s.row} accessibilityLabel={a11y}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y || [title, sub].filter(Boolean).join(', ')}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: C.pressed }]}
    >
      {body}
    </Pressable>
  );
}

/** Spring switch with a haptic tick (52×32), matches the accent */
export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  const C = useKitColors();
  const v = useSharedValue(value ? 1 : 0);
  useEffect(() => { v.value = withSpring(value ? 1 : 0, { damping: 20, stiffness: 260 }); }, [value, v]);
  const off = C.isDark ? '#2C2C2E' : '#E3E3E8';
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(v.value, [0, 1], [off, C.T.accent]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 20 }] }));
  return (
    <Pressable
      onPress={() => { if (disabled) return; Haptics.selectionAsync().catch(() => {}); onChange(!value); }}
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[s.track, track]}>
        <Animated.View style={[s.thumb, { backgroundColor: value ? '#000000' : (C.isDark ? '#8E8E93' : '#FFFFFF') }, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, marginLeft: 4, marginBottom: 10 },
  note: { fontSize: 12.5, lineHeight: 17, marginTop: 8, marginHorizontal: 6 },
  card: { borderRadius: 20, borderWidth: 1, padding: 5, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 15, minHeight: 58 },
  tile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15.5, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2, lineHeight: 17 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  thumb: { width: 26, height: 26, borderRadius: 13, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
});
