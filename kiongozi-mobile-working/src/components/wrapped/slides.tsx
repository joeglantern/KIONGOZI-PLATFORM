// The ten "Your week" slides, laid out from the Wrapped board (390 x 844) and scaled to the phone.
// Only interactive pieces take touches; everything else lets taps fall through to the story's tap layer.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring, withTiming, withRepeat, withSequence, Easing, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  WeekStats, SlideId, INK, WHITE, LIME, CORAL, VIOLET, TEAL, AMBER, PEACH, ART, fmt, fitSize, personaFor, weekLetters, weekOfLabel,
} from './wrappedData';
import { rise, pop, Reveal, Float3D, CountUp, PulseRing, STAGGER } from './motion';

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

const INK_70 = 'rgba(22,19,15,0.72)';
const W_80 = 'rgba(255,255,255,0.82)';
const W_70 = 'rgba(255,255,255,0.72)';

/** Giant numbers and words: system font at 900 with tight tracking, like the board's .big */
const big = (fs: number, color: string, ls = -6): TextStyle => ({
  fontSize: fs, lineHeight: Math.round(fs * 0.98), fontWeight: '900', letterSpacing: ls, color, includeFontPadding: false,
});
/** Headings, the board's .h */
const head = (fs: number, color: string, lh?: number): TextStyle => ({
  fontSize: fs, lineHeight: lh ?? Math.round(fs * 1.2), fontWeight: '800', letterSpacing: -0.6, color,
});
const d = (i: number) => 60 + i * STAGGER; // the n-th element's entrance delay

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

// 0 · intro (video background)
function Intro({ L, reduce, firstName, status, onRetry }: SlideProps) {
  const { k, y } = L;
  const fs = 92 * k;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y(290), alignItems: 'center' }}>
        <Animated.Text entering={rise(d(0), reduce)} style={[head(18 * k, W_80), { textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>
          It's been a week{firstName ? `, ${firstName}` : ''}.
        </Animated.Text>
        <Reveal delay={d(1)} reduce={reduce} height={fs} style={{ marginTop: 10 * k }}>
          <Text style={[big(fs, WHITE), { textAlign: 'center' }]} maxFontSizeMultiplier={1}>Your</Text>
        </Reveal>
        <Reveal delay={d(2)} reduce={reduce} height={fs}>
          <Text style={[big(fs, WHITE), { textAlign: 'center' }]} maxFontSizeMultiplier={1}>week</Text>
        </Reveal>
        {status === 'ready' ? (
          <Animated.Text entering={rise(d(4), reduce)} style={{ color: W_70, fontSize: 15 * k, marginTop: 18 * k }} maxFontSizeMultiplier={1.2}>
            Tap to see how it went
          </Animated.Text>
        ) : status === 'loading' ? (
          <Animated.View entering={rise(d(4), reduce)} style={{ marginTop: 22 * k }}><ActivityIndicator color={WHITE} /></Animated.View>
        ) : null}
      </View>
      {status === 'error' && (
        <Animated.View entering={rise(d(4), reduce)} style={{ position: 'absolute', left: 24, right: 24, top: y(560), alignItems: 'center', gap: 12 }} pointerEvents="box-none">
          <Text style={{ color: W_80, fontSize: 15, textAlign: 'center' }} pointerEvents="none">We could not load your week just now.</Text>
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.ghostPill, pressed && { opacity: 0.75 }]} accessibilityRole="button">
            <Text style={styles.ghostPillText}>Try again</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// 1 · likes (coral)
function Likes({ s, L, reduce, dir }: SlideProps) {
  const { k, y, W } = L;
  const likes = s?.likes ?? 0;
  const fs = fitSize(fmt(likes), W - 48, 170 * k, 0.62);
  const extra = s && s.comments > 0
    ? `Plus ${fmt(s.comments)} ${s.comments === 1 ? 'reply' : 'replies'} from people with something to say.`
    : s && s.posts > 1 ? `Across ${s.posts} posts.` : null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Float3D source={ART.heart} size={300 * k} style={{ right: -30 * k, top: y(130) }} reduce={reduce} dir={dir} depth={1.2} tilt={-6} />
      <Float3D source={ART.blob} size={70 * k} style={{ left: 22 * k, top: y(200) }} reduce={reduce} dir={dir} depth={0.6} delay={380} period={5200} phase={600} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(430) }}>
        <Animated.Text entering={rise(d(0), reduce)} style={head(24 * k, WHITE, 28 * k)} maxFontSizeMultiplier={1.2}>People tapped the heart on your posts</Animated.Text>
        <Animated.View entering={rise(d(1), reduce)} style={{ marginTop: 8 * k }}>
          <CountUp to={likes} format={fmt} delay={d(1) + 120} tick reduce={reduce} style={big(fs, WHITE)} />
        </Animated.View>
        <Animated.Text entering={rise(d(2), reduce)} style={head(22 * k, WHITE)} maxFontSizeMultiplier={1.2}>{likes === 1 ? 'time this week.' : 'times this week.'}</Animated.Text>
        {extra && <Animated.Text entering={rise(d(4), reduce)} style={{ color: 'rgba(255,255,255,0.88)', fontSize: 15 * k, lineHeight: 20 * k, marginTop: 16 * k }} maxFontSizeMultiplier={1.2}>{extra}</Animated.Text>}
      </View>
    </View>
  );
}

