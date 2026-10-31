// "Who's here": everyone in the baraza, who has the stick, whose hand is up, and (for people who
// chose to share) where in Kenya they're listening from, shown as glowing pins on a 3D map.
// You can follow people from here, and choose whether to show your own county.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput, Image, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn, FadeOut, FadeInDown, SlideInDown, SlideOutDown, SlideInRight, SlideOutRight, ZoomIn,
  LinearTransition, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useBarazaStore, barazaApi, BarazaState } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { VerifiedBadge } from '../social/VerifiedBadge';
import { useBT, BarazaTheme } from './barazaTheme';
import { ART, HandMark, PaintedStick } from './barazaArt';
import { COUNTY_PINS, KENYA_COUNTIES, KENYA_MAP_RATIO } from './kenyaMap';

const MAP = require('../../../assets/baraza/kenya_map.png');
const REMEMBER = 'baraza_from_v1';

type Person = BarazaState['people'][number];

/** Share your county in this room automatically if you chose to before (called after joining). */
export async function applyRememberedCounty(roomId: string) {
  try {
    const c = await AsyncStorage.getItem(REMEMBER);
    if (c && COUNTY_PINS[c]) await barazaApi(`/${roomId}/from`, 'POST', { county: c });
  } catch {}
}

export function WhoSheet({ visible, onClose, state }: { visible: boolean; onClose: () => void; state: BarazaState }) {
  const t = useBT();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const meId = useAuthStore(s => s.user?.id);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [follow, setFollow] = useState<Record<string, boolean>>({});

  useEffect(() => { if (!visible) { setPicking(false); setFilter(null); } }, [visible]);

  const room = state.room;
  const isFollowing = (p: Person) => follow[p.user_id] ?? !!p.following;
  const toggleFollow = async (p: Person) => {
    const next = !isFollowing(p);
    Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    setFollow(f => ({ ...f, [p.user_id]: next }));
    try {
      const r: any = next ? await apiClient.followUserNow(p.user_id) : await apiClient.unfollowUserNow(p.user_id);
      if (r && r.success === false) setFollow(f => ({ ...f, [p.user_id]: !next }));
    } catch { setFollow(f => ({ ...f, [p.user_id]: !next })); }
  };

  const setCounty = async (county: string | null) => {
    Haptics.selectionAsync().catch(() => {});
    setPicking(false);
    try { county ? await AsyncStorage.setItem(REMEMBER, county) : await AsyncStorage.removeItem(REMEMBER); } catch {}
    await barazaApi(`/${room.id}/from`, 'POST', { county });
    useBarazaStore.getState().refresh();
  };

  // Group: the stick, hands up (in order), everyone else
  const groups = useMemo(() => {
    const ppl = state.people.filter(p => !filter || p.from === filter);
    const holder = ppl.filter(p => p.user_id === room.holder_id);
    const queue = state.queue.map(id => ppl.find(p => p.user_id === id)).filter(Boolean) as Person[];
    const rest = ppl.filter(p => p.user_id !== room.holder_id && !state.queue.includes(p.user_id))
      .sort((a, b) => (a.user_id === meId ? -1 : b.user_id === meId ? 1 : 0));
    return { holder, queue, rest };
  }, [state, filter, meId, room.holder_id]);

  const places = state.places || [];
  const myCounty = state.me?.from || null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(19).stiffness(170)} exiting={SlideOutDown.duration(200)}
            style={[s.sheet, { height: H * 0.88, backgroundColor: t.dark ? '#171D38' : '#FFFFFF' }]}>
            <View style={[s.grab, { backgroundColor: t.line }]} />

            {picking ? (
              <CountyPicker t={t} current={myCounty} onPick={setCounty} onBack={() => setPicking(false)} bottom={insets.bottom} />
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={s.head}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.kicker, { color: t.faint }]}>WHO'S HERE</Text>
                    <Text style={[s.title, { color: t.ink }]} numberOfLines={1}>{room.title}</Text>
                  </View>
                  <Pressable onPress={onClose} style={[s.close, { backgroundColor: t.soft }]} hitSlop={8} accessibilityLabel="Close">
                    <Ionicons name="close" size={20} color={t.ink} />
                  </Pressable>
                </View>

                {/* Stats */}
                <View style={s.stats}>
                  <Stat t={t} icon={ART.iconListen} value={state.count} label="here now" />
                  <Stat t={t} icon={ART.iconLive} value={state.queue.length} label={state.queue.length === 1 ? 'hand up' : 'hands up'} />
                  <Stat t={t} pin value={places.length} label={places.length === 1 ? 'county' : 'counties'} />
                </View>

                {/* The map */}
                <KenyaMap t={t} places={places} active={filter} onPin={c => { Haptics.selectionAsync().catch(() => {}); setFilter(f => (f === c ? null : c)); }} />
                {filter ? (
                  <Animated.View entering={FadeIn} style={s.filterRow}>
                    <Pressable onPress={() => setFilter(null)} style={[s.filterChip, { backgroundColor: t.accent }]}>
                      <Text style={[s.filterText, { color: t.accentInk }]}>Listening from {filter}</Text>
                      <Ionicons name="close" size={15} color={t.accentInk} />
                    </Pressable>
                  </Animated.View>
                ) : places.length === 0 ? (
                  <Text style={[s.mapHint, { color: t.faint }]}>Nobody has shared where they're listening from yet.</Text>
                ) : (
                  <Text style={[s.mapHint, { color: t.faint }]}>Tap a pin to see who's listening from there.</Text>
                )}

                {/* You */}
                {state.me?.joined ? (
                  <Pressable onPress={() => setPicking(true)} style={[s.you, { backgroundColor: t.soft }]}
                    accessibilityRole="button" accessibilityLabel={myCounty ? `You're showing ${myCounty}. Change` : 'Share where you are listening from'}>
                    <View style={[s.youIcon, { backgroundColor: t.dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
                      <Image source={ART.pin} style={{ width: 26, height: 26 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.youTitle, { color: t.ink }]}>{myCounty ? `You're listening from ${myCounty}` : 'Where are you listening from?'}</Text>
                      <Text style={[s.youSub, { color: t.sub }]}>{myCounty ? 'Everyone here sees your county. Tap to change or hide it.' : 'Optional. Only your county shows, never your exact location.'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.faint} />
                  </Pressable>
                ) : null}

                {/* People */}
                {groups.holder.length > 0 && (
                  <Section t={t} title="Has the stick">
                    {groups.holder.map(p => <Row key={p.user_id} p={p} t={t} me={p.user_id === meId} holder following={isFollowing(p)} onFollow={() => toggleFollow(p)} />)}
                  </Section>
                )}
                {groups.queue.length > 0 && (
                  <Section t={t} title="Hands up" note="Next in line to speak">
                    {groups.queue.map((p, i) => <Row key={p.user_id} p={p} t={t} me={p.user_id === meId} queuePos={i + 1} following={isFollowing(p)} onFollow={() => toggleFollow(p)} />)}
                  </Section>
                )}
                {groups.rest.length > 0 && (
                  <Section t={t} title="Listening">
                    {groups.rest.map(p => <Row key={p.user_id} p={p} t={t} me={p.user_id === meId} following={isFollowing(p)} onFollow={() => toggleFollow(p)} />)}
                  </Section>
                )}
                {state.count > state.people.length ? (
                  <Text style={[s.mapHint, { color: t.faint, marginTop: 4 }]}>and {state.count - state.people.length} more</Text>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </>
      )}
    </Modal>
  );
}

function Stat({ t, icon, pin, value, label }: { t: BarazaTheme; icon?: any; pin?: boolean; value: number; label: string }) {
  return (
    <View style={[s.stat, { backgroundColor: t.soft }]}>
      <Image source={pin ? ART.pin : icon} style={{ width: 22, height: 22 }} />
      <Animated.Text key={value} entering={ZoomIn.springify().damping(12)} style={[s.statValue, { color: t.ink }]}>{value}</Animated.Text>
      <Text style={[s.statLabel, { color: t.sub }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** The 3D map of Kenya with a glowing pin per county people are listening from. */
function KenyaMap({ t, places, active, onPin }: { t: BarazaTheme; places: { county: string; n: number }[]; active: string | null; onPin: (c: string) => void }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 120, 260);
  const Hm = W * KENYA_MAP_RATIO;
  const max = Math.max(1, ...places.map(p => p.n));
  // the map breathes gently, like it's floating
  const f = useSharedValue(0);
  useEffect(() => { f.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true); }, [f]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -3 + f.value * 6 }] }));
  return (
    <View style={[s.mapWrap, { height: Hm + 16 }]}>
      <View style={[s.mapGlow, { width: W * 1.15, height: W * 1.15, borderRadius: W, backgroundColor: t.glow, opacity: t.dark ? 0.12 : 0.16 }]} />
      <Animated.View style={[{ width: W, height: Hm }, float]}>
        <Image source={MAP} style={{ width: W, height: Hm, opacity: t.dark ? 0.92 : 1 }} resizeMode="contain" />
        {places.map((p, i) => {
          const xy = COUNTY_PINS[p.county];
          if (!xy) return null;
          const size = 18 + (p.n / max) * 16;
          return (
            <MapPin key={p.county} x={xy[0] * W} y={xy[1] * Hm} size={size} n={p.n} i={i}
              dim={!!active && active !== p.county} on={active === p.county} onPress={() => onPin(p.county)} label={p.county} />
          );
        })}
      </Animated.View>
    </View>
  );
}

