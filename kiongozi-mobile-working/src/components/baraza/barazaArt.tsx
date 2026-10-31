// The painted side of Baraza: the room's backdrop, the talking stick as a real object (it sways
// when idle, glows and throws embers with the speaker's voice, and flies in when it is passed),
// the raised hand, and the theme picker. Art comes from assets/baraza (painted, transparent PNGs).
import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, withDelay,
  Easing, SharedValue, interpolate, useDerivedValue, Extrapolation, FadeIn, FadeOut, SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarazaTheme, BARAZA_THEMES, THEME_ORDER, useBarazaTheme } from './barazaTheme';

export const ART = {
  stick: require('../../../assets/baraza/stick.png'),
  glow: require('../../../assets/baraza/stick_glow.png'),
  embers: [
    require('../../../assets/baraza/ember_1.png'),
    require('../../../assets/baraza/ember_2.png'),
    require('../../../assets/baraza/ember_3.png'),
  ],
  hand: require('../../../assets/baraza/hand.png'),
  empty: require('../../../assets/baraza/stage_empty.png'),
  stickAnim: require('../../../assets/baraza/stick_anim.webp'),
  iconLive: require('../../../assets/baraza/icon_live.png'),
  iconListen: require('../../../assets/baraza/icon_listen.png'),
  iconRecorded: require('../../../assets/baraza/icon_recorded.png'),
  island: require('../../../assets/baraza/island.webp'),
  cloud: require('../../../assets/baraza/cloud.png'),
  stool: require('../../../assets/baraza/stool.png'),
  pin: require('../../../assets/baraza/pin.png'),
};

// The stick's shake, painted then animated (Higgsfield, Kling 3.0), cut out frame by frame.
// 61 frames at 12fps in a 10-column sheet; frames 0-13 are the stick at rest.
const SPRITE = {
  n: 60, cols: 10, rows: 7, fw: 171, fh: 420, ms: 5000,
  restTop: 0.0234, restBottom: 0.9968, restCx: 0.526,
  shakeFrom: 14, shakeTo: 46,
};

const STICK_RATIO = 1 / 6; // width / height of stick.png (a slender carved staff)

