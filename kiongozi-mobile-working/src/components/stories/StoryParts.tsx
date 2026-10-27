// Shared drawing for stories: text-story backgrounds, overlays (stickers/text), the avatar ring.
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryOverlay } from '../../stores/storyStore';
import { STICKERS, PATTERNS, bgById, fontById, fitFontSize } from './storyAssets';

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

/** The centred text of a text story. */
export function StoryText({ text, color, font, bg }: { text: string; color?: string | null; font?: string | null; bg?: string | null }) {
  const size = fitFontSize(text);
  const fallback = bgById(bg).dark ? '#111111' : '#FFFFFF';
  return (
    <View style={styles.textWrap} pointerEvents="none">
      <Text style={[fontById(font), { color: color || fallback, fontSize: size, lineHeight: Math.round(size * 1.18), textAlign: 'center' }]}>
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
  if (o.type === 'text' && o.text) {
    return (
      <View style={{ position: 'absolute', left: o.x * width - width / 2, width, top: o.y * height - 22 * k, alignItems: 'center', transform }} pointerEvents="none">
        <Text style={[styles.pill, { backgroundColor: o.bg || '#FFFFFF', color: o.color || '#000000', fontSize: 20 * k, maxWidth: width * 0.8 }]}>
          {o.text}
        </Text>
      </View>
    );
  }
  return null;
}

export function StoryOverlays({ overlays, width, height }: { overlays?: StoryOverlay[]; width: number; height: number }) {
  if (!overlays?.length) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {overlays.map((o, i) => <OverlayItem key={i} o={o} width={width} height={height} />)}
    </View>
  );
}

/** Avatar ring: gradient when unseen, thin grey when seen, none when no story. */
export const RING_COLORS: [string, string, string] = ['#5CB85C', '#F5B83D', '#FF5A5F'];
export function StoryRing({ size, state, children, gap = 3, bg }: {
  size: number; state: 'unseen' | 'seen' | 'none'; children: React.ReactNode; gap?: number; bg: string;
}) {
  if (state === 'none') return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  const ring = state === 'unseen' ? (size >= 60 ? 3.5 : 2.5) : size >= 60 ? 2 : 1.5;
  const inner = size - ring * 2;
  const content = (
    <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
  if (state === 'seen') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring, backgroundColor: '#5A5A5E' }}>{content}</View>
    );
  }
  return (
    <LinearGradient colors={RING_COLORS} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: ring }}>
      {content}
    </LinearGradient>
  );
}
export const ringInnerSize = (size: number, state: 'unseen' | 'seen' | 'none', gap = 3) =>
  state === 'none' ? size : size - (state === 'unseen' ? 3 : 1.5) * 2 - gap * 2;

const styles = StyleSheet.create({
  textWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', fontWeight: '800' },
});
