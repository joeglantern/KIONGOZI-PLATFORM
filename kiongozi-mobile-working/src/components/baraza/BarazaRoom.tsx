// A baraza in progress: everyone gathered under the tree. The stick holder stands on a carved dais
// inside a hoop of beads that fade as their turn runs; their words run under them as lyrics;
// everyone else sits on stools in an arc below, hands up are a numbered queue, and one floating
// dock at the bottom holds everything you can do.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, AppState, useWindowDimensions, ActivityIndicator, Image, Modal } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, ZoomIn, LinearTransition, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withRepeat, withDelay, Easing, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { toast } from '../../utils/alert';
import { useAuthStore } from '../../stores/authStore';
import { useBarazaStore, barazaApi, BarazaState, BarazaPerson } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { audioAvailable, TurnRecorder, SegmentPlayer, PlayableSegment, uploadChunk, askMic, setRoomAudioMode, DELAY_LABEL } from './barazaAudio';
import { Stick, BeadRing, TreeShade, PillButton, mmss } from './barazaUi';
import { TalkingStick, HandMark, ThemeSheet, ART, PaintedStick, BeadHoop, ConfettiBurst, DAIS_RATIO, SEAT_RATIO } from './barazaArt';
import { useBT, BarazaTheme } from './barazaTheme';
import { BarazaMinutesView } from './BarazaMinutes';
import { WhoSheet, applyRememberedCounty } from './WhoSheet';
import { LyricCaptions, LyricLine } from './LyricCaptions';

type Seg = PlayableSegment & { id: string; transcript: string | null; transcribed: boolean; words?: [number, number, string][] };

