// The painted side of Baraza: the room's backdrop, the talking stick as a real object (it sways
// when idle, glows and throws embers with the speaker's voice, and flies in when it is passed),
// the raised hand, and the theme picker. Art comes from assets/baraza (painted, transparent PNGs).
import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, withDelay,
  Easing, SharedValue, interpolate, Extrapolation, FadeIn, FadeOut, SlideInDown, SlideOutDown,
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

/**
 * The talking stick, held by whoever has the floor. `level` (0..1) is how loud they are right
 * now; `holderKey` changes when it is passed, which plays the fly-in.
 */
export function TalkingStick({ height, level, holderKey, t, late }: {
  height: number; level: SharedValue<number>; holderKey: string | null; t: BarazaTheme; late?: boolean;
}) {
  const w = height * STICK_RATIO;
  const sway = useSharedValue(0);
  const arrive = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [sway]);

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

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + level.value * 0.75,
    transform: [{ scale: 0.75 + level.value * 0.9 + (sway.value - 0.5) * 0.06 }],
  }));

  return (
    <View pointerEvents="none" style={{ width: w * 3, height, alignItems: 'center' }}>
      {/* light around the carved head, which sits near the top of the art */}
      <Animated.Image source={ART.glow} fadeDuration={0}
        style={[{ position: 'absolute', top: -height * 0.18, width: height * 0.75, height: height * 0.75, tintColor: late ? t.danger : t.glow }, glowStyle]} />
      <View style={{ position: 'absolute', top: height * 0.12, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: 8 }, (_, i) => <Ember key={i} i={i} level={level} t={t} />)}
      </View>
      <Animated.Image source={ART.stick} fadeDuration={0} resizeMode="contain" style={[{ width: w, height }, stickStyle]} />
    </View>
  );
}

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
