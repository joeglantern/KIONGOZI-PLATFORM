// Small app-wide preferences: low-data mode (saved on the phone) and feature switches
// from the server (/health/app-config → features), so features can be turned off without an update.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { setFeedPaused } from '../components/social/videoPlayback';

const LOW_DATA_KEY = 'kchat.lowData';
const ACTIVITY_KEY = 'kchat.showActivity';

export type Features = {
  recap: boolean; invites: boolean; watermark_shares: boolean; streaks: boolean; feed_cache: boolean; prefetch: boolean;
  presence: boolean; offline_cache: boolean; ads: boolean;
};
const DEFAULT_FEATURES: Features = { recap: true, invites: true, watermark_shares: true, streaks: true, feed_cache: true, prefetch: true, presence: true, offline_cache: true, ads: true };

interface PrefsState {
  lowData: boolean;
  /** Instagram-style activity status: off hides "Active now" both ways */
  showActivity: boolean;
  features: Features;
  load: () => Promise<void>;
  setLowData: (on: boolean) => void;
  setShowActivity: (on: boolean) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  lowData: false,
  showActivity: true,
  features: DEFAULT_FEATURES,
  load: async () => {
    try {
      const [v, a] = await Promise.all([AsyncStorage.getItem(LOW_DATA_KEY), AsyncStorage.getItem(ACTIVITY_KEY)]);
      if (v === '1') { set({ lowData: true }); setFeedPaused('lowData', true); }
      if (a === '0') set({ showActivity: false });
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
  setShowActivity: (on) => {
    set({ showActivity: on });
    AsyncStorage.setItem(ACTIVITY_KEY, on ? '1' : '0').catch(() => {});
  },
}));

/** Non-hook access for stores and helpers */
export const prefs = () => usePrefs.getState();
