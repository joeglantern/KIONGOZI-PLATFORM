// Kiongozi AI "presence" orb: soft brand-colour shapes drifting inside a circle.
// Drawn in code (crisp at any size, any theme), animated on the UI thread.
// state="thinking" spins faster and breathes; "idle" drifts slowly.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, cancelAnimation, interpolate, type SharedValue,
} from 'react-native-reanimated';

type Props = { size?: number; state?: 'idle' | 'thinking' };

const LAYERS: { colors: [string, string]; scale: number; offset: number; speed: number; start: number }[] = [
  { colors: ['#5CB85C', '#2F7D32'], scale: 1.05, offset: 0.22, speed: 1, start: 0 },
  { colors: ['#FF8A00', '#F5B83D'], scale: 0.78, offset: 0.3, speed: -1.4, start: 120 },
  { colors: ['#8BD48B', '#5CB85C'], scale: 0.7, offset: 0.26, speed: 1.8, start: 240 },
  { colors: ['#F5B83D', '#FFF1C9'], scale: 0.42, offset: 0.18, speed: -2.2, start: 60 },
];

export function AIOrb({ size = 72, state = 'idle' }: Props) {
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  const thinking = state === 'thinking';

  useEffect(() => {
    cancelAnimation(spin);
    spin.value = 0;
    spin.value = withRepeat(withTiming(1, { duration: thinking ? 3200 : 12000, easing: Easing.linear }), -1, false);
    cancelAnimation(breathe);
    breathe.value = 0;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: thinking ? 650 : 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: thinking ? 650 : 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [thinking]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, thinking ? 1.07 : 1.03]) }],
  }));

  return (
    <Reanimated.View style={[{ width: size, height: size, borderRadius: size / 2 }, styles.shell, shellStyle]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#123A1A' }]} />
      {LAYERS.map((l, i) => <Layer key={i} size={size} layer={l} spin={spin} />)}
      {/* soft top highlight for a glassy, crisp edge */}
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.6, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </Reanimated.View>
  );
}

function Layer({ size, layer, spin }: { size: number; layer: typeof LAYERS[number]; spin: SharedValue<number> }) {
  const d = size * layer.scale;
  const style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${layer.start + spin.value * 360 * layer.speed}deg` },
      { translateX: size * layer.offset },
    ],
  }));
  return (
    <Reanimated.View style={[styles.center, { width: size, height: size }, style]} pointerEvents="none">
      <LinearGradient
        colors={layer.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: d, height: d, borderRadius: d / 2, opacity: 0.9 }}
      />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden' },
  center: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});
