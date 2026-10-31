// Mitaa ("streets"): short clips in one vertical feed, one clip per swipe, like TikTok and Reels.
// The streets (For you, people you follow, busy #tags, Fresh) are tabs along the top. Each street
// remembers where you were, and a street never dead-ends: when it runs out the feed walks straight
// on into the next one and a small sign says where you are now.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable, ActivityIndicator, ViewToken, Platform, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, FadeOut } from 'react-native-reanimated';
import { SHEET_IN, SHEET_OUT, EASE_OUT, enterFade, enterDown } from '../../theme/motion';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMitaaStore, Street } from '../../stores/mitaaStore';
import type { Post } from '../../stores/socialStore';
import { useClipStore } from '../../stores/clipStore';
import { ClipItem } from '../../components/mzinga/ClipPlayer';
import { ClipComments } from '../../components/mzinga/ClipComments';
import { setFeedPaused } from '../../components/social/videoPlayback';
import { NATIVE_TABS, TAB_INSET } from '../../navigation/tabInset';
import apiClient from '../../utils/apiClient';

const HONEY = '#F2B544';
const SIGN_MS = 2000;
const UL_W = 18;
let soundOn = true;

/** One row of the feed: a clip, the street it belongs to and where it sits on that street */
type Row = { post: Post; key: string; title: string; kind: Street['kind']; idx: number; len: number };

