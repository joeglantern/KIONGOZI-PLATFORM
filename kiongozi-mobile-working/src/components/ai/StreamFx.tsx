// Subtle "magic" for AI replies, all on the UI thread:
//  • ShineText — a soft light band glides across text (used for "Thinking…")
//  • ReplyFx — while streaming, new words emerge through a soft fade at the bottom edge;
//    when done, the fade dissolves and one faint shine sweeps across the reply.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing, cancelAnimation,
} from 'react-native-reanimated';

const BAND = 70;

export function ShineText({ text, style, baseColor, shineColor }: {
  text: string; style?: StyleProp<TextStyle>; baseColor: string; shineColor: string;
}) {
  const [w, setW] = useState(0);
  const x = useSharedValue(-BAND);
  useEffect(() => {
    if (!w) return;
    x.value = -BAND;
    x.value = withRepeat(withTiming(w, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [w]);
  const bandStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value }] }));
  return (
    <View onLayout={e => setW(Math.round(e.nativeEvent.layout.width))} style={{ alignSelf: 'flex-start' }}>
      <Text style={[style, { color: baseColor }]}>{text}</Text>
      {w > 0 && (
        <Reanimated.View pointerEvents="none" style={[styles.band, { width: BAND }, bandStyle]}>
          <Reanimated.View style={[{ width: w }, innerStyle]}>
            <Text style={[style, { color: shineColor }]} numberOfLines={1}>{text}</Text>
          </Reanimated.View>
        </Reanimated.View>
      )}
    </View>
  );
}

export function ReplyFx({ streaming, bg, shine, children }: {
  streaming: boolean; bg: string; shine: string; children: React.ReactNode;
}) {
  const fade = useSharedValue(streaming ? 1 : 0);
  const sweep = useSharedValue(-1);
  const [w, setW] = useState(0);
  const [wasStreaming, setWasStreaming] = useState(streaming);

  useEffect(() => {
    if (streaming) { setWasStreaming(true); fade.value = 1; return; }
    fade.value = withTiming(0, { duration: 450 });
    if (wasStreaming) {
      // one soft shine across the finished reply
      sweep.value = -1;
      sweep.value = withDelay(120, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    }
  }, [streaming]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > -1 && sweep.value < 1 ? 1 : 0,
    transform: [{ translateX: sweep.value * (w + 160) - 80 }, { rotate: '18deg' }],
  }));

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ overflow: 'hidden' }}>
      {children}
      {/* new words emerge through this soft edge while streaming */}
      <Reanimated.View pointerEvents="none" style={[styles.edge, fadeStyle]}>
        <LinearGradient colors={[bg + '00', bg]} style={StyleSheet.absoluteFill} />
      </Reanimated.View>
      {wasStreaming && (
        <Reanimated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
          <LinearGradient colors={['transparent', shine, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Reanimated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 34 },
  sweep: { position: 'absolute', top: -40, bottom: -40, left: 0, width: 80 },
});
