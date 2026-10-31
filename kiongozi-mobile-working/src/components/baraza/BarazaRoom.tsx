// A baraza in progress: everyone gathered under the tree. The stick holder sits in the middle
// inside a ring of beads that go dark as their turn runs; everyone else is seated in an arc
// below, hands up are a numbered queue, and captions run under the speaker.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, AppState, useWindowDimensions, ActivityIndicator, Image } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, LinearTransition, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useBarazaStore, barazaApi, BarazaState, BarazaPerson } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { audioAvailable, TurnRecorder, SegmentPlayer, PlayableSegment, uploadChunk, askMic, setRoomAudioMode, DELAY_LABEL } from './barazaAudio';
import { Stick, BeadRing, TreeShade, PillButton, mmss } from './barazaUi';
import { TalkingStick, HandMark, ThemeSheet, ART, PaintedStick } from './barazaArt';
import { useBT, BarazaTheme } from './barazaTheme';
import { BarazaMinutesView } from './BarazaMinutes';
import { WhoSheet, applyRememberedCounty } from './WhoSheet';

const SPEAKER = 132;
const RING = 204;
const STICK_H = 196;

type Seg = PlayableSegment & { id: string; transcript: string | null; transcribed: boolean };

export function BarazaRoom() {
  const t = useBT();
  const insets = useSafeAreaInsets();
  const openId = useBarazaStore(s => s.openId)!;
  const state = useBarazaStore(s => s.state);
  const preview = useBarazaStore(s => s.preview);
  const error = useBarazaStore(s => s.error);
  const { width: W, height: H } = useWindowDimensions();

  useEffect(() => { useBarazaStore.getState().refresh(); }, [openId]);

  const close = () => useBarazaStore.getState().close();

  let body: React.ReactNode;
  if (!audioAvailable) body = <UpdateCard onClose={close} />;
  else if (state?.room.status === 'ended') body = <Ended state={state} onClose={close} />;
  else if (state?.me?.removed) body = <Notice icon="hand-left-outline" title="You were removed" text="The host removed you from this baraza." onClose={close} />;
  else if (state?.me?.joined) body = <Live state={state} />;
  else if (state || preview) body = <Consent state={state} onClose={close} />;
  else if (error) body = <Notice icon="cloud-offline-outline" title="Can't open this baraza" text={error} onClose={close} />;
  else body = <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TreeShade cy={insets.top + Math.min(H * 0.3, 260)} />
      <View style={{ flex: 1, width: W }}>{body}</View>
    </View>
  );
}

// ── Before joining: what it is, who's there, and the recording notice ──
function Consent({ state, onClose }: { state: BarazaState | null; onClose: () => void }) {
  const t = useBT();
  const insets = useSafeAreaInsets();
  const preview = useBarazaStore(s => s.preview);
  const busy = useBarazaStore(s => s.busy);
  const error = useBarazaStore(s => s.error);
  const title = state?.room.title || preview?.title || '';
  const host = state?.host || preview?.host;
  const count = state?.count ?? preview?.count ?? 0;
  const join = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await useBarazaStore.getState().join();
  };
  return (
    <View style={[styles.consentWrap, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }]}>
      <Pressable onPress={onClose} style={[styles.round, { backgroundColor: t.soft }]} hitSlop={8} accessibilityLabel="Close">
        <Ionicons name="chevron-down" size={22} color={t.ink} />
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
            <BeadRing size={132} progress={null} beads={34} />
            <UserAvatar avatarUrl={host?.avatar_url ?? undefined} name={host?.full_name || host?.username} size={84} />
            <View style={{ position: 'absolute', right: -14, bottom: -6 }}><PaintedStick height={86} /></View>
          </View>
        </Animated.View>
        <Text style={[styles.consentTitle, { color: t.ink }]}>{title}</Text>
        <Text style={[styles.consentSub, { color: t.sub }]}>Hosted by @{host?.username || '...'} · {count} here</Text>

        <Animated.View entering={FadeInDown.delay(120)} style={[styles.notice, { backgroundColor: t.card, borderColor: t.line }]}>
          <View style={[styles.recDot, { backgroundColor: t.danger }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: t.ink }]}>This baraza is recorded for minutes</Text>
            <Text style={[styles.noticeText, { color: t.sub }]}>
              Whoever holds the stick is recorded. Their words become captions, and when it ends everyone who was here gets the minutes (summary, key points and promises made). The host decides whether to post them.
            </Text>
          </View>
        </Animated.View>
        <Text style={[styles.rules, { color: t.faint }]}>One voice at a time. Raise your hand and wait your turn; the host passes the stick.</Text>
      </View>
      {error ? <Text style={[styles.err, { color: t.danger }]}>{error}</Text> : null}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <PillButton label={busy ? 'Joining…' : 'Join and listen'} icon="ear-outline" tone="honey" onPress={join} disabled={busy} />
        <PillButton label="Not now" onPress={onClose} />
      </View>
    </View>
  );
}

