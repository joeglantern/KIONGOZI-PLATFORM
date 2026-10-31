// The "Your week" slides as a cut-paper collage: flat paper colours, cutouts slapped onto the table that keep a
// stop-motion boil, the big number on a torn strip, and one brush mark at most per slide. Laid out on a
// 390 x 844 board and scaled to the phone. Only interactive pieces take touches; everything else lets taps
// fall through to the story's tap layer.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  WeekStats, SlideId, INK, WHITE, PAPER_WHITE, LIME, CORAL, VIOLET, TEAL, AMBER, CREAM, PINK, ART, fmt, fitSize, personaFor, weekLetters, weekOfLabel,
} from './wrappedData';
import { rise, CountUp, STAGGER } from './motion';
import { PAPER, AR, Piece, TornStrip, BrushMark, Boil, slap } from './paper';

export type Layout = { W: number; H: number; k: number; y: (v: number) => number; top: number; bottom: number };
export type Me = { username?: string; full_name?: string | null; avatar_url?: string | null } | null;

export type SlideProps = {
  id: SlideId;
  s: WeekStats | null;
  L: Layout;
  reduce: boolean;
  dir: number;
  me: Me;
  firstName: string;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  onOpenPost: (id: string) => void;
  onThanks: () => void;
  thanking: boolean;
  share: { busy: null | 'story' | 'post' | 'more'; done: string | null; toStory: () => void; toMore: () => void; toPost: () => void };
};

const INK_70 = 'rgba(27,23,18,0.72)';
const W_85 = 'rgba(255,255,255,0.86)';

/** Giant numbers and words: heavy, tight, poster-like */
const big = (fs: number, color: string, ls = -5): TextStyle => ({
  fontSize: fs, lineHeight: Math.round(fs * 1.02), fontWeight: '900', letterSpacing: ls, color, includeFontPadding: false,
});
/** Headings */
const head = (fs: number, color: string, lh?: number): TextStyle => ({
  fontSize: fs, lineHeight: lh ?? Math.round(fs * 1.18), fontWeight: '800', letterSpacing: -0.6, color,
});
const d = (i: number) => 80 + i * STAGGER;

export function SlideContent(p: SlideProps) {
  switch (p.id) {
    case 'intro': return <Intro {...p} />;
    case 'likes': return <Likes {...p} />;
    case 'top': return <TopPost {...p} />;
    case 'followers': return <Followers {...p} />;
    case 'fan': return <Fan {...p} />;
    case 'streak': return <Streak {...p} />;
    case 'baraza': return <Baraza {...p} />;
    case 'thing': return <Thing {...p} />;
    case 'persona': return <PersonaSlide {...p} />;
    case 'summary': return <Summary {...p} />;
  }
}

/** A big number (or word) torn onto a strip of paper */
function StripNumber({ text, value, prefix = '', W, k, delay, reduce, paper = 'white', color, rot = -2, max = 150, tick = true }: {
  text?: string; value?: number; prefix?: string; W: number; k: number; delay: number; reduce: boolean;
  paper?: 'white' | 'ink'; color: string; rot?: number; max?: number; tick?: boolean;
}) {
  const label = text ?? `${prefix}${fmt(value ?? 0)}`;
  const fs = fitSize(label, W - 96, max * k, 0.62);
  const h = Math.round(fs * 1.34);
  return (
    <TornStrip source={paper === 'ink' ? PAPER.stripInk : PAPER.stripWhite} w={W - 40} h={h} delay={delay} reduce={reduce} rot={rot}>
      <Animated.View entering={slap(delay + 380, reduce, 0)}>
        {value !== undefined && text === undefined
          ? <CountUp to={value} prefix={prefix} format={fmt} delay={delay + 380} tick={tick} reduce={reduce} style={big(fs, color)} />
          : <Text style={big(fs, color)} numberOfLines={1} maxFontSizeMultiplier={1}>{label}</Text>}
      </Animated.View>
    </TornStrip>
  );
}

