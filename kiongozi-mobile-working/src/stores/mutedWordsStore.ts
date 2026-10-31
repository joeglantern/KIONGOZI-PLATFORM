// Muted words on this phone: the list (kept on disk so cached feeds are filtered at once),
// optimistic add/remove with rollback, and the same matcher the server uses.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { supabase } from '../utils/supabaseClient';

export type MutedWord = { id: string; phrase: string; expires_at: string | null; created_at: string };
export type MuteDuration = '24h' | '7d' | 'forever';

const KEY = 'kchat.muted_words';
const DURATION_MS: Record<MuteDuration, number | null> = { '24h': 24 * 3600_000, '7d': 7 * 86400_000, forever: null };

const live = (w: MutedWord) => !w.expires_at || new Date(w.expires_at).getTime() > Date.now();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(words: MutedWord[]): RegExp | null {
  const parts = words.filter(live)
    .map(w => w.phrase.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean)
    .map(p => escape(p).replace(/\s+/g, '\\s+'));
  if (!parts.length) return null;
  try {
    return new RegExp(`(^|[^\\p{L}\\p{N}_])#?(${parts.join('|')})(?=$|[^\\p{L}\\p{N}_])`, 'iu');
  } catch {
    // Engines without Unicode property escapes: plain word boundaries
    return new RegExp(`(^|\\W)#?(${parts.join('|')})(?=$|\\W)`, 'i');
  }
}

type State = {
  words: MutedWord[];
  re: RegExp | null;
  loaded: boolean;
  load: () => Promise<void>;
  add: (phrase: string, duration: MuteDuration) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  reset: () => void;
};

const save = (words: MutedWord[]) => { AsyncStorage.setItem(KEY, JSON.stringify(words)).catch(() => {}); };

export const useMutedWords = create<State>((set, get) => ({
  words: [],
  re: null,
  loaded: false,

  load: async () => {
    if (!get().loaded) {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw && !get().loaded) { const w = (JSON.parse(raw) as MutedWord[]).filter(live); set({ words: w, re: compile(w) }); }
      } catch {}
    }
    const r: any = await apiClient.getMutedWords();
    if (r?.success && Array.isArray(r.data)) {
      const w = (r.data as MutedWord[]).filter(live);
      set({ words: w, re: compile(w), loaded: true });
      save(w);
    } else {
      set({ loaded: true });
    }
  },

  add: async (phrase, duration) => {
    const clean = phrase.replace(/\s+/g, ' ').trim();
    if (!clean) return false;
    const prev = get().words;
    const ms = DURATION_MS[duration];
    const temp: MutedWord = {
      id: `tmp-${Date.now()}`, phrase: clean, created_at: new Date().toISOString(),
      expires_at: ms ? new Date(Date.now() + ms).toISOString() : null,
    };
    const next = [temp, ...prev.filter(w => w.phrase.toLowerCase() !== clean.toLowerCase())];
    set({ words: next, re: compile(next) });
    const r: any = await apiClient.addMutedWord(clean, duration);
    if (r?.success && r.data?.id) {
      const done = get().words.map(w => (w.id === temp.id ? (r.data as MutedWord) : w));
      set({ words: done, re: compile(done) });
      save(done);
      return true;
    }
    set({ words: prev, re: compile(prev) });
    return false;
  },

  remove: async (id) => {
    const prev = get().words;
    const next = prev.filter(w => w.id !== id);
    set({ words: next, re: compile(next) });
    if (id.startsWith('tmp-')) return true;
    const r: any = await apiClient.removeMutedWord(id);
    if (r?.success) { save(next); return true; }
    set({ words: prev, re: compile(prev) });
    return false;
  },

  reset: () => { set({ words: [], re: null, loaded: false }); AsyncStorage.removeItem(KEY).catch(() => {}); },
}));

// Another account may sign in next: start clean
supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') useMutedWords.getState().reset(); });

/** Does any of these texts hit a muted word? (expired words are skipped) */
export function hitsMuted(re: RegExp | null, ...texts: (string | null | undefined)[]) {
  return !!re && texts.some(t => typeof t === 'string' && !!t && re.test(t));
}