// ── Inside ──
function Live({ state }: { state: BarazaState }) {
  const t = useBT();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const meId = useAuthStore(s => s.user?.id) || '';
  const skew = useBarazaStore(s => s.skew);
  const error = useBarazaStore(s => s.error);
  const store = useBarazaStore.getState;
  const { room } = state;
  const isHost = room.host_id === meId;
  const holding = room.holder_id === meId;

  // ── realtime pings + polling heartbeat ──
  const [subscribed, setSubscribed] = useState(false);
  const refreshTimer = useRef<any>(null);
  const softRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { store().refresh(); }, 200);
  }, [store]);

  // ── audio out: chunks play back to back ──
  const [now, setNow] = useState<PlayableSegment | null>(null);
  const [captions, setCaptions] = useState<Record<number, Seg>>({});
  const lastSeq = useRef(Math.max(0, state.latest_seq - 1));
  const playerRef = useRef<SegmentPlayer | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const take = useCallback((segs: Seg[]) => {
    if (!segs.length) return;
    setCaptions(c => {
      const next = { ...c };
      for (const s of segs) next[s.seq] = { ...(next[s.seq] || {}), ...s };
      // keep the last 30
      const keys = Object.keys(next).map(Number).sort((a, b) => a - b);
      for (const k of keys.slice(0, Math.max(0, keys.length - 30))) delete next[k];
      return next;
    });
    const fresh = segs.filter(s => s.seq > lastSeq.current).sort((a, b) => a.seq - b.seq);
    if (fresh.length) lastSeq.current = fresh[fresh.length - 1].seq;
    // Your own voice is not played back to you
    playerRef.current?.push(fresh.filter(s => s.speaker_id !== meId));
  }, [meId]);

  const fetchSegments = useCallback(async () => {
    const res = await barazaApi<Seg[]>(`/${room.id}/segments?after=${Math.max(0, lastSeq.current - 6)}`);
    if (res.success) take(res.data || []);
  }, [room.id, take]);

  useEffect(() => {
    if (!active) return;
    setRoomAudioMode(false);
    const p = new SegmentPlayer(setNow);
    p.from(lastSeq.current);
    playerRef.current = p;
    return () => { p.stop(); playerRef.current = null; setNow(null); };
  }, [active]);

  useEffect(() => {
    const ch = supabase
      .channel(`baraza-${room.id}`)
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'baraza_rooms', filter: `id=eq.${room.id}` }, () => softRefresh())
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'baraza_segments', filter: `room_id=eq.${room.id}` },
        (payload: any) => { if (payload?.new) take([payload.new as Seg]); })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'baraza_segments', filter: `room_id=eq.${room.id}` },
        (payload: any) => { if (payload?.new) take([payload.new as Seg]); })
      .subscribe((status: string) => {
        setSubscribed(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') { fetchSegments(); softRefresh(); }
      });
    return () => { supabase.removeChannel(ch); clearTimeout(refreshTimer.current); };
  }, [room.id, take, fetchSegments, softRefresh]);

  // Heartbeat (keeps you counted as here) and a safety net if realtime drops
  useEffect(() => {
    if (!active) return;
    const a = setInterval(() => store().refresh(), 8000);
    const b = setInterval(fetchSegments, subscribed ? 15000 : 4000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [active, subscribed, fetchSegments, store]);

  // ── audio in: record while you hold the stick ──
  const [micOn, setMicOn] = useState(true);
  const recRef = useRef<TurnRecorder | null>(null);
  const chain = useRef(Promise.resolve());
  const n = useRef(0);
  const [sendFail, setSendFail] = useState(false);

  useEffect(() => {
    const want = holding && micOn && active;
    if (!want) {
      const r = recRef.current;
      recRef.current = null;
      r?.stop();
      return;
    }
    let cancelled = false;
    (async () => {
      if (!(await askMic())) {
        Alert.alert('Microphone needed', 'Allow KChat to use the microphone in Settings to speak in a baraza.');
        setMicOn(false);
        return;
      }
      if (cancelled) return;
      const rec = new TurnRecorder(chunk => {
        if (!chunk.loud) return; // silence is not sent
        const i = ++n.current;
        chain.current = chain.current.then(async () => {
          try {
            const path = await uploadChunk(chunk.uri, room.id, meId, i);
            const res = await barazaApi(`/${room.id}/segments`, 'POST', { storage_path: path, duration_ms: chunk.ms });
            setSendFail(!res.success && res.error !== 'You do not have the stick');
          } catch {
            setSendFail(true);
          }
        });
      });
      recRef.current = rec;
      try { await rec.start(); } catch {
        recRef.current = null;
        Alert.alert('Microphone busy', 'Could not start recording. Close other apps using the mic and try again.');
        setMicOn(false);
      }
    })();
    return () => { cancelled = true; };
  }, [holding, micOn, active, room.id, meId]);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  // The stick arriving is felt
  const wasHolding = useRef(holding);
  useEffect(() => {
    if (holding && !wasHolding.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMicOn(true);
    }
    wasHolding.current = holding;
  }, [holding]);

  // ── turn clock ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 500);
    return () => clearInterval(t);
  }, []);
  const serverNow = Date.now() - skew;
  const timed = !!room.turn_ends_at && !!room.turn_started_at;
  const left = timed ? (new Date(room.turn_ends_at!).getTime() - serverNow) / 1000 : null;
  const total = timed ? (new Date(room.turn_ends_at!).getTime() - new Date(room.turn_started_at!).getTime()) / 1000 : null;
  const progress = timed && total ? Math.min(1, Math.max(0, 1 - (left! / total))) : null;
  const askedAt = useRef<string | null>(null);
  useEffect(() => {
    // Time's up: ask the server, which passes the stick on
    if (left !== null && left <= 0 && askedAt.current !== room.turn_ends_at) {
      askedAt.current = room.turn_ends_at;
      store().refresh();
    }
    if (holding && left !== null && Math.ceil(left) === 10) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  });

  // ── people ──
  const byId = useMemo(() => {
    const m = new Map<string, BarazaPerson>();
    for (const p of state.people) if (p.profile) m.set(p.user_id, p.profile);
    if (state.host) m.set(state.host.id, state.host);
    if (state.holder) m.set(state.holder.id, state.holder);
    return m;
  }, [state.people, state.host, state.holder]);
  const queuePos = (id: string) => state.queue.indexOf(id) + 1;
  const myPos = queuePos(meId);
  const nextUp = state.queue[0] ? byId.get(state.queue[0]) : null;
  const seated = state.people.filter(p => p.user_id !== room.holder_id);
  const holder = state.holder;

  const swap = useSharedValue(1);
  useEffect(() => {
    swap.value = withSequence(withTiming(0.86, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 160 }));
  }, [room.holder_id, swap]);
  const swapStyle = useAnimatedStyle(() => ({ transform: [{ scale: swap.value }] }));

  // ── captions: what is playing now (listeners) or your own last words (speaker) ──
  const capList = Object.values(captions).sort((a, b) => a.seq - b.seq);
  let capSpeaker: string | null = null;
  let capLines: string[] = [];
  if (holding) {
    const mine = capList.filter(c => c.speaker_id === meId && c.transcript);
    capLines = mine.slice(-2).map(c => c.transcript!);
    capSpeaker = meId;
  } else if (now) {
    const cur = captions[now.seq];
    const prev = capList.filter(c => c.seq < now.seq && c.speaker_id === now.speaker_id && c.transcript).slice(-1);
    capLines = [...prev.map(c => c.transcript!), cur?.transcript || (cur?.transcribed ? '' : '…')].filter(Boolean);
    capSpeaker = now.speaker_id;
  }

  // ── actions ──
  const tapHand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    store().hand(!state.me?.hand_raised_at);
  };
  const passNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    store().pass();
  };
  const passTo = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    store().pass(id);
  };
  const handBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    store().pass();
  };
  const takeBack = () => store().pass(room.host_id);
  const end = () => {
    Alert.alert('End the baraza?', 'Everyone leaves, and the minutes are written and posted from your account.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'End and write minutes', style: 'destructive', onPress: () => { recRef.current?.stop(); store().end(); } },
    ]);
  };
  const leave = () => {
    if (isHost) {
      Alert.alert('Leave the baraza?', 'If you are away for 5 minutes it ends on its own. You can also end it now.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave for now', onPress: () => store().close() },
        { text: 'End it', style: 'destructive', onPress: end },
      ]);
      return;
    }
    recRef.current?.stop();
    store().leave();
  };
  const turnMenu = () => {
    Alert.alert('Turn length', 'How long each person holds the stick (from the next turn).', [
      ...[60, 120, 180].map(s => ({ text: `${s / 60} minute${s === 60 ? '' : 's'}${room.turn_seconds === s ? ' ✓' : ''}`, onPress: () => store().setTurn(s) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };
  const report = (p: BarazaPerson) => {
    const send = (reason: string) => {
      apiClient.reportContent('user', p.id, reason, `[Baraza ${room.id}] ${room.title}`).then((r: any) => {
        Alert.alert(r?.success ? 'Thanks for telling us' : 'Could not send', r?.success ? 'Our team will look at it.' : r?.error || 'Try again later.');
      });
    };
    Alert.alert(`Report @${p.username}`, 'What is wrong?', [
      { text: 'Harassment', onPress: () => send('harassment') },
      { text: 'Hate speech', onPress: () => send('hate_speech') },
      { text: 'Spam', onPress: () => send('spam') },
      { text: 'Something else', onPress: () => send('other') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const personMenu = (id: string) => {
    const p = byId.get(id);
    if (!p || id === meId) return;
    Haptics.selectionAsync().catch(() => {});
    const opts: any[] = [];
    if (isHost) {
      if (room.holder_id !== id) opts.push({ text: 'Pass the stick', onPress: () => passTo(id) });
      else opts.push({ text: 'Take the stick back', onPress: takeBack });
      opts.push({
        text: 'Remove from baraza', style: 'destructive', onPress: () => Alert.alert(`Remove @${p.username}?`, 'They will not be able to come back to this baraza.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => store().remove(id) },
        ]),
      });
    }
    opts.push({ text: 'Report', onPress: () => report(p) });
    opts.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(p.full_name || `@${p.username}`, `@${p.username}`, opts);
  };

  // ── live level for the stick: your mic while you hold it; otherwise the voice now playing ──
  const level = useSharedValue(0);
  useEffect(() => {
    let k = 0;
    const tm = setInterval(() => {
      k += 1;
      let v = 0.04;
      if (holding && micOn) v = recRef.current?.level ?? 0;
      // Listeners hear words a few seconds behind, so the stick breathes while they play
      else if (now) v = 0.32 + 0.22 * Math.abs(Math.sin(k * 0.55)) + 0.12 * Math.abs(Math.sin(k * 1.7));
      level.value = withTiming(v, { duration: v > level.value ? 70 : 260 });
    }, 80);
    return () => clearInterval(tm);
  }, [holding, micOn, now, level]);

  // ── "passed to" card each time the stick changes hands ──
  const [passedTo, setPassedTo] = useState<BarazaPerson | null>(null);
  const firstHolder = useRef(true);
  useEffect(() => {
    if (firstHolder.current) { firstHolder.current = false; return; }
    if (!holder) return;
    setPassedTo(holder);
    const h = setTimeout(() => setPassedTo(null), 2200);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.holder_id]);

  const [themeOpen, setThemeOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const openWho = () => { Haptics.selectionAsync().catch(() => {}); setWhoOpen(true); };
  // If you chose a county before, show it in this room too (once per room)
  const sharedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.me?.joined || state.me.from || sharedRef.current === room.id) return;
    sharedRef.current = room.id;
    applyRememberedCounty(room.id).then(() => useBarazaStore.getState().refresh());
  }, [room.id, state.me?.joined, state.me?.from]);

  // ── layout ──
  const top = insets.top + 70;
  const arcTop = top + RING + 150;
  const arcN = Math.min(seated.length, 9);
  const extra = seated.length - arcN;
  const shown = seated.slice(0, arcN);
  const late = left !== null && left < 10;
  const hasWords = capLines.length > 0 || holding;

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={leave} style={[styles.round, { backgroundColor: t.soft }]} hitSlop={8} accessibilityLabel="Leave">
          <Ionicons name="chevron-down" size={22} color={t.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          <Text style={[styles.title, { color: t.ink }]} numberOfLines={1}>{room.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: t.soft }]} accessibilityLabel="Live now">
              <LiveIcon />
              <Text style={[styles.metaText, { color: t.danger }]}>Live</Text>
            </View>
            <Pressable onPress={openWho} hitSlop={8} style={({ pressed }) => [styles.metaChip, { backgroundColor: t.soft }, pressed && { transform: [{ scale: 0.95 }] }]}
              accessibilityRole="button" accessibilityLabel={`${state.count} listening. See who's here`}>
              <Image source={ART.iconListen} style={styles.metaIcon} fadeDuration={0} />
              <Text style={[styles.metaText, { color: t.ink }]}>{state.count}</Text>
              <Ionicons name="chevron-down" size={12} color={t.faint} />
            </Pressable>
            <View style={[styles.metaChip, { backgroundColor: t.soft }]} accessibilityLabel="Recorded for minutes">
              <Image source={ART.iconRecorded} style={styles.metaIcon} fadeDuration={0} />
              <Text style={[styles.metaText, { color: t.sub }]}>Minutes</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setThemeOpen(true)} style={[styles.round, { backgroundColor: t.soft }]} hitSlop={6} accessibilityLabel="Room style">
            <Ionicons name="color-palette-outline" size={19} color={t.ink} />
          </Pressable>
          {isHost ? (
            <Pressable onPress={turnMenu} style={[styles.round, { backgroundColor: t.soft }]} hitSlop={6} accessibilityLabel="Turn length">
              <Text style={[styles.turnLen, { color: t.ink }]}>{room.turn_seconds / 60}m</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* The stage: whoever holds the stick */}
      <View style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center' }}>
        {holder ? (
          <Animated.View style={[{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }, swapStyle]}>
            <BeadRing size={RING} progress={progress} />
            <Pressable onPress={() => personMenu(holder.id)} accessibilityLabel={`${holder.username} has the stick`}
              style={[styles.speakerFrame, { backgroundColor: t.card, shadowColor: t.dark ? '#000' : '#6B4A1F' }]}>
              <UserAvatar avatarUrl={holder.avatar_url ?? undefined} name={holder.full_name || holder.username} size={SPEAKER} />
            </Pressable>
            <View style={styles.stickSlot} pointerEvents="box-none">
              <TalkingStick height={STICK_H} level={level} holderKey={room.holder_id} t={t} late={late} />
            </View>
          </Animated.View>
        ) : (
          <Animated.Image entering={FadeIn.duration(300)} source={ART.empty} resizeMode="contain" style={{ width: RING * 1.25, height: RING }} />
        )}
        <Text style={[styles.speakerName, { color: t.ink }]} numberOfLines={1}>
          {holding ? 'You have the stick' : holder ? (holder.full_name || `@${holder.username}`) : 'The stick is waiting'}
        </Text>
        <Text style={[styles.speakerSub, { color: late ? t.danger : t.sub }]}>
          {left !== null ? `${mmss(left)} left` : !holder ? 'The host picks who speaks first' : room.holder_id === room.host_id ? (isHost ? 'Your turn as host · no clock' : 'Host is speaking') : ''}
          {holding && !micOn ? ' · mic off' : ''}
        </Text>

        {/* Captions */}
        <View style={[styles.captions, { width: W - 40, backgroundColor: hasWords ? t.card : 'transparent', borderColor: hasWords ? t.line : 'transparent' }]}>
          {holding && !capLines.length ? (
            <Text style={[styles.capHint, { color: t.faint }]}>Speak. Everyone hears you about {DELAY_LABEL.replace('~', '')} later.</Text>
          ) : capLines.length ? (
            <>
              {capSpeaker && capSpeaker !== room.holder_id && !holding ? (
                <Text style={[styles.capWho, { color: t.accent }]}>@{byId.get(capSpeaker)?.username || '…'}</Text>
              ) : null}
              {capLines.map((l, i) => (
                <Animated.Text key={`${i}-${l.slice(0, 12)}`} entering={FadeIn.duration(220)}
                  style={[styles.capLine, { color: t.ink }, i < capLines.length - 1 && { opacity: 0.45, fontSize: 15 }]}
                  numberOfLines={i < capLines.length - 1 ? 1 : 3}>
                  {l}
                </Animated.Text>
              ))}
            </>
          ) : (
            <Text style={[styles.capHint, { color: t.faint }]}>{now ? 'Listening…' : holder ? 'Waiting for their words…' : ''}</Text>
          )}
        </View>
      </View>

      {/* Everyone else, seated in an arc */}
      <View style={{ position: 'absolute', top: arcTop, left: 0, right: 0, height: 120 }} pointerEvents="box-none">
        {shown.map((p, i) => {
          const tt = arcN === 1 ? 0.5 : i / (arcN - 1);
          const a = Math.PI * (0.1 + 0.8 * tt);
          const x = W / 2 - (W / 2 - 40) * Math.cos(a);
          const y = 40 * Math.sin(a);
          const pos = queuePos(p.user_id);
          return (
            <Animated.View key={p.user_id} entering={ZoomIn.delay(i * 30).springify().damping(13)} exiting={FadeOut}
              layout={LinearTransition.springify().damping(16)} style={{ position: 'absolute', left: x - 23, top: y }}>
              <Pressable onPress={() => personMenu(p.user_id)} accessibilityLabel={`@${p.profile?.username}${pos ? `, hand up, number ${pos}` : ''}`}>
                <View style={[styles.seat, { backgroundColor: t.card, borderColor: pos ? t.accent : p.role === 'host' ? t.line : 'transparent' }]}>
                  <UserAvatar avatarUrl={p.profile?.avatar_url ?? undefined} name={p.profile?.full_name || p.profile?.username} size={40} />
                </View>
                {pos ? (
                  <Animated.View entering={ZoomIn.springify().damping(9)} style={styles.handPop}>
                    <HandMark size={22} wave />
                  </Animated.View>
                ) : null}
                {p.role === 'host' ? <Text style={[styles.hostTag, { color: t.sub }]}>Host</Text> : null}
              </Pressable>
            </Animated.View>
          );
        })}
        {seated.length > 0 && (
          <Pressable onPress={openWho} hitSlop={10} style={[styles.more, { top: 92 }]} accessibilityRole="button" accessibilityLabel="See who's here">
            <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700' }}>{extra > 0 ? `+${extra} more · ` : ''}See who's here</Text>
          </Pressable>
        )}
        {seated.length === 0 ? (
          <Animated.View entering={FadeIn.delay(400)} style={styles.emptyCrowd}>
            <HandMark size={34} />
            <Text style={[styles.emptyText, { color: t.sub }]}>Nobody else has pulled up a chair yet. People who join show up here.</Text>
          </Animated.View>
        ) : null}
      </View>

      {/* "Passed to" card */}
      {passedTo ? (
        <Animated.View entering={ZoomIn.springify().damping(14)} exiting={FadeOut.duration(220)} pointerEvents="none"
          style={[styles.passCard, { top: insets.top + 64, backgroundColor: t.dark ? '#232A4D' : '#FFFFFF', borderColor: t.line }]}>
          <Stick size={30} />
          <Text style={[styles.passText, { color: t.ink }]} numberOfLines={1}>
            {passedTo.id === meId ? 'The stick is yours' : `Stick passed to @${passedTo.username}`}
          </Text>
        </Animated.View>
      ) : null}

      {/* Bottom: hand queue + controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {state.queue.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.queueLabel, { color: t.faint }]}>Next up{isHost ? ' · tap to pass the stick' : ''}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {state.queue.map((id, i) => {
                const p = byId.get(id);
                const mine = id === meId;
                return (
                  <Animated.View key={id} entering={FadeInDown.springify().damping(15)} exiting={FadeOut.duration(160)} layout={LinearTransition.springify().damping(16)}>
                    <Pressable disabled={!isHost} onPress={() => passTo(id)}
                      style={({ pressed }) => [styles.chip, { backgroundColor: mine ? t.accent : t.card, borderColor: t.line }, pressed && { transform: [{ scale: 0.96 }] }]}
                      accessibilityLabel={`${i + 1}. @${p?.username}${isHost ? ', tap to pass the stick' : ''}`}>
                      <View style={[styles.chipNum, { backgroundColor: mine ? t.accentInk : t.accent }]}>
                        <Text style={[styles.chipNumText, { color: mine ? t.accent : t.accentInk }]}>{i + 1}</Text>
                      </View>
                      <UserAvatar avatarUrl={p?.avatar_url ?? undefined} name={p?.full_name || p?.username} size={24} />
                      <Text style={[styles.chipName, { color: mine ? t.accentInk : t.ink }]} numberOfLines={1}>{mine ? 'You' : `@${p?.username || '…'}`}</Text>
                      {isHost ? <Ionicons name="arrow-forward" size={14} color={t.sub} /> : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {sendFail && holding ? <Text style={[styles.err, { color: t.danger }]}>Your voice isn't getting through. Check your connection.</Text> : null}
        {error ? <Text style={[styles.err, { color: t.danger }]}>{error}</Text> : null}

        <View style={styles.controls}>
          {holding && (
            <Pressable onPress={() => setMicOn(m => !m)} style={[styles.mic, { backgroundColor: micOn ? t.soft : t.dangerSoft }]}
              accessibilityRole="button" accessibilityLabel={micOn ? 'Turn mic off' : 'Turn mic on'}>
              <Ionicons name={micOn ? 'mic' : 'mic-off'} size={22} color={micOn ? t.ink : t.danger} />
            </Pressable>
          )}

          {isHost ? (
            <>
              {room.holder_id && room.holder_id !== meId ? (
                <PillButton label="Take back" icon="arrow-undo" onPress={takeBack} style={{ flex: 1 }} a11y="Take the stick back" />
              ) : null}
              <PillButton
                label={nextUp ? `Pass to @${nextUp.username}` : 'No hands yet'}
                left={<Stick size={26} />} tone="honey" onPress={passNext} disabled={!nextUp} style={{ flex: 1.6 }}
                a11y={nextUp ? `Pass the stick to ${nextUp.username}` : 'Nobody has raised a hand'} />
              <PillButton label="End" tone="danger" onPress={end} style={{ paddingHorizontal: 16 }} a11y="End the baraza" />
            </>
          ) : holding ? (
            <PillButton label="Hand back the stick" left={<Stick size={26} />} tone="honey" onPress={handBack} style={{ flex: 1 }} />
          ) : (
            <>
              <PillButton
                label={state.me?.hand_raised_at ? (myPos ? `Hand up · you're #${myPos}` : 'Lower hand') : 'Raise hand'}
                left={<HandMark size={24} wave={!!state.me?.hand_raised_at} />}
                tone={state.me?.hand_raised_at ? 'plain' : 'honey'} onPress={tapHand} style={{ flex: 1.6 }}
                a11y={state.me?.hand_raised_at ? 'Lower your hand' : 'Raise your hand to speak'} />
              <PillButton label="Leave" onPress={leave} style={{ flex: 1 }} />
            </>
          )}
        </View>
      </View>

      <ThemeSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <WhoSheet visible={whoOpen} onClose={() => setWhoOpen(false)} state={state} />
    </View>
  );
}

// ── After the end: minutes are being written, then shown ──
function Ended({ state, onClose }: { state: BarazaState; onClose: () => void }) {
  return <BarazaMinutesView roomId={state.room.id} onClose={onClose} justEnded />;
}

function UpdateCard({ onClose }: { onClose: () => void }) {
  return (
    <Notice
      icon="arrow-up-circle-outline"
      title="Update KChat to join Barazas"
      text="Barazas need the newest version of the app for sound. Update from the App Store or Google Play, then come back."
      onClose={onClose}
    />
  );
}

function Notice({ icon, title, text, onClose }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onClose: () => void }) {
  const t = useBT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.center, { paddingHorizontal: 32, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View entering={ZoomIn.springify()} style={[styles.noticeIcon, { backgroundColor: t.soft }]}>
        <Ionicons name={icon} size={34} color={t.accent} />
      </Animated.View>
      <Text style={[styles.consentTitle, { color: t.ink }]}>{title}</Text>
      <Text style={[styles.consentSub, { color: t.sub, textAlign: 'center', lineHeight: 20 }]}>{text}</Text>
      <PillButton label="Close" onPress={onClose} style={{ marginTop: 28, alignSelf: 'stretch' }} />
    </View>
  );
}

/** The painted "live" ember, breathing softly. */
function LiveIcon() {
  const b = useSharedValue(0);
  useEffect(() => { b.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true); }, [b]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + b.value * 0.18 }], opacity: 0.75 + b.value * 0.25 }));
  return <Animated.Image source={ART.iconLive} fadeDuration={0} style={[styles.metaIcon, st]} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  title: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingLeft: 5, paddingRight: 9, borderRadius: 12 },
  metaIcon: { width: 17, height: 17 },
  metaText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  meta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  recPill: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingHorizontal: 7, height: 18, borderRadius: 9 },
  recDotSm: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  recText: { fontSize: 10.5, fontWeight: '600' },
  turnLen: { fontSize: 13, fontWeight: '800' },

  speakerFrame: { borderRadius: 999, padding: 4, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  stickSlot: { position: 'absolute', right: -27, bottom: -40 },
  speakerName: { fontSize: 21, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 14, letterSpacing: -0.3, maxWidth: '80%' },
  speakerSub: { fontSize: 13.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  captions: { minHeight: 74, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 12 },
  capWho: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  capLine: { fontSize: 17, lineHeight: 23, textAlign: 'center' },
  capHint: { fontSize: 14, textAlign: 'center', fontStyle: 'italic' },

  seat: { borderRadius: 24, borderWidth: 2, padding: 1 },
  handPop: { position: 'absolute', right: -10, top: -12 },
  hostTag: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  more: { position: 'absolute', alignSelf: 'center', fontSize: 12.5 },
  emptyCrowd: { alignItems: 'center', gap: 8, paddingHorizontal: 48, marginTop: 6 },
  emptyText: { fontSize: 13.5, lineHeight: 19, textAlign: 'center' },

  passCard: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 16, height: 46, borderRadius: 23, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8, maxWidth: '86%' },
  passText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  queueLabel: { fontSize: 12, fontWeight: '600', marginBottom: 7, paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: 19, paddingLeft: 5, paddingRight: 12, borderWidth: StyleSheet.hairlineWidth, maxWidth: 190 },
  chipNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chipNumText: { fontSize: 12.5, fontWeight: '800' },
  chipName: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  mic: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 13, textAlign: 'center', marginBottom: 10, paddingHorizontal: 20 },

  consentWrap: { flex: 1, paddingHorizontal: 16 },
  consentTitle: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, textAlign: 'center', marginTop: 22 },
  consentSub: { fontSize: 14, marginTop: 6 },
  notice: { flexDirection: 'row', gap: 12, marginTop: 28, padding: 16, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  recDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  noticeTitle: { fontSize: 15, fontWeight: '700' },
  noticeText: { fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  rules: { fontSize: 12.5, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  noticeIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
