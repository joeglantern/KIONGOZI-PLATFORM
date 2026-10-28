// WhatsApp swipe-to-reply: drag a message right, a reply arrow grows in behind it, a tick of
// haptics at the threshold, let go to reply. Rubber-bands past the limit, springs back.
// Only horizontal-right drags activate, so scrolling the chat is never blocked.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation, runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const THRESHOLD = 56;
const MAX = 84;

const tick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export function SwipeToReply({ onReply, color, enabled = true, children }: {
  onReply: () => void; color: string; enabled?: boolean; children: React.ReactNode;
}) {
  const x = useSharedValue(0);
  const armed = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX(14)
    .failOffsetX(-14)
    .failOffsetY([-12, 12])
    .onUpdate(e => {
      const dx = Math.max(0, e.translationX);
      // Resistance: 1:1 up to the threshold, then it gets heavier
      x.value = dx <= THRESHOLD ? dx : Math.min(MAX, THRESHOLD + (dx - THRESHOLD) * 0.35);
      const past = x.value >= THRESHOLD;
      if (past !== armed.value) {
        armed.value = past;
        if (past) runOnJS(tick)();
      }
    })
    .onEnd(() => {
      if (armed.value) runOnJS(onReply)();
      armed.value = false;
      x.value = withSpring(0, { damping: 18, stiffness: 260, mass: 0.6 });
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [12, THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(x.value, [12, THRESHOLD, MAX], [0.4, 1, 1.12], Extrapolation.CLAMP) }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View>
        <Animated.View style={[styles.icon, iconStyle]} pointerEvents="none">
          <View style={[styles.iconCircle, { backgroundColor: color }]}>
            <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
          </View>
        </Animated.View>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  icon: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
});
