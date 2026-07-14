import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kiongozi_theme_dark';

interface ThemeState {
  isDark: boolean;
  initialized: boolean;
  toggleTheme: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,
  initialized: false,

  toggleTheme: async () => {
    const next = !get().isDark;
    set({ isDark: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
  },

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      set({ isDark: saved !== null ? saved === 'true' : true, initialized: true });
    } catch {
      set({ initialized: true });
    }
  },
}));
