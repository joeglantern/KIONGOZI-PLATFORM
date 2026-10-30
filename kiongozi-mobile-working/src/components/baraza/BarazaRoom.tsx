// A baraza in progress: everyone gathered under the tree. The stick holder sits in the middle
// inside a ring of beads that go dark as their turn runs; everyone else is seated in an arc
// below, hands up are a numbered queue, and captions run under the speaker.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, AppState, useWindowDimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useBarazaStore, barazaApi, BarazaState, BarazaPerson } from '../../stores/barazaStore';
import { UserAvatar } from '../social/UserAvatar';
import { audioAvailable, TurnRecorder, SegmentPlayer, PlayableSegment, uploadChunk, askMic, setRoomAudioMode, DELAY_LABEL } from './barazaAudio';
import { HONEY, EMBER, INK, Stick, BeadRing, TreeShade, PillButton, mmss } from './barazaUi';
import { BarazaMinutesView } from './BarazaMinutes';

const SPEAKER = 128;
const RING = 196;

type Seg = PlayableSegment & { id: string; transcript: string | null; transcribed: boolean };

export function BarazaRoom() {
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
  else body = <View style={styles.center}><ActivityIndicator color={HONEY} /></View>;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TreeShade cy={insets.top + Math.min(H * 0.3, 260)} />
      <View style={{ flex: 1, width: W }}>{body}</View>
    </View>
  );
}

// ── Before joining: what it is, who's there, and the recording notice ──
function Consent({ state, onClose }: { state: BarazaState | null; onClose: () => void }) {
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
      <Pressable onPress={onClose} style={styles.round} hitSlop={8} accessibilityLabel="Close">
        <Ionicons name="chevron-down" size={22} color="#fff" />
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <BeadRing size={120} progress={null} beads={32} />
            <UserAvatar avatarUrl={host?.avatar_url} name={host?.full_name || host?.username} size={78} />
          </View>
        </Animated.View>
        <Text style={styles.consentTitle}>{title}</Text>
        <Text style={styles.consentSub}>Hosted by @{host?.username || '...'} · {count} here</Text>

        <Animated.View entering={FadeInDown.delay(120)} style={styles.notice}>
          <View style={styles.recDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>This baraza is recorded for minutes</Text>
            <Text style={styles.noticeText}>
              Whoever holds the stick is recorded. Their words become captions, and when it ends the minutes (summary, key points and promises made) are posted for everyone to read.
            </Text>
          </View>
        </Animated.View>
        <Text style={styles.rules}>One voice at a time. Raise your hand and wait your turn; the host passes the stick.</Text>
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <PillButton label={busy ? 'Joining…' : 'Join and listen'} icon="ear-outline" tone="honey" onPress={join} disabled={busy} />
        <PillButton label="Not now" onPress={onClose} />
      </View>
    </View>
  );
}