/** The room behind everything: colour, then a seamless texture or one painted image. */
export function Backdrop({ t }: { t: BarazaTheme }) {
  const { width, height } = useWindowDimensions();
  const TILE = 256;
  const cols = Math.ceil(width / TILE), rows = Math.ceil(height / TILE);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]} pointerEvents="none">
      {t.cover ? (
        <Image source={t.cover} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} />
      ) : t.tile ? (
        // laid out by hand: resizeMode="repeat" only draws one tile on Android
        <View style={[StyleSheet.absoluteFill, { opacity: t.tileOpacity ?? 1, flexDirection: 'row', flexWrap: 'wrap', width: cols * TILE, overflow: 'hidden' }]}>
          {Array.from({ length: cols * rows }, (_, i) => (
            <Image key={i} source={t.tile} style={{ width: TILE, height: TILE }} fadeDuration={0} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The stick on its own, still (badges, the start sheet, the minutes). */
export function PaintedStick({ height = 48, tilt = -28 }: { height?: number; tilt?: number }) {
  return (
    <Image source={ART.stick} fadeDuration={0}
      style={{ width: height * STICK_RATIO, height, transform: [{ rotate: `${tilt}deg` }] }} resizeMode="contain" />
  );
}

/** One ember drifting up from the stick's head on its own loop. */
function Ember({ i, level, t }: { i: number; level: SharedValue<number>; t: BarazaTheme }) {
  const p = useSharedValue(0);
  const seed = useMemo(() => ({
    dx: ((i * 37) % 23) - 11,          // sideways drift
    delay: (i * 211) % 1400,
    dur: 1500 + ((i * 97) % 900),
    size: 10 + ((i * 13) % 9),
  }), [i]);
  useEffect(() => {
    p.value = withDelay(seed.delay, withRepeat(withTiming(1, { duration: seed.dur, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p, seed]);
  const st = useAnimatedStyle(() => {
    const k = p.value;
    return {
      opacity: interpolate(k, [0, 0.15, 0.75, 1], [0, 1, 0.6, 0]) * Math.min(1, level.value * 1.6),
      transform: [
        { translateY: -k * (60 + level.value * 70) },
        { translateX: Math.sin(k * Math.PI * 2 + i) * 6 + seed.dx * k },
        { scale: 0.6 + (1 - k) * 0.6 },
      ],
    };
  });
  return (
    <Animated.Image source={ART.embers[i % 3]} fadeDuration={0}
      style={[{ position: 'absolute', width: seed.size, height: seed.size, tintColor: t.glow }, st]} />
  );
}

/** A twinkling spark that circles the stick's head like it is enchanted. */
function OrbitSpark({ i, n, radius, level, burst, t }: {
  i: number; n: number; radius: number; level: SharedValue<number>; burst: SharedValue<number>; t: BarazaTheme;
}) {
  const a = useSharedValue(0);
  const tw = useSharedValue(0);
  useEffect(() => {
    a.value = withRepeat(withTiming(1, { duration: 5200 + i * 700, easing: Easing.linear }), -1, false);
    tw.value = withDelay(i * 330, withRepeat(withTiming(1, { duration: 900 + i * 170, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [a, tw, i]);
  const size = 9 + (i % 3) * 3;
  const st = useAnimatedStyle(() => {
    const ang = (a.value + i / n) * Math.PI * 2 * (i % 2 ? -1 : 1);
    const r = radius * (1 + burst.value * 0.9 + level.value * 0.25);
    return {
      opacity: (0.35 + tw.value * 0.65) * (0.55 + Math.min(1, level.value * 1.5) * 0.45 + burst.value * 0.5),
      transform: [
        { translateX: Math.cos(ang) * r },
        { translateY: Math.sin(ang) * r * 0.55 },
        { scale: 0.6 + tw.value * 0.6 + burst.value * 0.8 },
        { rotate: `${a.value * 360}deg` },
      ],
    };
  });
  return (
    <Animated.Image source={ART.embers[(i + 1) % 3]} fadeDuration={0}
      style={[{ position: 'absolute', width: size, height: size, tintColor: t.glow }, st]} />
  );
}

/**
 * The talking stick, held by whoever has the floor. `level` (0..1) is how loud they are right
 * now; `holderKey` changes when it is passed, which plays the fly-in.
 */
export function TalkingStick({ height, level, holderKey, t, late }: {
  height: number; level: SharedValue<number>; holderKey: string | null; t: BarazaTheme; late?: boolean;
}) {
  const w = height * STICK_RATIO;
  // The painted shake (animated in Higgsfield) plays from a sprite sheet: one image, no flicker
  const FH = height / (SPRITE.restBottom - SPRITE.restTop);
  const FW = FH * (SPRITE.fw / SPRITE.fh);
  const sway = useSharedValue(0);
  const arrive = useSharedValue(1);
  const shake = useSharedValue(0);
  const prog = useSharedValue(0);   // frame position in the shake loop
  const tapBurst = useSharedValue(0);

  const loop = () => withRepeat(withSequence(
    withTiming(0, { duration: 0 }),
    withTiming(SPRITE.n, { duration: SPRITE.ms, easing: Easing.linear }),
  ), -1, false);

  useEffect(() => {
    prog.value = loop();
    sway.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  // Tap it: jump straight to the shake, with a flare of sparkles
  const tap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const from = SPRITE.shakeFrom;
    prog.value = withSequence(
      withTiming(from, { duration: 0 }),
      withTiming(SPRITE.n, { duration: ((SPRITE.n - from) / SPRITE.n) * SPRITE.ms, easing: Easing.linear }),
      loop(),
    );
    tapBurst.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 1000, easing: Easing.out(Easing.quad) }));
  };

  // Sparkles flare while the stick is shaking
  const burst = useDerivedValue(() => Math.max(
    tapBurst.value,
    interpolate(prog.value, [SPRITE.shakeFrom - 1, SPRITE.shakeFrom + 4, SPRITE.shakeTo], [0, 1, 0], Extrapolation.CLAMP),
  ));

  // Passed on: it flies in from above with a spin and lands with a little squash
  useEffect(() => {
    if (!holderKey) return;
    arrive.value = 0;
    arrive.value = withSpring(1, { damping: 11, stiffness: 120, mass: 0.9 });
    const h = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 380);
    return () => clearTimeout(h);
  }, [holderKey, arrive]);

  // Last seconds of a turn: a nervous little shake
  useEffect(() => {
    shake.value = late
      ? withRepeat(withSequence(withTiming(1, { duration: 70 }), withTiming(-1, { duration: 70 })), -1, true)
      : withTiming(0, { duration: 120 });
  }, [late, shake]);

  const stickStyle = useAnimatedStyle(() => {
    const a = arrive.value;
    const talk = level.value;
    return {
      opacity: interpolate(a, [0, 0.25], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: (1 - a) * -height * 1.6 },
        { translateX: (1 - a) * height * 0.5 },
        { rotate: `${-28 + (1 - a) * 400 + (sway.value - 0.5) * 6 + talk * 4 + shake.value * 3}deg` },
        { scaleY: 1 + (a > 0.98 ? 0 : (1 - a) * 0.12) },
      ],
    };
  });

  const spriteStyle = useAnimatedStyle(() => {
    const i = Math.min(SPRITE.n - 1, Math.floor(prog.value));
    return {
      transform: [
        { translateX: -(i % SPRITE.cols) * FW },
        { translateY: -Math.floor(i / SPRITE.cols) * FH },
      ],
    };
  });

  const rest = t.dark ? 0.42 : 0.18; // on night rooms the dark wood needs a little light to read
  const glowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, rest + level.value * (0.93 - rest) + burst.value * 0.45),
    transform: [{ scale: 0.75 + level.value * 0.9 + (sway.value - 0.5) * 0.06 + burst.value * 0.4 }],
  }));

  // Light, embers and sparkles sit on the carved head near the top of the art
  const G = height * 0.62;
  const cx = FW * SPRITE.restCx;
  const headY = FH * SPRITE.restTop + height * 0.06;
  return (
    <Pressable onPress={tap} hitSlop={20} accessibilityRole="button" accessibilityLabel="The talking stick">
      <Animated.View style={[{ width: FW, height: FH }, stickStyle]}>
        <Animated.Image source={ART.glow} fadeDuration={0}
          style={[{ position: 'absolute', left: cx - G / 2, top: headY - G / 2, width: G, height: G, tintColor: late ? t.danger : t.glow }, glowStyle]} />
        <View pointerEvents="none" style={{ position: 'absolute', left: cx, top: headY, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 8 }, (_, i) => <Ember key={i} i={i} level={level} t={t} />)}
        </View>
        <View style={{ width: FW, height: FH, overflow: 'hidden' }}>
          <Animated.Image source={ART.stickAnim} fadeDuration={0}
            style={[{ width: FW * SPRITE.cols, height: FH * SPRITE.rows }, spriteStyle]} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: cx, top: headY, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 5 }, (_, i) => <OrbitSpark key={i} i={i} n={5} radius={w * 1.25} level={level} burst={burst} t={t} />)}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** The stick's shake loop on its own (no glow or embers), for cards and small places. */
export function MiniStick({ height }: { height: number }) {
  const FH = height / (SPRITE.restBottom - SPRITE.restTop);
  const FW = FH * (SPRITE.fw / SPRITE.fh);
  const prog = useSharedValue(0);
  useEffect(() => {
    prog.value = withRepeat(withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(SPRITE.n, { duration: SPRITE.ms, easing: Easing.linear }),
    ), -1, false);
  }, [prog]);
  const st = useAnimatedStyle(() => {
    const i = Math.min(SPRITE.n - 1, Math.floor(prog.value));
    return { transform: [{ translateX: -(i % SPRITE.cols) * FW }, { translateY: -Math.floor(i / SPRITE.cols) * FH }] };
  });
  return (
    <View style={{ width: FW, height: FH, overflow: 'hidden' }} pointerEvents="none">
      <Animated.Image source={ART.stickAnim} fadeDuration={0} style={[{ width: FW * SPRITE.cols, height: FH * SPRITE.rows }, st]} />
    </View>
  );
}

/** Where things sit on island.webp (fractions of its width / height): six stools and the hearth. */
export const ISLAND = {
  ratio: 886 / 900,
  hearth: [0.479, 0.537] as [number, number],
  stools: [[0.357, 0.435], [0.589, 0.435], [0.279, 0.498], [0.703, 0.498], [0.394, 0.559], [0.603, 0.559]] as [number, number][],
  restCx: SPRITE.restCx, restTop: SPRITE.restTop, restBottom: SPRITE.restBottom, frameRatio: SPRITE.fw / SPRITE.fh,
};

/** A painted raised hand, used on the button and in the queue. */
export function HandMark({ size = 22, wave = false }: { size?: number; wave?: boolean }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = wave
      ? withSequence(withTiming(1, { duration: 140 }), withTiming(-1, { duration: 160 }), withTiming(0.6, { duration: 140 }), withSpring(0))
      : 0;
  }, [wave, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 18}deg` }] }));
  return <Animated.Image source={ART.hand} fadeDuration={0} style={[{ width: size, height: size }, st]} resizeMode="contain" />;
}

/** Pick the room's look. Kept on this phone only. */
export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const cur = useBarazaTheme(s => s.id);
  const t = BARAZA_THEMES[cur];
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)}
            style={[sheet.wrap, { backgroundColor: t.dark ? '#1B2140' : '#FFFFFF', paddingBottom: insets.bottom + 18 }]}>
            <View style={[sheet.grab, { backgroundColor: t.line }]} />
            <Text style={[sheet.title, { color: t.ink }]}>Room style</Text>
            <Text style={[sheet.sub, { color: t.sub }]}>Only changes how the baraza looks on your phone.</Text>
            <View style={sheet.grid}>
              {THEME_ORDER.map(id => {
                const th = BARAZA_THEMES[id];
                const on = id === cur;
                return (
                  <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${th.name}, ${th.blurb}`}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); useBarazaTheme.getState().set(id); }}
                    style={({ pressed }) => [sheet.card, { borderColor: on ? th.accent : t.line, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                    <View style={[sheet.swatch, { backgroundColor: th.bg }]}>
                      {th.cover ? <Image source={th.cover} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        : th.tile ? <Image source={th.tile} style={[StyleSheet.absoluteFill, { opacity: th.tileOpacity }]} resizeMode="cover" /> : null}
                      <View style={sheet.swatchStick}><PaintedStick height={52} /></View>
                      <View style={[sheet.dot, { backgroundColor: th.accent }]} />
                    </View>
                    <View style={sheet.cardText}>
                      <Text style={[sheet.name, { color: t.ink }]} numberOfLines={1}>{th.name}</Text>
                      {on ? <Ionicons name="checkmark-circle" size={18} color={th.accent} /> : null}
                    </View>
                    <Text style={[sheet.blurb, { color: t.sub }]} numberOfLines={1}>{th.blurb}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </>
      )}
    </Modal>
  );
}

const sheet = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 14 },
  title: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
  sub: { fontSize: 13.5, marginTop: 3, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.8%', borderRadius: 20, borderWidth: 2, padding: 8 },
  swatch: { height: 104, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  swatchStick: { marginTop: 4 },
  dot: { position: 'absolute', right: 10, top: 10, width: 14, height: 14, borderRadius: 7 },
  cardText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  blurb: { fontSize: 12.5, marginTop: 1, paddingHorizontal: 2 },
});
