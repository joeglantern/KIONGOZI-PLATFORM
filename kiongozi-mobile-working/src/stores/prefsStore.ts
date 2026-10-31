// Small app-wide preferences: low-data mode (saved on the phone) and feature switches
// from the server (/health/app-config → features), so features can be turned off without an update.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { setFeedPaused } from '../components/social/videoPlayback';
import { applyCrashConfig } from '../utils/crash';

const LOW_DATA_KEY = 'kchat.lowData';
const ACTIVITY_KEY = 'kchat.showActivity';
const BREAK_KEY = 'kchat.breakReminder';
const AUTOPLAY_KEY = 'kchat.autoplay';
const UPLOAD_KEY = 'kchat.uploadQuality';
const NOTIFY_KEY = 'kchat.notify';
const INTERESTS_KEY = 'kchat.interests';
const COUNTY_KEY = 'kchat.county';
/** Baraza's "listening from" remembers the same county (WhoSheet reads this key) */
const BARAZA_FROM_KEY = 'baraza_from_v1';

export type Autoplay = 'always' | 'never';
export type UploadQuality = 'standard' | 'hd';
/** What you get notified about. Saved on the phone for now; the server / PushService check comes later. */
export type NotifyKey = 'likes' | 'replies' | 'follows' | 'messages' | 'mentions' | 'stories' | 'baraza';
export type NotifyPrefs = Record<NotifyKey, boolean>;
const DEFAULT_NOTIFY: NotifyPrefs = { likes: true, replies: true, follows: true, messages: true, mentions: true, stories: true, baraza: true };

export type Features = {
  recap: boolean; invites: boolean; watermark_shares: boolean; streaks: boolean; feed_cache: boolean; prefetch: boolean;
  presence: boolean; offline_cache: boolean; ads: boolean; smart_replies: boolean; break_reminder: boolean;
};
const DEFAULT_FEATURES: Features = { recap: true, invites: true, watermark_shares: true, streaks: true, feed_cache: true, prefetch: true, presence: true, offline_cache: true, ads: true, smart_replies: true, break_reminder: true };

interface PrefsState {
  lowData: boolean;
  /** Instagram-style activity status: off hides "Active now" both ways */
  showActivity: boolean;
  /** Gentle "you've been scrolling a while" note */
  breakReminder: boolean;
  /** Feed videos: play as you scroll, or only when tapped */
  autoplay: Autoplay;
  /** Photos and videos you post: 'hd' skips the picker's re-compression */
  uploadQuality: UploadQuality;
  notify: NotifyPrefs;
  /** Topics picked on first run (Youth jobs, Climate, ...). Phone only: the server has no field for this yet. */
  interests: string[];
  /** Home county picked on first run, or null. Phone only for now, same reason. */
  county: string | null;
  features: Features;
  load: () => Promise<void>;
  setLowData: (on: boolean) => void;
  setShowActivity: (on: boolean) => void;
  setBreakReminder: (on: boolean) => void;
  setAutoplay: (v: Autoplay) => void;
  setUploadQuality: (v: UploadQuality) => void;
  setNotify: (key: NotifyKey, on: boolean) => void;
  setInterests: (topics: string[]) => void;
  setCounty: (county: string | null) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  lowData: false,
  showActivity: true,
  breakReminder: true,
  autoplay: 'always',
  uploadQuality: 'standard',
  notify: DEFAULT_NOTIFY,
  interests: [],
  county: null,
  features: DEFAULT_FEATURES,
  load: async () => {
    try {
      const [v, a, b, ap, uq, nf, it, co] = await Promise.all([
        AsyncStorage.getItem(LOW_DATA_KEY), AsyncStorage.getItem(ACTIVITY_KEY), AsyncStorage.getItem(BREAK_KEY),
        AsyncStorage.getItem(AUTOPLAY_KEY), AsyncStorage.getItem(UPLOAD_KEY), AsyncStorage.getItem(NOTIFY_KEY),
        AsyncStorage.getItem(INTERESTS_KEY), AsyncStorage.getItem(COUNTY_KEY),
      ]);
      if (v === '1') { set({ lowData: true }); setFeedPaused('lowData', true); }
      if (a === '0') set({ showActivity: false });
      if (b === '0') set({ breakReminder: false });
      if (ap === 'never') { set({ autoplay: 'never' }); setFeedPaused('autoplay', true); }
      if (uq === 'hd') set({ uploadQuality: 'hd' });
      if (nf) { try { const n = JSON.parse(nf); if (n && typeof n === 'object') set({ notify: { ...DEFAULT_NOTIFY, ...n } }); } catch {} }
      if (it) { try { const list = JSON.parse(it); if (Array.isArray(list)) set({ interests: list.filter((x: unknown) => typeof x === 'string') }); } catch {} }
      if (co) set({ county: co });
    } catch {}
    try {
      const res: any = await apiClient.getAppConfig();
      const f = res?.data?.features;
      if (f && typeof f === 'object') set({ features: { ...DEFAULT_FEATURES, ...f } });
      // Crash reporting key: set on the server, so it can be turned on/off without an update
      applyCrashConfig(res?.data?.sentry_dsn);
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
  setBreakReminder: (on) => {
    set({ breakReminder: on });
    AsyncStorage.setItem(BREAK_KEY, on ? '1' : '0').catch(() => {});
  },
  setAutoplay: (v) => {
    set({ autoplay: v });
    // Same switch the feed already listens to for low-data mode: 'never' = tap to play
    setFeedPaused('autoplay', v === 'never');
    AsyncStorage.setItem(AUTOPLAY_KEY, v).catch(() => {});
  },
  setUploadQuality: (v) => {
    set({ uploadQuality: v });
    AsyncStorage.setItem(UPLOAD_KEY, v).catch(() => {});
  },
  setNotify: (key, on) => {
    const notify = { ...usePrefs.getState().notify, [key]: on };
    set({ notify });
    // TODO(server): tell PushService which kinds to send; until then this only filters nothing server-side
    AsyncStorage.setItem(NOTIFY_KEY, JSON.stringify(notify)).catch(() => {});
  },
  setInterests: (topics) => {
    set({ interests: topics });
    AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(topics)).catch(() => {});
  },
  setCounty: (county) => {
    set({ county });
    if (county) AsyncStorage.multiSet([[COUNTY_KEY, county], [BARAZA_FROM_KEY, county]]).catch(() => {});
    else AsyncStorage.multiRemove([COUNTY_KEY, BARAZA_FROM_KEY]).catch(() => {});
  },
}));

/** Picker `quality` for photos you post: Standard re-compresses a little, HD keeps the original */
export const pickerQuality = () => (usePrefs.getState().uploadQuality === 'hd' ? 1 : 0.8);

/** Non-hook access for stores and helpers */
export const prefs = () => usePrefs.getState();