// The feed starts on the street you picked and, once a street has nothing more to load, carries on
// into the next one (wrapping round), skipping clips you already passed on an earlier street.
function buildRows(streets: Street[], base: number): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (let n = 0; n < streets.length; n++) {
    const s = streets[(base + n) % streets.length];
    s.clips.forEach((post, idx) => {
      if (seen.has(post.id)) return;
      seen.add(post.id);
      rows.push({ post, key: s.key, title: s.title, kind: s.kind, idx, len: s.clips.length });
    });
    if (s.more) break; // this street can still load more; walk on only once it has run out
  }
  return rows;
}

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
  const { fetch, more, setPos } = useMitaaStore.getState();
  // The street the feed starts from (the tab you picked), and a counter that restarts the list
  const [baseKey, setBaseKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [muted, setMuted] = useState(!soundOn);
  const [comments, setComments] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [sign, setSign] = useState<{ id: number; title: string } | null>(null);
  const signTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewed = useRef<string | null>(null);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => () => { if (signTimer.current) clearTimeout(signTimer.current); }, []);
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

  const baseIdx = Math.max(0, streets.findIndex(s => s.key === baseKey));
  const base: Street | undefined = streets[baseIdx];
  const rows = useMemo(() => buildRows(streets, baseIdx), [streets, baseIdx]);
  const listKey = `${base?.key ?? ''}:${nonce}`;
  // Where this street's list opens: the place you left it (read once per list)
  const startAt = useMemo(() => {
    if (!base) return 0;
    const p = useMitaaStore.getState().pos[base.key] ?? 0;
    return Math.max(0, Math.min(p, base.clips.length - 1));
  }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The clip on screen, tied to the list it belongs to so a fresh list never inherits an old index
  const [act, setAct] = useState<{ k: string; i: number }>({ k: listKey, i: startAt });
  const keyRef = useRef(listKey);
  keyRef.current = listKey;
  const active = act.k === listKey ? act.i : startAt;
  const at = Math.max(0, Math.min(active, rows.length - 1));
  const row = rows[at];
  const current = row?.post;
  const currentKey = row?.key ?? base?.key;

  // The next clip starts as soon as it is mostly on screen, not after the scroll settles
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const v = viewableItems.find(x => x.isViewable);
    if (v?.index == null) return;
    const i = v.index;
    setAct(prev => (prev.k === keyRef.current && prev.i === i ? prev : { k: keyRef.current, i }));
  }).current;
  const viewability = useRef({ itemVisiblePercentThreshold: 55 }).current;

  // Landing on a clip: remember the spot on its street, load more near the end, and when the feed
  // has walked on into the next street, show the street sign for a moment
  const seenList = useRef<string | null>(null);
  const lastKey = useRef<string | null>(null);
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!row) return;
    const fresh = seenList.current !== listKey;
    seenList.current = listKey;
    if (!fresh && lastId.current && lastId.current !== row.post.id) Haptics.selectionAsync().catch(() => {});
    lastId.current = row.post.id;
    setPos(row.key, row.idx);
    if (row.idx >= row.len - 3) more(row.key);
    if (!fresh && lastKey.current && lastKey.current !== row.key) {
      if (signTimer.current) clearTimeout(signTimer.current);
      setSign({ id: Date.now(), title: row.title });
      signTimer.current = setTimeout(() => setSign(null), SIGN_MS);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    lastKey.current = row.key;
  }, [listKey, row?.post.id, row?.key, row?.idx, row?.len]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count a view once per clip you land on
  useEffect(() => {
    if (!focused || !current || viewed.current === current.id) return;
    viewed.current = current.id;
    useClipStore.getState().markSeen(current.id);
    apiClient.recordPostView(current.id).catch(() => {});
  }, [focused, current?.id]);

  // Tabs: tap a street to land where you left it; tap the one you're on to go to its top and refresh
  const pickTab = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setComments(false);
    setScrubbing(false);
    if (signTimer.current) clearTimeout(signTimer.current);
    setSign(null);
    if (key === currentKey) {
      setPos(key, 0);
      useMitaaStore.getState().fetch();
    }
    setBaseKey(key);
    setNonce(n => n + 1);
  }, [currentKey, setPos]);

  const bottomInset = NATIVE_TABS ? TAB_INSET - 8 : 6;
  const openProfile = useCallback((username: string) => navigation.navigate('PublicProfile', { username }), [navigation]);
  const notInterested = useCallback((p: Post) => {
    Haptics.selectionAsync().catch(() => {});
    useMitaaStore.getState().hide(p.id);
    useClipStore.setState(st => ({ clips: st.clips.filter(x => x.id !== p.id) }));
  }, []);
  const openComments = useCallback(() => setComments(true), []);
  const noop = useCallback(() => {}, []);

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

  const H = size?.H ?? 0;
  const W = size?.W ?? 0;
  const renderItem = useCallback(({ item, index }: { item: Row; index: number }) => (
    <ClipItem
      post={item.post}
      onProfile={openProfile}
      onNotInterested={notInterested}
      followed={item.kind === 'following'}
      W={W}
      H={H}
      // Three players at most: this clip plays, the ones either side load quietly, the rest are posters
      state={focused && index === at ? 'play' : focused && Math.abs(index - at) === 1 ? 'warm' : 'cold'}
      muted={muted}
      onToggleSound={toggleSound}
      onClose={noop}
      onComments={openComments}
      onScrub={setScrubbing}
      chrome={!comments}
      bottomInset={bottomInset}
      hideTop
    />
  ), [W, H, focused, at, muted, comments, bottomInset, openProfile, notInterested, toggleSound, openComments, noop]);

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
          {/* Switching street is a quick fade, no slide: there's no swipe to match */}
          <Animated.View key={listKey} entering={enterFade(180)} style={{ flex: 1 }}>
            <FlatList
              data={rows}
              keyExtractor={r => r.post.id}
              renderItem={renderItem}
              extraData={at}
              // Exactly one clip per swipe, however hard the fling, and no bounce at either end
              pagingEnabled
              snapToInterval={H}
              snapToAlignment="start"
              disableIntervalMomentum
              decelerationRate="fast"
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              initialScrollIndex={Math.min(startAt, Math.max(0, rows.length - 1))}
              getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
              onViewableItemsChanged={onViewable}
              viewabilityConfig={viewability}
              scrollEnabled={!comments && !scrubbing}
              windowSize={3}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* Streets as tabs along the top, like For You / Following */}
      {size && streets.length > 0 && !comments && (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <View style={styles.bar} pointerEvents="box-none">
            <StreetTabs streets={streets} current={currentKey} onPick={pickTab} />
            <Pressable onPress={toggleSound} style={[styles.quiet, styles.left]} hitSlop={8} accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" style={styles.iconShadow} />
            </Pressable>
            <Pressable onPress={() => useClipStore.getState().openComposer()} style={[styles.quiet, styles.right]} hitSlop={8} accessibilityLabel="Post a clip">
              <Ionicons name="add" size={28} color="#fff" style={styles.iconShadow} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Street sign: only when the feed walks on into the next street */}
      {sign && !comments && (
        <Animated.View key={sign.id} entering={enterDown(220)} exiting={FadeOut.duration(220)} style={[styles.sign, { top: insets.top + 54 }]} pointerEvents="none">
          <Ionicons name="return-down-forward" size={14} color={HONEY} />
          <Text style={styles.signText} numberOfLines={1}>Now in <Text style={styles.signName}>{sign.title}</Text></Text>
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

// A row of street names, centred, scrolling sideways if they don't fit. The one you're on is bold
// white with a honey underline that glides to the next tab on the same calm curve as everything else.
function StreetTabs({ streets, current, onPick }: { streets: Street[]; current?: string; onPick: (key: string) => void }) {
  const ref = useRef<ScrollView>(null);
  const boxes = useRef<Record<string, { x: number; w: number }>>({});
  const [viewW, setViewW] = useState(0);
  const [tick, setTick] = useState(0);
  const ulX = useSharedValue(-100);
  const placed = useRef(false);
  useEffect(() => {
    const b = current ? boxes.current[current] : undefined;
    if (!b) return;
    const x = b.x + b.w / 2 - UL_W / 2;
    if (!placed.current) { ulX.value = x; placed.current = true; }
    else ulX.value = withTiming(x, { duration: 200, easing: EASE_OUT });
    if (viewW) ref.current?.scrollTo({ x: Math.max(0, b.x + b.w / 2 - viewW / 2), animated: true });
  }, [current, tick, viewW, ulX]);
  const ul = useAnimatedStyle(() => ({ transform: [{ translateX: ulX.value }] }));
  return (
    <View style={styles.tabsWrap} onLayout={e => setViewW(e.nativeEvent.layout.width)}>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsIn}>
        {streets.map(s => {
          const on = s.key === current;
          return (
            <Pressable
              key={s.key}
              onPress={() => onPick(s.key)}
              onLayout={e => {
                const { x, width } = e.nativeEvent.layout;
                const b = boxes.current[s.key];
                if (b && b.x === x && b.w === width) return;
                boxes.current[s.key] = { x, w: width };
                setTick(t => t + 1);
              }}
              style={styles.tab}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={on ? `${s.title}, tap to go to the top and refresh` : s.title}
            >
              <Text style={[styles.tabText, on && styles.tabOn]} numberOfLines={1}>{s.title}</Text>
            </Pressable>
          );
        })}
        <Animated.View style={[styles.underline, ul]} pointerEvents="none" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: { position: 'absolute', left: 0, right: 0, top: 0 },
  bar: { height: 40 },
  tabsWrap: { position: 'absolute', left: 50, right: 50, top: 0, height: 40 },
  tabsIn: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tab: { height: 40, paddingHorizontal: 9, justifyContent: 'center' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', letterSpacing: -0.2, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  tabOn: { color: '#fff', fontWeight: '800' },
  underline: { position: 'absolute', left: 0, bottom: 3, width: UL_W, height: 2.5, borderRadius: 2, backgroundColor: HONEY },
  iconShadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
  quiet: { position: 'absolute', top: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  left: { left: 6 },
  right: { right: 6 },
  sign: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 13, borderRadius: 15, backgroundColor: 'rgba(14,12,9,0.82)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.4)', maxWidth: 280 },
  signText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  signName: { color: HONEY, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 14 },
  emptySub: { color: 'rgba(255,255,255,0.6)', fontSize: 14.5, marginTop: 6, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: HONEY },
  emptyBtnText: { color: '#1A1206', fontSize: 15.5, fontWeight: '800' },
});
