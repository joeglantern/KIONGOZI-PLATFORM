// The way into Baraza from Explore, as an App Store "Today" card: a floating 3D island with six
// stools around the talking stick. When barazas are live, the biggest one's stools fill with the
// host, whoever has the stick and the hands up (in line order), and the frosted strip at the bottom
// becomes Join; the other live ones list underneath.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useBarazaStore, LiveBaraza, BarazaPerson } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { useTheme } from '../../hooks/useTheme';
import { ART, ISLAND, MiniStick } from './barazaArt';

const SEATS = 6;

export function BarazaStrip() {
  const T = useTheme();
  const live = useBarazaStore(s => s.live);
  useEffect(() => {
    const { fetchLive } = useBarazaStore.getState();
    fetchLive();
    const t = setInterval(fetchLive, 30_000);
    return () => clearInterval(t);
  }, []);

  const top = live[0] || null;
  const rest = live.slice(1, 4);

  const start = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    useBarazaStore.getState().openStart();
  };
  const open = (b: LiveBaraza) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    useBarazaStore.getState().open(b.id, b);
  };

  return (
    <View style={{ marginBottom: 6 }}>
      <TodayCard top={top} onPress={top ? () => open(top) : start} />
      {rest.length > 0 && (
        <View style={styles.more}>
          <View style={styles.moreHead}>
            <Text style={[styles.moreTitle, { color: T.text }]}>More barazas</Text>
            <Pressable onPress={start} hitSlop={8} accessibilityRole="button">
              <Text style={styles.moreLink}>Start one</Text>
            </Pressable>
          </View>
          {rest.map((b, i) => (
            <Pressable key={b.id} onPress={() => open(b)} accessibilityRole="button"
              accessibilityLabel={`Join ${b.title}, ${b.count} listening`}
              style={({ pressed }) => [styles.row, i < rest.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border }, pressed && { opacity: 0.6 }]}>
              <LinearGradient colors={['#C9C6F2', '#FFD9A8']} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={styles.rowArt}>
                <Image source={ART.stool} style={{ width: 28, height: 29 }} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: T.text }]} numberOfLines={1}>{b.title}</Text>
                <Text style={[styles.rowSub, { color: T.textSub }]} numberOfLines={1}>@{b.host?.username} · {b.count} listening</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: T.surface2 }]}><Text style={styles.pillText}>JOIN</Text></View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function TodayCard({ top, onPress }: { top: LiveBaraza | null; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const W = width - 40;
  const H = Math.round(Math.min(452, W * 1.2));
  const IW = Math.min(W * 0.84, 300);       // island width
  const IH = IW * ISLAND.ratio;
  const left = (W - IW) / 2;
  const topY = H * 0.25;

  // the island floats, clouds drift
  const f = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    f.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    c.value = withRepeat(withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [f, c]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + f.value * 8 }] }));
  const cloudA = useAnimatedStyle(() => ({ transform: [{ translateX: c.value * 26 }] }));
  const cloudB = useAnimatedStyle(() => ({ transform: [{ translateX: -c.value * 20 }] }));

  // the stick stands in the hearth
  const stickH = IW * 0.27;
  const frameH = stickH / (ISLAND.restBottom - ISLAND.restTop);
  const frameW = frameH * ISLAND.frameRatio;
  const hx = ISLAND.hearth[0] * IW;
  const hy = ISLAND.hearth[1] * IH;
  const stickLeft = hx - frameW * ISLAND.restCx;
  const stickTop = hy - frameH * ISLAND.restBottom + 4;
  const glow = IW * 0.22;

  // The stools are the host, whoever has the stick and the hands up (the server sends them in that order)
  const faces: BarazaPerson[] = top?.faces?.length ? top.faces.slice(0, SEATS)
    : top ? [top.host, top.speaker].filter((p, i, a): p is BarazaPerson => !!p && a.findIndex(q => q?.id === p.id) === i) : [];
  const taken = faces.length;
  const AV = Math.max(26, IW * 0.105);

  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={top ? `Live baraza: ${top.title}. ${top.count} listening. Join` : 'Baraza. Start a baraza'}
      style={({ pressed }) => [styles.card, { width: W, height: H }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <LinearGradient
        colors={top ? ['#8F86E0', '#C7A9E4', '#F9C49B', '#FFD8AE'] : ['#B9B4F0', '#DCC7EC', '#FBD3B0', '#FFE2BF']}
        locations={[0, 0.42, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <Animated.Image source={ART.cloud} style={[{ position: 'absolute', left: -12, top: H * 0.3, width: 92, height: 53, opacity: 0.92 }, cloudA]} />
      {!top ? <Animated.Image source={ART.cloud} style={[{ position: 'absolute', right: -8, top: H * 0.22, width: 70, height: 40, opacity: 0.82 }, cloudB]} /> : null}

      <Animated.View style={[{ position: 'absolute', left, top: topY, width: IW, height: IH }, float]}>
        <View style={[styles.islandGlow, { left: IW * 0.2, right: IW * 0.2, bottom: 0, height: IH * 0.18, borderRadius: IW }]} />
        <Image source={ART.island} style={{ width: IW, height: IH }} fadeDuration={0} />
        <Glow size={glow} x={hx} y={stickTop + frameH * 0.06} live={!!top} />
        <View style={{ position: 'absolute', left: stickLeft, top: stickTop }}>
          <MiniStick height={stickH} />
        </View>
        {faces.slice(0, SEATS).map((p, i) => {
          const [sx, sy] = ISLAND.stools[i];
          return (
            <Seat key={p.id} i={i} size={AV} x={sx * IW - AV / 2} y={sy * IH - AV * 0.95}>
              <UserAvatar avatarUrl={p.avatar_url ?? undefined} name={p.full_name || p.username} size={AV - 5} />
            </Seat>
          );
        })}
      </Animated.View>

      <View style={styles.copy} pointerEvents="none">
        <Text style={[styles.eyebrow, { color: top ? 'rgba(255,255,255,0.88)' : 'rgba(40,24,70,0.6)' }]}>
          {top ? 'HAPPENING NOW' : 'NEW ON KCHAT'}
        </Text>
        <Text style={[styles.title, { color: top ? '#FFFFFF' : '#1E1236' }, top && styles.titleShadow]} numberOfLines={2}>
          {top ? top.title : 'Pull up a stool.\nSay your piece.'}
        </Text>
      </View>

      <View style={styles.strip}>
        {top ? (
          <View style={{ width: 44, height: 44 }}>
            <UserAvatar avatarUrl={(top.speaker || top.host)?.avatar_url ?? undefined} name={(top.speaker || top.host)?.full_name || (top.speaker || top.host)?.username} size={44} />
            <View style={styles.liveBadge}><Image source={ART.iconLive} style={{ width: 14, height: 14 }} /></View>
          </View>
        ) : (
          <LinearGradient colors={['#FFE1A8', '#F2A81D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.appIcon}>
            <Image source={ART.stick} style={{ width: 12, height: 72 * 0.5, transform: [{ rotate: '-24deg' }] }} resizeMode="contain" />
          </LinearGradient>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.stripTitle} numberOfLines={1}>
            {top ? `@${(top.speaker || top.host)?.username || ''} has the stick` : 'Baraza'}
          </Text>
          <Text style={styles.stripSub} numberOfLines={1}>
            {top ? `${top.count} listening · ${taken} of ${SEATS} stools taken` : 'One voice at a time'}
          </Text>
        </View>
        <View style={[styles.cta, top && { backgroundColor: '#007AFF' }]}>
          <Text style={[styles.ctaText, top && { color: '#FFFFFF' }]}>{top ? 'JOIN' : 'START'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Glow({ size, x, y, live }: { size: number; x: number; y: number; live: boolean }) {
  const g = useSharedValue(0);
  useEffect(() => {
    g.value = withRepeat(withTiming(1, { duration: live ? 1600 : 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [g, live]);
  const st = useAnimatedStyle(() => ({ opacity: 0.5 + g.value * 0.5, transform: [{ scale: 0.9 + g.value * (live ? 0.4 : 0.25) }] }));
  return (
    <Animated.Image source={ART.glow}
      style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, tintColor: '#FFD27A' }, st]} />
  );
}

/** Someone sitting on a stool: pops in, then bobs gently. */
function Seat({ i, size, x, y, children }: { i: number; size: number; x: number; y: number; children: React.ReactNode }) {
  const b = useSharedValue(0);
  useEffect(() => {
    b.value = withDelay(i * 380, withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [b, i]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -b.value * 3 }] }));
  return (
    <Animated.View entering={ZoomIn.delay(200 + i * 90).springify().damping(11)}
      style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2 }, styles.seat, st]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center', borderRadius: 22, overflow: 'hidden', marginTop: 4,
    shadowColor: '#3A2470', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5,
  },
  islandGlow: { position: 'absolute', backgroundColor: 'rgba(255,160,80,0.28)' },
  copy: { position: 'absolute', left: 20, right: 20, top: 18 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: -0.08 },
  title: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: 0.36, marginTop: 2 },
  titleShadow: { textShadowColor: 'rgba(60,30,110,0.28)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  strip: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 76, paddingHorizontal: 16, gap: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.95)',
  },
  appIcon: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  liveBadge: {
    position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  stripTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.24, color: '#000000' },
  stripSub: { fontSize: 13, letterSpacing: -0.08, color: 'rgba(60,60,67,0.7)', marginTop: 1 },
  cta: { height: 30, borderRadius: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(118,118,128,0.14)' },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
  seat: {
    borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  more: { marginHorizontal: 20, marginTop: 18 },
  moreHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  moreTitle: { flex: 1, fontSize: 22, fontWeight: '700', letterSpacing: 0.35 },
  moreLink: { fontSize: 17, color: '#007AFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowArt: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.24 },
  rowSub: { fontSize: 13, marginTop: 1 },
  pill: { height: 30, borderRadius: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
});
