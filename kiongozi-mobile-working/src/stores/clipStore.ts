// Mzinga (the hive): short vertical videos. Holds the ranked clips, what is open (hive, player,
// composer), and which clips you have already watched (so the hive can show what is new).
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { saveSnap, readSnap } from '../utils/snapshot';
import { useSocialStore, Post, PostMedia } from './socialStore';

export type Rect = { x: number; y: number; width: number; height: number };

export const clipVideo = (p: Post): PostMedia | undefined => p.post_media?.find(m => m.media_type === 'video');

const SEEN_KEY = 'kchat.mzinga.seen';

interface ClipState {
  clips: Post[];
  cursor: string | null;
  loading: boolean;
  loaded: boolean;
  seen: Record<string, 1>;
  hiveOpen: boolean;
  /** player: which clip, and the hive cell it grew out of (for the zoom) */
  player: { index: number; origin?: Rect } | null;
  composerOpen: boolean;

  fetch: (refresh?: boolean) => Promise<void>;
  openHive: () => void;
  closeHive: () => void;
  play: (index: number, origin?: Rect) => void;
  closePlayer: () => void;
  openComposer: () => void;
  closeComposer: () => void;
  added: (post: Post) => void;
  markSeen: (id: string) => void;
  bumpComments: (id: string, n: number) => void;
  /** Sign out: forget clips, open screens and the watched list */
  reset: () => void;
}

let seenLoad: Promise<void> | null = null;
/** Read the stored watched list once and merge it in. */
const loadSeen = () => {
  if (!seenLoad) {
    seenLoad = AsyncStorage.getItem(SEEN_KEY)
      .then(v => (v ? JSON.parse(v) : {}))
      .catch(() => ({}))
      .then(stored => { useClipStore.setState(st => ({ seen: { ...stored, ...st.seen } })); });
  }
  return seenLoad;
};

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  cursor: null,
  loading: false,
  loaded: false,
  seen: {},
  hiveOpen: false,
  player: null,
  composerOpen: false,

  fetch: async (refresh = false) => {
    const s = get();
    if (s.loading || (!refresh && s.loaded && !s.cursor)) return;
    // mark busy before any await, so a second call can't start a duplicate request
    set({ loading: true });
    await loadSeen();
    if (!s.loaded && !s.clips.length) {
      // last-seen hive first, so it never opens empty
      const snap = await readSnap<Post[]>('clips');
      set(st => ({ clips: st.clips.length ? st.clips : snap || [] }));
    }
    // Next page = whatever the server ranks highest that we don't have yet
    const more = !refresh && get().loaded;
    const res: any = await apiClient.getClips(more ? get().clips.map(p => p.id) : [], more ? get().cursor : null);
    if (res.success) {
      const rows: Post[] = (res.data || []).filter((p: Post) => clipVideo(p));
      rows.forEach(p => useSocialStore.getState().seedInteraction(p));
      set(st => {
        const base = refresh || !st.loaded ? [] : st.clips;
        const ids = new Set(base.map(p => p.id));
        const clips = [...base, ...rows.filter(p => !ids.has(p.id))];
        if (refresh || !st.loaded) saveSnap('clips', clips.slice(0, 40), 0);
        return { clips, cursor: res.nextCursor ?? null, loaded: true, loading: false };
      });
    } else set({ loading: false, loaded: true });
  },

  openHive: () => { set({ hiveOpen: true }); get().fetch(true); },
  closeHive: () => set({ hiveOpen: false, player: null }),
  play: (index, origin) => set({ player: { index, origin } }),
  closePlayer: () => set({ player: null }),
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),
  added: post => {
    useSocialStore.getState().seedInteraction(post);
    set(st => ({ clips: [post, ...st.clips.filter(p => p.id !== post.id)] }));
  },
  bumpComments: (id, n) => set(st => ({ clips: st.clips.map(p => (p.id === id ? { ...p, comment_count: (p.comment_count || 0) + n } : p)) })),
  markSeen: async id => {
    if (get().seen[id]) return;
    // merge the stored list first, or this write would replace it
    await loadSeen();
    if (get().seen[id]) return;
    const seen = { ...get().seen, [id]: 1 as const };
    // keep the newest 500
    const keys = Object.keys(seen);
    if (keys.length > 500) keys.slice(0, keys.length - 500).forEach(k => delete seen[k]);
    set({ seen });
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen)).catch(() => {});
  },
  reset: () => {
    seenLoad = null;
    set({ clips: [], cursor: null, loading: false, loaded: false, seen: {}, hiveOpen: false, player: null, composerOpen: false });
    AsyncStorage.removeItem(SEEN_KEY).catch(() => {});
  },
}));
