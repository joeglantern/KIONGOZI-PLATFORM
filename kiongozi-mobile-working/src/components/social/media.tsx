// Shared media building blocks: real aspect ratios (no hard crops), a blurred backdrop when a
// photo is taller/wider than its frame allows, fade-in on load, and real video preview frames.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

// ── Aspect ratio of a remote image, cached for the session ──
const ratioCache = new Map<string, number>();
export function useImageRatio(url?: string | null, hint?: number | null) {
  const [ratio, setRatio] = useState<number | null>(() => (url && ratioCache.get(url)) || (hint && hint > 0 ? hint : null));
  useEffect(() => {
    if (!url) return;
    const cached = ratioCache.get(url);
    if (cached) { setRatio(cached); return; }
    let live = true;
    Image.getSize(url, (w, h) => {
      if (w > 0 && h > 0) { ratioCache.set(url, w / h); if (live) setRatio(w / h); }
    }, () => {});
    return () => { live = false; };
  }, [url]);
  return ratio;
}

// ── Video preview frame: stored thumbnail, else one generated on the device (cached) ──
const thumbCache = new Map<string, string>();
const thumbInflight = new Map<string, Promise<string | null>>();
export function useVideoThumb(url?: string | null, stored?: string | null) {
  const [thumb, setThumb] = useState<string | null>(stored || (url ? thumbCache.get(url) || null : null));
  useEffect(() => {
    if (stored || !url) return;
    const cached = thumbCache.get(url);
    if (cached) { setThumb(cached); return; }
    let live = true;
    if (!thumbInflight.has(url)) {
      thumbInflight.set(url, VideoThumbnails.getThumbnailAsync(url, { time: 500, quality: 0.6 })
        .then(t => { thumbCache.set(url, t.uri); return t.uri; })
        .catch(() => null)
        .finally(() => { thumbInflight.delete(url); }));
    }
    thumbInflight.get(url)?.then(u => { if (live && u) setThumb(u); });
    return () => { live = false; };
  }, [url, stored]);
  return thumb;
}

/** Image that fades in once loaded. */
export function FadeImage({ uri, style, contentFit = 'cover', blur }: {
  uri: string; style?: any; contentFit?: 'cover' | 'contain'; blur?: number;
}) {
  const o = useRef(new Animated.Value(0)).current;
  return (
    <Animated.Image
      source={{ uri, cache: 'force-cache' }}
      style={[style, { opacity: o }]}
      resizeMode={contentFit}
      blurRadius={blur}
      onLoad={() => Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: true }).start()}
    />
  );
}

/**
 * A photo shown at its real shape. If it is taller/wider than [minRatio, maxRatio], the frame is
 * clamped and the WHOLE photo is shown (contain) over a blurred copy of itself — nothing cut off.
 */
export function FitImage({
  uri, ratio, minRatio = 0.75, maxRatio = 1.91, width, radius = 12, onPress, style, bg, placeholder,
}: {
  uri: string; ratio?: number | null; minRatio?: number; maxRatio?: number;
  width?: number; radius?: number; onPress?: () => void; style?: StyleProp<ViewStyle>; bg: string;
  /** ~1KB blurred preview from the server, shown instantly while the photo loads */
  placeholder?: string | null;
}) {
  const measured = useImageRatio(uri, ratio);
  const r = measured || 1.33;
  const frame = Math.min(Math.max(r, minRatio), maxRatio);
  const clamped = Math.abs(frame - r) > 0.02;
  const body = (
    <View style={[{ width: width ?? '100%', aspectRatio: frame, borderRadius: radius, overflow: 'hidden', backgroundColor: bg }, style]}>
      {placeholder ? <Image source={{ uri: placeholder }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={6} /> : null}
      {clamped && <FadeImage uri={uri} style={StyleSheet.absoluteFill} contentFit="cover" blur={24} />}
      {clamped && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />}
      <FadeImage uri={uri} style={StyleSheet.absoluteFill} contentFit={clamped ? 'contain' : 'cover'} />
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.92 }} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
      {body}
    </Pressable>
  );
}

/** Video preview tile with a real frame and a play badge. */
export function VideoTile({ url, thumbnail, style, onPress, bg, iconSize = 22 }: {
  url: string; thumbnail?: string | null; style?: StyleProp<ViewStyle>; onPress?: () => void; bg: string; iconSize?: number;
}) {
  const thumb = useVideoThumb(url, thumbnail);
  return (
    <Pressable onPress={onPress} style={[{ overflow: 'hidden', backgroundColor: bg }, style]} accessibilityRole="button" accessibilityLabel="Play video">
      {thumb ? <FadeImage uri={thumb} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: iconSize * 2.2, height: iconSize * 2.2, borderRadius: iconSize * 1.1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play" size={iconSize} color="#fff" style={{ marginLeft: iconSize * 0.12 }} />
        </View>
      </View>
    </Pressable>
  );
}
