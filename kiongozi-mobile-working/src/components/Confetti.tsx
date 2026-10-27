// Confetti burst for happy moments (story shared, first post). Call celebrate() from anywhere;
// <ConfettiHost /> is mounted once at the app root.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing, AccessibilityInfo } from 'react-native';
import { create } from 'zustand';

const { width: W, height: H } = Dimensions.get('window');
const COLORS = ['#5CB85C', '#F5B83D', '#FF5A5F', '#7FD3F7', '#C792EA', '#FFFFFF'];
const COUNT = 46;

const useConfetti = create<{ shot: number; fire: () => void }>(set => ({
  shot: 0,
  fire: () => set(s => ({ shot: s.shot + 1 })),
}));

export const celebrate = () => useConfetti.getState().fire();

export function ConfettiHost() {
  const shot = useConfetti(s => s.shot);
  if (!shot) return null;
  return <Burst key={shot} />;
}

function Burst() {
  const t = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = React.useState(false);
  const pieces = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 0.9; // mostly upward
    const power = 0.55 + Math.random() * 0.5;
    return {
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      round: Math.random() < 0.3,
      dx: Math.cos(angle) * W * 0.55 * power,
      up: Math.sin(angle) * H * 0.45 * power,
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
    };
  }), []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(r => setReduce(!!r)).catch(() => {});
    Animated.timing(t, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true }).start();
  }, []);

  if (reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        // Shoot up from the bottom centre, then fall with gravity
        const x = t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        const y = t.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, p.up, p.up + H * 0.75],
          easing: Easing.out(Easing.quad),
        });
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        const opacity = t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', left: W / 2 - p.w / 2, top: H * 0.82,
              width: p.w, height: p.round ? p.w : p.h, borderRadius: p.round ? p.w / 2 : 2,
              backgroundColor: p.color, opacity,
              transform: [{ translateX: x }, { translateY: y }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
