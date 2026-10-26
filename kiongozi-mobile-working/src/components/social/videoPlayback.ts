// Shared state for inline (feed) video playback.
// - Picks the single most-visible video on screen and lets only that one play.
// - Remembers mute state across videos (muted by default, like other social apps).
// - Remembers playback position per URL so the feed and the full-screen viewer continue each other.
// Works in any list (Feed, Explore, Profile, Post detail...) without wiring viewability callbacks.
import { AppState, Dimensions, View } from 'react-native';
import type { RefObject } from 'react';

type Entry = { ref: RefObject<View | null>; enabled: boolean; setActive: (active: boolean) => void };

const entries = new Map<string, Entry>();
let activeId: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let pauseReasons = new Set<string>();
let seq = 0;

export const nextVideoId = () => `fv${++seq}`;

// ---- position memory -------------------------------------------------------
const positions = new Map<string, number>();
export const getPosition = (url: string) => positions.get(url) ?? 0;
export const setPosition = (url: string, t: number) => { if (Number.isFinite(t)) positions.set(url, t); };

// ---- mute state ------------------------------------------------------------
let muted = true;
const muteListeners = new Set<(m: boolean) => void>();
export const isMuted = () => muted;
export const setMuted = (m: boolean) => { muted = m; muteListeners.forEach(l => l(m)); };
export const onMuteChange = (l: (m: boolean) => void) => { muteListeners.add(l); return () => { muteListeners.delete(l); }; };

// ---- pausing (viewer open, app in background) -------------------------------
export function setFeedPaused(reason: string, paused: boolean) {
  if (paused) pauseReasons.add(reason); else pauseReasons.delete(reason);
  tick();
}
AppState.addEventListener('change', s => setFeedPaused('background', s !== 'active'));

// ---- visibility ------------------------------------------------------------
function setActive(id: string | null) {
  if (id === activeId) return;
  const prev = activeId ? entries.get(activeId) : undefined;
  activeId = id;
  prev?.setActive(false);
  if (id) entries.get(id)?.setActive(true);
}

function tick() {
  if (pauseReasons.size > 0) { setActive(null); return; }
  const list = [...entries.entries()].filter(([, e]) => e.enabled && e.ref.current);
  if (!list.length) { setActive(null); return; }
  const H = Dimensions.get('window').height;
  const top = 70, bottom = H - 70; // roughly clear of headers and the tab bar
  let pending = list.length;
  let best: { id: string | null; score: number } = { id: null, score: -Infinity };
  for (const [id, e] of list) {
    e.ref.current!.measureInWindow((_x, y, w, h) => {
      if (w > 0 && h > 0) {
        const visible = Math.max(0, Math.min(y + h, bottom) - Math.max(y, top));
        const frac = visible / Math.min(h, bottom - top);
        if (frac >= 0.6) {
          const score = frac * 1000 - Math.abs(y + h / 2 - H / 2);
          if (score > best.score) best = { id, score };
        }
      }
      if (--pending === 0) setActive(pauseReasons.size ? null : best.id);
    });
  }
}

export function registerVideo(id: string, entry: Entry) {
  entries.set(id, entry);
  if (!timer) timer = setInterval(tick, 250);
  return () => {
    entries.delete(id);
    if (activeId === id) activeId = null;
    if (!entries.size && timer) { clearInterval(timer); timer = null; }
  };
}

export function setVideoEnabled(id: string, enabled: boolean) {
  const e = entries.get(id);
  if (!e) return;
  e.enabled = enabled;
  if (!enabled && activeId === id) setActive(null);
}