// 0 · intro (stop-motion paper video behind)
function Intro({ L, reduce, firstName, status, onRetry }: SlideProps) {
  const { k, y, W } = L;
  const fs = 96 * k;
  const label = `It's been a week${firstName ? `, ${firstName}` : ''}.`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y(300), alignItems: 'center' }}>
        <Animated.View entering={slap(d(0), reduce, -3)} style={[styles.tag, { backgroundColor: PAPER_WHITE, transform: [{ rotate: '-3deg' }] }]}>
          <Text style={{ color: INK, fontSize: 16 * k, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>{label}</Text>
        </Animated.View>
        <Animated.Text entering={slap(d(2), reduce, -2)} style={[big(fs, WHITE), { textAlign: 'center', marginTop: 16 * k }]} maxFontSizeMultiplier={1}>Your</Animated.Text>
        <View>
          <Animated.Text entering={slap(d(3), reduce, 1)} style={[big(fs, WHITE), { textAlign: 'center' }]} maxFontSizeMultiplier={1}>week</Animated.Text>
          <BrushMark source={PAPER.underline} w={230 * k} h={34 * k} x={-8 * k} y={fs * 0.9} delay={d(5)} reduce={reduce} rot={-2} />
        </View>
        {status === 'ready' ? (
          <Animated.Text entering={rise(d(7), reduce)} style={{ color: W_85, fontSize: 15 * k, marginTop: 34 * k, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
            Tap to see how it went
          </Animated.Text>
        ) : status === 'loading' ? (
          <Animated.View entering={rise(d(6), reduce)} style={{ marginTop: 34 * k }}><ActivityIndicator color={WHITE} /></Animated.View>
        ) : null}
      </View>
      {status === 'error' && (
        <Animated.View entering={rise(d(4), reduce)} style={{ position: 'absolute', left: 24, right: 24, top: y(600), alignItems: 'center', gap: 12 }} pointerEvents="box-none">
          <Text style={{ color: W_85, fontSize: 15, textAlign: 'center' }} pointerEvents="none">We could not load your week just now.</Text>
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.paperBtn, { backgroundColor: PAPER_WHITE }, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.paperBtnText}>Try again</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// 1 · likes (coral, ink text)
function Likes({ s, L, reduce }: SlideProps) {
  const { k, y, W } = L;
  const likes = s?.likes ?? 0;
  const extra = s && s.comments > 0
    ? `Plus ${fmt(s.comments)} ${s.comments === 1 ? 'reply' : 'replies'} from people with something to say.`
    : s && s.posts > 1 ? `Across ${s.posts} posts.` : null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Piece source={PAPER.heart} w={250 * k} h={250 * k * AR.heart} x={W - 240 * k} y={y(108)} rot={9} delay={d(0)} reduce={reduce} />
      <Piece source={PAPER.dots} w={110 * k} h={110 * k * AR.dots} x={18 * k} y={y(200)} rot={-8} delay={d(1)} reduce={reduce} seed={1} drift={3} shadow={0.16} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(420) }}>
        <Animated.Text entering={rise(d(2), reduce)} style={head(24 * k, INK, 28 * k)} maxFontSizeMultiplier={1.2}>People tapped the heart{'\n'}on your posts</Animated.Text>
      </View>
      <View style={{ position: 'absolute', left: 20, top: y(500) }}>
        <StripNumber value={likes} W={W} k={k} delay={d(3)} reduce={reduce} color={INK} rot={-2} />
      </View>
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(500) + fitSize(fmt(likes), W - 96, 150 * k, 0.62) * 1.34 + 10 * k }}>
        <Animated.Text entering={rise(d(6), reduce)} style={head(22 * k, INK)} maxFontSizeMultiplier={1.2}>{likes === 1 ? 'time this week.' : 'times this week.'}</Animated.Text>
        {extra && <Animated.Text entering={rise(d(7), reduce)} style={{ color: INK_70, fontSize: 15 * k, lineHeight: 20 * k, marginTop: 10 * k, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>{extra}</Animated.Text>}
      </View>
    </View>
  );
}

function Avatar({ uri, size, name, radius }: { uri?: string | null; size: number; name?: string | null; radius?: number }) {
  const r = radius ?? size / 2;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r, backgroundColor: 'rgba(0,0,0,0.08)' }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#3FA845', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: WHITE, fontWeight: '800', fontSize: size * 0.42 }}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

/** A piece of torn cream paper with something on it (post, photo), slapped down at an angle */
function PaperCard({ children, style, rot = -3, delay, reduce, tint, h }: { children: React.ReactNode; style?: any; rot?: number; delay: number; reduce: boolean; tint?: string; h?: number }) {
  // Measured, then the paper drawn at exactly that size (Android draws a bundled image at its own pixel size with absoluteFill)
  const [sz, setSz] = useState<{ w: number; h: number } | null>(null);
  return (
    <Animated.View entering={slap(delay, reduce, rot)} style={[style, { transform: [{ rotate: `${rot}deg` }] }]} pointerEvents="box-none">
      <Boil reduce={reduce} amp={0.5} drift={2} style={h ? { height: h } : null}>
        <View style={h ? { height: h } : null} pointerEvents="box-none"
          onLayout={e => { const { width, height } = e.nativeEvent.layout; if (!sz || Math.abs(sz.w - width) > 1 || Math.abs(sz.h - height) > 1) setSz({ w: width, h: height }); }}>
          {sz ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: sz.w, height: sz.h }}>
              <Image source={PAPER.patch} style={{ position: 'absolute', left: 6, top: 9, width: sz.w, height: sz.h, tintColor: INK, opacity: 0.2 }} resizeMode="stretch" fadeDuration={0} />
              <Image source={PAPER.patch} style={[{ position: 'absolute', left: 0, top: 0, width: sz.w, height: sz.h }, tint ? { tintColor: tint } : null]} resizeMode="stretch" fadeDuration={0} />
            </View>
          ) : null}
          {children}
        </View>
      </Boil>
    </Animated.View>
  );
}

