// Voice notes in chats (WhatsApp feel): hold the mic to record, slide left to cancel, let go to
// send. Playback uses the video player (works on every app build); recording needs expo-audio,
// which only builds from 2.1.0 have, so the mic only shows when it is there.
import { CALM_SPRING } from '../../theme/motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { audioAvailable, askMic, setRoomAudioMode } from '../baraza/barazaAudio';

export const canRecordVoice = audioAvailable;
const MAX_MS = 5 * 60 * 1000;
const CANCEL_X = -90;

/** Rejects if `p` hasn't settled in `ms`, so a stuck mic never freezes the composer. */
const withTimeout = <T,>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms))]);

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function recordingOptions() {
  const common = { extension: '.m4a', sampleRate: 44100, numberOfChannels: 1, bitRate: 48000, isMeteringEnabled: true };
  return Platform.OS === 'ios'
    ? { ...common, outputFormat: 'aac ', audioQuality: 64, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false }
    : { ...common, outputFormat: 'mpeg4', audioEncoder: 'aac' };
}

/** One recording at a time. */
class Recording {
  private r: any = null;
  private began = 0;
  async start() {
    const a = require('expo-audio');
    await setRoomAudioMode(true);
    const r = new a.AudioModule.AudioRecorder(recordingOptions());
    await r.prepareToRecordAsync();
    r.record();
    this.r = r;
    this.began = Date.now();
  }
  get ms() { return this.began ? Date.now() - this.began : 0; }
  level(): number {
    try {
      const m = this.r?.getStatus?.()?.metering;
      return typeof m === 'number' ? Math.min(1, Math.max(0, (m + 55) / 50)) : 0.3;
    } catch { return 0.3; }
  }
  async stop(): Promise<{ uri: string; ms: number } | null> {
    const r = this.r;
    const ms = this.ms;
    this.r = null;
    this.began = 0;
    if (!r) return null;
    try { await r.stop(); } catch {}
    await setRoomAudioMode(false);
    const uri = r.uri;
    setTimeout(() => { try { r.release?.(); } catch {} }, 20_000);
    return uri ? { uri, ms } : null;
  }
}

/**
 * The mic button and, while held, the recording bar laid over the composer.
 * onSend gets the file and its length; very short taps show a hint instead.
 */
