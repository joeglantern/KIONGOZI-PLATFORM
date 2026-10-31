// Long-press on a message, iMessage style: the chat dims, the message lifts out where it was,
// and a compact action list opens right under it (or above, near the bottom of the screen).
// With reactions on, a white pill of six quick reactions springs in just above the message.
import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, useWindowDimensions, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { useThemeStore } from '../../stores/themeStore';
import type { BubbleRect } from './DMBubble';

export type MenuAction = { key: string; label: string; icon: any; danger?: boolean; onPress: () => void };

const ROW = 46;
const MENU_W = 236;

export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
const PILL_H = 46;
const PILL_GAP = 8;
const PILL_W = QUICK_REACTIONS.length * 40 + 30 + 2 + 16; // buttons + gaps, the +, padding

export type MenuReactions = {
  /** My current reaction on this message, highlighted */
  mine?: string | null;
  onPick: (emoji: string) => void;
  /** The "+": more emoji */
  onMore: () => void;
};

function PillButton({ index, children, onPress, label, style }: { index: number; children: React.ReactNode; onPress: () => void; label: string; style: any }) {
  const s = useSharedValue(0.4);
  useEffect(() => { s.value = withDelay(30 + index * 22, withSpring(1, { damping: 10, stiffness: 340, mass: 0.6 })); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Reanimated.View style={st}>
      <Pressable onPress={onPress} hitSlop={2} style={({ pressed }) => [style, pressed && { transform: [{ scale: 1.2 }] }]} accessibilityRole="button" accessibilityLabel={label}>
        {children}
      </Pressable>
    </Reanimated.View>
  );
}

const EMOJI_NAMES: Record<string, string> = { '❤️': 'Heart', '😂': 'Laugh', '😮': 'Wow', '😢': 'Sad', '🔥': 'Fire', '👏': 'Clap' };

export function MessageMenu({ rect, isOwn, preview, actions, onClose, reactions }: {
  rect: BubbleRect;
  isOwn: boolean;
  /** The message drawn again, lifted above the dim */
  preview: React.ReactNode;
  actions: MenuAction[];
  onClose: () => void;
  /** Leave out for messages you can't react to (still sending, failed) */
  reactions?: MenuReactions;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore(s => s.isDark);
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, damping: 16, stiffness: 260, mass: 0.8, useNativeDriver: true }),
    ]).start();
  }, [fade, pop]);

  // The reaction pill: scale .4 to 1 with a little overshoot (iMessage tapback)
  const pill = useSharedValue(0.4);
  const pillFade = useSharedValue(0);
  useEffect(() => {
    if (!reactions) return;
    pill.value = withSpring(1, { damping: 11, stiffness: 300, mass: 0.7 });
    pillFade.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);
  const pillStyle = useAnimatedStyle(() => ({ opacity: pillFade.value, transform: [{ scale: pill.value }] }));

  const close = (then?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => { onClose(); then?.(); });
    if (reactions) { pill.value = withSpring(0.6, { damping: 20, stiffness: 400 }); pillFade.value = withSpring(0, { damping: 20, stiffness: 400 }); }
  };

  // Where things go: menu under the message, pushed up when it would run off the bottom
  const menuH = actions.length * ROW + 2;
  const gap = 8;
  const bottomLimit = H - insets.bottom - 16;
  const topLimit = insets.top + 12 + (reactions ? PILL_H + PILL_GAP : 0);
  const menuTop = Math.min(rect.y + rect.height + gap, bottomLimit - menuH);
  const bubbleTop = Math.max(topLimit, Math.min(rect.y, menuTop - gap - rect.height));
  const bubbleMaxH = Math.max(60, menuTop - gap - bubbleTop);
  const side = isOwn
    ? { right: Math.max(10, W - (rect.x + rect.width)) }
    : { left: Math.max(10, rect.x) };

  const pillLeft = isOwn
    ? Math.min(W - 10 - PILL_W, rect.x + rect.width - PILL_W)
    : Math.min(Math.max(10, rect.x), W - 10 - PILL_W);

  const card = isDark ? '#252527' : '#FFFFFF';
  const line = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
  const ink = isDark ? '#FFFFFF' : '#000000';

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.42)', opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close menu" />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubbleWrap,
          { top: bubbleTop, width: rect.width, maxHeight: bubbleMaxH },
          side,
          {
            opacity: fade,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
          },
        ]}
      >
        {preview}
      </Animated.View>

      {reactions && (
        <Reanimated.View
          style={[
            styles.pill,
            { top: bubbleTop - PILL_GAP - PILL_H, left: Math.max(10, pillLeft), backgroundColor: card, transformOrigin: isOwn ? 'right bottom' : 'left bottom' } as any,
            pillStyle,
          ]}
        >
          {QUICK_REACTIONS.map((e, i) => {
            const on = reactions.mine === e;
            return (
              <PillButton
                key={e}
                index={i}
                label={on ? `Remove ${EMOJI_NAMES[e] || e}` : `React ${EMOJI_NAMES[e] || e}`}
                style={[styles.react, on && { backgroundColor: isDark ? 'rgba(52,199,89,0.28)' : '#E8F5E9' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); close(() => reactions.onPick(e)); }}
              >
                <Text style={styles.reactEmoji}>{e}</Text>
              </PillButton>
            );
          })}
          <PillButton
            index={QUICK_REACTIONS.length}
            label="More reactions"
            style={[styles.more, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F2F2F7' }]}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); close(reactions.onMore); }}
          >
            <Ionicons name="add" size={20} color={isDark ? '#AEAEB2' : '#6B6B70'} />
          </PillButton>
        </Reanimated.View>
      )}

      <Animated.View
        style={[
          styles.menu,
          { top: menuTop, width: MENU_W, backgroundColor: card },
          side,
          {
            opacity: fade,
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
              { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
            ],
          },
        ]}
      >
        {actions.map((a, i) => (
          <Pressable
            key={a.key}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); close(a.onPress); }}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line },
              pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <Text style={[styles.label, { color: a.danger ? '#FF453A' : ink }]}>{a.label}</Text>
            <Ionicons name={a.icon} size={19} color={a.danger ? '#FF453A' : ink} />
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { position: 'absolute', overflow: 'hidden' },
  pill: {
    position: 'absolute', height: PILL_H, borderRadius: PILL_H / 2, paddingHorizontal: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  react: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reactEmoji: { fontSize: 23, lineHeight: 28 },
  more: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  menu: {
    position: 'absolute', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 16,
  },
  row: { height: ROW, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, letterSpacing: -0.3 },
});
