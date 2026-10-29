// Mzinga: clips laid out as a honeycomb you drag around freely (Apple Watch home screen feel).
// The most-buzzing clip sits in the centre and the hive grows outward ring by ring, so "what is
// hot" is a place, not a position in an endless list. Cells near the edge shrink (fisheye), the
// one in the middle quietly plays, and tapping any cell grows it into the full-screen player.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDecay, withSpring, withTiming, cancelAnimation,
  useAnimatedReaction, runOnJS, Easing, FadeIn, FadeOut, SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClipStore, clipVideo } from '../../stores/clipStore';
import type { Post } from '../../stores/socialStore';
import { useVideoThumb } from '../social/media';
import { UserAvatar } from '../social/UserAvatar';
import { NoiseOverlay } from '../social/NoiseOverlay';
import { setFeedPaused } from '../social/videoPlayback';
import { ClipPlayer } from './ClipPlayer';
import { ClipComposer } from './ClipComposer';

export const HONEY = '#F2B544';
const D = 92;           // cell size in the middle
const STEP = D + 12;    // centre-to-centre distance
const MAX_CELLS = 61;   // 4 full rings around the centre

// ── Layout: hexagonal spiral, centre first ──
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
type Cell = { x: number; y: number; ring: number };
export function spiral(n: number): Cell[] {
  const out: Cell[] = [{ x: 0, y: 0, ring: 0 }];
  for (let k = 1; out.length < n; k++) {
    let q = -k, r = k;
    for (let i = 0; i < 6 && out.length < n; i++) {
      for (let j = 0; j < k && out.length < n; j++) {
        out.push({ x: STEP * (q + r / 2), y: STEP * (Math.sqrt(3) / 2) * r, ring: k });
        q += DIRS[i][0]; r += DIRS[i][1];
      }
    }
  }
  return out;
}

/** Size of a cell from how far it is from the middle of the hive (0..1 of the half-size). */
function fisheye(dx: number, dy: number, halfW: number, halfH: number) {
  'worklet';
  const nx = dx / halfW, ny = dy / halfH;
  const d = Math.sqrt(nx * nx + ny * ny);
  if (d < 0.3) return 1;
  return Math.max(0.22, 1 - (d - 0.3) * 1.05);
}

