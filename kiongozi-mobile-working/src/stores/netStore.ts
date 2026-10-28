// Knows whether we can reach the server, without a native module: every API call reports
// in, and while offline we quietly ping /health with backoff until it answers again.
import { create } from 'zustand';
import { AppState } from 'react-native';

const HEALTH = 'https://api.kiongozi.org/api/v1/health';

interface NetState {
  online: boolean;
  /** When we last came back online (drives the brief "Back online" pill) */
  backAt: number;
  reportOk: () => void;
  reportFail: () => void;
  check: () => Promise<boolean>;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let delay = 3000;
let fails = 0;

async function ping(): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(HEALTH, { method: 'GET', signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    return r.status < 500;
  } catch { return false; } finally { clearTimeout(t); }
}

export const useNet = create<NetState>((set, get) => ({
  online: true,
  backAt: 0,

  reportOk: () => {
    fails = 0;
    if (!get().online) {
      if (timer) { clearTimeout(timer); timer = null; }
      delay = 3000;
      set({ online: true, backAt: Date.now() });
    }
  },

  reportFail: () => {
    // One failed request can be a blip; confirm with a ping before showing the banner
    fails++;
    if (!get().online || fails > 1) { goOffline(); return; }
    ping().then(ok => (ok ? get().reportOk() : goOffline()));
  },

  check: async () => {
    const ok = await ping();
    ok ? get().reportOk() : goOffline();
    return ok;
  },
}));

function goOffline() {
  if (useNet.getState().online) useNet.setState({ online: false });
  if (timer) return;
  const loop = async () => {
    timer = null;
    if (await ping()) { useNet.getState().reportOk(); return; }
    delay = Math.min(delay * 1.6, 20000);
    timer = setTimeout(loop, delay);
  };
  timer = setTimeout(loop, delay);
}

// Coming back to the app is the moment people notice; check right away
AppState.addEventListener('change', s => { if (s === 'active') useNet.getState().check(); });
