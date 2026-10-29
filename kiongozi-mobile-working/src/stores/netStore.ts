// Knows whether we can reach the server, without a native module. Big-app rules:
// - Never accuse the person's internet on one failure: confirm twice, a moment apart.
// - Tell "your internet is down" apart from "our server is down" by also checking a neutral
//   site (Google's generate_204). Different message for each.
// - While not online, ping /health with backoff until it answers, then flash "Back online".
import { create } from 'zustand';
import { AppState } from 'react-native';

// iOS cuts sockets when the phone locks; failures then say nothing about their internet
const inForeground = () => AppState.currentState === 'active';

const HEALTH = 'https://api.kiongozi.org/api/v1/health';
const NEUTRAL = 'https://clients3.google.com/generate_204';

export type NetStatus = 'online' | 'offline' | 'server';

interface NetState {
  status: NetStatus;
  /** true when the API is reachable (kept for older callers) */
  online: boolean;
  /** When we last came back online (drives the brief "Back online" pill) */
  backAt: number;
  reportOk: () => void;
  reportFail: () => void;
  check: () => Promise<boolean>;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let delay = 3000;
let confirming = false;

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function reach(url: string, ms = 8000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { method: 'GET', signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    return r.status < 500;
  } catch { return false; } finally { clearTimeout(t); }
}

/** Two tries, 1.5s apart, before we call it */
async function apiUp() {
  if (await reach(HEALTH)) return true;
  await wait(1500);
  return reach(HEALTH);
}

export const useNet = create<NetState>((set, get) => ({
  status: 'online',
  online: true,
  backAt: 0,

  reportOk: () => {
    if (get().status !== 'online') {
      if (timer) { clearTimeout(timer); timer = null; }
      delay = 3000;
      set({ status: 'online', online: true, backAt: Date.now() });
    }
  },

  reportFail: () => {
    if (get().status !== 'online' || confirming) return; // already handling it
    if (!inForeground()) return;
    confirming = true;
    confirm().finally(() => { confirming = false; });
  },

  check: async () => {
    const ok = await reach(HEALTH);
    if (ok) get().reportOk();
    else if (get().status === 'online') get().reportFail();
    return ok;
  },
}));

async function confirm() {
  if (await apiUp()) { useNet.getState().reportOk(); return; }
  const internet = await reach(NEUTRAL, 6000);
  // Went to the background while checking: the results can't be trusted
  if (!inForeground()) return;
  const status: NetStatus = internet ? 'server' : 'offline';
  useNet.setState({ status, online: false });
  retryLoop();
}

function retryLoop() {
  if (timer) return;
  const loop = async () => {
    timer = null;
    if (await reach(HEALTH)) { useNet.getState().reportOk(); return; }
    // Keep the message honest as things change
    const internet = await reach(NEUTRAL, 6000);
    useNet.setState({ status: internet ? 'server' : 'offline', online: false });
    delay = Math.min(delay * 1.6, 20000);
    timer = setTimeout(loop, delay);
  };
  timer = setTimeout(loop, delay);
}

// Back in the app: if we were offline, check again right away (after the radio wakes up)
AppState.addEventListener('change', s => {
  if (s === 'active' && useNet.getState().status !== 'online') {
    delay = 3000;
    setTimeout(() => useNet.getState().check(), 800);
  }
});
