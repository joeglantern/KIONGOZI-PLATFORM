// Mitaa: short clips arranged as streets. Swipe up/down to change street, left/right to walk
// further down it. Remembers where you were on each street.
import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { saveSnap, readSnap } from '../utils/snapshot';
import { useSocialStore, Post } from './socialStore';
import { clipVideo } from './clipStore';

export type Street = { key: string; title: string; kind: 'foryou' | 'following' | 'tag' | 'fresh'; clips: Post[]; total: number; more: boolean };

interface MitaaState {
  streets: Street[];
  loading: boolean;
  loaded: boolean;
  /** where you are on each street */
  pos: Record<string, number>;
  fetch: (refresh?: boolean) => Promise<void>;
  more: (key: string) => Promise<void>;
  setPos: (key: string, i: number) => void;
  bumpComments: (postId: string, n: number) => void;
  added: (post: Post) => void;
  reset: () => void;
}

const busy = new Set<string>();

export const useMitaaStore = create<MitaaState>((set, get) => ({
  streets: [],
  loading: false,
  loaded: false,
  pos: {},

  fetch: async (refresh = false) => {
    if (get().loading) return;
    set({ loading: true });
    if (!get().streets.length) {
      const snap = await readSnap<Street[]>('mitaa');
      if (snap?.length && !get().streets.length) set({ streets: snap });
    }
    const r: any = await apiClient.getClipStreets();
    if (r.success && Array.isArray(r.data)) {
      const streets: Street[] = r.data
        .map((s: any) => ({ ...s, clips: (s.clips || []).filter((p: Post) => clipVideo(p)), more: (s.total || 0) > (s.clips || []).length }))
        .filter((s: Street) => s.clips.length);
      streets.forEach(s => s.clips.forEach(p => useSocialStore.getState().seedInteraction(p)));
      set({ streets, loaded: true, loading: false, ...(refresh ? { pos: {} } : {}) });
      saveSnap('mitaa', streets.map(s => ({ ...s, clips: s.clips.slice(0, 4) })), 0);
    } else set({ loading: false, loaded: true });
  },

  more: async key => {
    const st = get().streets.find(s => s.key === key);
    if (!st || !st.more || busy.has(key)) return;
    busy.add(key);
    try {
      const r: any = await apiClient.getStreetClips(key, st.clips.map(p => p.id));
      if (r.success) {
        const rows: Post[] = (r.data || []).filter((p: Post) => clipVideo(p));
        rows.forEach(p => useSocialStore.getState().seedInteraction(p));
        set(s => ({
          streets: s.streets.map(x => {
            if (x.key !== key) return x;
            const ids = new Set(x.clips.map(p => p.id));
            return { ...x, clips: [...x.clips, ...rows.filter(p => !ids.has(p.id))], more: !!r.nextCursor && rows.length > 0 };
          }),
        }));
      }
    } finally { busy.delete(key); }
  },

  setPos: (key, i) => set(s => ({ pos: { ...s.pos, [key]: i } })),

  bumpComments: (postId, n) => set(s => ({
    streets: s.streets.map(x => ({ ...x, clips: x.clips.map(p => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + n } : p)) })),
  })),

  // Your new clip goes to the front of "Kwako" and "Mpya" right away
  added: post => set(s => ({
    streets: s.streets.map(x => (x.kind === 'foryou' || x.kind === 'fresh' ? { ...x, clips: [post, ...x.clips.filter(p => p.id !== post.id)] } : x)),
  })),

  reset: () => set({ streets: [], loading: false, loaded: false, pos: {} }),
}));
