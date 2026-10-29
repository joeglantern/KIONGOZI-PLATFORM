// Long-press on a message, iMessage style: the chat dims, the message lifts out where it was,
// and a compact action list opens right under it (or above, near the bottom of the screen).
import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, useWindowDimensions, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../../stores/themeStore';
import type { BubbleRect } from './DMBubble';

export type MenuAction = { key: string; label: string; icon: any; danger?: boolean; onPress: () => void };

const ROW = 46;
const MENU_W = 236;

export function MessageMenu({ rect, isOwn, preview, actions, onClose }: {
  rect: BubbleRect;
  isOwn: boolean;
  /** The message drawn again, lifted above the dim */
  preview: React.ReactNode;
  actions: MenuAction[];
  onClose: () => void;
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

  const close = (then?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => { onClose(); then?.(); });
  };

  // Where things go: menu under the message, pushed up when it would run off the bottom
  const menuH = actions.length * ROW + 2;
  const gap = 8;
  const bottomLimit = H - insets.bottom - 16;
  const topLimit = insets.top + 12;
  const menuTop = Math.min(rect.y + rect.height + gap, bottomLimit - menuH);
  const bubbleTop = Math.max(topLimit, Math.min(rect.y, menuTop - gap - rect.height));
  const bubbleMaxH = Math.max(60, menuTop - gap - bubbleTop);
  const side = isOwn
    ? { right: Math.max(10, W - (rect.x + rect.width)) }
    : { left: Math.max(10, rect.x) };

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
  menu: {
    position: 'absolute', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 16,
  },
  row: { height: ROW, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, letterSpacing: -0.3 },
});
