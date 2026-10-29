// Baraza audio: the stick holder records in short chunks; listeners play the chunks back to back.
// expo-audio only exists in app builds from 2.1.0, so it is loaded lazily and only when its
// native module is present (older installs see "Update KChat" instead of crashing).
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { supabase } from '../../utils/supabaseClient';

export const audioAvailable = !!requireOptionalNativeModule('ExpoAudio');

let mod: any = null;
function A(): any {
  if (!audioAvailable) return null;
  if (!mod) mod = require('expo-audio');
  return mod;
}

/** Chunk length. Shorter = less delay, longer = better captions and fewer requests. */
export const CHUNK_MS = 6000;
/** What we tell people: roughly one chunk plus upload and download behind. */
export const DELAY_LABEL = '~8s';

// Voice only: mono AAC at 32 kbps (about 24 KB per chunk, fine on 3G), plays on both platforms
function recordingOptions() {
  const common = { extension: '.m4a', sampleRate: 22050, numberOfChannels: 1, bitRate: 32000, isMeteringEnabled: true };
  if (Platform.OS === 'ios') {
    return { ...common, outputFormat: 'aac ', audioQuality: 32, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false };
  }
  return { ...common, outputFormat: 'mpeg4', audioEncoder: 'aac' };
}

/** Playback works with the silent switch on; recording only while you hold the stick. */
export async function setRoomAudioMode(recording: boolean) {
  const a = A();
  if (!a) return;
  await a.setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: recording,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
    interruptionModeAndroid: 'duckOthers',
  }).catch(() => {});
}

export async function askMic(): Promise<boolean> {
  const a = A();
  if (!a) return false;
  try {
    const r = await a.requestRecordingPermissionsAsync();
    return !!r?.granted;
  } catch {
    return false;
  }
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Could not read the recording'));
    xhr.send();
  });
}

/** Uploads one chunk to storage; returns its storage path. */
export async function uploadChunk(uri: string, roomId: string, userId: string, n: number) {
  const path = `baraza/${roomId}/${userId}/${Date.now()}_${n}.m4a`;
  const bytes = await readBytes(uri);
  const { error } = await supabase.storage.from('social-media').upload(path, bytes, { contentType: 'audio/mp4', upsert: false });
  if (error) throw error;
  return path;
}

type Chunk = { uri: string; ms: number; loud: boolean };

/**
 * Records a turn as back-to-back chunks. The next recorder is prepared while the current one
 * runs, so the switch is just stop + start (a gap of roughly 0.1 s). Android can't record twice
 * at once, so the old one stops before the new one starts.
 */
export class TurnRecorder {
  private running = false;
  private cur: any = null;
  private next: any = null;
  private startedAt = 0;
  private peak = -160;
  private timer: any = null;
  private meter: any = null;

  constructor(private onChunk: (c: Chunk) => void) {}

  get active() { return this.running; }

  private async make() {
    const a = A();
    const r = new a.AudioModule.AudioRecorder(recordingOptions());
    await r.prepareToRecordAsync();
    return r;
  }

  private begin(r: any) {
    r.record();
    this.cur = r;
    this.startedAt = Date.now();
    this.peak = -160;
  }

  async start() {
    if (this.running || !A()) return;
    this.running = true;
    await setRoomAudioMode(true);
    try {
      this.begin(await this.make());
      this.make().then(r => { if (this.running) this.next = r; else r.release?.(); }).catch(() => {});
    } catch (e) {
      this.running = false;
      await setRoomAudioMode(false);
      throw e;
    }
    // Loudest moment of the chunk, so silent chunks are not sent
    this.meter = setInterval(() => {
      try {
        const m = this.cur?.getStatus?.()?.metering;
        if (typeof m === 'number' && m > this.peak) this.peak = m;
      } catch {}
    }, 200);
    this.timer = setTimeout(() => this.cut(), CHUNK_MS);
  }

  private async finishChunk(r: any, startedAt: number, peak: number) {
    try { await r.stop(); } catch {}
    const uri = r.uri;
    const ms = Date.now() - startedAt;
    // Metering is in dBFS; below about -50 is a quiet room. No meter reading = send it anyway
    if (uri && ms > 500) this.onChunk({ uri, ms, loud: peak === -160 || peak > -50 });
    setTimeout(() => { try { r.release?.(); } catch {} }, 30_000);
  }