/** Flies in from below with a tilt, settles at -3 degrees and keeps a gentle bob */
function TiltIn({ children, style, reduce, delay = 200, bob = true }: { children: React.ReactNode; style?: any; reduce: boolean; delay?: number; bob?: boolean }) {
  const t = useSharedValue(reduce ? 1 : 0);
  const o = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: reduce ? 320 : 260 }));
    if (reduce) return;
    t.value = withDelay(delay, withSpring(1, { damping: 13, stiffness: 110, mass: 1 }));
    if (bob) b.value = withDelay(delay + 900, withRepeat(withSequence(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
    return () => { cancelAnimation(b); cancelAnimation(t); };
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateY: (1 - t.value) * 90 - b.value * 6 },
      { rotate: `${-3 + (1 - t.value) * -7 + b.value * 0.8}deg` },
      { scale: 0.94 + 0.06 * t.value },
    ],
  }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

function Avatar({ uri, size, name }: { uri?: string | null; size: number; name?: string | null }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(0,0,0,0.08)' }} />;
  return (
    <LinearGradient colors={['#3FA845', '#86BD2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: WHITE, fontWeight: '800', fontSize: size * 0.42 }}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
    </LinearGradient>
  );
}

// 2 · top post (violet)
function TopPost({ s, L, reduce, dir, me, onOpenPost }: SlideProps) {
  const { k, y } = L;
  const tp = s?.topPost;
  if (!tp) return null;
  const stats = [
    (tp.view_count ?? 0) > 0 ? { n: tp.view_count!, label: tp.view_count === 1 ? 'view' : 'views' } : null,
    tp.likes > 0 ? { n: tp.likes, label: tp.likes === 1 ? 'like' : 'likes' } : null,
  ].filter(Boolean) as { n: number; label: string }[];
  const thumbH = 150 * k;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Float3D source={ART.spark} size={140 * k} style={{ left: -20 * k, top: y(120) }} spin reduce={reduce} dir={dir} depth={1.3} period={5000} />
      <Animated.Text pointerEvents="none" entering={rise(d(0), reduce)} style={[head(30 * k, WHITE, 34 * k), { position: 'absolute', left: 24, right: 24, top: y(150), textAlign: 'right' }]} maxFontSizeMultiplier={1.1}>
        Your post that{'\n'}went furthest
      </Animated.Text>
      <TiltIn reduce={reduce} delay={d(1) + 60} style={{ position: 'absolute', left: 30 * k, right: 30 * k, top: y(290) }}>
        <Pressable
          onPress={() => onOpenPost(tp.id)}
          style={({ pressed }) => [styles.postCard, { padding: 16 * k, borderRadius: 22 * k }, pressed && { transform: [{ scale: 0.97 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Open this post"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar uri={me?.avatar_url} size={36 * k} name={me?.full_name || me?.username} />
            <Text style={{ color: INK, fontWeight: '700', fontSize: 15 * k, flexShrink: 1 }} numberOfLines={1}>{me?.full_name || me?.username || 'You'}</Text>
            {me?.username ? <Text style={{ color: '#6B6B70', fontSize: 14 * k, flexShrink: 1 }} numberOfLines={1}>@{me.username}</Text> : null}
          </View>
          <Text style={{ color: INK, fontSize: 17 * k, lineHeight: 23 * k, marginTop: 10 * k }} numberOfLines={tp.thumbnail_url ? 3 : 4} maxFontSizeMultiplier={1.1}>{tp.content}</Text>
          {tp.thumbnail_url ? (
            <Image source={{ uri: tp.thumbnail_url }} style={{ height: thumbH, borderRadius: 14 * k, marginTop: 10 * k, backgroundColor: '#E9E6F7' }} resizeMode="cover" />
          ) : null}
        </Pressable>
      </TiltIn>
      {stats.length > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: Math.max(L.bottom, 16) + y(90), flexDirection: 'row', gap: 28 * k }}>
          {stats.map((x, i) => (
            <Animated.View key={x.label} entering={rise(d(3 + i), reduce)}>
              <CountUp to={x.n} format={fmt} delay={d(3 + i) + 150} duration={1000} reduce={reduce} tick={i === stats.length - 1} style={big(54 * k, WHITE, -2)} />
              <Text style={{ color: 'rgba(255,255,255,0.86)', fontSize: 14 * k }}>{x.label}</Text>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

// 3 · followers (lime, ink text)
function Followers({ s, L, reduce, dir }: SlideProps) {
  const { k, y, W } = L;
  const n = s?.followers ?? 0;
  const fs = fitSize(`+${fmt(n)}`, W - 48, 150 * k, 0.62);
  const dots = [CORAL, VIOLET, TEAL, AMBER].slice(0, Math.min(4, n));
  const rest = n - dots.length;
  const sz = 44 * k;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Float3D source={ART.rings} size={240 * k} style={{ left: W / 2 - 120 * k, top: y(130) }} reduce={reduce} dir={dir} depth={1} tilt={-8} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(420), alignItems: 'center' }}>
        <Animated.View entering={rise(d(0), reduce)}>
          <CountUp to={n} prefix="+" format={fmt} delay={d(0) + 120} tick reduce={reduce} style={[big(fs, INK), { textAlign: 'center' }]} />
        </Animated.View>
        <Animated.Text entering={rise(d(1), reduce)} style={[head(24 * k, INK), { marginTop: 6 * k, textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>
          {n === 1 ? 'new person followed you' : 'new people followed you'}
        </Animated.Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 22 * k }}>
          {dots.map((c, i) => (
            <Animated.View key={c} entering={pop(d(3) + i * 90, reduce)} style={[styles.dot, { width: sz, height: sz, borderRadius: sz / 2, backgroundColor: c, marginLeft: i ? -12 * k : 0 }]} />
          ))}
          {rest > 0 && (
            <Animated.View entering={pop(d(3) + dots.length * 90, reduce)} style={[styles.dot, { width: sz + (rest > 99 ? 12 : 0), height: sz, borderRadius: sz / 2, backgroundColor: INK, marginLeft: -12 * k, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: LIME, fontSize: 12 * k, fontWeight: '800' }} maxFontSizeMultiplier={1}>+{fmt(rest)}</Text>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

// 4 · biggest fan (teal)
function Fan({ s, L, reduce, dir, onThanks, thanking }: SlideProps) {
  const { k, y, W } = L;
  const f = s?.topFan;
  if (!f) return null;
  const av = 180 * k;
  const times = f.count === 1 ? 'once' : f.count === 2 ? 'twice' : `${f.count} times`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Float3D source={ART.bubble} size={170 * k} style={{ right: -10 * k, top: y(120) }} reduce={reduce} dir={dir} depth={1.2} period={5000} tilt={6} />
      <Animated.Text pointerEvents="none" entering={rise(d(0), reduce)} style={[head(30 * k, WHITE, 34 * k), { position: 'absolute', left: 24, top: y(150) }]} maxFontSizeMultiplier={1.1}>
        Your biggest{'\n'}fan this week
      </Animated.Text>
      <View pointerEvents="none" style={{ position: 'absolute', left: W / 2 - av / 2, top: y(300), width: av, height: av, alignItems: 'center', justifyContent: 'center' }}>
        <PulseRing size={av + 16} reduce={reduce} delay={900} />
        <Animated.View entering={pop(d(1), reduce, 0.3)} style={[styles.fanRing, { width: av + 16, height: av + 16, borderRadius: (av + 16) / 2 }]}>
          <Avatar uri={f.avatar_url} size={av} name={f.full_name || f.username} />
        </Animated.View>
      </View>
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(510), alignItems: 'center' }} pointerEvents="box-none">
        <Animated.Text pointerEvents="none" entering={rise(d(2), reduce)} style={[head(34 * k, WHITE), { textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>@{f.username}</Animated.Text>
        <Animated.Text pointerEvents="none" entering={rise(d(3), reduce)} style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 * k, marginTop: 8 * k, textAlign: 'center' }} maxFontSizeMultiplier={1.2}>
          liked and replied to you {times}
        </Animated.Text>
        <Animated.View entering={rise(d(4), reduce)}>
          <Pressable onPress={onThanks} disabled={thanking} style={({ pressed }) => [styles.whitePill, { marginTop: 22 * k, height: 46, paddingHorizontal: 22 }, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityRole="button" accessibilityLabel={`Say thanks to ${f.username}`}>
            {thanking ? <ActivityIndicator color={TEAL} /> : <Text style={{ color: TEAL, fontWeight: '800', fontSize: 16 }}>Say thanks</Text>}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// 5 · streak (amber, ink text)
function Streak({ s, L, reduce, dir }: SlideProps) {
  const { k, y, W } = L;
  const a = Math.max(0, Math.min(7, s?.activeDays ?? 0));
  const letters = useMemo(() => weekLetters(s?.since), [s?.since]);
  const label = `${a} of 7`;
  const fs = fitSize(label, W - 48, 130 * k, 0.56);
  const ds = 34 * k;
  const dotDelay = (i: number) => d(2) + 140 + i * 150;
  // A soft tick as each active day lands
  useEffect(() => {
    const ts = Array.from({ length: a }, (_, i) => setTimeout(() => Haptics.selectionAsync().catch(() => {}), dotDelay(i) + 120));
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Float3D source={ART.flame} size={220 * k} style={{ left: W / 2 - 110 * k, top: y(130) }} reduce={reduce} dir={dir} depth={1} amp={18} period={3200} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(420), alignItems: 'center' }}>
        <Reveal delay={d(0)} reduce={reduce} height={fs}>
          <Text style={[big(fs, INK), { textAlign: 'center' }]} maxFontSizeMultiplier={1}>{label}</Text>
        </Reveal>
        <Animated.Text entering={rise(d(1), reduce)} style={[head(24 * k, INK), { marginTop: 6 * k, textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>
          {a === 1 ? 'day, you showed up' : 'days, you showed up'}
        </Animated.Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 * k, marginTop: 26 * k }}>
          {letters.map((l, i) => {
            const on = i < a;
            return (
              <Animated.View key={i} entering={pop(dotDelay(i), reduce)} style={{ width: ds, height: ds, borderRadius: ds / 2, backgroundColor: on ? INK : 'rgba(22,19,15,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: on ? AMBER : INK, fontWeight: '800', fontSize: 13 * k }} maxFontSizeMultiplier={1}>{l}</Text>
              </Animated.View>
            );
          })}
        </View>
        {(s?.streak ?? 0) > 1 && (
          <Animated.Text entering={rise(dotDelay(7) + 60, reduce)} style={{ color: INK, fontSize: 15 * k, marginTop: 18 * k, fontWeight: '600' }} maxFontSizeMultiplier={1.2}>
            A {s!.streak}-day streak and counting.
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

// 6 · baraza (cream, ink text)
function Baraza({ s, L, reduce, dir }: SlideProps) {
  const { k, y, W } = L;
  const n = s?.barazas ?? 0;
  const label = `${fmt(n)}×`;
  const fs = fitSize(label, W - 48, 160 * k, 0.62);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Float3D source={ART.stick} size={170 * k} style={{ right: 20 * k, top: y(110) }} reduce={reduce} dir={dir} depth={1.1} tilt={14} amp={12} period={4600} />
      <Float3D source={ART.pill} size={64 * k} style={{ left: 28 * k, top: y(250) }} reduce={reduce} dir={dir} depth={0.5} delay={420} period={5400} phase={800} tilt={-20} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(400) }}>
        <Animated.Text entering={rise(d(0), reduce)} style={head(26 * k, INK)} maxFontSizeMultiplier={1.2}>You pulled up a stool</Animated.Text>
        <Reveal delay={d(1)} reduce={reduce} height={fs}>
          <Text style={big(fs, INK)} maxFontSizeMultiplier={1}>{label}</Text>
        </Reveal>
        <Animated.Text entering={rise(d(2), reduce)} style={head(22 * k, INK)} maxFontSizeMultiplier={1.2}>in a baraza this week.</Animated.Text>
        <Animated.Text entering={rise(d(4), reduce)} style={{ color: INK_70, fontSize: 15 * k, lineHeight: 20 * k, marginTop: 14 * k }} maxFontSizeMultiplier={1.2}>
          {n >= 2 ? 'You kept coming back to the conversation.' : 'The stools are out again this week.'}
        </Animated.Text>
      </View>
    </View>
  );
}

// 7 · your thing + your day (ink)
function Thing({ s, L, reduce, dir }: SlideProps) {
  const { k, y, W } = L;
  const tag = s?.topTag ? `#${s.topTag.replace(/^#/, '')}` : null;
  const day = s?.bestDay || null;
  const tagFs = tag ? fitSize(tag, W - 48, 96 * k, 0.58) : 0;
  const dayFs = day ? fitSize(day, W - 48, 80 * k, 0.6) : 0;
  let i = 0;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Float3D source={ART.squiggle} size={200 * k} style={{ left: -20 * k, top: y(130) }} reduce={reduce} dir={dir} depth={1.2} period={4400} tilt={-6} />
      <Float3D source={ART.spark} size={64 * k} style={{ right: 36 * k, top: y(210) }} spin reduce={reduce} dir={dir} depth={0.6} delay={400} />
      <View style={{ position: 'absolute', left: 24, right: 24, top: y(tag && day ? 330 : 400) }}>
        {tag && (
          <>
            <Animated.Text entering={rise(d(i++), reduce)} style={styles.kicker} maxFontSizeMultiplier={1.2}>YOUR THING</Animated.Text>
            <Reveal delay={d(i++)} reduce={reduce} height={tagFs}>
              <Text style={big(tagFs, LIME, -4)} numberOfLines={1} maxFontSizeMultiplier={1}>{tag}</Text>
            </Reveal>
          </>
        )}
        {day && (
          <>
            <Animated.Text entering={rise(d(i++), reduce)} style={[styles.kicker, tag ? { marginTop: 40 * k } : null]} maxFontSizeMultiplier={1.2}>YOUR DAY</Animated.Text>
            <Reveal delay={d(i++)} reduce={reduce} height={dayFs}>
              <Text style={big(dayFs, CORAL, -3)} numberOfLines={1} maxFontSizeMultiplier={1}>{day}</Text>
            </Reveal>
            <Animated.Text entering={rise(d(i++) + 60, reduce)} style={{ color: W_80, fontSize: 15 * k, lineHeight: 20 * k, marginTop: 10 * k }} maxFontSizeMultiplier={1.2}>
              Most of your likes and replies came in on {day}.
            </Animated.Text>
          </>
        )}
      </View>
    </View>
  );
}

// 8 · persona (video background)
function PersonaSlide({ s, L, reduce }: SlideProps) {
  const { k, W } = L;
  const p = personaFor(s);
  const fs = Math.min(58 * k, fitSize(p.name, (W - 48) * 2, 58 * k, 0.55));
  useEffect(() => {
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), d(1) + 260);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['rgba(30,18,70,0)', 'rgba(30,18,70,0.55)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%' }} />
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: Math.max(L.bottom, 16) + 48 * k, alignItems: 'center' }}>
        <Animated.Text entering={rise(d(0), reduce)} style={[styles.kicker, { color: W_80, letterSpacing: 1 }]} maxFontSizeMultiplier={1.2}>THIS WEEK YOU WERE</Animated.Text>
        <Reveal delay={d(1)} reduce={reduce} height={fs * 2} style={{ marginTop: 8 * k }}>
          <Text style={[big(fs, WHITE, -2), { textAlign: 'center' }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1}>{p.name}</Text>
        </Reveal>
        <Animated.Text entering={rise(d(3), reduce)} style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16 * k, lineHeight: 22 * k, marginTop: 12 * k, textAlign: 'center' }} maxFontSizeMultiplier={1.2}>
          {p.line}
        </Animated.Text>
      </View>
    </View>
  );
}

// 9 · summary: the shareable card
function Summary({ s, L, reduce, me, share }: SlideProps) {
  const { k, H, W } = L;
  const p = personaFor(s);
  const top = L.top + 74;
  const actionsH = 52 + 44 + Math.max(L.bottom, 16) + 16;
  const cardH = Math.min(560 * k, H - top - actionsH - 12);
  const cardW = W - 48;
  const tiles = [
    { n: fmt(s?.likes ?? 0), l: (s?.likes ?? 0) === 1 ? 'like' : 'likes' },
    { n: `+${fmt(s?.followers ?? 0)}`, l: (s?.followers ?? 0) === 1 ? 'follower' : 'followers' },
    { n: `${s?.activeDays ?? 0}/7`, l: 'days active' },
    { n: fmt(s?.barazas ?? 0), l: (s?.barazas ?? 0) === 1 ? 'baraza' : 'barazas' },
  ];
  const [first, ...restWords] = p.name.split(' ');
  const nameLines = restWords.length ? `${first}\n${restWords.join(' ')}` : p.name;
  const sk = Math.min(1, cardH / 560); // card contents shrink on short phones
  const tileW = (cardW - 40 - 10) / 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TiltIn reduce={reduce} delay={120} style={[styles.cardShadow, { position: 'absolute', left: 24, right: 24, top, height: cardH }]}>
        <View pointerEvents="none" style={[styles.card, { height: cardH }]}>
          <Float3D source={ART.trophy} size={150 * sk} style={{ right: -20 * sk, top: 10 * sk }} reduce={reduce} delay={420} amp={8} period={4200} />
          <Text style={{ position: 'absolute', left: 20, top: 22 * sk, color: W_80, fontSize: 13, fontWeight: '700' }} maxFontSizeMultiplier={1.1}>
            {me?.username ? `@${me.username} · ` : ''}week of {weekOfLabel(s?.since)}
          </Text>
          <Text style={[big(40 * sk, WHITE, -1.5), { position: 'absolute', left: 18, top: 58 * sk, lineHeight: 42 * sk, width: cardW - 150 * sk }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1}>
            {nameLines}
          </Text>
          <View style={{ position: 'absolute', left: 20, right: 20, top: 180 * sk, flexDirection: 'row', flexWrap: 'wrap', gap: 10 * sk }}>
            {tiles.map((t, i) => (
              <Animated.View key={t.l} entering={pop(520 + i * 90, reduce, 0.6)} style={[styles.tile, { width: tileW, padding: 12 * sk }]}>
                <Text style={big(38 * sk, WHITE, -1)} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>{t.n}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.86)', fontSize: 13 }} maxFontSizeMultiplier={1.1}>{t.l}</Text>
              </Animated.View>
            ))}
          </View>
          {(s?.topTag || s?.bestDay) ? (
            <Text style={{ position: 'absolute', left: 20, right: 20, bottom: 60 + 26 * sk, color: 'rgba(255,255,255,0.92)', fontSize: 14 }} numberOfLines={2} maxFontSizeMultiplier={1.1}>
              {s?.topTag ? <>Top topic <Text style={{ color: LIME, fontWeight: '800' }}>#{s.topTag.replace(/^#/, '')}</Text></> : null}
              {s?.topTag && s?.bestDay ? '  ·  ' : ''}
              {s?.bestDay ? <>Best day <Text style={{ color: PEACH, fontWeight: '800' }}>{s.bestDay}</Text></> : null}
            </Text>
          ) : null}
          <View style={styles.cardFoot}>
            <Image source={ART.logo} style={{ width: 30, height: 30, borderRadius: 8 }} />
            <Text style={{ color: WHITE, fontSize: 13, fontWeight: '700', flex: 1 }} maxFontSizeMultiplier={1.1}>KChat · Kenya, say your piece</Text>
          </View>
        </View>
      </TiltIn>

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: Math.max(L.bottom, 16) + 6 }} pointerEvents="box-none">
        {share.done ? (
          <Animated.View entering={rise(0, reduce, 16)} style={styles.doneRow} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={22} color={LIME} />
            <Text style={{ color: WHITE, fontSize: 16, fontWeight: '700' }}>{share.done}</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={rise(d(4), reduce)}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={share.toStory} disabled={!!share.busy || !s} style={({ pressed }) => [styles.whitePill, { flex: 1, height: 52 }, (pressed || !!share.busy) && { opacity: 0.85 }, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button">
                {share.busy === 'story' ? <ActivityIndicator color={INK} /> : <Text style={{ color: INK, fontWeight: '800', fontSize: 16 }}>Share to story</Text>}
              </Pressable>
              <Pressable onPress={share.toMore} disabled={!!share.busy || !s} style={({ pressed }) => [styles.round, (pressed || !!share.busy) && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Share to other apps">
                {share.busy === 'more' ? <ActivityIndicator color={WHITE} /> : <Ionicons name="share-outline" size={22} color={WHITE} />}
              </Pressable>
            </View>
            <Pressable onPress={share.toPost} disabled={!!share.busy || !s} style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 12 }} hitSlop={6} accessibilityRole="button">
              <Text style={{ color: W_70, fontSize: 13, fontWeight: '600' }}>{share.busy === 'post' ? 'Posting' : 'Post it to your feed instead'}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  postCard: { backgroundColor: WHITE, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 18 },
  dot: { borderWidth: 3, borderColor: LIME },
  fanRing: { backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 14 },
  whitePill: { borderRadius: 26, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  ghostPill: { height: 42, paddingHorizontal: 20, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  ghostPillText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 28, backgroundColor: VIOLET, overflow: 'hidden' },
  cardShadow: { borderRadius: 28, backgroundColor: VIOLET, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 20 },
  tile: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16 },
  cardFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.2)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  doneRow: { height: 52, marginBottom: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