const DOCK_H = 64;
const SEAT_W = 46;
const SEAT_H = Math.round(SEAT_W * SEAT_RATIO);
const SEAT_AV = 44;
const SEAT_BOX = SEAT_AV + 5; // avatar plus its white ring
const SEAT_BLOCK = SEAT_BOX - 16 + SEAT_H; // the avatar overlaps the seat top by 16
const REACTIONS = ['🔥', '👏', '❤️', '😂', '🤔', '🙌'];
const DELAY_WORDS = `${DELAY_LABEL.replace('~', '').replace(/s$/, '')} seconds`;
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

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
  const { width: W, height: H } = useWindowDimensions();
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
  const [roomMuted, setRoomMuted] = useState(false);
  const mutedRef = useRef(false);

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
    p.setMuted(mutedRef.current);
    playerRef.current = p;
    return () => { p.stop(); playerRef.current = null; setNow(null); };
  }, [active]);

  useEffect(() => {
    mutedRef.current = roomMuted;
    playerRef.current?.setMuted(roomMuted);
  }, [roomMuted]);

  // When the chunk playing changes, remember when it started (word timing in the lyrics)
  const [nowStarted, setNowStarted] = useState<number | null>(null);
  useEffect(() => { setNowStarted(now ? Date.now() : null); }, [now?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── the stick arriving is a moment: felt, lit, and showered ──
  const [moment, setMoment] = useState(0);
  const momentTimer = useRef<any>(null);
  const pool = useSharedValue(0);
  const wasHolding = useRef(holding);
  useEffect(() => {
    if (holding && !wasHolding.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 160);
      setMicOn(true);
      setMoment(m => m + 1);
      pool.value = withSequence(withTiming(1, { duration: 260 }), withDelay(1300, withTiming(0, { duration: 900 })));
      clearTimeout(momentTimer.current);
      momentTimer.current = setTimeout(() => setMoment(0), 2200);
    }
    wasHolding.current = holding;
  }, [holding, pool]);
  useEffect(() => () => clearTimeout(momentTimer.current), []);

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

  // ── lyrics: what is playing now (listeners) or your own last words (speaker) ──
  const capList = Object.values(captions).sort((a, b) => a.seq - b.seq);
  const toLine = (c: Seg): LyricLine => ({ seq: c.seq, text: c.transcript!, durationMs: c.duration_ms, words: c.words });
  let capSpeaker: string | null = null;
  let lyricLines: LyricLine[] = [];
  let pending = false;
  let liveSeq: number | null = null;
  if (holding) {
    const mine = capList.filter(c => c.speaker_id === meId);
    lyricLines = mine.filter(c => c.transcript).slice(-3).map(toLine);
    pending = mine.some(c => !c.transcript && !c.transcribed);
    capSpeaker = meId;
  } else if (now) {
    const same = capList.filter(c => c.speaker_id === now.speaker_id && c.seq <= now.seq && c.transcript);
    lyricLines = same.slice(-3).map(toLine);
    const cur = captions[now.seq];
    pending = !cur?.transcript && !cur?.transcribed;
    liveSeq = now.seq;
    capSpeaker = now.speaker_id;
  }
  const hint = lyricLines.length ? null
    : holding ? `Speak. Everyone hears you about ${DELAY_WORDS} later.`
    : now ? 'Listening…' : holder ? 'Waiting for their words…' : null;
  const [lyricsFull, setLyricsFull] = useState(false);

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
  const takeBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    store().pass(room.host_id);
  };
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
    // "Thanks" at once; the report goes in the background, with a toast only if it fails
    const send = (reason: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast('Thanks for telling us', { kind: 'success', message: 'Our team will look at it.' });
      apiClient.reportContent('user', p.id, reason, `[Baraza ${room.id}] ${room.title}`).catch(() => null).then((r: any) => {
        if (!r?.success && !/already reported/i.test(r?.error || '')) toast("Couldn't send the report", { kind: 'error' });
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

  // ── "passed to" pill each time the stick changes hands (your own arrival is the moment above) ──
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

  // ── reactions: on this phone only for now ──
  const [reactOpen, setReactOpen] = useState(false);
  const [floats, setFloats] = useState<{ id: number; glyph: string; x: number }[]>([]);
  const floatId = useRef(0);
  const reactClose = useRef<any>(null);
  const toggleReact = () => {
    Haptics.selectionAsync().catch(() => {});
    setReactOpen(o => !o);
    clearTimeout(reactClose.current);
    reactClose.current = setTimeout(() => setReactOpen(false), 5000);
  };
  const react = (glyph: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const id = ++floatId.current;
    setFloats(f => [...f.slice(-11), { id, glyph, x: W * 0.2 + Math.random() * W * 0.6 }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1700);
    clearTimeout(reactClose.current);
    reactClose.current = setTimeout(() => setReactOpen(false), 4000);
  };
  useEffect(() => () => clearTimeout(reactClose.current), []);

  const [themeOpen, setThemeOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openWho = () => { Haptics.selectionAsync().catch(() => {}); setWhoOpen(true); };
  // If you chose a county before, show it in this room too (once per room)
  const sharedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.me?.joined || state.me.from || sharedRef.current === room.id) return;
    sharedRef.current = room.id;
    applyRememberedCounty(room.id).then(() => useBarazaStore.getState().refresh());
  }, [room.id, state.me?.joined, state.me?.from]);

  // ── layout: the stage scales down on short screens so the circle and dock still fit ──
  const availH = H - insets.top - insets.bottom;
  const k = Math.min(1, Math.max(0.72, (availH - 420) / 363));
  const DAIS_W = Math.round(Math.min(300, W * 0.77) * k);
  const DAIS_H = Math.round(DAIS_W * DAIS_RATIO);
  const HOOP = Math.round(204 * k);
  const AV = Math.round(148 * k);
  const STICK_H = Math.round(196 * k);
  const hoopCy = Math.round(DAIS_H * 0.47 - AV / 2);        // hoop centre, measured from the dais top
  const over = Math.max(0, HOOP / 2 - hoopCy) + 8;            // how far the hoop rises above the dais
  const stageH = over + DAIS_H + 58;
  const POOL = Math.round(W * 1.4);
  const emptyW = Math.round(DAIS_W * 0.62), emptyH = Math.round(emptyW * 512 / 720);
  const dockBottom = insets.bottom + 14;
  const arcN = Math.min(seated.length, 9);
  const extra = seated.length - arcN;
  const shown = seated.slice(0, arcN);
  const arcDepth = Math.round(40 * k); // how deep the arc of stools bows
  const late = left !== null && left < 10;

  const poolStyle = useAnimatedStyle(() => ({
    opacity: (t.dark ? 0.5 : 0.34) + pool.value * 0.5,
    transform: [{ scale: 1 + pool.value * 0.18 }],
  }));

  const speakerName = holding ? 'You have the stick' : holder ? (holder.full_name || `@${holder.username}`) : 'The stick is waiting';
  const speakerSub = !holder ? 'The host picks who speaks first'
    : left !== null ? `${holding ? '' : 'Has the stick · '}${mmss(left)} left${holding && !micOn ? ' · mic off' : ''}`
    : room.holder_id === room.host_id ? (isHost ? `Your turn as host · no clock${!micOn ? ' · mic off' : ''}` : 'Host is speaking · no clock')
    : '';

  // ── the dock's main action ──
  type Main = { label: string; onPress: () => void; icon: 'hand' | 'stick' | 'undo'; disabled?: boolean; fill?: number; a11y?: string };
  let main: Main;
  if (holding) {
    if (isHost) main = nextUp
      ? { label: `Pass to @${nextUp.username}`, onPress: passNext, icon: 'stick', a11y: `Pass the stick to ${nextUp.username}` }
      : { label: 'No hands yet', onPress: passNext, icon: 'stick', disabled: true, a11y: 'Nobody has raised a hand' };
    else main = { label: 'Done talking', onPress: handBack, icon: 'stick', a11y: 'Hand the stick back' };
  } else if (isHost) {
    if (nextUp) main = { label: `Pass to @${nextUp.username}`, onPress: passNext, icon: 'stick', a11y: `Pass the stick to ${nextUp.username}` };
    else if (room.holder_id) main = { label: 'Take back', onPress: takeBack, icon: 'undo', a11y: 'Take the stick back' };
    else main = { label: 'Pick up the stick', onPress: takeBack, icon: 'stick' };
  } else if (state.me?.hand_raised_at) {
    main = {
      label: myPos ? `Hand up · ${ordinal(myPos)} in line` : 'Lower hand', onPress: tapHand, icon: 'hand', a11y: 'Lower your hand',
      fill: myPos === 1 ? 0.9 : myPos === 2 ? 0.6 : myPos === 3 ? 0.35 : myPos ? 0.2 : 0,
    };
  } else {
    main = { label: 'Hand up', onPress: tapHand, icon: 'hand', a11y: 'Raise your hand to speak' };
  }

  const sheetRows: SheetRow[] = [
    ...(room.holder_id && room.holder_id !== meId ? [{ label: 'Take the stick back', icon: 'arrow-undo-outline' as const, onPress: takeBack }] : []),
    { label: 'Turn length', sub: `${room.turn_seconds / 60} minute${room.turn_seconds === 60 ? '' : 's'} each`, icon: 'timer-outline', onPress: turnMenu },
    { label: 'Leave for now', sub: 'Ends on its own after 5 minutes away', icon: 'exit-outline', onPress: () => store().close() },
    { label: 'End baraza', sub: 'Everyone leaves and the minutes are written', icon: 'stop-circle-outline', danger: true, onPress: end },
  ];

  const lyrics = (
    <LyricCaptions lines={lyricLines} liveSeq={liveSeq} startedAt={nowStarted} pending={pending} hint={hint} level={level}
      full={lyricsFull} onToggle={() => setLyricsFull(f => !f)} t={t} />
  );

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

      {lyricsFull ? (
        /* Transcript open: the circle folds into one row and the words take the stage */
        <Animated.View key="full" entering={FadeInDown.springify().damping(18)} exiting={FadeOut.duration(160)} style={{ flex: 1, paddingBottom: dockBottom + DOCK_H + 16 }}>
          <Pressable onPress={openWho} style={styles.faceRow} accessibilityRole="button" accessibilityLabel="See who's here">
            {holder ? (
              <View style={[styles.faceHolder, { borderColor: t.accent }]}>
                <UserAvatar avatarUrl={holder.avatar_url ?? undefined} name={holder.full_name || holder.username} size={28} />
              </View>
            ) : null}
            {seated.slice(0, 9).map(p => (
              <View key={p.user_id} style={[styles.face, { borderColor: t.bg }]}>
                <UserAvatar avatarUrl={p.profile?.avatar_url ?? undefined} name={p.profile?.full_name || p.profile?.username} size={28} />
              </View>
            ))}
            {seated.length > 9 ? <Text style={[styles.faceMore, { color: t.sub }]}>+{seated.length - 9}</Text> : null}
            <Text style={[styles.faceName, { color: t.sub }]} numberOfLines={1}>
              {holder ? `${holder.full_name || `@${holder.username}`} has the stick${left !== null ? ` · ${mmss(left)}` : ''}` : 'The stick is waiting'}
            </Text>
          </Pressable>
          {lyrics}
        </Animated.View>
      ) : (
        <Animated.View key="room" entering={FadeInUp.springify().damping(18)} style={{ flex: 1 }} pointerEvents="box-none">
          {/* The stage: a pool of light, the dais, and whoever holds the stick inside the bead hoop */}
          <View style={{ height: stageH, alignItems: 'center' }} pointerEvents="box-none">
            <View pointerEvents="none" style={{ position: 'absolute', width: POOL, height: POOL, left: W / 2 - POOL / 2, top: over + hoopCy + 30 - POOL / 2 }}>
              <Animated.Image source={ART.glow} fadeDuration={0} style={[{ width: POOL, height: POOL, tintColor: t.glow }, poolStyle]} />
            </View>
            <Image source={ART.dais} fadeDuration={0} resizeMode="contain" style={{ position: 'absolute', top: over, width: DAIS_W, height: DAIS_H }} />
            {holder ? (
              <Animated.View style={[{ position: 'absolute', top: over + hoopCy - HOOP / 2, width: HOOP, height: HOOP, alignItems: 'center', justifyContent: 'center' }, swapStyle]}>
                <BeadHoop size={HOOP} progress={progress} t={t} late={late} />
                <Pressable onPress={() => personMenu(holder.id)} accessibilityLabel={`${holder.username} has the stick`}
                  style={[styles.speakerFrame, { backgroundColor: t.dark ? 'rgba(255,255,255,0.92)' : '#FFFFFF', shadowColor: t.dark ? '#000' : '#6B4A1F' }]}>
                  <UserAvatar avatarUrl={holder.avatar_url ?? undefined} name={holder.full_name || holder.username} size={AV - 10} />
                </Pressable>
                <View style={{ position: 'absolute', right: -27 * k, bottom: -40 * k }} pointerEvents="box-none">
                  <TalkingStick height={STICK_H} level={level} holderKey={room.holder_id} t={t} late={late} />
                </View>
              </Animated.View>
            ) : (
              <Animated.Image entering={FadeIn.duration(300)} source={ART.empty} resizeMode="contain"
                style={{ position: 'absolute', top: over + DAIS_H * 0.5 - emptyH + 10, width: emptyW, height: emptyH }} />
            )}
            {moment ? <ConfettiBurst key={moment} ox={W / 2} oy={over + hoopCy + AV / 2} spread={W * 0.42} /> : null}
            <View style={{ position: 'absolute', top: over + DAIS_H + 2, left: 24, right: 24, alignItems: 'center' }} pointerEvents="none">
              {moment ? (
                <Animated.View key="moment" entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(300)} style={{ alignItems: 'center' }}>
                  <Text style={[styles.momentTitle, { color: t.ink }]}>The stick is yours</Text>
                  <Text style={[styles.momentSub, { color: t.sub }]} numberOfLines={2}>
                    Everyone hears you about {DELAY_WORDS} later. {isHost ? 'There is no clock on your turn.' : `You have ${room.turn_seconds / 60} minute${room.turn_seconds === 60 ? '' : 's'}.`}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View key="name" entering={FadeIn.duration(240)} style={{ alignItems: 'center' }}>
                  <Text style={[styles.speakerName, { color: t.ink }]} numberOfLines={1}>{speakerName}</Text>
                  <Text style={[styles.speakerSub, { color: late ? t.danger : t.sub }]} numberOfLines={1}>{speakerSub}</Text>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Their words */}
          {capSpeaker && capSpeaker !== room.holder_id && !holding ? (
            <Text style={[styles.capWho, { color: t.accent }]} numberOfLines={1}>@{byId.get(capSpeaker)?.username || '…'} said</Text>
          ) : null}
          {lyrics}

          {/* Everyone else, on stools in an arc */}
          <View style={{ height: arcDepth + SEAT_BLOCK + 16, marginTop: 6 }} pointerEvents="box-none">
            {shown.map((p, i) => {
              const tt = arcN === 1 ? 0.5 : i / (arcN - 1);
              const a = Math.PI * (0.1 + 0.8 * tt);
              const x = W / 2 - (W / 2 - 40) * Math.cos(a);
              const y = arcDepth * Math.sin(a);
              return (
                <Animated.View key={p.user_id} entering={ZoomIn.delay(i * 30).springify().damping(13)} exiting={FadeOut}
                  layout={LinearTransition.springify().damping(16)} style={{ position: 'absolute', left: x - (SEAT_W + 16) / 2, top: y }}>
                  <Seat p={p} i={i} pos={queuePos(p.user_id)} t={t} onPress={() => personMenu(p.user_id)} />
                </Animated.View>
              );
            })}
            {seated.length === 0 ? (
              <Animated.View entering={FadeIn.delay(400)} style={styles.emptyCrowd}>
                <Image source={ART.seat} style={{ width: 40, height: Math.round(40 * SEAT_RATIO), opacity: 0.8 }} fadeDuration={0} />
                <Text style={[styles.emptyText, { color: t.sub }]}>Nobody else has pulled up a stool yet. People who join show up here.</Text>
              </Animated.View>
            ) : null}
          </View>
          {seated.length > 0 ? (
            <Pressable onPress={openWho} hitSlop={10} style={{ alignSelf: 'center', marginTop: 2 }} accessibilityRole="button" accessibilityLabel="See who's here">
              <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700' }}>{extra > 0 ? `+${extra} · ` : ''}See who's here</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      )}

      {/* Floating reactions drift up past the speaker */}
      {floats.map(f => <FloatingReaction key={f.id} glyph={f.glyph} x={f.x} bottom={dockBottom + DOCK_H + 20} rise={H * 0.62} />)}

      {/* Above the dock: the reaction strip, "passed to" pill and any problem */}
      <View style={[styles.aboveDock, { bottom: dockBottom + DOCK_H + 10 }]} pointerEvents="box-none">
        {sendFail && holding ? <Text style={[styles.err, { color: t.danger }]}>Your voice isn't getting through. Check your connection.</Text> : null}
        {error ? <Text style={[styles.err, { color: t.danger }]}>{error}</Text> : null}
        {passedTo && passedTo.id !== meId ? (
          <Animated.View entering={ZoomIn.springify().damping(14)} exiting={FadeOut.duration(220)} pointerEvents="none"
            style={[styles.passPill, { backgroundColor: t.card, borderColor: t.line, shadowColor: t.dark ? '#000' : '#5A3E12' }]}>
            <Stick size={26} />
            <Text style={[styles.passText, { color: t.ink }]} numberOfLines={1}>Stick passed to @{passedTo.username}</Text>
          </Animated.View>
        ) : null}
        {reactOpen ? (
          <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut.duration(140)}
            style={[styles.strip, { backgroundColor: t.card, borderColor: t.line, shadowColor: t.dark ? '#000' : '#5A3E12' }]}>
            {REACTIONS.map(r => (
              <Pressable key={r} onPress={() => react(r)} accessibilityRole="button" accessibilityLabel={`React ${r}`}
                style={({ pressed }) => [styles.reactChip, { backgroundColor: t.soft }, pressed && { transform: [{ scale: 0.88 }] }]}>
                <Text style={styles.reactGlyph}>{r}</Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </View>

      {/* The dock */}
      <View style={[styles.dock, { bottom: dockBottom, backgroundColor: t.card, borderColor: t.line, shadowColor: t.dark ? '#000' : '#5A3E12' }]}>
        <Pressable onPress={toggleReact} accessibilityRole="button" accessibilityLabel="React" accessibilityState={{ expanded: reactOpen }}
          style={({ pressed }) => [styles.dockRound, { backgroundColor: reactOpen ? t.accent : t.soft }, pressed && { transform: [{ scale: 0.92 }] }]}>
          <Image source={ART.iconLive} style={{ width: 26, height: 26 }} fadeDuration={0} />
        </Pressable>
        <MainButton spec={main} t={t} />
        {isHost ? (
          <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setSheetOpen(true); }} accessibilityRole="button" accessibilityLabel="More"
            style={({ pressed }) => [styles.dockMore, { backgroundColor: t.soft }, pressed && { transform: [{ scale: 0.92 }] }]}>
            <Ionicons name="ellipsis-horizontal" size={18} color={t.ink} />
          </Pressable>
        ) : null}
        {holding ? (
          <Pressable onPress={() => setMicOn(m => !m)} accessibilityRole="button" accessibilityLabel={micOn ? 'Turn mic off' : 'Turn mic on'}
            style={({ pressed }) => [styles.dockRound, { backgroundColor: micOn ? t.soft : t.dangerSoft }, pressed && { transform: [{ scale: 0.92 }] }]}>
            <Ionicons name={micOn ? 'mic' : 'mic-off'} size={22} color={micOn ? t.ink : t.danger} />
          </Pressable>
        ) : (
          <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setRoomMuted(m => !m); }} accessibilityRole="button"
            accessibilityLabel={roomMuted ? 'Turn room audio on' : 'Mute room audio'}
            style={({ pressed }) => [styles.dockRound, { backgroundColor: roomMuted ? t.dangerSoft : t.soft }, pressed && { transform: [{ scale: 0.92 }] }]}>
            <Ionicons name={roomMuted ? 'volume-mute' : 'volume-high'} size={22} color={roomMuted ? t.danger : t.ink} />
          </Pressable>
        )}
      </View>

      <ThemeSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <WhoSheet visible={whoOpen} onClose={() => setWhoOpen(false)} state={state} />
      {isHost ? <DockSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} rows={sheetRows} t={t} /> : null}
    </View>
  );
}

/** A listener on a stool: avatar sitting on the seat, a tiny label under, badges for the queue. */
function Seat({ p, i, pos, t, onPress }: { p: BarazaState['people'][number]; i: number; pos: number; t: BarazaTheme; onPress: () => void }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withDelay((i % 5) * 190, withRepeat(withTiming(1, { duration: 1500 + (i % 3) * 160, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [bob, i]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.value * 3 }] }));
  const host = p.role === 'host';
  const label = pos ? (pos === 1 ? 'next up' : `${ordinal(pos)} in line`) : host ? 'host' : p.from || '';
  const showPin = !!p.from && !pos && !host;
  return (
    <Animated.View style={st}>
      <Pressable onPress={onPress} style={{ width: SEAT_W + 16, alignItems: 'center' }}
        accessibilityRole="button" accessibilityLabel={`@${p.profile?.username}${pos ? `, hand up, number ${pos}` : host ? ', host' : ''}${p.from ? `, from ${p.from}` : ''}`}>
        <View style={{ width: SEAT_W + 16, height: SEAT_BLOCK, alignItems: 'center' }}>
          <Image source={ART.seat} fadeDuration={0} style={{ position: 'absolute', top: SEAT_BOX - 16, width: SEAT_W, height: SEAT_H }} />
          <View style={[styles.seatAvatar, { backgroundColor: t.dark ? 'rgba(255,255,255,0.92)' : '#FFFFFF', shadowColor: t.dark ? '#000' : '#5A3E12' }]}>
            <UserAvatar avatarUrl={p.profile?.avatar_url ?? undefined} name={p.profile?.full_name || p.profile?.username} size={SEAT_AV} />
          </View>
          {pos ? (
            <Animated.View entering={ZoomIn.springify().damping(10)} style={[styles.numBadge, { backgroundColor: t.accent, borderColor: t.bg }]}>
              <Text style={[styles.numText, { color: t.accentInk }]}>{pos}</Text>
            </Animated.View>
          ) : null}
          {p.hand_raised_at ? (
            <Animated.View entering={ZoomIn.springify().damping(9)} style={styles.handBadge}>
              <HandMark size={20} wave />
            </Animated.View>
          ) : null}
        </View>
        {label ? (
          <View style={styles.seatLabelRow}>
            {showPin ? <Image source={ART.pin} style={{ width: 10, height: 10 }} fadeDuration={0} /> : null}
            <Text style={[styles.seatLabel, { color: pos ? t.accent : t.sub }]} numberOfLines={1}>{label}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** The dock's middle button: amber, with a translucent fill showing your place in the line. */
function MainButton({ spec, t }: { spec: { label: string; onPress: () => void; icon: 'hand' | 'stick' | 'undo'; disabled?: boolean; fill?: number; a11y?: string }; t: BarazaTheme }) {
  const fill = useSharedValue(spec.fill ?? 0);
  useEffect(() => { fill.value = withSpring(spec.fill ?? 0, { damping: 16, stiffness: 120 }); }, [spec.fill, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <Animated.View style={[{ flex: 1 }, pressStyle]}>
      <Pressable onPress={spec.onPress} disabled={spec.disabled} accessibilityRole="button" accessibilityLabel={spec.a11y || spec.label}
        onPressIn={() => { press.value = withTiming(0.96, { duration: 80 }); }} onPressOut={() => { press.value = withSpring(1, { damping: 12 }); }}
        style={[styles.main, { backgroundColor: t.accent, opacity: spec.disabled ? 0.45 : 1, shadowColor: t.accent }]}>
        <Animated.View pointerEvents="none" style={[styles.mainFill, fillStyle]} />
        {spec.icon === 'hand' ? <Image source={ART.handBtn} style={{ width: 24, height: 24 }} fadeDuration={0} resizeMode="contain" />
          : spec.icon === 'stick' ? <PaintedStick height={28} tilt={-32} />
          : <Ionicons name="arrow-undo" size={19} color={t.accentInk} />}
        <Text style={[styles.mainText, { color: t.accentInk }]} numberOfLines={1}>{spec.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** One reaction drifting up the room and fading. */
function FloatingReaction({ glyph, x, bottom, rise }: { glyph: string; x: number; bottom: number; rise: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }); }, [p]);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.08, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: -p.value * rise },
      { translateX: Math.sin(p.value * Math.PI * 2.2) * 16 },
      { scale: 0.8 + p.value * 0.7 },
    ],
  }));
  return <Animated.Text pointerEvents="none" style={[{ position: 'absolute', left: x, bottom, fontSize: 30 }, st]}>{glyph}</Animated.Text>;
}

type SheetRow = { label: string; sub?: string; icon: keyof typeof Ionicons.glyphMap; danger?: boolean; onPress: () => void };

/** The host's extra actions, from the dock's small ⋯ button. */
function DockSheet({ visible, onClose, rows, t }: { visible: boolean; onClose: () => void; rows: SheetRow[]; t: BarazaTheme }) {
  const insets = useSafeAreaInsets();
  const run = (r: SheetRow) => { onClose(); setTimeout(r.onPress, 260); };
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)}
            style={[styles.sheet, { backgroundColor: t.dark ? '#1B2140' : '#FFFFFF', paddingBottom: insets.bottom + 14 }]}>
            <View style={[styles.grab, { backgroundColor: t.line }]} />
            {rows.map(r => (
              <Pressable key={r.label} onPress={() => run(r)} accessibilityRole="button" accessibilityLabel={r.label}
                style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: t.soft }]}>
                <View style={[styles.sheetIcon, { backgroundColor: r.danger ? t.dangerSoft : t.soft }]}>
                  <Ionicons name={r.icon} size={20} color={r.danger ? t.danger : t.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetLabel, { color: r.danger ? t.danger : t.ink }]}>{r.label}</Text>
                  {r.sub ? <Text style={[styles.sheetSub, { color: t.sub }]} numberOfLines={1}>{r.sub}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.faint} />
              </Pressable>
            ))}
          </Animated.View>
        </>
      )}
    </Modal>
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
  turnLen: { fontSize: 13, fontWeight: '800' },

  // stage
  speakerFrame: { borderRadius: 999, padding: 5, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  speakerName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, maxWidth: '100%' },
  speakerSub: { fontSize: 13, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  momentTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  momentSub: { fontSize: 13, lineHeight: 17, textAlign: 'center', marginTop: 3 },
  capWho: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 2 },

  // transcript open
  faceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, height: 50 },
  faceHolder: { borderRadius: 18, borderWidth: 2, padding: 1, marginRight: 6 },
  face: { borderRadius: 16, borderWidth: 2, marginLeft: -8 },
  faceMore: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  faceName: { flex: 1, fontSize: 12.5, fontWeight: '600', marginLeft: 10, textAlign: 'right' },

  // circle
  seatAvatar: { position: 'absolute', top: 0, width: SEAT_BOX, height: SEAT_BOX, borderRadius: SEAT_BOX / 2, padding: 2.5, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  numBadge: { position: 'absolute', top: -4, right: 2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 11, fontWeight: '800' },
  handBadge: { position: 'absolute', top: -8, left: 0 },
  seatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2, maxWidth: SEAT_W + 24 },
  seatLabel: { fontSize: 10, fontWeight: '700' },
  emptyCrowd: { alignItems: 'center', gap: 8, paddingHorizontal: 48, marginTop: 10 },
  emptyText: { fontSize: 13.5, lineHeight: 19, textAlign: 'center' },

  // above the dock
  aboveDock: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8 },
  passPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 7, paddingRight: 14, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6, maxWidth: '90%' },
  passText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  reactChip: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  reactGlyph: { fontSize: 22 },
  err: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },

  // the dock
  dock: { position: 'absolute', left: 16, right: 16, height: DOCK_H, borderRadius: DOCK_H / 2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  dockRound: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dockMore: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  main: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, overflow: 'hidden', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  mainFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.35)' },
  mainText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },

  // host sheet
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 12, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 16 },
  sheetIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sheetLabel: { fontSize: 16, fontWeight: '600' },
  sheetSub: { fontSize: 12.5, marginTop: 1 },

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
