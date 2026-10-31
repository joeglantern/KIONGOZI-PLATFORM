// The repost loop, drawn like the big apps draw it: two rounded arrows chasing each other.
// Outline when idle, filled in the accent once you've reposted; it spins a half turn on tap.
// A rolling count ticks the number up or down like a counter instead of just swapping it.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function RepostLoop({ size, on, spin, color, onColor }: {
  size: number; on: boolean; spin?: Animated.Value; color: string; onColor: string;
}) {
  const rotate = spin ? spin.interpolate({ inputRange: [0, 1, 2], outputRange: ['0deg', '0deg', '180deg'] }) : '0deg';
  const bump = spin ? spin.interpolate({ inputRange: [0, 1, 1.5, 2], outputRange: [1, 1, 1.35, 1] }) : 1;
  return (
    <Animated.View style={{ transform: [{ rotate }, { scale: bump }] }}>
      {/* a heavier stroke once on reads as "filled" at this size without a second glyph */}
      <Ionicons name={on ? 'repeat' : 'repeat-outline'} size={size} color={on ? onColor : color} style={on ? s.bold : undefined} />
    </Animated.View>
  );
}

/** Slides the old number out and the new one in, up when it grows and down when it shrinks. */
export function RollingCount({ value, text, style }: { value: number; text: string; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState({ text, key: 0 });
  const prev = useRef(value);
  const y = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (text === shown.text) return;
    const up = value >= prev.current;
    prev.current = value;
    const H = 14;
    Animated.parallel([
      Animated.timing(y, { toValue: up ? -H : H, duration: 110, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      setShown(c => ({ text, key: c.key + 1 }));
      y.setValue(up ? H : -H);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 260 }),
        Animated.timing(o, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    });
  }, [text, value]);
  return (
    <View style={s.clip}>
      <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[style, { transform: [{ translateY: y }], opacity: o }]}>{shown.text}</Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  bold: { fontWeight: '900' as any },
  clip: { overflow: 'hidden', justifyContent: 'center' },
});