const backOut = (t: number) => {
  'worklet';
  const c1 = 1.5, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function MzingaHost() {
  const hiveOpen = useClipStore(s => s.hiveOpen);
  const player = useClipStore(s => s.player);
  const composerOpen = useClipStore(s => s.composerOpen);
  // Feed videos stay quiet while the hive or a clip is open
  useEffect(() => {
    setFeedPaused('mzinga', hiveOpen || !!player || composerOpen);
  }, [hiveOpen, player, composerOpen]);
  return (
    <>
      {hiveOpen && <MzingaHive />}
      {player && !hiveOpen && <ClipPlayer standalone />}
      {/* Over the hive the composer is rendered inside the hive's Modal (iOS can't present two sibling Modals) */}
      {composerOpen && !hiveOpen && <ClipComposer />}
    </>
  );
}

function MzingaHive() {
  const insets = useSafeAreaInsets();
  const { width: W, height: winH } = useWindowDimensions();
  const [H, setH] = useState(winH);
  const clips = useClipStore(s => s.clips);
  const loaded = useClipStore(s => s.loaded);
  const seen = useClipStore(s => s.seen);
  const player = useClipStore(s => s.player);
  const composerOpen = useClipStore(s => s.composerOpen);
  const { closeHive, play, openComposer } = useClipStore.getState();

  const items = useMemo(() => clips.slice(0, MAX_CELLS), [clips]);
  const cells = useMemo(() => spiral(Math.max(1, items.length)), [items.length]);
  const maxRing = cells[cells.length - 1]?.ring ?? 0;

  // Hive area: between the header and the bottom card
  const top = insets.top + 64;
  const bottom = insets.bottom + 132;
  const cx = W / 2;
  const cy = top + (H - top - bottom) / 2;
  const halfW = W / 2;
  const halfH = (H - top - bottom) / 2 + 40;

  const bound = useMemo(() => {
    let mx = 0, my = 0;
    cells.forEach(c => { mx = Math.max(mx, Math.abs(c.x)); my = Math.max(my, Math.abs(c.y)); });
    return { x: mx, y: my };
  }, [cells]);
  const pts = useMemo(() => cells.map(c => [c.x, c.y]), [cells]);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const intro = useSharedValue(0);
  const fade = useSharedValue(0);

  // Cells pop in ring by ring: on open, and again when the first clips arrive
  const hasItems = items.length > 0;
  useEffect(() => {
    fade.value = withTiming(1, { duration: 220 });
    intro.value = 0;
    intro.value = withTiming(Math.max(maxRing, 2) + 1.6, { duration: 380 + Math.max(maxRing, 2) * 150, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasItems]);

  const [focus, setFocus] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  // Only start the live preview once the hive has settled on a cell
  useEffect(() => {
    setPreview(null);
    const t = setTimeout(() => setPreview(focus), 420);
    return () => clearTimeout(t);
  }, [focus]);

  // The list shrank under the focused cell (e.g. a refresh): go back to the centre
  useEffect(() => {
    if (focus < Math.max(1, items.length)) return;
    tx.value = withSpring(0, { damping: 18, stiffness: 140 });
    ty.value = withSpring(0, { damping: 18, stiffness: 140 });
    setFocus(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const onFocus = (i: number) => {
    setFocus(i);
    Haptics.selectionAsync().catch(() => {});
  };

  useAnimatedReaction(
    () => {
      let best = 0, bd = 1e9;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i][0] + tx.value, dy = pts[i][1] + ty.value;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },
    (cur, prev) => { if (prev !== null && cur !== prev) runOnJS(onFocus)(cur); },
    [pts],
  );

  // Snap the nearest cell to the middle once a fling slows down
  const snap = () => {
    'worklet';
    let best = 0, bd = 1e9;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i][0] + tx.value, dy = pts[i][1] + ty.value;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    tx.value = withSpring(-pts[best][0], { damping: 18, stiffness: 140 });
    ty.value = withSpring(-pts[best][1], { damping: 18, stiffness: 140 });
  };

  const openAt = (i: number) => {
    const c = cells[i];
    const scale = fisheye(c.x + tx.value, c.y + ty.value, halfW, halfH);
    const size = D * scale;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    play(i, { x: cx + c.x + tx.value - size / 2, y: cy + c.y + ty.value - size / 2, width: size, height: size });
  };

  const onTap = (x: number, y: number) => {
    let hit = -1, bd = 1e9;
    cells.forEach((c, i) => {
      const px = cx + c.x + tx.value, py = cy + c.y + ty.value;
      const r = (D * fisheye(c.x + tx.value, c.y + ty.value, halfW, halfH)) / 2 + 4;
      const d = Math.hypot(x - px, y - py);
      if (d < r && d < bd) { bd = d; hit = i; }
    });
    if (hit < 0) return;
    if (!items.length) { openComposer(); return; }
    openAt(hit);
  };

  const pan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      cancelAnimation(tx); cancelAnimation(ty);
      sx.value = tx.value; sy.value = ty.value;
    })
    .onUpdate(e => {
      const rub = (v: number, lim: number) => {
        'worklet';
        if (v > lim) return lim + (v - lim) * 0.35;
        if (v < -lim) return -lim + (v + lim) * 0.35;
        return v;
      };
      tx.value = rub(sx.value + e.translationX, bound.x);
      ty.value = rub(sy.value + e.translationY, bound.y);
    })
    .onEnd(e => {
      // snap when the faster axis comes to rest
      const xMain = Math.abs(e.velocityX) >= Math.abs(e.velocityY);
      const after = (fin?: boolean) => { 'worklet'; if (fin) snap(); };
      tx.value = withDecay({ velocity: e.velocityX, clamp: [-bound.x, bound.x], rubberBandEffect: true, deceleration: 0.994 }, xMain ? after : undefined);
      ty.value = withDecay({ velocity: e.velocityY, clamp: [-bound.y, bound.y], rubberBandEffect: true, deceleration: 0.994 }, xMain ? undefined : after);
    });
  // x/y are local to the full-screen hive view, the same space as cx/cy
  const tap = Gesture.Tap().maxDuration(260).onEnd((e, ok) => { if (ok) runOnJS(onTap)(e.x, e.y); });
  const gesture = Gesture.Exclusive(pan, tap);

  const close = () => {
    fade.value = withTiming(0, { duration: 160 }, fin => { if (fin) runOnJS(closeHive)(); });
  };

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const fc = items[focus];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => (player ? useClipStore.getState().closePlayer() : close())}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, rootStyle]} onLayout={e => setH(e.nativeEvent.layout.height)}>
          {/* Warm dark, a little honey light in the middle, painted grain on top */}
          <LinearGradient colors={['#0A0907', '#15110A', '#0A0907']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[styles.glow, { left: cx - 220, top: cy - 220 }]} />
          <NoiseOverlay opacity={0.06} />

          <GestureDetector gesture={gesture}>
            <View style={StyleSheet.absoluteFill}>
              {items.length ? items.map((p, i) => (
                <HiveCell
                  key={p.id}
                  post={p}
                  cell={cells[i]}
                  cx={cx} cy={cy} halfW={halfW} halfH={halfH}
                  tx={tx} ty={ty} intro={intro}
                  seen={!!seen[p.id]}
                  live={preview === i && !player && !composerOpen}
                />
              )) : loaded ? (
                <EmptyCell cx={cx} cy={cy} />
              ) : (
                spiral(19).map((c, i) => <GhostCell key={i} cell={c} cx={cx} cy={cy} halfW={halfW} halfH={halfH} intro={intro} />)
              )}
            </View>
          </GestureDetector>

          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
            <Pressable onPress={close} style={styles.round} hitSlop={8} accessibilityLabel="Close Mzinga">
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </Pressable>
            <View style={{ alignItems: 'center' }} pointerEvents="none">
              <Text style={styles.title}>Mzinga</Text>
              <Text style={styles.sub}>What's buzzing, from the centre out</Text>
            </View>
            <Pressable onPress={openComposer} style={[styles.round, { backgroundColor: HONEY }]} hitSlop={8} accessibilityLabel="Post a clip">
              <Ionicons name="add" size={24} color="#1A1206" />
            </Pressable>
          </View>

          {/* What's in the middle right now */}
          <View style={[styles.card, { bottom: insets.bottom + 22 }]} pointerEvents="box-none">
            {fc ? (
              <Animated.View key={fc.id} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                <Pressable onPress={() => openAt(focus)} style={styles.cardInner} accessibilityRole="button" accessibilityLabel={`Watch clip by ${fc.profiles?.username}`}>
                  <UserAvatar avatarUrl={fc.profiles?.avatar_url} name={fc.profiles?.full_name || fc.profiles?.username} size={36} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardName} numberOfLines={1}>@{fc.profiles?.username}</Text>
                    <Text style={styles.cardText} numberOfLines={1}>{fc.content?.trim() || 'Tap to watch'}</Text>
                  </View>
                  <View style={styles.playPill}>
                    <Ionicons name="play" size={13} color="#1A1206" />
                    <Text style={styles.playText}>{dur(clipVideo(fc)?.duration_seconds)}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            ) : loaded ? (
              <Text style={styles.hint}>Tap + to put the first clip in the hive</Text>
            ) : null}
            {items.length > 1 && <Text style={styles.hint}>Drag to explore · tap a cell to watch</Text>}
          </View>

          {player && <ClipPlayer />}
          {composerOpen && <ClipComposer />}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export const dur = (s?: number | null) => {
  if (!s || !isFinite(s)) return 'Watch';
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

function useCellStyle(cell: Cell, cx: number, cy: number, halfW: number, halfH: number, tx: SharedValue<number>, ty: SharedValue<number>, intro: SharedValue<number>) {
  return useAnimatedStyle(() => {
    const dx = cell.x + tx.value, dy = cell.y + ty.value;
    const s = fisheye(dx, dy, halfW, halfH);
    const t = Math.min(1, Math.max(0, intro.value - cell.ring * 0.55));
    const pop = t === 0 ? 0 : backOut(t);
    return {
      opacity: Math.min(1, t * 2) * (0.35 + 0.65 * s),
      transform: [{ translateX: cx + dx - D / 2 }, { translateY: cy + dy - D / 2 }, { scale: s * pop }],
    };
  });
}

const HiveCell = React.memo(function HiveCell({ post, cell, cx, cy, halfW, halfH, tx, ty, intro, seen, live }: {
  post: Post; cell: Cell; cx: number; cy: number; halfW: number; halfH: number;
  tx: SharedValue<number>; ty: SharedValue<number>; intro: SharedValue<number>; seen: boolean; live: boolean;
}) {
  const v = clipVideo(post);
  const thumb = useVideoThumb(v?.url, v?.thumbnail_url);
  const style = useCellStyle(cell, cx, cy, halfW, halfH, tx, ty, intro);
  return (
    <Animated.View style={[styles.cell, style, { borderColor: seen ? 'rgba(255,255,255,0.14)' : HONEY }]} pointerEvents="none">
      <View style={styles.cellInner}>
        {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} /> : v?.placeholder ? <Image source={{ uri: v.placeholder }} style={StyleSheet.absoluteFill} blurRadius={8} /> : null}
        {live && v?.url ? <LivePreview url={v.url} /> : null}
      </View>
    </Animated.View>
  );
});

