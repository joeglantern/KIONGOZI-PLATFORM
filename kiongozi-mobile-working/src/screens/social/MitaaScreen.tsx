// Mitaa ("streets"): short clips laid out as a map instead of one endless line.
// Swipe up/down to change street (For you, people you follow, busy #tags, Fresh); swipe
// left/right to walk further down the street you're on. Each street remembers where you were.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { SHEET_IN, SHEET_OUT, enterUp } from '../../theme/motion';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMitaaStore, Street } from '../../stores/mitaaStore';
import type { Post } from '../../stores/socialStore';
import { useClipStore } from '../../stores/clipStore';
import { ClipItem } from '../../components/mzinga/ClipPlayer';
import { ClipComments } from '../../components/mzinga/ClipComments';
import { setFeedPaused } from '../../components/social/videoPlayback';
import { NATIVE_TABS, TAB_INSET } from '../../navigation/tabInset';
import apiClient from '../../utils/apiClient';

const HONEY = '#F2B544';
const COACH_KEY = 'kchat.mitaa.coach';
let soundOn = true;

export default function MitaaScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const navigation = useNavigation<any>();
  const { height: winH } = useWindowDimensions();
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const streets = useMitaaStore(s => s.streets);
  const loaded = useMitaaStore(s => s.loaded);
  const loading = useMitaaStore(s => s.loading);
  const error = useMitaaStore(s => s.error);
  const pos = useMitaaStore(s => s.pos);
  const { fetch, more, setPos } = useMitaaStore.getState();
  const [row, setRow] = useState(0);
  const [muted, setMuted] = useState(!soundOn);
  const [comments, setComments] = useState(false);
  const [coach, setCoach] = useState(false);
  const viewed = useRef<string | null>(null);

  useEffect(() => { fetch(); }, [fetch]);
  // Tapping the Mitaa tab again while you're on it retries a failed or empty load
  useEffect(() => {
    const tabs = navigation.getParent?.();
    if (!tabs) return;
    return tabs.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      const st = useMitaaStore.getState();
      if (st.error || !st.streets.length) st.fetch();
    });
  }, [navigation]);
  useEffect(() => { setFeedPaused('mitaa', focused); return () => setFeedPaused('mitaa', false); }, [focused]);

  // One-time hint so the two directions are obvious
  useEffect(() => {
    if (!focused || !streets.length) return;
    AsyncStorage.getItem(COACH_KEY).then(v => {
      if (v) return;
      setCoach(true);
      AsyncStorage.setItem(COACH_KEY, '1').catch(() => {});
      setTimeout(() => setCoach(false), 4200);
    }).catch(() => {});
  }, [focused, streets.length]);

  const street: Street | undefined = streets[Math.min(row, Math.max(0, streets.length - 1))];
  const at = street ? Math.min(pos[street.key] ?? 0, Math.max(0, street.clips.length - 1)) : 0;
  const current = street?.clips[at];

  // Count a view once per clip you land on
  useEffect(() => {
    if (!focused || !current || viewed.current === current.id) return;
    viewed.current = current.id;
    useClipStore.getState().markSeen(current.id);
    apiClient.recordPostView(current.id).catch(() => {});
  }, [focused, current?.id]);

  const bottomInset = NATIVE_TABS ? TAB_INSET - 8 : 6;
  const openProfile = useCallback((username: string) => navigation.navigate('PublicProfile', { username }), [navigation]);
  const notInterested = useCallback((p: Post) => {
    Haptics.selectionAsync().catch(() => {});
    useMitaaStore.getState().hide(p.id);
    useClipStore.setState(st => ({ clips: st.clips.filter(x => x.id !== p.id) }));
  }, []);

  // Comments open: the clip shrinks into the space above the sheet and keeps playing (like the hive player)
  const cp = useSharedValue(0);
  useEffect(() => { cp.value = comments ? withTiming(1, SHEET_IN) : withTiming(0, SHEET_OUT); }, [comments, cp]);
  const sheetTall = Math.round(winH * 0.64) + Math.max(0, TAB_INSET - insets.bottom);
  const frameH = size?.H || winH;
  const shrink = useAnimatedStyle(() => {
    const h = frameH;
    const s = Math.max(0.2, (h - sheetTall - insets.top - 8) / h);
    return {
      transform: [
        { translateY: interpolate(cp.value, [0, 1], [0, -h * (1 - s) / 2 + insets.top + 4]) },
        { scale: interpolate(cp.value, [0, 1], [1, s]) },
      ],
      borderRadius: interpolate(cp.value, [0, 1], [0, 18]),
    };
  });
  const toggleSound = useCallback(() => { soundOn = muted; setMuted(m => !m); Haptics.selectionAsync().catch(() => {}); }, [muted]);

  const onRowEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!size) return;
    const i = Math.round(e.nativeEvent.contentOffset.y / size.H);
    if (i !== row) { setRow(i); setComments(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
  };

  const next = streets[row + 1];

  return (
    <View style={styles.root} onLayout={e => setSize({ W: e.nativeEvent.layout.width, H: e.nativeEvent.layout.height })}>
      {!size ? null : !streets.length ? (
        <View style={[styles.empty, { paddingTop: insets.top }]}>
          {loading || !loaded ? <ActivityIndicator color={HONEY} /> : error ? (
            <>
              <Ionicons name="cloud-offline-outline" size={40} color={HONEY} />
              <Text style={styles.emptyTitle}>Couldn't load Mitaa</Text>
              <Text style={styles.emptySub}>Check your connection and try again.</Text>
              <Pressable onPress={() => fetch()} style={styles.emptyBtn} accessibilityRole="button">
                <Ionicons name="refresh" size={18} color="#1A1206" />
                <Text style={styles.emptyBtnText}>Retry</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="map-outline" size={40} color={HONEY} />
              <Text style={styles.emptyTitle}>Mitaa is quiet</Text>
              <Text style={styles.emptySub}>Post the first clip and start a street.</Text>
              <Pressable onPress={() => useClipStore.getState().openComposer()} style={styles.emptyBtn} accessibilityRole="button">
                <Ionicons name="add" size={18} color="#1A1206" />
                <Text style={styles.emptyBtnText}>Post a clip</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <Animated.View style={[{ flex: 1, overflow: 'hidden' }, shrink]}>
        <FlatList
          data={streets}
          keyExtractor={s => s.key}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: size.H, offset: size.H * i, index: i })}
          onMomentumScrollEnd={onRowEnd}
          scrollEnabled={!comments}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          renderItem={({ item, index }) => (
            <StreetRow
              street={item}
              nextTitle={streets[index + 1]?.title}
              onProfile={openProfile}
              onNotInterested={notInterested}
              W={size.W}
              H={size.H}
              active={focused && index === row}
              near={focused && Math.abs(index - row) === 1}
              start={pos[item.key] ?? 0}
              muted={muted}
              bottomInset={bottomInset}
              locked={comments}
              onToggleSound={toggleSound}
              onComments={() => setComments(true)}
              onIndex={i => { setPos(item.key, i); if (i >= item.clips.length - 3) more(item.key); }}
            />
          )}
        />
        </Animated.View>
      )}

      {/* Where you are: the street, your place on it, and what's below */}
      {street && size && !comments && (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <View style={styles.bar} pointerEvents="box-none">
          {/* Centred plain title like the big apps, the street you're on and your place on it under it */}
          <View style={styles.titleWrap} pointerEvents="none">
            <Text style={styles.title} accessibilityRole="header">Mitaa</Text>
            <Animated.View key={street.key} entering={enterUp(220)} style={styles.titleSub}>
              <Text style={styles.streetName} numberOfLines={1}>{street.title}</Text>
              <Dots count={street.clips.length} at={at} />
            </Animated.View>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={toggleSound} style={styles.quiet} hitSlop={8} accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" style={styles.iconShadow} />
            </Pressable>
            <Pressable onPress={() => useClipStore.getState().openComposer()} style={styles.quiet} hitSlop={8} accessibilityLabel="Post a clip">
              <Ionicons name="add" size={28} color="#fff" style={styles.iconShadow} />
            </Pressable>
          </View>
          </View>
        </View>
      )}
      {next && size && !comments && (
        <View style={[styles.nextHint, { top: insets.top + 80 }]} pointerEvents="none">
          <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={styles.nextText} numberOfLines={1}>{next.title}</Text>
        </View>
      )}

      {coach && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)} style={styles.coach} pointerEvents="none">
          <View style={styles.coachCard}>
            <View style={styles.coachRow}><Ionicons name="swap-vertical" size={22} color={HONEY} /><Text style={styles.coachText}>Swipe up or down to change street</Text></View>
            <View style={styles.coachRow}><Ionicons name="swap-horizontal" size={22} color={HONEY} /><Text style={styles.coachText}>Swipe sideways to walk the street</Text></View>
          </View>
        </Animated.View>
      )}

      <ClipComments
        post={current || null}
        open={comments}
        onClose={() => setComments(false)}
        onCount={(id, n) => useMitaaStore.getState().bumpComments(id, n)}
        bottomInset={TAB_INSET}
      />
    </View>
  );
}