export function VoiceRecorder({ accent, textColor, subColor, barBg, onSend, onRecordingChange }: {
  accent: string; textColor: string; subColor: string; barBg: string;
  onSend: (v: { uri: string; durationMs: number }) => void;
  onRecordingChange?: (on: boolean) => void;
}) {
  const rec = useRef(new Recording()).current;
  const [on, setOn] = useState(false);
  const [ms, setMs] = useState(0);
  // false, or the line to show above the composer (the hold hint or why recording didn't start)
  const [hint, setHint] = useState<string | false>(false);
  const dx = useSharedValue(0);
  const level = useSharedValue(0.2);
  const cancelled = useRef(false);
  const starting = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => {
      setMs(rec.ms);
      level.value = withTiming(rec.level(), { duration: 120 });
      if (rec.ms >= MAX_MS) finish();
    }, 120);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  const say = (text: string) => {
    setHint(text);
    setTimeout(() => setHint(false), 2600);
  };

  const begin = async () => {
    cancelled.current = false;
    // Show the recording bar the moment the hold lands (like WhatsApp), then wake the mic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMs(0);
    setOn(true);
    onRecordingChange?.(true);
    let failed = false;
    starting.current = (async () => {
      const ok = await withTimeout(askMic(), 8000, 'mic permission');
      if (!ok) { failed = true; return; }
      await withTimeout(rec.start(), 5000, 'recorder start');
    })().catch(e => { failed = true; console.warn('[voice] could not start recording', e?.message || e); });
    await starting.current;
    if (failed) {
      rec.stop().catch(() => {}); // in case the mic came up after we gave up on it
      setOn(false);
      onRecordingChange?.(false);
      dx.value = withSpring(0, CALM_SPRING);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      say("Couldn't start the mic. Check KChat can use it, then try again");
    }
  };

  const finish = async () => {
    // never wait on a mic that didn't come up; begin() closes the bar itself if it failed
    await Promise.race([starting.current, new Promise(r => setTimeout(r, 6000))]);
    const out = await rec.stop();
    setOn(false);
    onRecordingChange?.(false);
    dx.value = withSpring(0, CALM_SPRING);
    if (!out || cancelled.current) return;
    if (out.ms < 700) { say('Hold to record, let go to send'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSend({ uri: out.uri, durationMs: out.ms });
  };

  const markCancel = () => {
    if (cancelled.current) return;
    cancelled.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    finish();
  };

  const showHint = () => {
    Haptics.selectionAsync().catch(() => {});
    say('Hold to record, let go to send');
  };

  const hold = Gesture.Pan()
    .activateAfterLongPress(160)
    .onStart(() => { runOnJS(begin)(); })
    .onUpdate(e => {
      dx.value = Math.min(0, e.translationX);
      if (e.translationX < CANCEL_X) runOnJS(markCancel)();
    })
    .onFinalize((_e, success) => { if (success) runOnJS(finish)(); });
  const tap = Gesture.Tap().onEnd(() => { runOnJS(showHint)(); });
  const gesture = Gesture.Exclusive(hold, tap);

  const dot = useSharedValue(1);
  useEffect(() => {
    dot.value = on ? withRepeat(withTiming(0.25, { duration: 600 }), -1, true) : 1;
  }, [on, dot]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value * 0.6 }],
    opacity: interpolate(dx.value, [CANCEL_X, 0], [0.2, 1], Extrapolation.CLAMP),
  }));
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { scale: on ? 1.35 : 1 }],
  }));
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: 1 + level.value * 0.6 }], opacity: on ? 0.35 : 0 }));

  return (
    <>
      {on && (
        <View style={[styles.bar, { backgroundColor: barBg }]} pointerEvents="none">
          <Animated.View style={[styles.recDot, dotStyle]} />
          <Text style={[styles.recTime, { color: textColor }]}>{mmss(ms)}</Text>
          <Animated.View style={[styles.slide, slideStyle]}>
            <Ionicons name="chevron-back" size={15} color={subColor} />
            <Text style={[styles.slideText, { color: subColor }]}>Slide to cancel</Text>
          </Animated.View>
        </View>
      )}
      {hint && !on && (
        <View style={[styles.hint, { backgroundColor: barBg }]} pointerEvents="none">
          <Text style={[styles.hintText, { color: textColor }]}>{hint}</Text>
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.mic, micStyle]} accessibilityRole="button" accessibilityLabel="Hold to record a voice note">
          <Animated.View style={[StyleSheet.absoluteFill, styles.micPulse, { backgroundColor: accent }, pulse]} />
          <View style={[styles.micInner, { backgroundColor: on ? accent : 'transparent' }]}>
            <Ionicons name="mic" size={21} color={on ? '#000' : subColor} />
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

// ── Playback bubble ──

/** Stable pseudo waveform from the message id (we don't store real peaks). */
function bars(seed: string, n = 30) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const base = 0.25 + ((h >>> 8) % 1000) / 1000 * 0.75;
    const shape = Math.sin((i / n) * Math.PI) * 0.35 + 0.65; // fuller in the middle
    return Math.max(0.18, base * shape);
  });
}

const SPEEDS = [1, 1.5, 2];

type Engine = { toggle: () => void; setRate: (r: number) => void };

