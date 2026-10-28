// Small app-wide preferences: low-data mode (saved on the phone) and feature switches
// from the server (/health/app-config → features), so features can be turned off without an update.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { setFeedPaused } from '../components/social/videoPlayback';

const LOW_DATA_KEY = 'kchat.lowData';

export type Features = {
  recap: boolean; invites: boolean; watermark_shares: boolean; streaks: boolean; feed_cache: boolean; prefetch: boolean;
};
const DEFAULT_FEATURES: Features = { recap: true, invites: true, watermark_shares: true, streaks: true, feed_cache: true, prefetch: true };

interface PrefsState {
  lowData: boolean;
  features: Features;
  load: () => Promise<void>;
  setLowData: (on: boolean) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  lowData: false,
  features: DEFAULT_FEATURES,
  load: async () => {
    try {
      const v = await AsyncStorage.getItem(LOW_DATA_KEY);
      if (v === '1') { set({ lowData: true }); setFeedPaused('lowData', true); }
    } catch {}
    try {
      const res: any = await apiClient.getAppConfig();
      const f = res?.data?.features;
      if (f && typeof f === 'object') set({ features: { ...DEFAULT_FEATURES, ...f } });
    } catch {}
  },
  setLowData: (on) => {
    set({ lowData: on });
    // Low-data mode: videos in the feed don't autoplay (tap to watch), nothing is downloaded ahead
    setFeedPaused('lowData', on);
    AsyncStorage.setItem(LOW_DATA_KEY, on ? '1' : '0').catch(() => {});
  },
}));

/** Non-hook access for stores and helpers */
export const prefs = () => usePrefs.getState();
