// "Active now" (Instagram / WhatsApp): one Supabase Realtime presence channel. Each phone joins
// while the app is open and in front, and leaves when it goes to the background.
// Turning off "Show activity status" stops sharing yours and hides everyone else's (same as Instagram).
import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { usePrefs } from './prefsStore';

interface PresenceState {
  online: Record<string, true>;
  start: (userId: string) => void;
  stop: () => void;
}

let channel: RealtimeChannel | null = null;
let me: string | null = null;
let appSub: { remove: () => void } | null = null;
let prefsUnsub: (() => void) | null = null;

const allowed = () => {
  const p = usePrefs.getState();
  return p.showActivity && p.features.presence;
};

function join() {
  if (!me || channel || !allowed()) return;
  const ch = supabase.channel('kchat-online', { config: { presence: { key: me } } });
  ch.on('presence', { event: 'sync' }, () => {
    const online: Record<string, true> = {};
    for (const k of Object.keys(ch.presenceState())) if (k !== me) online[k] = true;
    usePresence.setState({ online });
  }).subscribe(status => {
    if (status === 'SUBSCRIBED') ch.track({ at: Date.now() }).catch(() => {});
  });
  channel = ch;
}

function leave() {
  if (!channel) return;
  const ch = channel;
  channel = null;
  ch.untrack().catch(() => {}).finally(() => supabase.removeChannel(ch));
  usePresence.setState({ online: {} });
}

export const usePresence = create<PresenceState>(() => ({
  online: {},
  start: (userId) => {
    me = userId;
    if (AppState.currentState === 'active') join();
    appSub?.remove();
    appSub = AppState.addEventListener('change', (s: AppStateStatus) => (s === 'active' ? join() : leave()));
    prefsUnsub?.();
    prefsUnsub = usePrefs.subscribe((p, prev) => {
      if (p.showActivity === prev.showActivity && p.features.presence === prev.features.presence) return;
      allowed() ? join() : leave();
    });
  },
  stop: () => {
    appSub?.remove(); appSub = null;
    prefsUnsub?.(); prefsUnsub = null;
    leave();
    me = null;
  },
}));

export const useIsOnline = (userId?: string | null) => usePresence(s => (userId ? !!s.online[userId] : false));