const StreetRow = React.memo(function StreetRow({ street, nextTitle, W, H, active, near, start, muted, bottomInset, locked, onToggleSound, onComments, onIndex, onProfile, onNotInterested }: {
  street: Street; nextTitle?: string; W: number; H: number; active: boolean; near: boolean; start: number; muted: boolean; bottomInset: number; locked: boolean;
  onToggleSound: () => void; onComments: () => void; onIndex: (i: number) => void;
  onProfile: (username: string) => void; onNotInterested: (p: Post) => void;
}) {
  const [i, setI] = useState(Math.min(start, Math.max(0, street.clips.length - 1)));
  // A clip was hidden at the end: step back onto the last page that still exists
  const last = street.more ? street.clips.length - 1 : street.clips.length;
  useEffect(() => { if (i > last) setI(Math.max(0, last)); }, [i, last]);
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const n = Math.round(e.nativeEvent.contentOffset.x / W);
    if (n !== i) { setI(n); onIndex(n); Haptics.selectionAsync().catch(() => {}); }
  };
  const initial = useMemo(() => Math.min(start, Math.max(0, street.clips.length - 1)), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ width: W, height: H }}>
      <FlatList
        horizontal
        data={street.clips}
        keyExtractor={p => p.id}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        initialScrollIndex={initial}
        getItemLayout={(_, k) => ({ length: W, offset: W * k, index: k })}
        onMomentumScrollEnd={onEnd}
        scrollEnabled={!locked}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        ListFooterComponent={street.more ? null : <StreetEnd W={W} H={H} title={street.title} next={nextTitle} bottomInset={bottomInset} />}
        renderItem={({ item, index }) => (
          <ClipItem
            post={item}
            onProfile={onProfile}
            onNotInterested={onNotInterested}
            followed={street.kind === 'following'}
            W={W}
            H={H}
            state={active && index === i ? 'play' : (active && Math.abs(index - i) === 1) || (near && index === i) ? 'warm' : 'cold'}
            muted={muted}
            onToggleSound={onToggleSound}
            onClose={() => {}}
            onComments={onComments}
            chrome={!locked}
            bottomInset={bottomInset}
            hideTop
          />
        )}
      />
    </View>
  );
});