/** Muted loop of the clip in the middle cell, fading in over its cover. */
function LivePreview({ url }: { url: string }) {
  const o = useSharedValue(0);
  const player = useVideoPlayer(url, p => { p.loop = true; p.muted = true; p.play(); });
  useEffect(() => {
    const show = () => { o.value = withTiming(1, { duration: 260 }); };
    // it may already be ready (cached) before this listener is attached
    if (player.status === 'readyToPlay') show();
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') show();
    });
    return () => sub.remove();
  }, [player, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
    </Animated.View>
  );
}

function GhostCell({ cell, cx, cy, halfW, halfH, intro }: { cell: Cell; cx: number; cy: number; halfW: number; halfH: number; intro: SharedValue<number> }) {
  const zero = useSharedValue(0);
  const style = useCellStyle(cell, cx, cy, halfW, halfH, zero, zero, intro);
  return <Animated.View style={[styles.cell, style, styles.ghost]} pointerEvents="none" />;
}

function EmptyCell({ cx, cy }: { cx: number; cy: number }) {
  return (
    <View style={[styles.cell, styles.emptyCell, { transform: [{ translateX: cx - D / 2 }, { translateY: cy - D / 2 }] }]} pointerEvents="none">
      <Ionicons name="add" size={34} color={HONEY} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', width: 440, height: 440, borderRadius: 220, backgroundColor: 'rgba(242,181,68,0.07)' },
  header: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 },

  cell: { position: 'absolute', left: 0, top: 0, width: D, height: D, borderRadius: D / 2, borderWidth: 2.5, padding: 3 },
  cellInner: { flex: 1, borderRadius: D / 2, overflow: 'hidden', backgroundColor: '#1F1A12' },
  ghost: { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.05)' },
  emptyCell: { borderColor: HONEY, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  card: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 10 },
  cardInner: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', minWidth: 300,
    backgroundColor: 'rgba(30,26,18,0.92)', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
  },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardText: { color: 'rgba(255,255,255,0.65)', fontSize: 13.5, marginTop: 1 },
  playPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: HONEY, borderRadius: 14, paddingHorizontal: 10, height: 28 },
  playText: { color: '#1A1206', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { color: 'rgba(255,255,255,0.42)', fontSize: 12.5 },
});
