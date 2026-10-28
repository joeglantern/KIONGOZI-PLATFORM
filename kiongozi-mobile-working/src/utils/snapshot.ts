// Offline-first (WhatsApp trick): each main screen keeps a copy of what it last showed,
// so the app opens to real content even with no internet. Cleared on logout.
import AsyncStorage from '@react-native-async-storage/async-storage';

const P = 'kchat.snap.';
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Save soon (debounced), so bursts of updates write once. */
export function saveSnap(key: string, data: unknown, delay = 800) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    AsyncStorage.setItem(P + key, JSON.stringify(data)).catch(() => {});
  }, delay);
}

export async function readSnap<T>(key: string): Promise<T | null> {
  try {
    const v = await AsyncStorage.getItem(P + key);
    return v ? (JSON.parse(v) as T) : null;
  } catch { return null; }
}

export async function clearSnaps() {
  Object.values(timers).forEach(clearTimeout);
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter(k => k.startsWith(P) || k.startsWith('kchat.draft.')));
  } catch {}
}
