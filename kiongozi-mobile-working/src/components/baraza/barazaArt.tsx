// The painted side of Baraza: the room's backdrop, the talking stick as a real object (it sways
// when idle, glows and throws embers with the speaker's voice, and flies in when it is passed),
// the raised hand, and the theme picker. Art comes from assets/baraza (painted, transparent PNGs).
import { EASE_OUT, useReduceMotion } from '../../theme/motion';
import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay,
  Easing, SharedValue, interpolate, useDerivedValue, Extrapolation, FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedReaction,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  handWave: require('../../../assets/baraza/hand_wave.webp'),
  iconLive: require('../../../assets/baraza/icon_live.png'),
  iconListen: require('../../../assets/baraza/icon_listen.png'),
  iconRecorded: require('../../../assets/baraza/icon_recorded.png'),
  island: require('../../../assets/baraza/island.webp'),
  cloud: require('../../../assets/baraza/cloud.png'),
  stool: require('../../../assets/baraza/stool.png'),
  pin: require('../../../assets/baraza/pin.png'),
  /** the carved dais the speaker stands on (900 x 692) */
  dais: require('../../../assets/baraza/stage.webp'),
  /** ring of Maasai beads, the turn clock (700 x 700) */
  hoop: require('../../../assets/baraza/hoop.webp'),
  /** a stool from above-front for the listeners (200 x 193) */
  seat: require('../../../assets/baraza/stool_seat.png'),
  handBtn: require('../../../assets/baraza/hand_btn.png'),
  soundArc: require('../../../assets/baraza/sound_arc.png'),
  /** 8 x 3 sheet of 56px confetti pieces */
  confetti: require('../../../assets/baraza/confetti_sheet.png'),
};

export const DAIS_RATIO = 692 / 900;
export const SEAT_RATIO = 193 / 200;

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
  const SKY = Math.round(Math.max(width, height) * 1.25);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]} pointerEvents="none">
      {t.gradient ? <LinearGradient colors={t.gradient} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} /> : null}
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
      {t.sky ? (
        // a glow sitting high in the sky, fading out to the night colour
        <Image source={ART.glow} fadeDuration={0} resizeMode="stretch"
          style={{ position: 'absolute', width: SKY, height: SKY, left: width / 2 - SKY / 2, top: height * 0.25 - SKY / 2, tintColor: t.sky, opacity: 0.9 }} />
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

  const reduce = useReduceMotion();
  useEffect(() => {
    // Reduce Motion: the stick rests on its first painted frame, no sway
    if (reduce) { prog.value = 0; sway.value = 0.5; return; }
    prog.value = loop();
    sway.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce]);

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
    arrive.value = withTiming(1, { duration: 560, easing: EASE_OUT });
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

/**
 * The bead hoop as the turn clock. `progress` is how much of the turn has gone (0..1): a veil in
 * the room colour sweeps clockwise from twelve o'clock so the beads fade as the turn runs. Done
 * with two rotating half-rings behind half-width clips (no SVG). It always breathes a little.
 */
export function BeadHoop({ size, progress, t, late }: { size: number; progress: number | null; t: BarazaTheme; late?: boolean }) {
  const R = size / 2;
  const th = Math.round(size * 0.09);
  const timed = progress !== null;
  const p = useSharedValue(progress ?? 0);
  const breathe = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    p.value = timed ? withTiming(progress!, { duration: 520, easing: Easing.linear }) : withTiming(0, { duration: 200 });
  }, [progress, timed, p]);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: timed ? 2200 : 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [timed, breathe]);
  useEffect(() => {
    pulse.value = late
      ? withRepeat(withTiming(1, { duration: 480, easing: Easing.inOut(Easing.sin) }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [late, pulse]);
  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.015 }] }));
  const rightRot = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(p.value, [0, 0.5], [-180, 0], Extrapolation.CLAMP)}deg` }] }));
  const leftRot = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(p.value, [0.5, 1], [0, 180], Extrapolation.CLAMP)}deg` }] }));
  const lateRing = useAnimatedStyle(() => ({ opacity: pulse.value * 0.7 }));

  const half = (side: 'left' | 'right', rot: any) => (
    <View key={side} pointerEvents="none" style={{ position: 'absolute', top: 0, left: side === 'right' ? R : 0, width: R, height: size, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: side === 'right' ? -R : 0, width: size, height: size }, rot]}>
        <View style={{ position: 'absolute', left: R, top: 0, width: R, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: -R, top: 0, width: size, height: size, borderRadius: R, borderWidth: th, borderColor: t.bg, opacity: 0.72 }} />
        </View>
      </Animated.View>
    </View>
  );

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, wrap]}>
      <Animated.View style={[{ position: 'absolute', left: -3, top: -3, width: size + 6, height: size + 6, borderRadius: R + 3, borderWidth: 3, borderColor: t.danger }, lateRing]} />
      <Image source={ART.hoop} fadeDuration={0} style={{ width: size, height: size }} resizeMode="contain" />
      {timed ? [half('right', rightRot), half('left', leftRot)] : null}
    </Animated.View>
  );
}

