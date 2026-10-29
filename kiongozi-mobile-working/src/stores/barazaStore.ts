// Baraza: what is live (Explore card), which room is open, and its server state.
// The server decides who holds the stick and when turns end; this store just mirrors it.
import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface BarazaPerson {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
}

export interface LiveBaraza {
  id: string;
  title: string;
  created_at: string;
  turn_seconds: number;
  host: BarazaPerson | null;
  speaker: BarazaPerson | null;
  count: number;
}

export interface BarazaRoomRow {
  id: string;
  host_id: string;
  title: string;
  status: 'live' | 'ended';
  turn_seconds: number;
  holder_id: string | null;
  turn_started_at: string | null;
  turn_ends_at: string | null;
  version: number;
  minutes_status: 'none' | 'building' | 'ready' | 'failed';
  minutes_post_id: string | null;
  created_at: string;
}

export interface BarazaState {
  room: BarazaRoomRow;
  host: BarazaPerson | null;
  holder: BarazaPerson | null;
  people: { user_id: string; role: 'host' | 'listener'; hand_raised_at: string | null; spoke: boolean; profile: BarazaPerson | null }[];
  queue: string[];
  count: number;
  me: { role: 'host' | 'listener'; hand_raised_at: string | null; removed: boolean; joined: boolean } | null;
  latest_seq: number;
  server_now: string;
}

export interface BarazaMinutes {
  room: { id: string; title: string; status: string; minutes_status: BarazaRoomRow['minutes_status']; minutes_post_id: string | null; created_at: string; ended_at: string | null; host_id: string };
  host: BarazaPerson | null;
  summary: string | null;
  key_points: { text: string; by: BarazaPerson | null }[];
  ahadi: { id: string; text: string; done: boolean; who_name: string | null; user: BarazaPerson | null; can_check: boolean }[];
}

type Res<T = any> = { success: boolean; data?: T; error?: string };

/** Uses the shared API client (auth headers, token refresh). */
export function barazaApi<T = any>(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: any): Promise<Res<T>> {
  return (apiClient as any).request(`/api/v1/baraza${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

interface Store {
  live: LiveBaraza[];
  liveLoaded: boolean;
  startOpen: boolean;
  /** Room on screen (before joining it shows the consent card) */
  openId: string | null;
  preview: LiveBaraza | null;
  state: BarazaState | null;
  /** Date.now() - server time, so turn countdowns match the server */
  skew: number;
  busy: boolean;
  error: string | null;
  minutesId: string | null;

  fetchLive: () => Promise<void>;
  openStart: () => void;
  closeStart: () => void;
  open: (id: string, preview?: LiveBaraza | null) => void;
  close: () => void;
  apply: (s: BarazaState | undefined) => void;
  refresh: () => Promise<void>;
  create: (title: string, turnSeconds: number) => Promise<string | null>;
  join: () => Promise<boolean>;
  leave: () => Promise<void>;
  hand: (up: boolean) => Promise<void>;
  pass: (to?: string) => Promise<void>;
  remove: (userId: string) => Promise<void>;
  setTurn: (seconds: number) => Promise<void>;
  end: () => Promise<void>;
  openMinutes: (id: string) => void;
  closeMinutes: () => void;
}

export const useBarazaStore = create<Store>((set, get) => ({
  live: [],
  liveLoaded: false,
  startOpen: false,
  openId: null,
  preview: null,
  state: null,
  skew: 0,
  busy: false,
  error: null,
  minutesId: null,

  fetchLive: async () => {
    const res = await barazaApi<LiveBaraza[]>('/live');
    if (res.success) set({ live: res.data || [], liveLoaded: true });
    else set({ liveLoaded: true });
  },

  openStart: () => set({ startOpen: true, error: null }),
  closeStart: () => set({ startOpen: false }),
  open: (id, preview = null) => set({ openId: id, preview, state: null, error: null }),
  close: () => { set({ openId: null, preview: null, state: null, error: null }); get().fetchLive(); },

  apply: s => {
    if (!s) return;
    const cur = get().state;
    // Ignore an older answer that arrives after a newer one
    if (cur && cur.room.id === s.room.id && s.room.version < cur.room.version) return;
    set({ state: s, skew: Date.now() - new Date(s.server_now).getTime() });
  },

  refresh: async () => {
    const id = get().openId;
    if (!id) return;
    const res = await barazaApi<BarazaState>(`/${id}`);
    if (get().openId !== id) return;
    if (res.success) get().apply(res.data);
    else if (!get().state) set({ error: res.error || 'Could not load this baraza' });
  },

  create: async (title, turnSeconds) => {
    set({ busy: true, error: null });
    const res = await barazaApi<BarazaState>('/', 'POST', { title, turn_seconds: turnSeconds });
    set({ busy: false });
    if (!res.success || !res.data) { set({ error: res.error || 'Could not start the baraza' }); return null; }
    set({ startOpen: false, openId: res.data.room.id, preview: null, state: null });
    get().apply(res.data);
    return res.data.room.id;
  },

  join: async () => {
    const id = get().openId;
    if (!id) return false;
    set({ busy: true, error: null });
    const res = await barazaApi<BarazaState>(`/${id}/join`, 'POST');
    set({ busy: false });
    if (!res.success) { set({ error: res.error || 'Could not join' }); return false; }
    get().apply(res.data);
    return true;
  },

  leave: async () => {
    const id = get().openId;
    if (id) barazaApi(`/${id}/leave`, 'POST').catch(() => {});
    get().close();
  },

  hand: async up => {
    const id = get().openId;
    if (!id) return;
    const res = await barazaApi<BarazaState>(`/${id}/hand`, 'POST', { up });
    if (res.success) get().apply(res.data); else set({ error: res.error || null });
  },

  pass: async to => {
    const id = get().openId;
    if (!id) return;
    const res = await barazaApi<BarazaState>(`/${id}/pass`, 'POST', to ? { to } : {});
    if (res.success) get().apply(res.data); else set({ error: res.error || null });
  },

  remove: async userId => {
    const id = get().openId;
    if (!id) return;
    const res = await barazaApi<BarazaState>(`/${id}/remove`, 'POST', { user_id: userId });
    if (res.success) get().apply(res.data); else set({ error: res.error || null });
  },

  setTurn: async seconds => {
    const id = get().openId;
    if (!id) return;
    const res = await barazaApi<BarazaState>(`/${id}/turn`, 'POST', { seconds });
    if (res.success) get().apply(res.data); else set({ error: res.error || null });
  },

  end: async () => {
    const id = get().openId;
    if (!id) return;
    const res = await barazaApi(`/${id}/end`, 'POST');
    if (!res.success) { set({ error: res.error || null }); return; }
    await get().refresh();
  },

  openMinutes: id => set({ minutesId: id }),
  closeMinutes: () => set({ minutesId: null }),
}));
