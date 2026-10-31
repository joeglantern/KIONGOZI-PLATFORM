// Settings building blocks, iOS grouped style: borderless cards (radius 14) with full-width rows
// and hairlines inset past the icon tile; every row says its current state in the subtitle
// ("On · silent 11pm to 7am") so you don't have to open things to know how they're set.
import { CALM_SPRING, enterUp } from '../../theme/motion';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

type IconName = keyof typeof Ionicons.glyphMap;

// iOS-style coloured tiles so the eye can scan by colour: one hue per kind of setting
const TILE: Record<string, string> = {
  'notifications-outline': '#FF3B30', 'volume-mute-outline': '#FF453A', 'radio-button-on-outline': '#FF9500',
  'options-outline': '#FF9500',
  'lock-closed-outline': '#007AFF', 'key-outline': '#5E5CE6', 'person-add-outline': '#0A84FF', 'ban-outline': '#8E8E93',
  'cellular-outline': '#34C759', 'download-outline': '#30B0C7', 'phone-portrait-outline': '#64D2FF',
  'sparkles-outline': '#AF52DE', 'cafe-outline': '#A2845E', 'reader-outline': '#FF9F0A', 'document-text-outline': '#8E8E93',
  'trash-outline': '#FF3B30',
  'stats-chart': '#34C759', 'stats-chart-outline': '#34C759',
};
const solid = (name: string) => (name.endsWith('-outline') ? name.slice(0, -8) : name) as IconName;

export function useKitColors() {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  return {
    T,
    isDark,
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardBorder: isDark ? '#2C2C2E' : '#E9E9EE',
    pressed: isDark ? '#2C2C2E' : '#E5E5EA',
    tile: isDark ? '#2C2C2E' : '#E5E5EA',
    page: isDark ? T.bg : '#F2F2F7',
    separator: isDark ? 'rgba(84,84,88,0.6)' : 'rgba(60,60,67,0.2)',
  };
}

/** Staggered entrance, gentle (skipped when the system asks for less motion) */
export const rise = (order: number) => enterUp(260).delay(Math.min(order, 8) * 45);

export function Section({ title, note, order = 0, children }: { title?: string; note?: string; order?: number; children: React.ReactNode }) {
  const C = useKitColors();
  return (
    <Animated.View entering={rise(order)} style={{ marginTop: title ? 22 : 14 }}>
      {title ? <Text style={[s.section, { color: C.T.textSub }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">{title}</Text> : null}
      {children}
      {note ? <Text style={[s.note, { color: C.T.textMuted }]} maxFontSizeMultiplier={1.3}>{note}</Text> : null}
    </Animated.View>
  );
}

/** Hairline between two rows, inset past the icon tile (16 padding + 30 tile + 12 gap) */
const SEPARATOR_INSET = 58;

export function Card({ children }: { children: React.ReactNode }) {
  const C = useKitColors();
  // A hairline goes between two rows in a row; other content (a segmented control) sits flush
  const items = React.Children.toArray(children);
  return (
    <View style={[s.card, { backgroundColor: C.card }]}>
      {items.map((child, i) => {
        const isRow = React.isValidElement(child) && child.type === Row;
        const prev = items[i - 1];
        const prevRow = i > 0 && React.isValidElement(prev) && prev.type === Row;
        return (
          <React.Fragment key={(React.isValidElement(child) && child.key) || i}>
            {isRow && prevRow ? <View style={[s.separator, { backgroundColor: C.separator }]} /> : null}
            {child}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function Row({
  icon, title, sub, onPress, right, chevron, external, danger, a11y, color,
}: {
  icon?: IconName; title: string; sub?: string; onPress?: () => void; right?: React.ReactNode;
  chevron?: boolean; external?: boolean; danger?: boolean; a11y?: string;
  /** tile colour; defaults to the colour for this icon */
  color?: string;
}) {
  const C = useKitColors();
  const tint = danger ? C.T.error : C.T.text;
  const tileColor = color || (icon && TILE[icon]) || (danger ? '#FF3B30' : '#8E8E93');
  const body = (
    <>
      {icon ? (
        <View style={[s.tile, { backgroundColor: tileColor }]}>
          <View style={s.tileShine} />
          <Ionicons name={Ionicons.glyphMap[solid(icon)] ? solid(icon) : icon} size={17} color="#FFFFFF" />
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
  useEffect(() => { v.value = withSpring(value ? 1 : 0, CALM_SPRING); }, [value, v]);
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

/** iOS-style segmented control (two to four short options); the thumb springs between them */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  const C = useKitColors();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex(o => o.id === value));
  const x = useSharedValue(idx);
  useEffect(() => { x.value = withSpring(idx, CALM_SPRING); }, [idx, x]);
  const seg = w ? (w - 4) / options.length : 0;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * seg }] }));
  return (
    <View
      onLayout={e => setW(e.nativeEvent.layout.width)}
      style={[s.segment, { backgroundColor: C.isDark ? '#1C1C1E' : '#E9E9EE' }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {seg > 0 && (
        <Animated.View style={[s.segThumb, { width: seg, backgroundColor: C.isDark ? '#3A3A3C' : '#FFFFFF' }, thumb]} />
      )}
      {options.map(o => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => { if (on) return; Haptics.selectionAsync().catch(() => {}); onChange(o.id); }}
            style={s.segItem}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
          >
            <Text style={[s.segText, { color: C.T.text, fontWeight: on ? '600' : '400' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '600', letterSpacing: -0.08, textTransform: 'uppercase', marginLeft: 16, marginBottom: 6 },
  note: { fontSize: 12.5, lineHeight: 17, marginTop: 8, marginHorizontal: 16 },
  card: { borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 44 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: SEPARATOR_INSET },
  tile: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  tileShine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  title: { fontSize: 17, fontWeight: '400', letterSpacing: -0.41 },
  sub: { fontSize: 13, marginTop: 2, lineHeight: 17 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  thumb: { width: 26, height: 26, borderRadius: 13, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  segment: { flexDirection: 'row', height: 36, borderRadius: 10, padding: 2, marginTop: 4, marginHorizontal: 16, marginBottom: 12 },
  segThumb: { position: 'absolute', top: 2, bottom: 2, left: 2, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 14, letterSpacing: -0.1 },
});
