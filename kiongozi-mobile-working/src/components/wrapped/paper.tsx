// Cut-paper motion for "Your week": pieces of paper slapped onto the table, a stop-motion "boil" that keeps
// them alive at 8 frames a second, torn strips that rip in from the left, and a paper grain over everything.
// The shadow under each cutout is the same picture tinted ink and nudged down-right, so it follows the
// paper's real edge (Android elevation would draw a box). Reduce motion keeps fades and drops the boil.
import React, { useEffect } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType, StyleProp, ViewStyle, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withDelay, withTiming, withRepeat, withSequence, withSpring, Easing, cancelAnimation,
} from 'react-native-reanimated';

export const PAPER = {
  grain: require('../../../assets/wrapped/paper/grain.png'),
  heart: require('../../../assets/wrapped/paper/heart.webp'),
  star: require('../../../assets/wrapped/paper/star.webp'),
  sun: require('../../../assets/wrapped/paper/sun.webp'),
  stick: require('../../../assets/wrapped/paper/stick.webp'),
  bubble: require('../../../assets/wrapped/paper/bubble.webp'),
  trophy: require('../../../assets/wrapped/paper/trophy.webp'),
  flame: require('../../../assets/wrapped/paper/flame.webp'),
  stool: require('../../../assets/wrapped/paper/stool.webp'),
  squiggle: require('../../../assets/wrapped/paper/squiggle.webp'),
  dots: require('../../../assets/wrapped/paper/dots.webp'),
  arrow: require('../../../assets/wrapped/paper/arrow.webp'),
  stripWhite: require('../../../assets/wrapped/paper/strip_white.webp'),
  stripInk: require('../../../assets/wrapped/paper/strip_ink.webp'),
  patch: require('../../../assets/wrapped/paper/patch_cream.webp'),
  underline: require('../../../assets/wrapped/paper/brush_underline.webp'),
  circle: require('../../../assets/wrapped/paper/brush_circle.webp'),
  scribble: require('../../../assets/wrapped/paper/brush_scribble.webp'),
};

/** Height / width of each cutout (measured from the trimmed art) */
export const AR = {
  heart: 0.905, star: 1.019, sun: 1.008, stick: 1.546, bubble: 0.775, trophy: 0.991, flame: 1.233, stool: 0.859,
  squiggle: 0.986, dots: 0.914, arrow: 1.008, patch: 1.181, circle: 0.678, strip: 0.192, underline: 0.075, scribble: 0.208,
};

/** Paper slapped down: drops in from a little above, bigger and turned, lands with a quick settle */
export function slap(delay: number, reduce: boolean, rot = 0): any {
  if (reduce) return FadeIn.delay(delay).duration(260);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: 1.35 }, { rotate: `${rot + 14}deg` }, { translateY: -30 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 90 })),
        transform: [
          { scale: withDelay(delay, withSequence(withTiming(0.96, { duration: 170, easing: Easing.in(Easing.quad) }), withSpring(1, { damping: 10, stiffness: 260 }))) },
          { rotate: withDelay(delay, withTiming(`${rot}deg`, { duration: 190, easing: Easing.out(Easing.cubic) })) },
          { translateY: withDelay(delay, withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) })) },
        ],
      },
    };
  };
}

/** Slides in from off-screen like a strip pushed across the table, landing at an angle */
export function shove(delay: number, reduce: boolean, from: 'left' | 'right' = 'left', rot = 0): any {
  if (reduce) return FadeIn.delay(delay).duration(260);
  const dx = from === 'left' ? -420 : 420;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateX: dx }, { rotate: `${rot + (from === 'left' ? -6 : 6)}deg` }] },
      animations: {
        transform: [
          { translateX: withDelay(delay, withSpring(0, { damping: 15, stiffness: 170, mass: 0.9 })) },
          { rotate: withDelay(delay, withSpring(`${rot}deg`, { damping: 12, stiffness: 150 })) },
        ],
      },
    };
  };
}

/**
 * Stop-motion boil: the piece hops between three slightly different poses, 8 times a second, like a stop-motion
 * frame being re-shot. `amp` is degrees of wobble; `drift` adds a slow bob on top so it never looks frozen.
 */