// 2 · top post (violet)
function TopPost({ s, L, reduce, me, onOpenPost }: SlideProps) {
  const { k, y } = L;
  const tp = s?.topPost;
  if (!tp) return null;
  const stats = [
    (tp.view_count ?? 0) > 0 ? { n: tp.view_count!, label: tp.view_count === 1 ? 'view' : 'views' } : null,
    tp.likes > 0 ? { n: tp.likes, label: tp.likes === 1 ? 'like' : 'likes' } : null,
  ].filter(Boolean) as { n: number; label: string }[];
  const thumbH = 140 * k;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Piece source={PAPER.star} w={150 * k} h={150 * k * AR.star} x={-26 * k} y={y(104)} rot={-12} delay={d(0)} reduce={reduce} />
      <Animated.Text pointerEvents="none" entering={rise(d(1), reduce)} style={[head(30 * k, WHITE, 34 * k), { position: 'absolute', left: 24, right: 24, top: y(150), textAlign: 'right' }]} maxFontSizeMultiplier={1.1}>
        Your post that{'\n'}went furthest
      </Animated.Text>
      <PaperCard delay={d(2)} reduce={reduce} rot={-3} style={{ position: 'absolute', left: 26 * k, right: 26 * k, top: y(290) }}>
        <Pressable onPress={() => onOpenPost(tp.id)} style={({ pressed }) => [{ padding: 22 * k, paddingVertical: 26 * k }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open this post">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar uri={me?.avatar_url} size={34 * k} name={me?.full_name || me?.username} />
            <Text style={{ color: INK, fontWeight: '800', fontSize: 15 * k, flexShrink: 1 }} numberOfLines={1}>{me?.full_name || me?.username || 'You'}</Text>
            {me?.username ? <Text style={{ color: INK_70, fontSize: 14 * k, flexShrink: 1 }} numberOfLines={1}>@{me.username}</Text> : null}
          </View>
          <Text style={{ color: INK, fontSize: 17 * k, lineHeight: 23 * k, marginTop: 10 * k }} numberOfLines={tp.thumbnail_url ? 3 : 5} maxFontSizeMultiplier={1.1}>{tp.content}</Text>
          {tp.thumbnail_url ? (
            <Image source={{ uri: tp.thumbnail_url }} style={{ height: thumbH, borderRadius: 4, marginTop: 12 * k, backgroundColor: '#E2D8C0' }} resizeMode="cover" />
          ) : null}
        </Pressable>
      </PaperCard>
      {stats.length > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: Math.max(L.bottom, 16) + y(80), flexDirection: 'row', gap: 30 * k }}>
          {stats.map((x, i) => (
            <Animated.View key={x.label} entering={slap(d(4 + i), reduce, i ? 2 : -2)}>
              <CountUp to={x.n} format={fmt} delay={d(4 + i) + 150} duration={1000} reduce={reduce} tick={i === stats.length - 1} style={big(56 * k, WHITE, -2)} />
              <Text style={{ color: W_85, fontSize: 14 * k, fontWeight: '700' }}>{x.label}</Text>
              {i === 0 ? <BrushMark source={PAPER.scribble} w={110 * k} h={26 * k} x={-6} y={60 * k} delay={d(6)} reduce={reduce} rot={-3} /> : null}
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

// 3 · followers (lime, ink text)
function Followers({ s, L, reduce }: SlideProps) {
  const { k, y, W } = L;
  const n = s?.followers ?? 0;
  const label = `+${fmt(n)}`;
  const fs = fitSize(label, W - 48, 150 * k, 0.62);
  const dots = [CORAL, VIOLET, TEAL, AMBER].slice(0, Math.min(4, n));
  const rest = n - dots.length;
  const sz = 46 * k;
  const ringW = Math.min(W - 40, fs * label.length * 0.62 + 90 * k);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Piece source={PAPER.sun} w={250 * k} h={250 * k * AR.sun} x={W / 2 - 125 * k} y={y(100)} rot={0} delay={d(0)} reduce={reduce} drift={3} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: y(430), alignItems: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <BrushMark source={PAPER.circle} w={ringW} h={fs * 1.45} x={(fs * label.length * 0.62 - ringW) / 2} y={-fs * 0.2} delay={d(3)} reduce={reduce} rot={-4} />
          <Animated.View entering={slap(d(1), reduce, -2)} style={{ transform: [{ translateX: 0 }] }}>
            <CountUp to={n} prefix="+" format={fmt} delay={d(1) + 120} tick reduce={reduce} style={[big(fs, INK), { textAlign: 'center' }]} />
          </Animated.View>
        </View>
        <Animated.Text entering={rise(d(2), reduce)} style={[head(24 * k, INK), { marginTop: 14 * k, textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>
          {n === 1 ? 'new person followed you' : 'new people followed you'}
        </Animated.Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 26 * k }}>
          {dots.map((c, i) => (
            <Animated.View key={c} entering={slap(d(4) + i * 110, reduce, (i % 2 ? 6 : -6))} style={{ marginLeft: i ? -10 * k : 0 }}>
              <PaperDot size={sz} color={c} />
            </Animated.View>
          ))}
          {rest > 0 && (
            <Animated.View entering={slap(d(4) + dots.length * 110, reduce, 4)} style={{ marginLeft: -10 * k }}>
              <PaperDot size={sz} color={INK}><Text style={{ color: LIME, fontSize: 12 * k, fontWeight: '900' }} maxFontSizeMultiplier={1}>+{fmt(rest)}</Text></PaperDot>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

/** A small circle cut from coloured paper, with its shadow */
function PaperDot({ size, color, children }: { size: number; color: string; children?: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 3, top: 4, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(27,23,18,0.22)' }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

// 4 · biggest fan (teal)
function Fan({ s, L, reduce, onThanks, thanking }: SlideProps) {
  const { k, y, W } = L;
  const f = s?.topFan;
  if (!f) return null;
  const av = 170 * k;
  const times = f.count === 1 ? 'once' : f.count === 2 ? 'twice' : `${f.count} times`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Piece source={PAPER.bubble} w={170 * k} h={170 * k * AR.bubble} x={W - 168 * k} y={y(110)} rot={7} delay={d(0)} reduce={reduce} />
      <Animated.Text pointerEvents="none" entering={rise(d(1), reduce)} style={[head(30 * k, WHITE, 34 * k), { position: 'absolute', left: 24, top: y(150) }]} maxFontSizeMultiplier={1.1}>
        Your biggest{'\n'}fan this week
      </Animated.Text>
      {/* the fan's photo, stuck on a scrap of paper like a print */}
      <PaperCard delay={d(2)} reduce={reduce} rot={4} style={{ position: 'absolute', left: W / 2 - (av + 44 * k) / 2, top: y(290) }}>
        <View style={{ padding: 22 * k, paddingBottom: 30 * k }} pointerEvents="none">
          <Avatar uri={f.avatar_url} size={av} name={f.full_name || f.username} radius={6} />
        </View>
      </PaperCard>
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(560), alignItems: 'center' }} pointerEvents="box-none">
        <Animated.Text pointerEvents="none" entering={rise(d(3), reduce)} style={[head(32 * k, WHITE), { textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>@{f.username}</Animated.Text>
        <Animated.Text pointerEvents="none" entering={rise(d(4), reduce)} style={{ color: W_85, fontSize: 16 * k, marginTop: 6 * k, textAlign: 'center', fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
          liked and replied to you {times}
        </Animated.Text>
        <Animated.View entering={slap(d(5), reduce, -2)} style={{ transform: [{ rotate: '-2deg' }] }}>
          <Pressable onPress={onThanks} disabled={thanking} style={({ pressed }) => [styles.paperBtn, { marginTop: 22 * k, backgroundColor: PAPER_WHITE }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Say thanks to ${f.username}`}>
            {thanking ? <ActivityIndicator color={TEAL} /> : <Text style={styles.paperBtnText}>Say thanks</Text>}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// 5 · streak (amber, ink text)
function Streak({ s, L, reduce }: SlideProps) {
  const { k, y, W } = L;
  const a = Math.max(0, Math.min(7, s?.activeDays ?? 0));
  const letters = useMemo(() => weekLetters(s?.since), [s?.since]);
  const ds = 38 * k;
  const dotDelay = (i: number) => d(4) + i * 140;
  useEffect(() => {
    const ts = Array.from({ length: a }, (_, i) => setTimeout(() => Haptics.selectionAsync().catch(() => {}), dotDelay(i) + 140));
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Piece source={PAPER.flame} w={190 * k} h={190 * k * AR.flame} x={W / 2 - 95 * k} y={y(104)} rot={-4} delay={d(0)} reduce={reduce} amp={2.4} drift={6} />
      <View style={{ position: 'absolute', left: 20, top: y(420) }}>
        <StripNumber text={`${a} of 7`} W={W} k={k} delay={d(1)} reduce={reduce} paper="ink" color={AMBER} rot={2} max={120} />
      </View>
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(420) + fitSize(`${a} of 7`, W - 96, 120 * k, 0.62) * 1.34 + 12 * k, alignItems: 'center' }}>
        <Animated.Text entering={rise(d(3), reduce)} style={[head(24 * k, INK), { textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>
          {a === 1 ? 'day, you showed up' : 'days, you showed up'}
        </Animated.Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 * k, marginTop: 24 * k }}>
          {letters.map((l, i) => {
            const on = i < a;
            return (
              <Animated.View key={i} entering={slap(dotDelay(i), reduce, i % 2 ? 5 : -5)}>
                <PaperDot size={ds} color={on ? INK : CREAM}>
                  <Text style={{ color: on ? AMBER : INK_70, fontWeight: '900', fontSize: 13 * k }} maxFontSizeMultiplier={1}>{l}</Text>
                </PaperDot>
              </Animated.View>
            );
          })}
        </View>
        {(s?.streak ?? 0) > 1 && (
          <Animated.Text entering={rise(dotDelay(7) + 60, reduce)} style={{ color: INK, fontSize: 15 * k, marginTop: 18 * k, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
            A {s!.streak}-day streak and counting.
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

// 6 · baraza (cream, ink text)
function Baraza({ s, L, reduce }: SlideProps) {
  const { k, y, W } = L;
  const n = s?.barazas ?? 0;
  const label = `${fmt(n)}×`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Piece source={PAPER.stick} w={112 * k} h={112 * k * AR.stick} x={W - 150 * k} y={y(150)} rot={10} delay={d(0)} reduce={reduce} amp={1.4} />
      <Piece source={PAPER.stool} w={130 * k} h={130 * k * AR.stool} x={30 * k} y={y(230)} rot={-6} delay={d(1)} reduce={reduce} seed={2} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(430) }}>
        <Animated.Text entering={rise(d(2), reduce)} style={head(26 * k, INK)} maxFontSizeMultiplier={1.2}>You pulled up a stool</Animated.Text>
      </View>
      <View style={{ position: 'absolute', left: 20, top: y(478) }}>
        <StripNumber text={label} W={W} k={k} delay={d(3)} reduce={reduce} paper="ink" color={CREAM} rot={-2} max={140} />
      </View>
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(478) + fitSize(label, W - 96, 140 * k, 0.62) * 1.34 + 10 * k }}>
        <Animated.Text entering={rise(d(5), reduce)} style={head(22 * k, INK)} maxFontSizeMultiplier={1.2}>in a baraza this week.</Animated.Text>
        <Animated.Text entering={rise(d(6), reduce)} style={{ color: INK_70, fontSize: 15 * k, lineHeight: 20 * k, marginTop: 10 * k, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
          {n >= 2 ? 'You kept coming back to the conversation.' : 'The stools are out again this week.'}
        </Animated.Text>
      </View>
    </View>
  );
}

// 7 · your thing + your day (pink, ink text)
function Thing({ s, L, reduce }: SlideProps) {
  const { k, y, W } = L;
  const tag = s?.topTag ? `#${s.topTag.replace(/^#/, '')}` : null;
  const day = s?.bestDay || null;
  const dayFs = day ? fitSize(day, W - 48, 78 * k, 0.6) : 0;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Piece source={PAPER.squiggle} w={230 * k} h={230 * k * AR.squiggle} x={-30 * k} y={y(110)} rot={-8} delay={d(0)} reduce={reduce} />
      <Piece source={PAPER.arrow} w={80 * k} h={80 * k * AR.arrow} x={W - 110 * k} y={y(220)} rot={6} delay={d(1)} reduce={reduce} seed={1} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: y(tag && day ? 340 : 420) }}>
        {tag && (
          <>
            <Animated.Text entering={rise(d(2), reduce)} style={[styles.kicker, { marginLeft: 24 }]} maxFontSizeMultiplier={1.2}>YOUR THING</Animated.Text>
            <View style={{ marginLeft: 20, marginTop: 8 * k }}>
              <StripNumber text={tag} W={W} k={k} delay={d(3)} reduce={reduce} paper="ink" color={LIME} rot={-2} max={84} />
            </View>
          </>
        )}
        {day && (
          <View style={{ marginLeft: 24, marginTop: tag ? 30 * k : 0 }}>
            <Animated.Text entering={rise(d(5), reduce)} style={styles.kicker} maxFontSizeMultiplier={1.2}>YOUR DAY</Animated.Text>
            <View>
              <Animated.Text entering={slap(d(6), reduce, -1)} style={[big(dayFs, INK, -3), { marginTop: 4 * k }]} numberOfLines={1} maxFontSizeMultiplier={1}>{day}</Animated.Text>
              <BrushMark source={PAPER.underline} w={Math.min(W - 60, day.length * dayFs * 0.6)} h={30 * k} x={-4} y={dayFs * 1.02} delay={d(7)} reduce={reduce} rot={-1.5} />
            </View>
            <Animated.Text entering={rise(d(8), reduce)} style={{ color: INK_70, fontSize: 15 * k, lineHeight: 20 * k, marginTop: 22 * k, marginRight: 24, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
              Most of your likes and replies came in on {day}.
            </Animated.Text>
          </View>
        )}
      </View>
    </View>
  );
}

// 8 · persona (stop-motion paper trophy video behind; text sits on the plain violet at the bottom)
function PersonaSlide({ s, L, reduce }: SlideProps) {
  const { k, W } = L;
  const p = personaFor(s);
  const fs = Math.min(60 * k, fitSize(p.name, (W - 48) * 2, 60 * k, 0.55));
  useEffect(() => {
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), d(2) + 260);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: Math.max(L.bottom, 16) + 56 * k, alignItems: 'center' }}>
        <Animated.View entering={slap(d(0), reduce, -2)} style={[styles.tag, { backgroundColor: LIME, transform: [{ rotate: '-2deg' }] }]}>
          <Text style={{ color: INK, fontSize: 13 * k, fontWeight: '900', letterSpacing: 1 }} maxFontSizeMultiplier={1.2}>THIS WEEK YOU WERE</Text>
        </Animated.View>
        <Animated.Text entering={slap(d(2), reduce, 0)} style={[big(fs, WHITE, -2), { textAlign: 'center', marginTop: 14 * k }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1}>{p.name}</Animated.Text>
        <Animated.Text entering={rise(d(4), reduce)} style={{ color: W_85, fontSize: 16 * k, lineHeight: 22 * k, marginTop: 12 * k, textAlign: 'center', fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
          {p.line}
        </Animated.Text>
      </View>
    </View>
  );
}

// 9 · summary: the shareable card, a torn violet sheet with coloured paper tiles
function Summary({ s, L, reduce, me, share }: SlideProps) {
  const { k, H, W } = L;
  const p = personaFor(s);
  const top = L.top + 74;
  const actionsH = 52 + 44 + Math.max(L.bottom, 16) + 16;
  const cardH = Math.min(560 * k, H - top - actionsH - 12);
  const cardW = W - 48;
  const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const cand: { v: number; n: string; l: string }[] = [
    { v: s?.likes ?? 0, n: fmt(s?.likes ?? 0), l: pl(s?.likes ?? 0, 'like', 'likes') },
    { v: s?.followers ?? 0, n: `+${fmt(s?.followers ?? 0)}`, l: pl(s?.followers ?? 0, 'follower', 'followers') },
    { v: (s as any)?.postViews ?? 0, n: fmt((s as any)?.postViews ?? 0), l: pl((s as any)?.postViews ?? 0, 'view', 'views') },
    { v: s?.comments ?? 0, n: fmt(s?.comments ?? 0), l: pl(s?.comments ?? 0, 'reply', 'replies') },
    { v: s?.barazas ?? 0, n: fmt(s?.barazas ?? 0), l: pl(s?.barazas ?? 0, 'baraza', 'barazas') },
    { v: s?.activeDays ?? 0, n: `${s?.activeDays ?? 0}/7`, l: 'days active' },
    { v: s?.storyViews ?? 0, n: fmt(s?.storyViews ?? 0), l: pl(s?.storyViews ?? 0, 'story view', 'story views') },
  ];
  const tiles = cand.filter(t => t.v > 0).slice(0, 4);
  const TILE = [CORAL, LIME, AMBER, PINK];
  const [first, ...restWords] = p.name.split(' ');
  const nameLines = restWords.length ? `${first}\n${restWords.join(' ')}` : p.name;
  const sk = Math.min(1, cardH / 560);
  const tileW = (cardW - 48 - 12) / 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <PaperCard delay={120} reduce={reduce} rot={-2} tint={VIOLET} h={cardH} style={{ position: 'absolute', left: 24, right: 24, top, height: cardH }}>
        <View pointerEvents="none" style={{ height: cardH }}>
          <View style={{ position: 'absolute', right: 18 * sk, top: 18 * sk, width: 120 * sk, height: 120 * sk * AR.trophy }}>
            <Piece source={PAPER.trophy} w={120 * sk} h={120 * sk * AR.trophy} x={0} y={0} rot={8} delay={460} reduce={reduce} amp={1.2} drift={2} />
          </View>
          <Text style={{ position: 'absolute', left: 26, top: 30 * sk, color: W_85, fontSize: 13, fontWeight: '800' }} maxFontSizeMultiplier={1.1}>
            {me?.username ? `@${me.username} · ` : ''}week of {weekOfLabel(s?.since)}
          </Text>
          <Text style={[big(42 * sk, WHITE, -1.5), { position: 'absolute', left: 24, top: 60 * sk, lineHeight: 44 * sk, width: cardW - 160 * sk }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1}>
            {nameLines}
          </Text>
          <View style={{ position: 'absolute', left: 24, right: 24, top: 184 * sk, flexDirection: 'row', flexWrap: 'wrap', gap: 12 * sk }}>
            {tiles.map((t, i) => (
              <Animated.View key={t.l} entering={slap(560 + i * 120, reduce, i % 2 ? 2 : -2)} style={{ width: tileW, transform: [{ rotate: `${i % 2 ? 2 : -2}deg` }] }}>
                <View style={{ position: 'absolute', left: 4, top: 5, right: -4, bottom: -5, backgroundColor: 'rgba(27,23,18,0.25)', borderRadius: 3 }} />
                <View style={{ backgroundColor: TILE[i], borderRadius: 3, padding: 12 * sk }}>
                  <Text style={big(36 * sk, INK, -1)} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>{t.n}</Text>
                  <Text style={{ color: INK, fontSize: 13, fontWeight: '700' }} maxFontSizeMultiplier={1.1}>{t.l}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
          <Text style={{ position: 'absolute', left: 24, right: 24, top: (184 + (tiles.length > 2 ? 2 : tiles.length ? 1 : 0) * 92 + 18) * sk, color: W_85, fontSize: 16 * Math.max(sk, 0.85), lineHeight: 22 * Math.max(sk, 0.85), fontWeight: '700' }} numberOfLines={4} maxFontSizeMultiplier={1.1}>
            {p.line}
          </Text>
          {(s?.topTag || s?.bestDay) ? (
            <Text style={{ position: 'absolute', left: 24, right: 24, bottom: 62 + 20 * sk, color: W_85, fontSize: 14, fontWeight: '600' }} numberOfLines={2} maxFontSizeMultiplier={1.1}>
              {s?.topTag ? <>Top topic <Text style={{ color: LIME, fontWeight: '900' }}>#{s.topTag.replace(/^#/, '')}</Text></> : null}
              {s?.topTag && s?.bestDay ? '  ·  ' : ''}
              {s?.bestDay ? <>Best day <Text style={{ color: AMBER, fontWeight: '900' }}>{s.bestDay}</Text></> : null}
            </Text>
          ) : null}
          <View style={styles.cardFoot}>
            <Image source={ART.logo} style={{ width: 28, height: 28, borderRadius: 7 }} />
            <Text style={{ color: WHITE, fontSize: 13, fontWeight: '800', flex: 1 }} maxFontSizeMultiplier={1.1}>KChat · Kenya, say your piece</Text>
          </View>
        </View>
      </PaperCard>

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: Math.max(L.bottom, 16) + 6 }} pointerEvents="box-none">
        {share.done ? (
          <Animated.View entering={rise(0, reduce, 16)} style={styles.doneRow} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={22} color={TEAL} />
            <Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>{share.done}</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={rise(d(4), reduce)}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={share.toStory} disabled={!!share.busy || !s} style={({ pressed }) => [styles.inkPill, { flex: 1 }, (pressed || !!share.busy) && { opacity: 0.88 }, pressed && styles.pressed]} accessibilityRole="button">
                {share.busy === 'story' ? <ActivityIndicator color={CREAM} /> : <Text style={{ color: CREAM, fontWeight: '900', fontSize: 16 }}>Share to story</Text>}
              </Pressable>
              <Pressable onPress={share.toMore} disabled={!!share.busy || !s} style={({ pressed }) => [styles.round, (pressed || !!share.busy) && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Share to other apps">
                {share.busy === 'more' ? <ActivityIndicator color={INK} /> : <Ionicons name="share-outline" size={22} color={INK} />}
              </Pressable>
            </View>
            <Text style={{ alignSelf: 'center', paddingVertical: 12, color: INK_70, fontSize: 13, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>Friends can tap it to see their own week</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: INK_70, fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 0, shadowOffset: { width: 3, height: 4 }, elevation: 3 },
  paperBtn: { height: 48, paddingHorizontal: 26, borderRadius: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 0, shadowOffset: { width: 3, height: 4 }, elevation: 4 },
  paperBtnText: { color: INK, fontWeight: '900', fontSize: 16 },
  pressed: { transform: [{ scale: 0.97 }] },
  inkPill: { height: 52, borderRadius: 26, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(27,23,18,0.08)', alignItems: 'center', justifyContent: 'center' },
  cardFoot: { position: 'absolute', left: 14, right: 14, bottom: 14, height: 50, backgroundColor: 'rgba(0,0,0,0.18)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 2 },
  doneRow: { height: 52, marginBottom: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
