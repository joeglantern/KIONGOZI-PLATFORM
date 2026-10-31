// "Your week": a Spotify Wrapped style story. Full-screen, segmented bars filling on the UI thread, tap right to go on,
// tap left to go back, hold to pause, swipe down to close. Only the current slide and the next one are mounted;
// the intro and persona slides play a looping 3D video behind them.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StatusBar, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, cancelAnimation, runOnJS, Easing, interpolate, interpolateColor,
  Extrapolation, FadeOut, useReducedMotion,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WeekStats, SlideId, SLIDE_BG, SLIDE_MS, LIGHT, INK, WHITE, VIDEO, visibleSlides, rangeLabel } from './wrappedData';
import { LoopVideo } from './motion';
import { Grain, PAPER } from './paper';
import { Image } from 'react-native';
import { SlideContent, Layout, Me } from './slides';

export type ShareProps = {
  busy: null | 'story' | 'post' | 'more';
  done: string | null;
  toStory: () => void;
  toMore: () => void;
  toPost: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  stats: WeekStats | null;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  me: Me;
  share: ShareProps;
  onOpenPost: (postId: string) => void;
  onThanks: () => void;
  thanking: boolean;
};

export function WrappedStory(props: Props) {
  const { visible, onClose } = props;
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar hidden animated />
        {visible && <StoryBody {...props} />}
      </GestureHandlerRootView>
    </Modal>
  );
}

const VIDEO_SLIDES: Partial<Record<SlideId, { src: any; poster: any }>> = {
  intro: { src: VIDEO.intro, poster: VIDEO.introPoster },
  persona: { src: VIDEO.persona, poster: VIDEO.personaPoster },
};

