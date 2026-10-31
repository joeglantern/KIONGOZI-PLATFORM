// Composer media previews: shows picked photos/videos at their real shape before posting.
// 1 item  -> full-width preview at its own aspect ratio (clamped 4:5 … 1.91:1, never cropped).
// 2+ items -> snapping carousel of equal-height tiles with a "1/3" counter.
import { EASE_OUT } from '../../theme/motion';
import React, { useMemo, useState } from 'react';
import {
  View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export type ComposerMediaItem = {
  id: string;
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  thumbnailUri?: string;
  /** Correctly-oriented ratio for previews (video thumbnails), falls back to width/height. */
  previewRatio?: number;
  durationMs?: number;
};

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;
const TILE_H = 220;
const GAP = 8;
const SIDE = 16;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const ratioOf = (m: ComposerMediaItem): number | undefined => {
  if (m.previewRatio && isFinite(m.previewRatio)) return m.previewRatio;
  if (m.width && m.height) return m.width / m.height;
  return undefined;
};

const fmtDuration = (ms?: number) => {
  if (!ms || ms <= 0) return null;
  const t = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function ComposerMedia({
  items, width, onRemove, status, locked,
}: {
  items: ComposerMediaItem[];
  /** Available content width (screen width minus side padding). */
  width: number;
  onRemove: (id: string) => void;
  status: Record<string, UploadStatus | undefined>;
  /** True while posting: removal and playback disabled. */
  locked?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const { height: winH } = useWindowDimensions();
  // Carousel tiles: 220 tall, but on a 568pt screen (keyboard up) cap at ~36% of the window
  const tileH = Math.round(Math.min(TILE_H, Math.max(160, winH * 0.36)));

  const tiles = useMemo(() => {
    if (items.length <= 1) return [];
    const maxW = Math.max(140, width * 0.82);
    return items.map(m => {
      const r = ratioOf(m) ?? 1;
      const tileRatio = clamp(r, MIN_RATIO, MAX_RATIO);
      const w = Math.round(Math.min(tileH * tileRatio, maxW));
      return { w, letterbox: Math.abs(w / tileH - r) > 0.03 || !ratioOf(m) };
    });
  }, [items, width, tileH]);

  const offsets = useMemo(() => {
    const out: number[] = [];
    let x = 0;
    for (const t of tiles) { out.push(x); x += t.w + GAP; }
    return out;
  }, [tiles]);

  if (items.length === 0) return null;

  if (items.length === 1) {
    const m = items[0];
    const r = ratioOf(m);
    const boxRatio = clamp(r ?? 1, MIN_RATIO, MAX_RATIO);
    // A 4:5 photo at 288pt wide is 360pt tall: more than half of a 568pt screen. Cap the preview
    // at 60% of the window height and letterbox (blurred fill) instead of growing further.
    const maxH = Math.round(winH * 0.6);
    const h = Math.min(Math.round(width / boxRatio), maxH);
    const letterbox = !r || Math.abs(boxRatio - r) > 0.01 || h === maxH;
    return (
      <View style={styles.single}>
        <MediaTile
          key={m.id}
          item={m}
          w={width}
          h={h}
          radius={18}
          letterbox={letterbox}
          onRemove={onRemove}
          status={status[m.id]}
          locked={locked}
        />
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    let i = 0;
    for (let k = 0; k < offsets.length; k++) if (offsets[k] <= x + 12) i = k;
    // At the far end the last tile may never reach its snap offset.
    const { layoutMeasurement, contentSize } = e.nativeEvent;
    if (x + layoutMeasurement.width >= contentSize.width - 4) i = offsets.length - 1;
    if (i !== index) setIndex(i);
  };

  return (
    <View style={styles.carouselWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        decelerationRate="fast"
        snapToOffsets={offsets}
        snapToEnd={false}
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.carouselRow}
      >
        {items.map((m, i) => (
          <MediaTile
            key={m.id}
            item={m}
            w={tiles[i]?.w ?? tileH}
            h={tileH}
            radius={16}
            letterbox={tiles[i]?.letterbox ?? true}
            onRemove={onRemove}
            status={status[m.id]}
            locked={locked}
          />
        ))}
      </ScrollView>
      <Animated.View entering={FadeIn.duration(200)} style={styles.counter} pointerEvents="none">
        <Text style={styles.counterText} maxFontSizeMultiplier={1.2}>{Math.min(index, items.length - 1) + 1}/{items.length}</Text>
      </Animated.View>
    </View>
  );
}

function MediaTile({
  item, w, h, radius, letterbox, onRemove, status, locked,
}: {
  item: ComposerMediaItem;
  w: number;
  h: number;
  radius: number;
  letterbox: boolean;
  onRemove: (id: string) => void;
  status?: UploadStatus;
  locked?: boolean;
}) {
  const T = useTheme();
  const [playing, setPlaying] = useState(false);
  const isVideo = item.type === 'video';
  const src = isVideo ? item.thumbnailUri : item.uri;
  const duration = isVideo ? fmtDuration(item.durationMs) : null;
  const showPlayer = isVideo && playing && !locked;

  return (
    <Animated.View
      entering={FadeIn.duration(240).easing(EASE_OUT)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(240)}
      style={[
        styles.tile,
        { width: w, height: h, borderRadius: radius, backgroundColor: T.surface2, borderColor: T.border },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        disabled={!isVideo || locked}
        onPress={() => setPlaying(p => !p)}
        accessibilityRole={isVideo ? 'button' : 'image'}
        accessibilityLabel={isVideo ? (playing ? 'Stop preview' : 'Play preview') : 'Selected photo'}
      >
        {src ? (
          letterbox ? (
            <>
              <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={24} />
              <View style={[StyleSheet.absoluteFill, styles.dim]} />
              <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            </>
          ) : (
            <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )
        ) : (
          <View style={styles.center}>
            <Ionicons name={isVideo ? 'videocam' : 'image'} size={28} color={T.textMuted} />
          </View>
        )}

        {showPlayer ? <InlineVideo uri={item.uri} fit={letterbox ? 'contain' : 'cover'} /> : null}

        {isVideo && (
          <View style={styles.videoMeta} pointerEvents="none">
            <View style={styles.playBadge}>
              <Ionicons name={showPlayer ? 'pause' : 'play'} size={14} color="#fff" style={showPlayer ? undefined : { marginLeft: 2 }} />
            </View>
            {duration ? (
              <View style={styles.durationPill}>
                <Text style={styles.durationText} maxFontSizeMultiplier={1.2}>{duration}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Pressable>

      {status && status !== 'done' && status !== 'error' ? (
        <Animated.View entering={FadeIn.duration(150)} style={[StyleSheet.absoluteFill, styles.uploadOverlay]} pointerEvents="none">
          {status === 'uploading' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.85)" />
          )}
        </Animated.View>
      ) : null}
      {status === 'done' ? (
        <Animated.View entering={FadeIn.duration(180).easing(EASE_OUT)} style={styles.statusDot} pointerEvents="none">
          <Ionicons name="checkmark" size={14} color="#000" />
        </Animated.View>
      ) : null}
      {status === 'error' ? (
        <Animated.View entering={FadeIn.duration(180).easing(EASE_OUT)} style={[styles.statusDot, { backgroundColor: T.error }]} pointerEvents="none">
          <Ionicons name="alert" size={14} color="#fff" />
        </Animated.View>
      ) : null}

      {!locked && (
        <Pressable
          onPress={() => onRemove(item.id)}
          style={styles.removeHit}
          accessibilityRole="button"
          accessibilityLabel={isVideo ? 'Remove video' : 'Remove photo'}
        >
          {({ pressed }) => (
            <View style={[styles.removeBadge, pressed && { transform: [{ scale: 0.88 }], opacity: 0.8 }]}>
              <Ionicons name="close" size={16} color="#fff" />
            </View>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

function InlineVideo({ uri, fit }: { uri: string; fit: 'contain' | 'cover' }) {
  const player = useVideoPlayer(uri, p => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  return (
    <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill} pointerEvents="none">
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={fit} nativeControls={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  single: { marginTop: 12 },
  carouselWrap: { marginTop: 12, marginHorizontal: -SIDE },
  carouselRow: { gap: GAP, paddingHorizontal: SIDE },
  tile: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(0,0,0,0.18)' },
  videoMeta: {
    position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  playBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  durationPill: {
    height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
  },
  durationText: { color: '#fff', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  uploadOverlay: { backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  statusDot: {
    position: 'absolute', left: 10, top: 10, width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#5CB85C', alignItems: 'center', justifyContent: 'center',
  },
  removeHit: {
    position: 'absolute', top: 0, right: 0, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)',
  },
  counter: {
    position: 'absolute', bottom: 10, right: SIDE + 10, height: 22, paddingHorizontal: 8, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center',
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
