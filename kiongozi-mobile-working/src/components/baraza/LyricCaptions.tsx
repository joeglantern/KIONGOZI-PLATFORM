// Captions as lyrics: the words are the surface. No box. The line being said now is big and bright,
// the one or two lines already said sit dimmed above it, and a dim "…" below means the next chunk
// is on its way. Each new line slides in from below while the old ones move up and fade.
// MINI sits under the speaker; FULL takes the stage (tap the chip or swipe up).
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, SharedValue, interpolate, Extrapolation,
  LinearTransition, FadeIn, FadeOut, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BarazaTheme } from './barazaTheme';

/** One chunk's words. `words` are [startMs, endMs, word] from the chunk's start (optional). */
export type LyricLine = { seq: number; text: string; durationMs: number; words?: [number, number, string][] };

const enterLine = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 22 }] },
    animations: {
      opacity: withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }),
      transform: [{ translateY: withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }) }],
    },
  };
};

const SIZE = {
  mini: { prev: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const, letterSpacing: -0.1 }, live: { fontSize: 19, lineHeight: 24, fontWeight: '800' as const, letterSpacing: -0.3 }, gap: 4 },
  full: { prev: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.4 }, live: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.6 }, gap: 10 },
};

/** A word that lights up at its moment in the chunk. */
function Word({ word, start, clock, style }: { word: string; start: number; clock: SharedValue<number>; style: any }) {
  const st = useAnimatedStyle(() => ({ opacity: interpolate(clock.value, [start, start + 250], [0.28, 1], Extrapolation.CLAMP) }));
  return <Animated.Text style={[style, st]}>{word} </Animated.Text>;
}

export function LyricCaptions({ lines, liveSeq, startedAt, pending, hint, level, full, onToggle, t, showChip = true }: {
  /** oldest first, the last one is the line being said now */
  lines: LyricLine[];
  /** which chunk is playing now (words are timed against it) */
  liveSeq: number | null;
  /** Date.now() when that chunk started playing; null = no word timing (the speaker's own words) */
  startedAt: number | null;
  /** the next chunk exists but has no words yet */
  pending: boolean;
  /** shown when there are no lines */
  hint: string | null;
  level: SharedValue<number>;
  full: boolean;
  onToggle: () => void;
  t: BarazaTheme;
  showChip?: boolean;
}) {
  const S = full ? SIZE.full : SIZE.mini;
  const live = lines.length ? lines[lines.length - 1] : null;
  const prev = lines.slice(0, -1).slice(full ? -2 : -1);

  // Clock in ms since the live chunk started, for word timing
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!live || startedAt === null || liveSeq !== live.seq) { clock.value = 1e9; return; } // no timing: everything bright
    const elapsed = Math.max(0, Date.now() - startedAt);
    const dur = Math.max(elapsed, live.durationMs || 6000);
    clock.value = elapsed;
    clock.value = withTiming(dur, { duration: dur - elapsed, easing: Easing.linear });
  }, [live?.seq, liveSeq, startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const breath = useAnimatedStyle(() => ({ transform: [{ scale: 1 + level.value * 0.015 }] }));

  const toggle = () => { Haptics.selectionAsync().catch(() => {}); onToggle(); };
  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .onEnd(e => {
      'worklet';
      if ((!full && e.translationY < -40) || (full && e.translationY > 40)) runOnJS(toggle)();
    });

  const liveStyle = [
    styles.line, S.live, { color: t.ink },
    t.dark && { textShadowColor: 'rgba(242,181,68,0.35)', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  ];
  const timed = !!live?.words?.length && startedAt !== null && liveSeq === live?.seq;

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.wrap, full && styles.wrapFull]} accessibilityRole="text" accessibilityLabel={live ? `Captions: ${live.text}` : hint || 'Captions'}>
        <View style={[styles.column, { gap: S.gap }, full && { justifyContent: 'center', flex: 1 }]}>
          {!lines.length ? (
            hint ? (
              <Animated.Text key="hint" entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}
                style={[styles.line, S.live, { color: t.ink, opacity: 0.4, fontWeight: '600' }]}>{hint}</Animated.Text>
            ) : null
          ) : (
            <>
              {/* one keyed wrapper per line, so a line that was live slides up into its dimmed place */}
              {prev.map((l, i) => (
                <Animated.View key={l.seq} layout={LinearTransition.duration(420).easing(Easing.out(Easing.cubic))} exiting={FadeOut.duration(200)}>
                  <Text style={[styles.line, S.prev, { color: t.ink, opacity: prev.length === 2 && i === 0 ? 0.22 : 0.4 }]} numberOfLines={full ? 3 : 1}>
                    {l.text}
                  </Text>
                </Animated.View>
              ))}
              {live ? (
                <Animated.View key={live.seq} entering={enterLine} layout={LinearTransition.duration(420).easing(Easing.out(Easing.cubic))} style={breath}>
                  {timed ? (
                    <View style={styles.words}>
                      {live.words!.map((w, i) => <Word key={`${live.seq}-${i}`} word={w[2]} start={w[0]} clock={clock} style={liveStyle} />)}
                    </View>
                  ) : (
                    <Text style={liveStyle} numberOfLines={full ? 6 : 3}>{live.text}</Text>
                  )}
                </Animated.View>
              ) : null}
              {pending ? (
                <Animated.Text key="pending" entering={FadeIn.duration(300)} exiting={FadeOut.duration(160)}
                  layout={LinearTransition.duration(420)} style={[styles.line, S.live, { color: t.ink, opacity: 0.14 }]}>…</Animated.Text>
              ) : null}
            </>
          )}
        </View>
        {!t.cover ? (
          <>
            <LinearGradient pointerEvents="none" colors={[t.bg, 'transparent']} style={[styles.fade, { top: 0 }]} />
            <LinearGradient pointerEvents="none" colors={['transparent', t.bg]} style={[styles.fade, { bottom: showChip ? 34 : 0 }]} />
          </>
        ) : null}
        {showChip ? (
          <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={full ? 'Back to the room' : 'Open the transcript'}
            style={({ pressed }) => [styles.chip, { backgroundColor: t.soft }, pressed && { transform: [{ scale: 0.95 }] }]}>
            <Text style={[styles.chipText, { color: t.sub }]}>{full ? 'Done' : 'Transcript'}</Text>
            <Ionicons name={full ? 'chevron-up' : 'chevron-down'} size={13} color={t.sub} />
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 6 },
  wrapFull: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  column: { alignItems: 'center', alignSelf: 'stretch', minHeight: 48, justifyContent: 'flex-end' },
  line: { textAlign: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, height: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, paddingLeft: 11, paddingRight: 8, borderRadius: 13, marginTop: 8 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
});
