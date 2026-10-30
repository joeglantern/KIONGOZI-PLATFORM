// Shared drawing for stories: text-story backgrounds, overlays (stickers/text), the avatar ring.
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StoryOverlay } from '../../stores/storyStore';
import { STICKERS, PATTERNS, bgById, fontById, fitFontSize, fitLineHeight, textAnchoredTop, TEXT_TOP } from './storyAssets';
import { PollCard, POLL_W } from './PollCard';
import { MentionPill, QuestionCard, SliderCard, CountdownCard, PostSticker, stickerSize, isInteractive } from './StoryStickers';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

export const POLL_H = 150; // approx. card height at scale 1

export const STICKER_BASE = 150; // sticker width at scale 1, in px on a 390px-wide canvas

/**
 * Photo/video framing (pinch / drag / rotate in the composer) travels as an extra overlay
 * {type:'sticker', key:'__media', x, y, scale, rotation} so no server change is needed:
 *  - x, y     = centre of the media as a fraction of the canvas (0.5, 0.5 = centred)
 *  - scale    = zoom relative to cover-fill (1 = fills the canvas exactly, <1 = smaller)
 *  - rotation = degrees
 * It is never drawn as a sticker; the viewer applies it to the media layer instead.
 * Older app versions ignore it (no such sticker) and just show the media cover-filled.
 */
export const MEDIA_KEY = '__media';
export type MediaFrame = { x: number; y: number; scale: number; rotation: number };
export const isMediaFrame = (o: StoryOverlay) => o.type === 'sticker' && o.key === MEDIA_KEY;
export const mediaFrameOf = (overlays?: StoryOverlay[] | null): MediaFrame | null => {
  const o = overlays?.find(isMediaFrame);
  return o ? { x: o.x ?? 0.5, y: o.y ?? 0.5, scale: o.scale || 1, rotation: o.rotation || 0 } : null;
};

/** Size of the media box at scale 1: the media's aspect, just covering a cw×ch canvas. */
export function coverBox(cw: number, ch: number, mw?: number | null, mh?: number | null) {
  if (!mw || !mh) return { w: cw, h: ch };
  const s = Math.max(cw / mw, ch / mh);
  return { w: mw * s, h: mh * s };
}

/** Does a framed media box still cover the whole canvas? (If not, a backdrop shows.) */
export function frameCovers(f: MediaFrame, cw: number, ch: number, bw: number, bh: number) {
  if (Math.abs(f.rotation % 360) > 0.5) return false;
  const cx = f.x * cw, cy = f.y * ch, hw = (bw * f.scale) / 2, hh = (bh * f.scale) / 2;
  return cx - hw <= 0.5 && cx + hw >= cw - 0.5 && cy - hh <= 0.5 && cy + hh >= ch - 0.5;
}

/** Blurred, darkened copy of the media behind a zoomed-out / moved photo or video. */
export function MediaBackdrop({ uri }: { uri?: string | null }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} pointerEvents="none">
      {!!uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={40} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
    </View>
  );
}

/**
 * Photo/video layer of a story in a width×height canvas. `children` fill the media box
 * (use absoluteFill + cover). Without a frame it is the classic full-bleed cover.
 */
export function FramedMedia({ frame, mw, mh, width, height, backdropUri, children }: {
  frame: MediaFrame | null; mw?: number | null; mh?: number | null; width: number; height: number;
  backdropUri?: string | null; children: React.ReactNode;
}) {
  if (!frame) return <View style={StyleSheet.absoluteFill} pointerEvents="none">{children}</View>;
  const { w, h } = coverBox(width, height, mw, mh);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {!frameCovers(frame, width, height, w, h) && <MediaBackdrop uri={backdropUri} />}
      <View style={{
        position: 'absolute', left: (width - w) / 2, top: (height - h) / 2, width: w, height: h,
        transform: [
          { translateX: (frame.x - 0.5) * width }, { translateY: (frame.y - 0.5) * height },
          { rotate: `${frame.rotation}deg` }, { scale: frame.scale },
        ],
      }}>
        {children}
      </View>
    </View>
  );
}

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
/** Black or white, whichever reads better on `hex`. */
function contrastOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#000000';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#000000' : '#FFFFFF';
}