// ── Inside ──
function Live({ state }: { state: BarazaState }) {
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

  // ── layout ──
  const top = insets.top + 76;
  const arcTop = top + RING + 120;
  const arcN = Math.min(seated.length, 9);
  const extra = seated.length - arcN;
  const shown = seated.slice(0, arcN);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={leave} style={styles.round} hitSlop={8} accessibilityLabel="Leave">
          <Ionicons name="chevron-down" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          <Text style={styles.title} numberOfLines={1}>{room.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.liveDot} />
            <Text style={styles.meta}>Live · {state.count} listening</Text>
            <View style={styles.recPill}><View style={styles.recDotSm} /><Text style={styles.recText}>Recorded</Text></View>
          </View>
        </View>
        {isHost ? (
          <Pressable onPress={turnMenu} style={styles.round} hitSlop={8} accessibilityLabel="Turn length">
            <Text style={styles.turnLen}>{room.turn_seconds / 60}m</Text>
          </Pressable>
        ) : <View style={{ width: 40 }} />}
      </View>

      {/* The speaker, in the ring */}
      <View style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center' }}>
        <Animated.View style={[{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }, swapStyle]}>
          <BeadRing size={RING} progress={progress} />
          <Pressable onPress={() => holder && personMenu(holder.id)} accessibilityLabel={holder ? `${holder.username} has the stick` : 'Nobody has the stick'}>
            <UserAvatar avatarUrl={holder?.avatar_url} name={holder?.full_name || holder?.username} size={SPEAKER} />
          </Pressable>
          <View style={styles.stickBadge}><Stick size={36} /></View>
        </Animated.View>
        <Text style={styles.speakerName} numberOfLines={1}>
          {holding ? 'You have the stick' : holder ? (holder.full_name || `@${holder.username}`) : '…'}
        </Text>
        <Text style={[styles.speakerSub, left !== null && left < 15 && { color: EMBER }]}>
          {left !== null ? `${mmss(left)} left` : room.holder_id === room.host_id ? (isHost ? 'Your turn as host · no clock' : 'Host is speaking') : ''}
          {holding && !micOn ? ' · mic off' : ''}
        </Text>

        {/* Captions */}
        <View style={[styles.captions, { width: W - 48 }]}>
          {holding && !capLines.length ? (
            <Text style={styles.capHint}>Speak. Everyone hears you about {DELAY_LABEL.replace('~', '')} later.</Text>
          ) : capLines.length ? (
            <>
              {capSpeaker && capSpeaker !== room.holder_id && !holding ? (
                <Text style={styles.capWho}>@{byId.get(capSpeaker)?.username || '…'}</Text>
              ) : null}
              {capLines.map((l, i) => (
                <Animated.Text key={`${i}-${l.slice(0, 12)}`} entering={FadeIn.duration(220)}
                  style={[styles.capLine, i < capLines.length - 1 && { opacity: 0.45, fontSize: 15 }]} numberOfLines={i < capLines.length - 1 ? 1 : 3}>
                  {l}
                </Animated.Text>
              ))}
            </>
          ) : (
            <Text style={styles.capHint}>{now ? 'Listening…' : holder ? 'Waiting for their words…' : ''}</Text>
          )}
        </View>
      </View>

      {/* Everyone else, seated in an arc */}
      <View style={{ position: 'absolute', top: arcTop, left: 0, right: 0, height: 120 }} pointerEvents="box-none">
        {shown.map((p, i) => {
          const t = arcN === 1 ? 0.5 : i / (arcN - 1);
          const a = Math.PI * (0.1 + 0.8 * t);
          const x = W / 2 - (W / 2 - 40) * Math.cos(a);
          const y = 40 * Math.sin(a);
          const pos = queuePos(p.user_id);
          return (
            <Animated.View key={p.user_id} entering={ZoomIn.delay(i * 30)} exiting={FadeOut}
              style={{ position: 'absolute', left: x - 22, top: y }}>
              <Pressable onPress={() => personMenu(p.user_id)} accessibilityLabel={`@${p.profile?.username}${pos ? `, hand up, number ${pos}` : ''}`}>
                <View style={[styles.seat, pos ? { borderColor: HONEY } : p.role === 'host' ? { borderColor: 'rgba(242,181,68,0.45)' } : null]}>
                  <UserAvatar avatarUrl={p.profile?.avatar_url} name={p.profile?.full_name || p.profile?.username} size={40} />
                </View>
                {pos ? <View style={styles.handBadge}><Text style={styles.handNum}>{pos}</Text></View> : null}
                {p.role === 'host' ? <Text style={styles.hostTag}>Host</Text> : null}
              </Pressable>
            </Animated.View>
          );
        })}
        {extra > 0 && <Text style={[styles.more, { top: 90 }]}>+{extra} more listening</Text>}
      </View>

      {/* Bottom: hand queue + controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {state.queue.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.queueLabel}>Hands up · first come, first served{isHost ? ' · tap to pass' : ''}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {state.queue.map((id, i) => {
                const p = byId.get(id);
                return (
                  <Animated.View key={id} entering={FadeInDown.springify().damping(15)}>
                    <Pressable disabled={!isHost} onPress={() => passTo(id)}
                      style={({ pressed }) => [styles.chip, id === meId && styles.chipMe, pressed && { opacity: 0.75 }]}
                      accessibilityLabel={`${i + 1}. @${p?.username}${isHost ? ', tap to pass the stick' : ''}`}>
                      <Text style={styles.chipNum}>{i + 1}</Text>
                      <UserAvatar avatarUrl={p?.avatar_url} name={p?.full_name || p?.username} size={22} />
                      <Text style={styles.chipName} numberOfLines={1}>{id === meId ? 'You' : `@${p?.username || '…'}`}</Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {sendFail && holding ? <Text style={styles.err}>Your voice isn't getting through. Check your connection.</Text> : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={styles.controls}>
          {holding && (
            <Pressable onPress={() => setMicOn(m => !m)} style={[styles.mic, !micOn && { backgroundColor: 'rgba(232,116,59,0.2)' }]}
              accessibilityRole="button" accessibilityLabel={micOn ? 'Turn mic off' : 'Turn mic on'}>
              <Ionicons name={micOn ? 'mic' : 'mic-off'} size={22} color={micOn ? HONEY : '#FF9A73'} />
            </Pressable>
          )}

          {isHost ? (
            <>
              {room.holder_id && room.holder_id !== meId ? (
                <PillButton label="Take back" icon="arrow-undo" onPress={takeBack} style={{ flex: 1 }} a11y="Take the stick back" />
              ) : null}
              <PillButton
                label={nextUp ? `Pass to @${nextUp.username}` : 'No hands yet'}
                icon="arrow-forward-circle" tone="honey" onPress={passNext} disabled={!nextUp} style={{ flex: 1.6 }}
                a11y={nextUp ? `Pass the stick to ${nextUp.username}` : 'Nobody has raised a hand'} />
              <PillButton label="End" tone="danger" onPress={end} style={{ paddingHorizontal: 16 }} a11y="End the baraza" />
            </>
          ) : holding ? (
            <PillButton label="Hand back the stick" icon="hand-right-outline" tone="honey" onPress={handBack} style={{ flex: 1 }} />
          ) : (
            <>
              <PillButton
                label={state.me?.hand_raised_at ? (myPos ? `Hand up · you're #${myPos}` : 'Lower hand') : 'Raise hand'}
                icon={state.me?.hand_raised_at ? 'hand-left' : 'hand-left-outline'}
                tone={state.me?.hand_raised_at ? 'plain' : 'honey'} onPress={tapHand} style={{ flex: 1.6 }}
                a11y={state.me?.hand_raised_at ? 'Lower your hand' : 'Raise your hand to speak'} />
              <PillButton label="Leave" onPress={leave} style={{ flex: 1 }} />
            </>
          )}
        </View>
      </View>
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
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.center, { paddingHorizontal: 32, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.noticeIcon}>
        <Ionicons name={icon} size={34} color={HONEY} />
      </Animated.View>
      <Text style={styles.consentTitle}>{title}</Text>
      <Text style={[styles.consentSub, { textAlign: 'center', lineHeight: 20 }]}>{text}</Text>
      <PillButton label="Close" onPress={onClose} style={{ marginTop: 28, alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B4A', marginRight: 5 },
  meta: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontVariant: ['tabular-nums'] },
  recPill: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)' },
  recDotSm: { width: 5, height: 5, borderRadius: 3, backgroundColor: EMBER, marginRight: 4 },
  recText: { color: 'rgba(255,255,255,0.6)', fontSize: 10.5, fontWeight: '600' },
  turnLen: { color: HONEY, fontSize: 13, fontWeight: '800' },

  stickBadge: { position: 'absolute', right: 22, bottom: 22, borderRadius: 20, backgroundColor: '#17120B', padding: 2 },
  speakerName: { color: '#fff', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 8, letterSpacing: -0.3, maxWidth: '80%' },
  speakerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  captions: { minHeight: 74, marginTop: 14, alignItems: 'center', justifyContent: 'flex-start' },
  capWho: { color: HONEY, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  capLine: { color: 'rgba(255,255,255,0.92)', fontSize: 17, lineHeight: 23, textAlign: 'center' },
  capHint: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },

  seat: { borderRadius: 24, borderWidth: 2, borderColor: 'transparent', padding: 1 },
  handBadge: { position: 'absolute', right: -4, top: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: HONEY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  handNum: { color: INK, fontSize: 11.5, fontWeight: '800' },
  hostTag: { color: HONEY, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  more: { position: 'absolute', alignSelf: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12.5 },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  queueLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 7, paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, borderRadius: 17, paddingLeft: 4, paddingRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', maxWidth: 170 },
  chipMe: { backgroundColor: 'rgba(242,181,68,0.18)' },
  chipNum: { color: INK, backgroundColor: HONEY, width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  chipName: { color: '#fff', fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  mic: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(242,181,68,0.14)', alignItems: 'center', justifyContent: 'center' },
  err: { color: '#FF9A73', fontSize: 13, textAlign: 'center', marginBottom: 10, paddingHorizontal: 20 },

  consentWrap: { flex: 1, paddingHorizontal: 16 },
  consentTitle: { color: '#fff', fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, textAlign: 'center', marginTop: 18 },
  consentSub: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 6 },
  notice: { flexDirection: 'row', gap: 12, marginTop: 28, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.3)' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: EMBER, marginTop: 5 },
  noticeTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noticeText: { color: 'rgba(255,255,255,0.62)', fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  rules: { color: 'rgba(255,255,255,0.4)', fontSize: 12.5, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  noticeIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(242,181,68,0.12)', alignItems: 'center', justifyContent: 'center' },
});
