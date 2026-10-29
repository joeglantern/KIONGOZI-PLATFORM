// Mitaa ("streets"): short clips laid out as a map instead of one endless line.
// Swipe up/down to change street (For you, people you follow, busy #tags, Fresh); swipe
// left/right to walk further down the street you're on. Each street remembers where you were.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMitaaStore, Street } from '../../stores/mitaaStore';
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
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const streets = useMitaaStore(s => s.streets);
  const loaded = useMitaaStore(s => s.loaded);
  const loading = useMitaaStore(s => s.loading);
  const pos = useMitaaStore(s => s.pos);
  const { fetch, more, setPos } = useMitaaStore.getState();
  const [row, setRow] = useState(0);
  const [muted, setMuted] = useState(!soundOn);
  const [comments, setComments] = useState(false);
  const [coach, setCoach] = useState(false);
  const viewed = useRef<string | null>(null);

  useEffect(() => { fetch(); }, [fetch]);
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
          {loading || !loaded ? <ActivityIndicator color={HONEY} /> : (
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
      )}

      {/* Where you are: the street, your place on it, and what's below */}
      {street && size && !comments && (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <Animated.View key={street.key} entering={FadeInDown.duration(220)} style={styles.pillWrap} pointerEvents="none">
            <View style={styles.pill}>
              <Text style={styles.pillTitle} numberOfLines={1}>{street.title}</Text>
              <Text style={styles.pillCount}>{at + 1}/{street.more ? `${street.clips.length}+` : street.clips.length}</Text>
            </View>
            <Dots count={Math.min(street.clips.length, 9)} at={Math.min(at, 8)} />
          </Animated.View>
          <View style={styles.actions}>
            <Pressable onPress={toggleSound} style={styles.round} hitSlop={8} accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={19} color="#fff" />
            </Pressable>
            <Pressable onPress={() => useClipStore.getState().openComposer()} style={[styles.round, { backgroundColor: HONEY }]} hitSlop={8} accessibilityLabel="Post a clip">
              <Ionicons name="add" size={22} color="#1A1206" />
            </Pressable>
          </View>
        </View>
      )}
      {next && size && !comments && (
        <View style={[styles.nextHint, { top: insets.top + 60 }]} pointerEvents="none">
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
      />
    </View>
  );
}

const StreetRow = React.memo(function StreetRow({ street, W, H, active, near, start, muted, bottomInset, locked, onToggleSound, onComments, onIndex }: {
  street: Street; W: number; H: number; active: boolean; near: boolean; start: number; muted: boolean; bottomInset: number; locked: boolean;
  onToggleSound: () => void; onComments: () => void; onIndex: (i: number) => void;
}) {
  const [i, setI] = useState(Math.min(start, Math.max(0, street.clips.length - 1)));
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
        renderItem={({ item, index }) => (
          <ClipItem
            post={item}
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

function Dots({ count, at }: { count: number; at: number }) {
  if (count < 2) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, k) => (
        <View key={k} style={[styles.dot, k === at && styles.dotOn]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 14 },
  pillWrap: { alignItems: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, borderRadius: 17, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', maxWidth: 240 },
  pillTitle: { color: '#fff', fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3, flexShrink: 1 },
  pillCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontVariant: ['tabular-nums'], fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 4, marginTop: 7, marginLeft: 14 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { width: 14, backgroundColor: HONEY },
  actions: { flexDirection: 'row', gap: 10 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
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