/** Text story styles (same in the composer and the viewer): plain, a solid pill behind the text, or a soft outline. */
export const TEXT_STYLES = ['plain', 'pill', 'outline'] as const;
export function textStyleFx(style: string | null | undefined, color: string): { box: any; text: any } {
  if (style === 'pill') {
    return {
      box: { backgroundColor: color, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center', overflow: 'hidden' },
      text: { color: contrastOn(color) },
    };
  }
  if (style === 'outline') {
    return { box: null, text: { textShadowColor: contrastOn(color) === '#000000' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 } };
  }
  return { box: null, text: null };
}

export function StoryText({ text, color, font, bg, textStyle }: { text: string; color?: string | null; font?: string | null; bg?: string | null; textStyle?: string | null }) {
  const size = fitFontSize(text);
  const fallback = bgById(bg).dark ? '#000000' : '#FFFFFF';
  const anchored = textAnchoredTop(text);
  const fx = textStyleFx(textStyle, color || fallback);
  return (
    <View style={[styles.textWrap, anchored && { justifyContent: 'flex-start' }]} pointerEvents="none">
      {anchored && <View style={{ height: `${TEXT_TOP * 100}%` }} />}
      <View style={fx.box}>
        <Text style={[fontById(font), { color: color || fallback, fontSize: size, lineHeight: fitLineHeight(size), textAlign: 'center' }, fx.text]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** "example.com" from a URL, for the link sticker label. */
export function linkLabel(url: string) {
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(url || '');
  return (m ? m[1] : url).slice(0, 32);
}

/** Link sticker: white pill with a link icon and the site name (same look in composer and viewer). */
export function LinkPill({ url, k }: { url: string; k: number }) {
  return (
    <View style={[styles.link, { height: 40 * k, paddingHorizontal: 14 * k, borderRadius: 20 * k, gap: 6 * k }]}>
      <Ionicons name="link" size={18 * k} color="#2F7BF6" />
      <Text style={{ color: '#2F7BF6', fontSize: 16 * k, fontWeight: '700' }} numberOfLines={1}>{linkLabel(url)}</Text>
    </View>
  );
}
export const LINK_H = 40;

/** One overlay, positioned in a canvas of width×height. `author` puts a face on the question box. */
export function OverlayItem({ o, width, height, author }: {
  o: StoryOverlay; width: number; height: number; author?: { avatar_url?: string | null; name?: string };
}) {
  if (isMediaFrame(o)) return null; // media framing, not a sticker
  const k = width / 390; // keep sizes proportional across screen sizes
  const transform = [{ rotate: `${o.rotation || 0}deg` }, { scale: o.scale || 1 }];
  const size = stickerSize(o, k);
  if (size) {
    const body = o.type === 'mention' ? <MentionPill username={o.text || ''} k={k} />
      : o.type === 'question' ? <QuestionCard prompt={o.text || ''} color={o.bg} avatarUrl={author?.avatar_url} name={author?.name} k={k} />
      : o.type === 'slider' ? <SliderCard question={o.text} emoji={o.emoji} k={k} />
      : o.type === 'countdown' && o.ends_at ? <CountdownCard title={o.text} endsAt={o.ends_at} k={k} live={false} />
      : o.type === 'post' && o.post ? <PostSticker post={o.post} k={k} />
      : null;
    if (!body) return null;
    return (
      <View style={{ position: 'absolute', left: o.x * width - width / 2, width, top: o.y * height - size.h / 2, alignItems: 'center', transform }} pointerEvents="none">
        {body}
      </View>
    );
  }
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
  if (o.type === 'link' && o.url) {
    return (
      <View style={{ position: 'absolute', left: o.x * width - width / 2, width, top: o.y * height - (LINK_H * k) / 2, alignItems: 'center', transform }} pointerEvents="none">
        <LinkPill url={o.url} k={k} />
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
      {overlays.map((o, i) => ((skipPolls && (o.type === 'poll' || o.type === 'link' || isInteractive(o))) || isMediaFrame(o) ? null : <OverlayItem key={i} o={o} width={width} height={height} />))}
    </View>
  );
}

/** Avatar ring: a hand-painted brushstroke ring when unseen (one stroke per story, up to 8),
 *  thin grey when seen, none when no story. Ring -> `gap` of background colour -> avatar. */
export const RING_COLORS: [string, string, string] = ['#5CB85C', '#F5B83D', '#FF5A5F'];
const ringWidth = (size: number, state: 'unseen' | 'seen') =>
  state === 'unseen' ? Math.max(2.5, size * 0.09) : (size >= 48 ? 1.5 : 1);
const defaultGap = (size: number) => (size >= 48 ? 3 : 1.5);

/** Close friends ring (IG green). */
export const CLOSE_RING: [string, string] = ['#1DB954', '#0E8F3E'];

// Painted rings (assets/stories/rings, made by a small brush script): index = story count - 1
const PAINTED = [
  require('../../../assets/stories/rings/ring_brand_1.png'), require('../../../assets/stories/rings/ring_brand_2.png'),
  require('../../../assets/stories/rings/ring_brand_3.png'), require('../../../assets/stories/rings/ring_brand_4.png'),
  require('../../../assets/stories/rings/ring_brand_5.png'), require('../../../assets/stories/rings/ring_brand_6.png'),
  require('../../../assets/stories/rings/ring_brand_7.png'), require('../../../assets/stories/rings/ring_brand_8.png'),
];
const PAINTED_CLOSE = [
  require('../../../assets/stories/rings/ring_close_1.png'), require('../../../assets/stories/rings/ring_close_2.png'),
  require('../../../assets/stories/rings/ring_close_3.png'), require('../../../assets/stories/rings/ring_close_4.png'),
  require('../../../assets/stories/rings/ring_close_5.png'), require('../../../assets/stories/rings/ring_close_6.png'),
  require('../../../assets/stories/rings/ring_close_7.png'), require('../../../assets/stories/rings/ring_close_8.png'),
];

export function StoryRing({ size, state, children, gap, bg, close, count = 1 }: {
  size: number; state: 'unseen' | 'seen' | 'none'; children: React.ReactNode; gap?: number; bg: string; close?: boolean;
  /** number of stories: the painted ring splits into this many strokes (max 8) */
  count?: number;
}) {
  const isDark = useThemeStore(s => s.isDark);
  if (state === 'none') return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  const ring = ringWidth(size, state);
  const g = gap ?? defaultGap(size);
  const mid = size - ring * 2;
  const hole = mid - g * 2;
  const content = (
    <View style={{ width: mid, height: mid, borderRadius: mid / 2, backgroundColor: state === 'unseen' ? 'transparent' : bg, alignItems: 'center', justifyContent: 'center' }}>
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
  const n = Math.min(Math.max(Math.round(count) || 1, 1), 8);
  return (
    <View style={{ width: size, height: size, padding: ring }}>
      <Image source={(close ? PAINTED_CLOSE : PAINTED)[n - 1]} style={{ position: 'absolute', width: size, height: size }} fadeDuration={0} />
      {content}
    </View>
  );
}
/** Avatar size that exactly fills a StoryRing of `size` (inside the ring and the gap). */
export const ringInnerSize = (size: number, state: 'unseen' | 'seen' | 'none', gap?: number) =>
  state === 'none' ? size : size - ringWidth(size, state) * 2 - (gap ?? defaultGap(size)) * 2;

const styles = StyleSheet.create({
  textWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  pill: { overflow: 'hidden', fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', maxWidth: 260, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
