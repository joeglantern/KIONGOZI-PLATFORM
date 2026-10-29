// Outbox: what you do without a connection is kept on the phone and sent when it's back
// (WhatsApp: clock → tick). Survives app restarts.
//  - dm      a chat message (with an optional photo, uploaded when it sends)
//  - ix      like / bookmark / repost: only the latest wish per post is kept
//  - follow  follow / unfollow: only the latest wish per person is kept
// Jobs go out one by one, in order. A network failure pauses the queue and retries later;
// a refusal from the server drops that job (a message is then shown as "Not sent · Tap to retry").
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { useNet } from '../stores/netStore';

const KEY = 'kchat.outbox';

export type DMJob = {
  t: 'dm'; id: string; tries: number;
  conversationId: string; tempId: string; senderId: string; createdAt: string;
  content: string; mediaUri?: string; mediaUrl?: string; replyToId?: string;
  /** 'audio' for voice notes (default photo) */
  mediaType?: 'image' | 'audio'; durationMs?: number;
};
export type IxJob = { t: 'ix'; id: string; tries: number; kind: 'like' | 'bookmark' | 'repost'; postId: string; want: boolean };
export type FollowJob = { t: 'follow'; id: string; tries: number; userId: string; want: boolean };
export type Job = DMJob | IxJob | FollowJob;
type NewJob = Omit<DMJob, 'id' | 'tries'> | Omit<IxJob, 'id' | 'tries'> | Omit<FollowJob, 'id' | 'tries'>;
type Result = 'done' | 'network' | 'rejected';

let jobs: Job[] = [];
let loaded = false;
let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 5000;
const listeners = new Set<() => void>();

const save = () => AsyncStorage.setItem(KEY, JSON.stringify(jobs)).catch(() => {});
const emit = () => listeners.forEach(l => { try { l(); } catch {} });

export const isNetworkError = (r: any) => !r || r.error === 'Network error';

export function onOutbox(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Messages still waiting to send in a chat (to show them after a restart or a refresh) */
export const queuedDMs = (conversationId: string) =>
  jobs.filter((j): j is DMJob => j.t === 'dm' && j.conversationId === conversationId);

export const outboxSize = () => jobs.length;

export function enqueue(job: NewJob) {
  // Only the latest wish matters for toggles: liking then unliking offline sends nothing twice
  if (job.t === 'ix') jobs = jobs.filter(j => !(j.t === 'ix' && j.kind === job.kind && j.postId === job.postId));
  if (job.t === 'follow') jobs = jobs.filter(j => !(j.t === 'follow' && j.userId === job.userId));
  jobs.push({ ...job, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, tries: 0 } as Job);
  save();
  emit();
  flush();
}

/** A follow/unfollow that just went through online replaces anything older still queued */
export function settleFollow(userId: string) {
  const before = jobs.length;
  jobs = jobs.filter(j => !(j.t === 'follow' && j.userId === userId));
  if (jobs.length !== before) { save(); emit(); }
}

export function settleInteraction(kind: IxJob['kind'], postId: string) {
  const before = jobs.length;
  jobs = jobs.filter(j => !(j.t === 'ix' && j.kind === kind && j.postId === postId));
  if (jobs.length !== before) { save(); emit(); }
}

export function clearOutbox() {
  jobs = [];
  AsyncStorage.removeItem(KEY).catch(() => {});
  emit();
}

/** Upload a photo picked for a chat message; returns its public URL */
export async function uploadDMImage(uri: string, userId: string, kind: 'image' | 'audio' = 'image'): Promise<string> {
  const { supabase } = require('./supabaseClient');
  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] || (kind === 'audio' ? 'm4a' : 'jpg');
  const mimeType = kind === 'audio' ? 'audio/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg';
  const storagePath = `dms/${userId}/${Date.now()}.${ext}`;
  const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Failed to read file'));
    xhr.send();
  });
  const { error } = await supabase.storage.from('social-media').upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message || 'Network error');
  return supabase.storage.from('social-media').getPublicUrl(storagePath).data.publicUrl;
}

async function runDM(job: DMJob): Promise<Result> {
  const api = require('./apiClient').default;
  const { useDMStore } = require('../stores/dmStore');
  if (job.mediaUri && !job.mediaUrl) {
    try {
      job.mediaUrl = await uploadDMImage(job.mediaUri, job.senderId, job.mediaType || 'image');
      save();
    } catch (e: any) {
      // The photo file is gone (phone cleared it): nothing we can send
      if (/read file/i.test(e?.message || '')) return 'rejected';
      return 'network';
    }
  }
  const r: any = await api.sendDM(job.conversationId, job.content, job.mediaUrl, job.mediaUrl ? (job.mediaType || 'image') : undefined, job.replyToId, job.durationMs);
  if (r?.success && r.data) {
    useDMStore.getState().replaceMessage(job.conversationId, job.tempId, r.data);
    return 'done';
  }
  return isNetworkError(r) ? 'network' : 'rejected';
}

async function runFollow(job: FollowJob): Promise<Result> {
  const api = require('./apiClient').default;
  const r: any = job.want ? await api.followUserNow(job.userId) : await api.unfollowUserNow(job.userId);
  if (r?.success) return 'done';
  if (isNetworkError(r)) return 'network';
  // "Already following" / "not following" mean the wish is already true
  if (/already|not following|not found/i.test(r?.error || '')) return 'done';
  return 'rejected';
}

async function runInteraction(job: IxJob): Promise<Result> {
  const { ensureInteraction } = require('../stores/interactionSync');
  const r = await ensureInteraction(job.postId, job.kind, job.want);
  return r;
}

async function run(job: Job): Promise<Result> {
  try {
    if (job.t === 'dm') return await runDM(job);
    if (job.t === 'follow') return await runFollow(job);
    return await runInteraction(job);
  } catch {
    return 'network';
  }
}

function markFailed(job: Job) {
  if (job.t !== 'dm') return;
  try {
    const { useDMStore } = require('../stores/dmStore');
    useDMStore.getState().markMessageFailed(job.conversationId, job.tempId);
  } catch {}
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => { retryTimer = null; flush(); }, backoff);
  backoff = Math.min(backoff * 2, 60000);
}

export async function flush() {
  if (flushing || !jobs.length) return;
  flushing = true;
  try {
    while (jobs.length) {
      const job = jobs[0];
      const res = await run(job);
      if (res === 'network') {
        job.tries++;
        // A message that keeps failing for a long time is given up so the queue never jams
        if (job.tries >= 40) {
          jobs.shift();
          markFailed(job);
          save();
          emit();
          continue;
        }
        save();
        scheduleRetry();
        return;
      }
      jobs.shift();
      if (res === 'rejected') markFailed(job);
      backoff = 5000;
      save();
      emit();
    }
  } finally {
    flushing = false;
  }
}

let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  // Back online, or back in the app: send what's waiting
  useNet.subscribe((s: any, prev: any) => {
    if (s.status === 'online' && prev?.status !== 'online') { backoff = 5000; flush(); }
  });
  AppState.addEventListener('change', st => { if (st === 'active') flush(); });
}

/** Call once after sign-in: loads what was waiting from last time and starts sending it */
export async function loadOutbox() {
  watch();
  if (!loaded) {
    loaded = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved: Job[] = JSON.parse(raw);
        const fresh = new Set(jobs.map(j => j.id));
        jobs = [...saved.filter(j => !fresh.has(j.id)), ...jobs];
      }
    } catch {}
    emit();
  }
  flush();
}