/** The actual player, mounted on the first tap so a long chat doesn't load every note. */
function VoiceEngine({ url, rate, onState, engine }: {
  url: string; rate: number; engine: React.MutableRefObject<Engine | null>;
  onState: (s: { playing?: boolean; pos?: number; dur?: number; ended?: boolean }) => void;
}) {
  const player = useVideoPlayer(url, p => { p.loop = false; p.playbackRate = rate; });
  useEffect(() => {
    setRoomAudioMode(false); // plays even with the silent switch on (builds with expo-audio)
    player.play();
    engine.current = {
      toggle: () => { if (player.playing) player.pause(); else player.play(); },
      setRate: r => { player.playbackRate = r; },
    };
    const a = player.addListener('playingChange', ({ isPlaying }: any) => onState({ playing: isPlaying }));
    const b = player.addListener('playToEnd', () => { player.pause(); player.currentTime = 0; onState({ playing: false, pos: 0, ended: true }); });
    const t = setInterval(() => {
      if (!player.playing) return;
      onState({ pos: player.currentTime || 0, dur: player.duration > 0 ? player.duration : undefined });
    }, 120);
    return () => { a.remove(); b.remove(); clearInterval(t); engine.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);
  return null;
}

export function VoiceBubbleBody({ id, url, durationMs, fg, meta, accent, isOwn, transcript, pending, createdAt }: {
  id: string; url: string; durationMs?: number | null; fg: string; meta: string; accent: string; isOwn: boolean;
  transcript?: string | null; pending?: boolean; createdAt: string;
}) {
  const [armed, setArmed] = useState(false);
  const engine = useRef<Engine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState((durationMs || 0) / 1000);
  const [speed, setSpeed] = useState(0);
  const [open, setOpen] = useState(false);
  const shape = useMemo(() => bars(id), [id]);

  const onState = (st: { playing?: boolean; pos?: number; dur?: number }) => {
    if (st.playing !== undefined) setPlaying(st.playing);
    if (st.pos !== undefined) setPos(st.pos);
    if (st.dur !== undefined) setDur(st.dur);
  };
  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    if (!armed) { setArmed(true); return; }
    engine.current?.toggle();
  };
  const cycle = () => {
    const n = (speed + 1) % SPEEDS.length;
    setSpeed(n);
    engine.current?.setRate(SPEEDS[n]);
    Haptics.selectionAsync().catch(() => {});
  };

  const frac = dur > 0 ? Math.min(1, pos / dur) : 0;
  const fillColor = isOwn ? '#000' : accent;
  const restColor = isOwn ? 'rgba(0,0,0,0.28)' : meta;
  const recent = Date.now() - new Date(createdAt).getTime() < 3 * 60 * 1000;
  const waiting = transcript == null && !pending && recent;

  return (
    <View style={{ minWidth: 220 }}>
      {armed && <VoiceEngine url={url} rate={SPEEDS[speed]} onState={onState} engine={engine} />}
      <View style={styles.vRow}>
        <Pressable onPress={toggle} hitSlop={6} style={[styles.play, { backgroundColor: isOwn ? 'rgba(0,0,0,0.12)' : 'rgba(127,127,127,0.18)' }]} accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={fg} style={!playing && { marginLeft: 2 }} />
        </Pressable>
        <View style={styles.wave}>
          {shape.map((v, i) => (
            <View key={i} style={[styles.waveBar, { height: 4 + v * 20, backgroundColor: i / shape.length <= frac ? fillColor : restColor }]} />
          ))}
        </View>
        <Pressable onPress={cycle} hitSlop={6} style={[styles.speed, { borderColor: restColor }]} accessibilityLabel="Playback speed">
          <Text style={[styles.speedText, { color: fg }]}>{SPEEDS[speed]}×</Text>
        </Pressable>
      </View>
      {dur > 0 && <Text style={[styles.vTime, { color: meta }]}>{mmss((playing || pos > 0 ? Math.max(0, dur - pos) : dur) * 1000)}</Text>}
      {transcript ? (
        <Pressable onPress={() => setOpen(o => !o)}>
          <Text style={[styles.transcript, { color: fg }]} numberOfLines={open ? undefined : 3}>{transcript}</Text>
        </Pressable>
      ) : waiting ? (
        <Text style={[styles.transcript, { color: meta, fontStyle: 'italic' }]}>Writing it out…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 46, top: 0, bottom: 0, borderRadius: 19, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, zIndex: 2 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', marginRight: 8 },
  recTime: { fontSize: 15.5, fontVariant: ['tabular-nums'], fontWeight: '600', minWidth: 44 },
  slide: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  slideText: { fontSize: 14.5 },
  hint: { position: 'absolute', right: 0, bottom: 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, zIndex: 3 },
  hintText: { fontSize: 13.5, fontWeight: '600' },
  mic: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginLeft: 6, zIndex: 4 },
  micPulse: { borderRadius: 19 },
  micInner: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },

  vRow: { flexDirection: 'row', alignItems: 'center' },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  wave: { flex: 1, height: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waveBar: { width: 2.5, borderRadius: 2 },
  speed: { marginLeft: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, height: 22, alignItems: 'center', justifyContent: 'center' },
  speedText: { fontSize: 11.5, fontWeight: '700' },
  vTime: { fontSize: 11.5, marginTop: 3, marginLeft: 44, fontVariant: ['tabular-nums'] },
  transcript: { fontSize: 14.5, lineHeight: 19, marginTop: 6 },
});