function MapPin({ x, y, size, n, i, dim, on, onPress, label }: {
  x: number; y: number; size: number; n: number; i: number; dim: boolean; on: boolean; onPress: () => void; label: string;
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(i * 260, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
  }, [pulse, i]);
  const ring = useAnimatedStyle(() => ({ opacity: (1 - pulse.value) * 0.55, transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  return (
    <Animated.View entering={ZoomIn.delay(200 + i * 70).springify().damping(10)}
      style={{ position: 'absolute', left: x - size / 2, top: y - size + 3, width: size, height: size, opacity: dim ? 0.35 : 1 }}>
      <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${n} listening from ${label}`}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: size * 0.35, width: size, height: size * 0.6, borderRadius: size, backgroundColor: '#FF8A4C' }, ring]} />
        <Image source={ART.pin} style={{ width: size, height: size, transform: [{ scale: on ? 1.25 : 1 }] }} />
        {n > 1 ? (
          <View style={s.pinCount}><Text style={s.pinCountText}>{n}</Text></View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function Section({ t, title, note, children }: { t: BarazaTheme; title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={s.secHead}>
        <Text style={[s.secTitle, { color: t.ink }]}>{title}</Text>
        {note ? <Text style={[s.secNote, { color: t.faint }]}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Row({ p, t, me, holder, queuePos, following, onFollow }: {
  p: Person; t: BarazaTheme; me: boolean; holder?: boolean; queuePos?: number; following: boolean; onFollow: () => void;
}) {
  const name = p.profile?.full_name || p.profile?.username || 'Someone';
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} layout={LinearTransition.springify().damping(18)} style={s.row}>
      <View>
        <View style={[s.avatarRing, { borderColor: holder ? t.accent : queuePos ? t.accent : 'transparent' }]}>
          <UserAvatar avatarUrl={p.profile?.avatar_url ?? undefined} name={name} size={44} />
        </View>
        {holder ? <View style={s.badge}><PaintedStick height={22} tilt={-30} /></View> : null}
        {queuePos ? <View style={s.badge}><HandMark size={18} /></View> : null}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[s.name, { color: t.ink }]} numberOfLines={1}>{name}</Text>
          {p.profile?.is_verified ? <VerifiedBadge size={14} /> : null}
          {me ? <Text style={[s.youTag, { color: t.faint }]}>· you</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Text style={[s.handle, { color: t.sub }]} numberOfLines={1}>
            @{p.profile?.username}{p.role === 'host' ? ' · host' : ''}{queuePos ? ` · #${queuePos} in line` : ''}
          </Text>
        </View>
        {p.from ? (
          <View style={s.fromRow}>
            <Image source={ART.pin} style={{ width: 13, height: 13 }} />
            <Text style={[s.from, { color: t.sub }]}>{p.from}</Text>
          </View>
        ) : null}
      </View>
      {!me ? (
        <Pressable onPress={onFollow} accessibilityRole="button" accessibilityLabel={following ? `Unfollow ${name}` : `Follow ${name}`}
          style={({ pressed }) => [s.follow, following ? { backgroundColor: t.soft } : { backgroundColor: t.ink }, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Text style={[s.followText, { color: following ? t.ink : t.dark ? '#141A33' : '#FFFFFF' }]}>{following ? 'Following' : 'Follow'}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function CountyPicker({ t, current, onPick, onBack, bottom }: {
  t: BarazaTheme; current: string | null; onPick: (c: string | null) => void; onBack: () => void; bottom: number;
}) {
  const [q, setQ] = useState('');
  const list = KENYA_COUNTIES.filter(c => c.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Animated.View entering={SlideInRight.springify().damping(20)} exiting={SlideOutRight.duration(160)} style={{ flex: 1 }}>
      <View style={s.head}>
        <Pressable onPress={onBack} style={[s.close, { backgroundColor: t.soft }]} hitSlop={8} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={t.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.title, { color: t.ink }]}>Listening from</Text>
          <Text style={[s.youSub, { color: t.sub }]}>Your county shows next to your name in barazas. We'll remember it.</Text>
        </View>
      </View>
      <View style={[s.search, { backgroundColor: t.soft }]}>
        <Ionicons name="search" size={17} color={t.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search counties" placeholderTextColor={t.faint}
          style={[s.searchInput, { color: t.ink }]} autoCorrect={false} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottom + 24 }}>
        <Pressable onPress={() => onPick(null)} style={s.pickRow}>
          <Ionicons name="eye-off-outline" size={19} color={t.sub} />
          <Text style={[s.pickText, { color: t.ink }]}>Keep it private</Text>
          {!current ? <Ionicons name="checkmark-circle" size={20} color={t.accent} /> : null}
        </Pressable>
        {list.map(c => (
          <Pressable key={c} onPress={() => onPick(c)} style={({ pressed }) => [s.pickRow, pressed && { backgroundColor: t.soft }]}>
            <Image source={ART.pin} style={{ width: 18, height: 18, opacity: current === c ? 1 : 0.55 }} />
            <Text style={[s.pickText, { color: t.ink }]}>{c}</Text>
            {current === c ? <Ionicons name="checkmark-circle" size={20} color={t.accent} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, overflow: 'hidden' },
  grab: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  kicker: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4, marginTop: 1 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 14 },
  stat: { flex: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 12 },
  statValue: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, marginTop: 6, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12.5, fontWeight: '600', marginTop: 1 },
  mapWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  mapGlow: { position: 'absolute' },
  mapHint: { textAlign: 'center', fontSize: 13, marginTop: 6, paddingHorizontal: 24 },
  filterRow: { alignItems: 'center', marginTop: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, borderRadius: 16, paddingHorizontal: 14 },
  filterText: { fontSize: 13.5, fontWeight: '700' },
  pinCount: { position: 'absolute', right: -6, top: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#16130F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pinCountText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  you: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 18, borderRadius: 20, padding: 14 },
  youIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  youTitle: { fontSize: 15, fontWeight: '700' },
  youSub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  secTitle: { fontSize: 16, fontWeight: '800' },
  secNote: { fontSize: 12.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 9 },
  avatarRing: { borderWidth: 2.5, borderRadius: 26, padding: 1.5 },
  badge: { position: 'absolute', right: -4, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  name: { fontSize: 15.5, fontWeight: '700', flexShrink: 1 },
  youTag: { fontSize: 13 },
  handle: { fontSize: 13, flexShrink: 1 },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  from: { fontSize: 12.5, fontWeight: '600' },
  follow: { height: 34, borderRadius: 17, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  followText: { fontSize: 13.5, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 14, marginBottom: 6, borderRadius: 14, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 15.5 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, height: 50 },
  pickText: { flex: 1, fontSize: 16, fontWeight: '600' },
});
