// Motion pieces for the "Your week" story: entrance animations (rise, pop, reveal, tilt), the floating 3D objects,
// count-up numbers and the looping video backgrounds. Everything that moves runs on the UI thread, except the
// count-up text, which is a short JS tick. Reduce motion keeps the fades and drops the floats and springs.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withDelay, withSpring, withTiming, withRepeat, withSequence,
  Easing, cancelAnimation, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';

/** Gap between elements entering one after another */
export const STAGGER = 120;

const RISE_SPRING = { damping: 16, stiffness: 150, mass: 0.9 };
const POP_SPRING = { damping: 9, stiffness: 140, mass: 0.8 }; // a little overshoot, like the board's 1.08

/** Rises 40px and settles in, the board's .r1 to .r4 */
export function rise(delay: number, reduce: boolean, dist = 40): any {
  if (reduce) return FadeIn.delay(delay).duration(320);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: dist }, { scale: 0.96 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) })),
        transform: [
          { translateY: withDelay(delay, withSpring(0, RISE_SPRING)) },
          { scale: withDelay(delay, withSpring(1, RISE_SPRING)) },
        ],
      },
    };
  };
}

/** Grows from small with an overshoot (dots, avatars, pills) */
export function pop(delay: number, reduce: boolean, from = 0): any {
  if (reduce) return FadeIn.delay(delay).duration(260);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: from }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 160 })),
        transform: [{ scale: withDelay(delay, withSpring(1, POP_SPRING)) }],
      },
    };
  };
}

/** Slides up from behind a clip edge, for the giant words (wrap in <Reveal>) */
export function lift(delay: number, reduce: boolean, dist: number): any {
  if (reduce) return FadeIn.delay(delay).duration(320);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: dist }] },
      animations: { transform: [{ translateY: withDelay(delay, withSpring(0, { damping: 18, stiffness: 120, mass: 1 })) }] },
    };
  };
}

/** A giant line that comes up from behind its own baseline (Spotify's mask reveal) */
export function Reveal({ delay, reduce, height, children, style }: { delay: number; reduce: boolean; height: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const pad = Math.min(16, Math.round(height * 0.12)); // room for descenders under the tight line height
  return (
    <View style={[{ overflow: 'hidden', paddingTop: 6, marginTop: -6, paddingBottom: pad, marginBottom: -pad }, style]}>
      <Animated.View entering={lift(delay, reduce, height * 1.15)}>{children}</Animated.View>
    </View>
  );
}

/**
 * A 3D object: pops in with a spring and overshoot, then floats and turns slowly forever.
 * dir and depth give a parallax drift in from the side the story is moving from.
 */
export function Float3D({
  source, size, style, delay = 150, tilt = 0, spin = false, amp = 14, period = 4000, phase = 0,
  depth = 1, dir = 1, reduce = false, width,
}: {
  source: ImageSourcePropType; size: number; style?: StyleProp<ViewStyle>; delay?: number; tilt?: number; spin?: boolean;
  amp?: number; period?: number; phase?: number; depth?: number; dir?: number; reduce?: boolean; width?: number;
}) {
  const popV = useSharedValue(reduce ? 1 : 0);
  const fade = useSharedValue(0);
  const fl = useSharedValue(0.5);
  const turn = useSharedValue(0);
  const drift = useSharedValue(reduce ? 0 : dir * depth * 70);

  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: reduce ? 320 : 220 }));
    if (reduce) return;
    popV.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 110, mass: 0.9 }));
    drift.value = withDelay(Math.max(0, delay - 120), withSpring(0, { damping: 20, stiffness: 70 }));
    fl.value = withDelay(delay + 500 + phase, withRepeat(withSequence(
      withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: period / 2, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
    if (spin) turn.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(fl); cancelAnimation(turn); cancelAnimation(popV); cancelAnimation(drift); };
  }, []);

  const st = useAnimatedStyle(() => {
    const p = popV.value;
    const rot = tilt + (1 - p) * -25 + (fl.value - 0.5) * 8 + turn.value;
    return {
      opacity: fade.value,
      transform: [
        { translateX: drift.value },
        { translateY: (0.5 - fl.value) * amp },
        { scale: interpolate(p, [0, 1], [0.3, 1], Extrapolation.EXTEND) },
        { rotate: `${rot}deg` },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: width ?? size, height: size }, style, st]}>
      <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </Animated.View>
  );
}

/** A number that counts up from 0 with an ease-out; a light tick lands with the last digit */
export function CountUp({
  to, delay = 0, duration = 1200, style, prefix = '', suffix = '', format = (n: number) => String(n), tick = false, reduce = false,
}: {
  to: number; delay?: number; duration?: number; style?: StyleProp<TextStyle>; prefix?: string; suffix?: string;
  format?: (n: number) => string; tick?: boolean; reduce?: boolean;
}) {
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce || to <= 0) { setV(to); return; }
    let raf = 0;
    let start = 0;
    let last = -1;
    const timer = setTimeout(() => {
      const step = (ts: number) => {
        if (!start) start = ts;
        const k = Math.min(1, (ts - start) / duration);
        const e = 1 - Math.pow(1 - k, 4);
        const n = Math.round(to * e);
        if (n !== last) { last = n; setV(n); }
        if (k < 1) raf = requestAnimationFrame(step);
        else if (tick) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [to, reduce]);
  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]} maxFontSizeMultiplier={1} numberOfLines={1}>{prefix}{format(v)}{suffix}</Text>;
}

/** A full-bleed looping video with its poster until the first frame plays (same idea as OrbVideo) */
export function LoopVideo({ source, poster, playing }: { source: any; poster: any; playing: boolean }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(source, p => { p.loop = true; p.muted = true; });
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }: any) => { if (isPlaying) setReady(true); });
    return () => sub.remove();
  }, [player]);
  useEffect(() => { try { if (playing) player.play(); else player.pause(); } catch {} }, [playing, player]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={poster} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

/** A soft ring that keeps breathing out from behind an avatar */
export function PulseRing({ size, color = 'rgba(255,255,255,0.5)', reduce, delay = 600 }: { size: number; color?: string; reduce: boolean; delay?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 1], [0, 0.9, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.35]) }],
  }));
  if (reduce) return null;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color }, st]} />;
}