function StoryBody({ onClose, stats, status, onRetry, me, share, onOpenPost, onThanks, thanking }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const L: Layout = useMemo(() => {
    const k = Math.min(W / 390, (H / 844) * 1.04);
    return { W, H, k, y: (v: number) => (v / 844) * H, top: insets.top, bottom: insets.bottom };
  }, [W, H, insets.top, insets.bottom]);

  const slides = useMemo(() => visibleSlides(status === 'ready' ? stats : null), [stats, status]);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [shown, setShown] = useState(0); // bumps each time a slide shows, so its entrance replays
  const [held, setHeld] = useState(false);
  const cur = slides[Math.min(idx, slides.length - 1)];
  const ready = status === 'ready';
  const busy = !!share.busy || thanking;
  const paused = held || busy;

  const firstName = useMemo(() => {
    const n = (me?.full_name || '').trim().split(/\s+/)[0];
    return n || me?.username || '';
  }, [me?.full_name, me?.username]);

  // ── progress: one shared value for the current bar, animated on the UI thread ──
  const p = useSharedValue(0);
  const advanceRef = useRef<() => void>(() => {});
  const onBarEnd = useCallback(() => advanceRef.current(), []);
  const runBar = useCallback((from: number) => {
    const ms = SLIDE_MS[cur] || 6000;
    p.value = from;
    p.value = withTiming(1, { duration: Math.max(60, ms * (1 - from)), easing: Easing.linear }, done => {
      if (done) runOnJS(onBarEnd)();
    });
  }, [cur]);

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (!ready) return;
    if (!paused) runBar(0);
  }, [idx, ready, shown]);

  // pause and resume from where the bar is
  const pausedRef = useRef(paused);
  useEffect(() => {
    if (pausedRef.current === paused) return;
    pausedRef.current = paused;
    if (!ready) return;
    if (paused) cancelAnimation(p);
    else if (p.value < 1) runBar(p.value);
  }, [paused]);

  // ── moving between slides ──
  const go = useCallback((to: number) => {
    if (to < 0) { setShown(n => n + 1); return; } // first slide: start it again
    if (to >= slides.length) { onClose(); return; }
    Haptics.selectionAsync().catch(() => {});
    setDir(to > idx ? 1 : -1);
    setIdx(to);
    setShown(n => n + 1);
  }, [idx, slides.length, onClose]);
  const next = useCallback(() => { if (ready) go(idx + 1); }, [go, idx, ready]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);
  // The summary waits for you; every other bar moves on when it fills
  advanceRef.current = () => { if (cur !== 'summary' && !pausedRef.current) next(); };

  // ── background colour cross-fade ──
  const bgFrom = useSharedValue(SLIDE_BG[cur]);
  const bgTo = useSharedValue(SLIDE_BG[cur]);
  const bgT = useSharedValue(1);
  useEffect(() => {
    if (bgTo.value === SLIDE_BG[cur]) return;
    bgFrom.value = bgTo.value;
    bgTo.value = SLIDE_BG[cur];
    bgT.value = 0;
    bgT.value = withTiming(1, { duration: reduce ? 250 : 520, easing: Easing.inOut(Easing.quad) });
  }, [cur]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(bgT.value, [0, 1], [bgFrom.value, bgTo.value]) }));

  // ── gestures: tap zones, hold to pause, swipe down to close ──
  const drag = useSharedValue(0);
  const chrome = useSharedValue(1);
  const hold = (on: boolean) => {
    setHeld(on);
    chrome.value = withTiming(on ? 0 : 1, { duration: 180 });
  };
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const finishClose = useCallback(() => closeRef.current(), []);
  const onTap = (x: number) => { if (busy) return; if (x < W * 0.35) prev(); else next(); };

  const tap = Gesture.Tap().maxDistance(14).onEnd((e, ok) => { if (ok) runOnJS(onTap)(e.x); });
  const longPress = Gesture.LongPress().minDuration(220).maxDistance(24)
    .onStart(() => { runOnJS(hold)(true); })
    .onFinalize((_e, ok) => { if (ok) runOnJS(hold)(false); });
  const pan = Gesture.Pan().maxPointers(1).activeOffsetY(14).failOffsetX([-24, 24])
    .onStart(() => { runOnJS(hold)(true); })
    .onUpdate(e => { drag.value = Math.max(0, e.translationY); })
    .onEnd(e => {
      if (e.translationY > 120 || e.velocityY > 800) {
        drag.value = withTiming(H, { duration: 220, easing: Easing.out(Easing.quad) }, done => { if (done) runOnJS(finishClose)(); });
      } else {
        drag.value = withSpring(0, { damping: 22, stiffness: 240, velocity: e.velocityY });
        runOnJS(hold)(false);
      }
    });
  const gesture = Gesture.Simultaneous(pan, Gesture.Exclusive(longPress, tap));

  const stageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: drag.value },
      { scale: interpolate(drag.value, [0, H], [1, 0.8], Extrapolation.CLAMP) },
    ],
    borderRadius: interpolate(drag.value, [0, 80], [0, 28], Extrapolation.CLAMP),
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(drag.value, [0, 320], [1, 0.15], Extrapolation.CLAMP) }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value }));

  const light = !!LIGHT[cur];
  const fg = light ? INK : WHITE;
  const mounted = slides.slice(idx, idx + 2);

  const slideProps = { s: stats, L, reduce, dir, me, firstName, status, onRetry, onOpenPost, onThanks, thanking, share };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]}>
      <Animated.View style={[styles.stage, bgStyle, stageStyle]}>
        {/* the new slide's paper is pushed in over the last one with a torn top edge */}
        <TearWipe key={`w-${cur}-${shown}`} color={SLIDE_BG[cur]} dir={dir} H={H} W={W} reduce={reduce} first={shown === 0} />
        {/* video backgrounds for this slide and the next (warmed up, still hidden) */}
        {mounted.map(id => {
          const v = VIDEO_SLIDES[id];
          // the paper videos are made at 9:19.5 with plain paper padding, so "cover" never crops the art
          const box = StyleSheet.absoluteFill;
          return v ? <VideoLayer key={`v-${id}`} src={v.src} poster={v.poster} active={id === cur} playing={id === cur && !paused} box={box} /> : null;
        })}

        <Grain />

        {/* the tap layer sits under the slide, so buttons on the slide still get their own taps */}
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false} />
        </GestureDetector>

        <Animated.View key={`${cur}-${shown}`} style={StyleSheet.absoluteFill} pointerEvents="box-none" exiting={FadeOut.duration(160)}>
          <SlideContent id={cur} {...slideProps} />
        </Animated.View>

        {/* bars, title, date and close */}
        <Animated.View style={[styles.chrome, { top: insets.top + 8 }, chromeStyle]} pointerEvents="box-none">
          <Bars count={slides.length} index={idx} progress={p} light={light} loading={!ready} />
          <View style={styles.headRow} pointerEvents="box-none">
            <Text style={[styles.headText, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>KChat · Your week</Text>
            <View style={styles.headRight} pointerEvents="box-none">
              <Text style={[styles.headText, { color: fg }]} maxFontSizeMultiplier={1.1}>{rangeLabel(stats?.since, stats?.until)}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={fg} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** A sheet of the next slide's paper slides over the old one, torn edge first, in stepped stop-motion frames */
function TearWipe({ color, dir, H, W, reduce, first }: { color: string; dir: number; H: number; W: number; reduce: boolean; first: boolean }) {
  const t = useSharedValue(first || reduce ? 1 : 0);
  useEffect(() => {
    if (first || reduce) return;
    t.value = withTiming(7, { duration: 7 * 48, easing: Easing.linear });
  }, []);
  const edge = 46;
  const st = useAnimatedStyle(() => {
    const k = Math.floor(t.value) / 7;
    const e = 1 - Math.pow(1 - k, 2);
    const off = (1 - e) * (H + edge);
    return { transform: [{ translateY: dir >= 0 ? off : -off }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: dir >= 0 ? -edge : 0, height: H + edge }, st]}>
      {dir >= 0 ? <Image source={PAPER.stripWhite} style={{ width: W + 40, marginLeft: -20, height: edge * 2, marginBottom: -edge, tintColor: color }} resizeMode="stretch" fadeDuration={0} /> : null}
      <View style={{ flex: 1, backgroundColor: color }} />
      {dir < 0 ? <Image source={PAPER.stripWhite} style={{ width: W + 40, marginLeft: -20, height: edge * 2, marginTop: -edge, tintColor: color }} resizeMode="stretch" fadeDuration={0} /> : null}
    </Animated.View>
  );
}

function VideoLayer({ src, poster, active, playing, box }: { src: any; poster: any; active: boolean; playing: boolean; box: any }) {
  const o = useSharedValue(active ? 1 : 0);
  useEffect(() => { o.value = withTiming(active ? 1 : 0, { duration: 420, easing: Easing.out(Easing.quad) }); }, [active]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[box, st]} pointerEvents="none" exiting={FadeOut.duration(220)}>
      <LoopVideo source={src} poster={poster} playing={playing} />
    </Animated.View>
  );
}

/** One bar per slide; past bars full, the current one fills by scaleX from its left edge (never width) */
function Bars({ count, index, progress, light, loading }: { count: number; index: number; progress: any; light: boolean; loading: boolean }) {
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const track = light ? 'rgba(22,19,15,0.22)' : 'rgba(255,255,255,0.3)';
  const color = light ? INK : WHITE;
  return (
    <View style={styles.bars} pointerEvents="none">
      {Array.from({ length: loading ? 1 : count }, (_, i) => (
        <View key={i} style={[styles.bar, { backgroundColor: track }]}>
          {i < index ? <View style={[styles.barFill, { backgroundColor: color }]} />
            : i === index ? <Animated.View style={[styles.barFill, { backgroundColor: color, transformOrigin: 'left center' } as any, fill]} />
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden' },
  chrome: { position: 'absolute', left: 0, right: 0 },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  bar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  barFill: { ...StyleSheet.absoluteFillObject, borderRadius: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, marginTop: 10 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headText: { fontSize: 13, fontWeight: '700', opacity: 0.88 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