export function Boil({ children, style, reduce, amp = 1.6, fps = 8, drift = 0, seed = 0 }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; reduce: boolean; amp?: number; fps?: number; drift?: number; seed?: number;
}) {
  const f = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    f.value = withRepeat(withTiming(3, { duration: 3000 / fps, easing: Easing.linear }), -1, false);
    if (drift) b.value = withRepeat(withSequence(
      withTiming(1, { duration: 2200 + seed * 170, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 2200 + seed * 170, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    return () => { cancelAnimation(f); cancelAnimation(b); };
  }, [reduce]);
  const st = useAnimatedStyle(() => {
    const frame = (Math.floor(f.value) + seed) % 3;
    const r = frame === 0 ? -amp : frame === 1 ? amp * 0.4 : amp * 0.9;
    const x = frame === 0 ? 0.6 : frame === 1 ? -0.6 : 0;
    const y = frame === 2 ? -0.8 : 0.4;
    return { transform: [{ translateX: x }, { translateY: y - b.value * drift }, { rotate: `${r}deg` }] };
  });
  return <Animated.View style={[style, st]} pointerEvents="box-none">{children}</Animated.View>;
}

/** A cut-paper picture with a crisp shadow that follows its edge */
export function Cutout({ source, w, h, shadow = 0.22, off = 5 }: { source: ImageSourcePropType; w: number; h?: number; shadow?: number; off?: number }) {
  const hh = h ?? w;
  return (
    <View style={{ width: w, height: hh }}>
      <Image source={source} style={{ position: 'absolute', left: off, top: off * 1.3, width: w, height: hh, tintColor: '#1B1712', opacity: shadow }} resizeMode="contain" fadeDuration={0} />
      <Image source={source} style={{ width: w, height: hh }} resizeMode="contain" fadeDuration={0} />
    </View>
  );
}

/** A cutout that slaps down and then boils: the default way paper pieces live on a slide */
export function Piece({ source, w, h, x, y, rot = 0, delay = 0, reduce, amp, drift = 4, seed = 0, shadow, flip }: {
  source: ImageSourcePropType; w: number; h?: number; x: number; y: number; rot?: number; delay?: number; reduce: boolean;
  amp?: number; drift?: number; seed?: number; shadow?: number; flip?: boolean;
}) {
  return (
    <Animated.View entering={slap(delay, reduce, rot)} style={{ position: 'absolute', left: x, top: y, transform: [{ rotate: `${rot}deg` }, ...(flip ? [{ scaleX: -1 }] : [])] }} pointerEvents="none">
      <Boil reduce={reduce} amp={amp} drift={drift} seed={seed}>
        <Cutout source={source} w={w} h={h} shadow={shadow} />
      </Boil>
    </Animated.View>
  );
}

/**
 * Rips a torn strip in from the left in stepped frames (12 a second), like it is being torn off the roll,
 * then the content on it lands. `children` sits on top of the strip.
 */
export function TornStrip({ source, w, h, delay, reduce, rot = -2, children, style }: {
  source: ImageSourcePropType; w: number; h: number; delay: number; reduce: boolean; rot?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(delay, withTiming(6, { duration: 6 * 70, easing: Easing.linear }));
    return () => cancelAnimation(t);
  }, [reduce]);
  const clip = useAnimatedStyle(() => ({ width: reduce ? w : (Math.floor(t.value) / 6) * w }));
  return (
    <View style={[{ width: w, height: h, transform: [{ rotate: `${rot}deg` }] }, style]} pointerEvents="none">
      <Animated.View style={[{ height: h, overflow: 'hidden' }, clip]}>
        <Image source={source} style={{ position: 'absolute', left: 3, top: 5, width: w, height: h, tintColor: '#1B1712', opacity: 0.2 }} resizeMode="stretch" fadeDuration={0} />
        <Image source={source} style={{ width: w, height: h }} resizeMode="stretch" fadeDuration={0} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

/** A brush mark painted on: wipes in left to right with a soft ease (underline, circle, scribble) */
export function BrushMark({ source, w, h, x, y, delay, reduce, rot = 0, opacity = 1 }: {
  source: ImageSourcePropType; w: number; h: number; x: number; y: number; delay: number; reduce: boolean; rot?: number; opacity?: number;
}) {
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(t);
  }, [reduce]);
  const clip = useAnimatedStyle(() => ({ width: t.value * w }));
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity, transform: [{ rotate: `${rot}deg` }] }} pointerEvents="none">
      <Animated.View style={[{ height: h, overflow: 'hidden' }, clip]}>
        <Image source={source} style={{ width: w, height: h }} resizeMode="stretch" fadeDuration={0} />
      </Animated.View>
    </View>
  );
}

/** Fine paper grain over the whole slide so flat colour reads as card, not screen */
export function Grain({ opacity = 0.55 }: { opacity?: number }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={PAPER.grain} style={{ position: 'absolute', left: 0, top: 0, width, height, opacity }} resizeMode="cover" fadeDuration={0} />
    </View>
  );
}
