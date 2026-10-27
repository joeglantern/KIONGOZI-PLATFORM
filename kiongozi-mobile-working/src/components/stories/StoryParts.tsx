// Shared drawing for stories: text-story backgrounds, overlays (stickers/text), the avatar ring.
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryOverlay } from '../../stores/storyStore';
import { STICKERS, PATTERNS, bgById, fontById, fitFontSize, fitLineHeight, textAnchoredTop, TEXT_TOP } from './storyAssets';
import { PollCard, POLL_W } from './PollCard';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

export const POLL_H = 150; // approx. card height at scale 1

export const STICKER_BASE = 150; // sticker width at scale 1, in px on a 390px-wide canvas

/** Background for text stories: gradient + optional kitenge/kanga tile. */
export function StoryBackground({ bg }: { bg?: string | null }) {
  const b = bgById(bg);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {b.pattern && (
        <Image source={PATTERNS[b.pattern]} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity: 0.1 }]} />
      )}
    </View>
  );
}

/** The text of a text story: upper-middle when short (matches the composer), centred when long. */
export function StoryText({ text, color, font, bg }: { text: string; color?: string | null; font?: string | null; bg?: string | null }) {
  const size = fitFontSize(text);
  const fallback = bgById(bg).dark ? '#000000' : '#FFFFFF';
  const anchored = textAnchoredTop(text);
  return (
    <View style={[styles.textWrap, anchored && { justifyContent: 'flex-start' }]} pointerEvents="none">
      {anchored && <View style={{ height: `${TEXT_TOP * 100}%` }} />}
      <Text style={[fontById(font), { color: color || fallback, fontSize: size, lineHeight: fitLineHeight(size), textAlign: 'center' }]}>
        {text}
      </Text>
    </View>
  );
}

/** One overlay, positioned in a canvas of width×height. */
export function OverlayItem({ o, width, height }: { o: StoryOverlay; width: number; height: number }) {
  const k = width / 390; // keep sizes proportional across screen sizes
  const transform = [{ rotate: `${o.rotation || 0}deg` }, { scale: o.scale || 1 }];
  if (o.type === 'sticker' && o.key && STICKERS[o.key]) {
    const s = STICKERS[o.key];
    const w = STICKER_BASE * k;
    const h = w / s.ratio;
    return (
      <Image
        source={s.src}
        accessibilityLabel={s.label}
        style={{ position: 'absolute', left: o.x * width - w / 2, top: o.y * height - h / 2, width: w, height: h, transform }}
        resizeMode="contain"
      />
    );
  }
  if (o.type === 'poll') {
    const w = POLL_W * k;
    return (
      <View style={{ position: 'absolute', left: o.x * width - w / 2, top: o.y * height - (POLL_H * k) / 2, transform }} pointerEvents="none">
        <PollCard question={o.text || ''} options={o.options || []} k={k} />
      </View>
    );
  }
  if (o.type === 'text' && o.text) {
    return (
      <View style={{ position: 'absolute', left: o.x * width - width / 2, width, top: o.y * height - 21 * k, alignItems: 'center', transform }} pointerEvents="none">
        <Text style={[styles.pill, { backgroundColor: o.bg || '#FFFFFF', color: o.color || '#000000', fontSize: 20 * k, lineHeight: 26 * k, paddingHorizontal: 14 * k, paddingVertical: 8 * k, borderRadius: 10 * k, maxWidth: width * 0.8 }]}>
          {o.text}
        </Text>
      </View>
    );
  }
  return null;
}

export function StoryOverlays({ overlays, width, height, skipPolls }: { overlays?: StoryOverlay[]; width: number; height: number; skipPolls?: boolean }) {
  if (!overlays?.length) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {overlays.map((o, i) => (skipPolls && o.type === 'poll' ? null : <OverlayItem key={i} o={o} width={width} height={height} />))}
    </View>
  );
}

/** Avatar ring: gradient when unseen, thin grey when seen, none when no story.
 *  Ring → `gap` of background colour → avatar (design: 3px gradient / 1.5px grey, 3px gap). */
export const RING_COLORS: [string, string, string] = ['#5CB85C', '#F5B83D', '#FF5A5F'];
const ringWidth = (size: number, state: 'unseen' | 'seen') =>
  state === 'unseen' ? (size >= 48 ? 3 : 2) : (size >= 48 ? 1.5 : 1);
const defaultGap = (size: number) => (size >= 48 ? 3 : 1.5);

export function StoryRing({ size, state, children, gap, bg }: {
  size: number; state: 'unseen' | 'seen' | 'none'; children: React.ReactNode; gap?: number; bg: string;
}) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  if (state === 'none') return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  const ring = ringWidth(size, state);
  const g = gap ?? defaultGap(size);
  const mid = size - ring * 2;
  const hole = mid - g * 2;
  const content = (
    <View style={{ width: mid, height: mid, borderRadius: mid / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: hole, height: hole, borderRadius: hole / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
  if (state === 'seen') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring, backgroundColor: isDark ? '#3A3A3C' : '#C7C7CC' }}>{content}</View>
    );
  }
  return (
    <LinearGradient colors={[T.accent, RING_COLORS[1], RING_COLORS[2]]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: ring }}>
      {content}
    </LinearGradient>
  );
}
/** Avatar size that exactly fills a StoryRing of `size` (inside the ring and the gap). */
export const ringInnerSize = (size: number, state: 'unseen' | 'seen' | 'none', gap?: number) =>
  state === 'none' ? size : size - ringWidth(size, state) * 2 - (gap ?? defaultGap(size)) * 2;

const styles = StyleSheet.create({
  textWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  pill: { overflow: 'hidden', fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
});