// confetti_sheet.png: 8 columns x 3 rows of 56px pieces
const CONF = { cols: 8, rows: 3, cell: 56 };

function ConfettiPiece({ idx, ox, oy, vx, vy, rot, spin, s, delay }: {
  idx: number; ox: number; oy: number; vx: number; vy: number; rot: number; spin: number; s: number; delay: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1600, easing: Easing.linear }));
  }, [p, delay]);
  const st = useAnimatedStyle(() => {
    const k = p.value;
    return {
      opacity: interpolate(k, [0, 0.04, 0.78, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: vx * k },
        { translateY: vy * k + 945 * k * k },
        { rotate: `${rot + spin * k}deg` },
        { scale: 1 - k * 0.25 },
      ],
    };
  });
  const cell = CONF.cell * s;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: ox - cell / 2, top: oy - cell / 2, width: cell, height: cell, overflow: 'hidden' }, st]}>
      <Image source={ART.confetti} fadeDuration={0}
        style={{ width: CONF.cols * cell, height: CONF.rows * cell, transform: [{ translateX: -(idx % CONF.cols) * cell }, { translateY: -Math.floor(idx / CONF.cols) * cell }] }} />
    </Animated.View>
  );
}

/** Confetti bursting up from (ox, oy) and falling back over about 1.6 s. Mount it to play once. */
export function ConfettiBurst({ n = 18, ox, oy, spread }: { n?: number; ox: number; oy: number; spread: number }) {
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => {
    const side = (i / (n - 1)) * 2 - 1; // spread evenly across, then jitter
    return {
      idx: Math.floor(Math.random() * CONF.cols * CONF.rows),
      vx: side * spread * (0.6 + Math.random() * 0.5),
      vy: -(700 + Math.random() * 220),
      rot: Math.random() * 360,
      spin: (Math.random() - 0.5) * 800,
      s: 0.42 + Math.random() * 0.2,
      delay: Math.random() * 140,
    };
  }), [n, spread]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {seeds.map((sd, i) => <ConfettiPiece key={i} ox={ox} oy={oy} {...sd} />)}
    </View>
  );
}

/** A painted raised hand, used on the button and in the queue. `wave` waves once; `loop` keeps waving. */
export function HandMark({ size = 22, wave = false, loop = false }: { size?: number; wave?: boolean; loop?: boolean }) {
  const r = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) { r.value = 0; return; }   // Reduce Motion: the hand stays up, still
    if (loop) {
      // a slow, steady wave from -8 to 10 degrees while the hand stays up
      r.value = withRepeat(withSequence(
        withTiming(10 / 18, { duration: 550, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8 / 18, { duration: 550, easing: Easing.inOut(Easing.sin) }),
      ), -1, false);
      return;
    }
    r.value = wave
      ? withSequence(withTiming(1, { duration: 140 }), withTiming(-1, { duration: 160 }), withTiming(0.6, { duration: 140 }), withTiming(0, { duration: 160, easing: EASE_OUT }))
      : 0;
  }, [wave, loop, r, reduce]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: size * 0.4 }, { rotate: `${r.value * 18}deg` }, { translateY: -size * 0.4 }] }));
  return <Animated.Image source={ART.hand} fadeDuration={0} style={[{ width: size, height: size }, st]} resizeMode="contain" />;
}

/** The waving hand sheet (Higgsfield wave, keyed and cut): 60 frames at 12 fps, 10 per row. */
const WAVE_BURST_MS = 1700;
const WAVE_REST_MS = 480;
const WAVE = { n: 60, cols: 10, fw: 167, fh: 180, fps: 12, peaks: [{ f: 9, side: -1, x: 0.25 }, { f: 23, side: 1, x: 0.674 }, { f: 38, side: -1, x: 0.259 }, { f: 46, side: 1, x: 0.613 }] };

