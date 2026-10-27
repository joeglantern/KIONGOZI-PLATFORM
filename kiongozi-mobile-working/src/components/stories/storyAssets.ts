// Bundled story assets (ship with OTA updates) and the composer's presets.
import { Platform } from 'react-native';

export const STICKERS: Record<string, { src: any; label: string; ratio: number }> = {
  nimepiga_kura: { src: require('../../../assets/stories/sticker_nimepiga_kura.png'), label: 'Nimepiga kura', ratio: 360 / 296 },
  jiandikishe: { src: require('../../../assets/stories/sticker_jiandikishe.png'), label: 'Nimejiandikisha', ratio: 336 / 360 },
  sauti_yangu: { src: require('../../../assets/stories/sticker_sauti_yangu.png'), label: 'Sauti yangu', ratio: 360 / 186 },
  poa: { src: require('../../../assets/stories/sticker_poa.png'), label: 'Poa sana', ratio: 360 / 233 },
  nairobi: { src: require('../../../assets/stories/sticker_nairobi.png'), label: 'Nairobi', ratio: 360 / 274 },
  mpya: { src: require('../../../assets/stories/sticker_mpya.png'), label: 'Mpya', ratio: 360 / 344 },
};

export const PATTERNS: Record<string, any> = {
  kitenge: require('../../../assets/stories/pattern_kitenge.png'),
  kanga: require('../../../assets/stories/pattern_kanga.png'),
};

export const EMPTY_ILLUSTRATION = require('../../../assets/stories/stories_empty.png');

/** Text-story backgrounds. Stored on the story as `bg` = the id. */
export const BACKGROUNDS: { id: string; name: string; colors: [string, string]; pattern?: string; dark?: boolean }[] = [
  { id: 'kijani', name: 'Kijani', colors: ['#14653F', '#0A3A24'], pattern: 'kitenge' },
  { id: 'machweo', name: 'Machweo', colors: ['#F5A33D', '#D9366F'] },
  { id: 'udongo', name: 'Udongo', colors: ['#C2611F', '#7A2E0E'], pattern: 'kanga' },
  { id: 'bahari', name: 'Bahari', colors: ['#1D4E89', '#0E7490'] },
  { id: 'zambarau', name: 'Zambarau', colors: ['#6A2C82', '#2E1A47'], pattern: 'kitenge' },
  { id: 'usiku', name: 'Usiku', colors: ['#1C1C1E', '#000000'], pattern: 'kanga' },
  { id: 'mchana', name: 'Mchana', colors: ['#F4EBDD', '#E3D0B0'], dark: true },
  { id: 'bendera', name: 'Bendera', colors: ['#B3141B', '#5E0A0E'], pattern: 'kitenge' },
];
export const bgById = (id?: string | null) => BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];

export const TEXT_COLORS = ['#FFFFFF', '#000000', '#F5B83D', '#FF5A5F', '#5CB85C', '#7FD3F7', '#C792EA'];

/** Story fonts. Stored as `font` = the id. */
export const FONTS: { id: string; label: string; style: { fontFamily?: string; fontWeight?: any; letterSpacing?: number } }[] = [
  { id: 'grotesk', label: 'Aa', style: { fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 } },
  { id: 'classic', label: 'Aa', style: { fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontWeight: '700' } },
  { id: 'mono', label: 'Aa', style: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontWeight: '700' } },
  { id: 'plain', label: 'Aa', style: { fontWeight: '800' } },
];
export const fontById = (id?: string | null) => (FONTS.find(f => f.id === id) || FONTS[0]).style;

/** Auto-fit size for a text story: 36 for short text (the design size), smaller as it grows. */
export const fitFontSize = (text: string) => {
  const n = text.length;
  if (n < 40) return 36;
  if (n < 90) return 32;
  if (n < 160) return 26;
  if (n < 280) return 22;
  return 18;
};
/** Line height paired with fitFontSize (36 -> 42, per the design). */
export const fitLineHeight = (size: number) => (size >= 36 ? 42 : Math.round(size * 1.18));
/** Short text sits in the upper-middle of the canvas; long text stays centred so it never runs off. */
export const TEXT_TOP = 0.296; // 250 / 844
export const textAnchoredTop = (text: string) => fitFontSize(text) >= 32;

export const REACTIONS = ['😂', '😮', '😍', '😢', '👏', '🔥'];

/** "saa 3", "dak 12" style times for the story header. */
export function storyAge(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'sasa hivi';
  if (mins < 60) return `dak ${mins}`;
  return `saa ${Math.floor(mins / 60)}`;
}

/** App link used when sharing a story (no server needed). */
export const APP_LINK = 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile';

/**
 * The story viewer is a Modal outside the NavigationContainer. AppNavigator can register its
 * navigation ref here (`storyNav.current = navRef.current`) so the viewers sheet can open a DM.
 */
export const storyNav: { current: { navigate: (...args: any[]) => void } | null } = { current: null };