// End of a street: say so and point at the next one
function StreetEnd({ W, H, title, next, bottomInset }: { W: number; H: number; title: string; next?: string; bottomInset: number }) {
  return (
    <View style={[styles.end, { width: W, height: H, paddingBottom: bottomInset }]}>
      <View style={styles.endCard}>
        <Ionicons name="flag-outline" size={30} color={HONEY} />
        <Text style={styles.endTitle}>{`You've walked all of ${title}`}</Text>
        {next ? (
          <View style={styles.endRow}>
            <Ionicons name="chevron-up" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.endSub}>{`Swipe up for ${next}`}</Text>
          </View>
        ) : (
          <Text style={styles.endSub}>{"That's every street for now"}</Text>
        )}
      </View>
    </View>
  );
}

// At most 9 dots; the window slides so the lit dot always matches where you are
const MAX_DOTS = 9;
function Dots({ count, at }: { count: number; at: number }) {
  if (count < 2) return null;
  const n = Math.min(count, MAX_DOTS);
  const from = Math.max(0, Math.min(at - Math.floor(n / 2), count - n));
  return (
    <View style={styles.dots}>
      {Array.from({ length: n }).map((_, k) => {
        const idx = from + k;
        const edge = (k === 0 && from > 0) || (k === n - 1 && from + n < count);
        return <View key={k} style={[styles.dot, edge && styles.dotEdge, idx === at && styles.dotOn]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: { position: 'absolute', left: 0, right: 0, top: 0 },
  bar: { height: 40 },
  titleWrap: { position: 'absolute', left: 90, right: 90, top: 9, alignItems: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.4, lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  titleSub: { alignItems: 'center', marginTop: 1 },
  streetName: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4, maxWidth: 200 },
  iconShadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { width: 14, backgroundColor: HONEY },
  dotEdge: { width: 3, height: 3, marginTop: 1 },
  end: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  endCard: { alignItems: 'center', gap: 10, backgroundColor: 'rgba(22,19,14,0.94)', borderRadius: 22, paddingVertical: 26, paddingHorizontal: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.35)', maxWidth: 320 },
  endTitle: { color: '#fff', fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', letterSpacing: -0.3 },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  endSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
  actions: { position: 'absolute', right: 6, top: 0, flexDirection: 'row', alignItems: 'center', gap: 2 },
  quiet: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  nextHint: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 3, opacity: 0.85 },
  nextText: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, fontWeight: '600', maxWidth: 200 },
  coach: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  coachCard: { backgroundColor: 'rgba(22,19,14,0.94)', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, gap: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.35)' },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coachText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 14 },
  emptySub: { color: 'rgba(255,255,255,0.6)', fontSize: 14.5, marginTop: 6, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: HONEY },
  emptyBtnText: { color: '#1A1206', fontSize: 15.5, fontWeight: '800' },
});