/**
 * A raised hand that really waves (a filmed wrist wave, cut out frame by frame) and throws ripples off the
 * fingertips: at each end of a swing, where the hand stops and turns back, two amber arcs leave the
 * fingertips on that side, travel outward and fade. Everything runs on the UI thread.
 */
export function WavingHand({ height = 44, color = '#E9A23B' }: { height?: number; color?: string }) {
  const H = height, W = H * (WAVE.fw / WAVE.fh);
  const f = useSharedValue(0);
  const rl = useSharedValue(1);   // ripple on the left, 0..1 (1 = done)
  const rr = useSharedValue(1);
  // Playful and hard to miss: a quick burst (the filmed wave at 3x, ~1.7 s, four swings), then a short
  // rest on the open palm, again and again
  const reduce = useReduceMotion();
  useEffect(() => {
    // Reduce Motion: the open palm, still, no ripples
    if (reduce) { f.value = 0; return; }
    f.value = withRepeat(withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(WAVE.n, { duration: WAVE_BURST_MS, easing: Easing.linear }),
      withTiming(WAVE.n, { duration: WAVE_REST_MS }),
    ), -1, false);
  }, [f, reduce]);
  // fire a ripple the moment the frame reaches a swing peak
  useAnimatedReaction(() => Math.floor(f.value) % WAVE.n, (cur, prev) => {
    if (cur === prev) return;
    for (let i = 0; i < WAVE.peaks.length; i++) {
      const pk = WAVE.peaks[i];
      if (pk.f === cur) {
        if (pk.side < 0) { rl.value = 0; rl.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }); }
        else { rr.value = 0; rr.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }); }
      }
    }
  });
  const sprite = useAnimatedStyle(() => {
    const i = Math.floor(f.value) % WAVE.n;
    return { transform: [{ translateX: -(i % WAVE.cols) * W }, { translateY: -Math.floor(i / WAVE.cols) * H }] };
  });
  // the whole hand tilts with each swing, pivoting at the wrist (four swings per burst, still while resting)
  const sway = useAnimatedStyle(() => {
    const ph = (f.value / WAVE.n) * Math.PI * 8;
    const a = Math.sin(ph) * 9;
    const hop = Math.abs(Math.sin(ph)) * 1.5;
    return { transform: [{ translateY: H / 2 - hop }, { rotate: `${a}deg` }, { translateY: -H / 2 }] };
  });
  const arc = (v: SharedValue<number>, side: number, k: number) => useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, v.value - k * 0.12) / (1 - k * 0.12));
    return {
      opacity: v.value >= 1 ? 0 : (1 - p) * 0.95,
      transform: [{ translateX: side * (4 + p * H * 0.22) }, { scale: 0.7 + p * 0.6 }],
    };
  });
  const l1 = arc(rl, -1, 0), l2 = arc(rl, -1, 1), r1 = arc(rr, 1, 0), r2 = arc(rr, 1, 1);
  const A = H * 0.34; // arc box: a ring with only one side drawn
  const ring = (side: number, extra: number) => ({
    position: 'absolute' as const, top: H * 0.06 - extra / 2, width: A + extra, height: A + extra, borderRadius: (A + extra) / 2,
    borderWidth: 2.2, borderColor: 'transparent', [side < 0 ? 'borderLeftColor' : 'borderRightColor']: color,
    [side < 0 ? 'left' : 'right']: -A * 0.28 - extra / 2,
  });
  return (
    <View style={{ width: W, height: H }} pointerEvents="none">
      <Animated.View style={[ring(-1, 0), l1]} />
      <Animated.View style={[ring(-1, A * 0.5), l2]} />
      <Animated.View style={[ring(1, 0), r1]} />
      <Animated.View style={[ring(1, A * 0.5), r2]} />
      <Animated.View style={[{ width: W, height: H, overflow: 'hidden' }, sway]}>
        <Animated.Image source={ART.handWave} fadeDuration={0} style={[{ width: W * WAVE.cols, height: H * Math.ceil(WAVE.n / WAVE.cols) }, sprite]} />
      </Animated.View>
    </View>
  );
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
          <Animated.View entering={SlideInDown.duration(320).easing(EASE_OUT)} exiting={SlideOutDown.duration(180)}
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
                      {th.gradient ? <LinearGradient colors={th.gradient} style={StyleSheet.absoluteFill} /> : null}
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
  title: { fontSize: 20, fontWeight: '800', letterSpacing: 0.35 },
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