  private async cut() {
    if (!this.running) return;
    const done = this.cur, began = this.startedAt, peak = this.peak;
    let nxt = this.next;
    this.next = null;
    try { await done.stop(); } catch {}
    if (this.running) {
      try {
        if (!nxt) nxt = await this.make();
        this.begin(nxt);
      } catch {
        this.running = false;
      }
    }
    const uri = done.uri;
    const ms = Date.now() - began;
    if (uri && ms > 500) this.onChunk({ uri, ms, loud: peak === -160 || peak > -50 });
    setTimeout(() => { try { done.release?.(); } catch {} }, 30_000);
    if (this.running) {
      this.make().then(r => { if (this.running) this.next = r; else r.release?.(); }).catch(() => {});
      this.timer = setTimeout(() => this.cut(), CHUNK_MS);
    } else {
      this.stopTimers();
      await setRoomAudioMode(false);
    }
  }

  private stopTimers() {
    clearTimeout(this.timer);
    clearInterval(this.meter);
    this.timer = null;
    this.meter = null;
  }

  /** Ends the turn; the last partial chunk is still sent. */
  async stop() {
    if (!this.running) return;
    this.running = false;
    this.stopTimers();
    const r = this.cur;
    this.cur = null;
    const n = this.next;
    this.next = null;
    try { n?.release?.(); } catch {}
    if (r) await this.finishChunk(r, this.startedAt, this.peak);
    await setRoomAudioMode(false);
  }
}

export type PlayableSegment = { seq: number; url: string; duration_ms: number; speaker_id: string };

/**
 * Plays chunks in seq order, one after another. The next chunk loads while the current one
 * plays. If we fall behind, playback speeds up a little, and very old chunks are skipped.
 */
export class SegmentPlayer {
  private queue: PlayableSegment[] = [];
  private lastSeq = 0;
  private playing: { seg: PlayableSegment; p: any; sub: any; guard: any } | null = null;
  private preloaded: { seq: number; p: any } | null = null;
  private stopped = false;

  constructor(private onNow: (seg: PlayableSegment | null) => void) {}

  /** Start after this seq (older chunks are ignored). */
  from(seq: number) { this.lastSeq = Math.max(this.lastSeq, seq); }

  push(segs: PlayableSegment[]) {
    if (this.stopped) return;
    for (const s of segs) {
      if (s.seq <= this.lastSeq) continue;
      this.queue.push(s);
      this.lastSeq = s.seq;
    }
    this.queue.sort((a, b) => a.seq - b.seq);
    // More than ~40 s behind: jump ahead to the latest few chunks
    if (this.queue.length > 6) this.queue = this.queue.slice(-3);
    this.pump();
  }

  private create(url: string) {
    const a = A();
    return a.createAudioPlayer({ uri: url }, { updateInterval: 250 });
  }

  private pump() {
    if (this.stopped || this.playing || !this.queue.length || !A()) return;
    const seg = this.queue.shift()!;
    let p: any;
    if (this.preloaded?.seq === seg.seq) { p = this.preloaded.p; this.preloaded = null; }
    else {
      try { this.preloaded?.p.remove(); } catch {}
      this.preloaded = null;
      try { p = this.create(seg.url); } catch { this.onNow(null); return; }
    }
    const sub = p.addListener('playbackStatusUpdate', (s: any) => { if (s?.didJustFinish) this.done(); });
    // A chunk that never finishes (bad network) is given up on
    const guard = setTimeout(() => this.done(), seg.duration_ms + 6000);
    this.playing = { seg, p, sub, guard };
    try {
      if (this.queue.length >= 2) p.setPlaybackRate(1.15);
      p.play();
    } catch {}
    this.onNow(seg);
    const nxt = this.queue[0];
    if (nxt && !this.preloaded) {
      try { this.preloaded = { seq: nxt.seq, p: this.create(nxt.url) }; } catch {}
    }
  }

  private done() {
    const cur = this.playing;
    if (!cur) return;
    this.playing = null;
    clearTimeout(cur.guard);
    try { cur.sub?.remove(); } catch {}
    try { cur.p.remove(); } catch {}
    if (!this.queue.length) this.onNow(null);
    this.pump();
  }

  stop() {
    this.stopped = true;
    this.queue = [];
    if (this.playing) {
      clearTimeout(this.playing.guard);
      try { this.playing.sub?.remove(); } catch {}
      try { this.playing.p.remove(); } catch {}
      this.playing = null;
    }
    try { this.preloaded?.p.remove(); } catch {}
    this.preloaded = null;
  }
}
