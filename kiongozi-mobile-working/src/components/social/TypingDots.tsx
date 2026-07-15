import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const DELAYS = [0, 200, 400];

function Dot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -5, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(400 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />
  );
}

export function TypingDots() {
  return (
    <View style={styles.row}>
      {DELAYS.map(d => <Dot key={d} delay={d} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5CB85C' },
});
