import { useThemeStore } from '../stores/themeStore';

export interface AppTheme {
  // Backgrounds
  bg: string;
  surface: string;
  surface2: string;
  inputBg: string;
  // Borders
  border: string;
  borderLight: string;
  // Text
  text: string;
  textSub: string;
  textMuted: string;
  placeholder: string;
  // Brand
  accent: string;
  accentDeep: string;
  // Accent tints
  acc10: string;
  acc25: string;
  // Semantic
  error: string;
  like: string;
  likeBg: string;
  dangerBg: string;
  // Navigation
  tabBar: string;
  tabBarBorder: string;
  tabIconActive: string;
  tabIconInactive: string;
  // Chat
  userBubble: string;
  botBg: string;
  botBorder: string;
  // Cards
  card: string;
  frost: string;
}

const dark: AppTheme = {
  bg:             '#000000',
  surface:        '#111111',
  surface2:       '#1A1A1A',
  inputBg:        '#1A1A1A',
  border:         '#2A2A2A',
  borderLight:    '#1A1A1A',
  text:           '#FFFFFF',
  textSub:        '#8E8E93',
  textMuted:      '#636366',
  placeholder:    '#555555',
  accent:         '#5CB85C',
  accentDeep:     '#4DA04D',
  acc10:          'rgba(92,184,92,0.10)',
  acc25:          'rgba(92,184,92,0.28)',
  error:          '#FF3B30',
  like:           '#E53E3E',
  likeBg:         'rgba(229,62,62,0.14)',
  dangerBg:       'rgba(255,59,48,0.09)',
  tabBar:         '#000000',
  tabBarBorder:   '#1A1A1A',
  tabIconActive:  '#FFFFFF',
  tabIconInactive:'#555555',
  userBubble:     '#1A1A1A',
  botBg:          '#0D1F0D',
  botBorder:      '#2A3A2A',
  card:           '#0C0C0C',
  frost:          'rgba(255,255,255,0.05)',
};

const light: AppTheme = {
  bg:             '#FFFFFF',
  surface:        '#F2F2F7',
  surface2:       '#E5E5EA',
  inputBg:        '#F2F2F7',
  border:         '#D1D1D6',
  borderLight:    '#E9E9EE',
  text:           '#000000',
  textSub:        '#6C6C70',
  textMuted:      '#8E8E93',
  placeholder:    '#AEAEB2',
  accent:         '#5CB85C',
  accentDeep:     '#4DA04D',
  acc10:          'rgba(92,184,92,0.10)',
  acc25:          'rgba(92,184,92,0.28)',
  error:          '#FF3B30',
  like:           '#E53E3E',
  likeBg:         'rgba(229,62,62,0.14)',
  dangerBg:       'rgba(255,59,48,0.06)',
  tabBar:         '#F9F9F9',
  tabBarBorder:   '#D1D1D6',
  tabIconActive:  '#000000',
  tabIconInactive:'#AEAEB2',
  userBubble:     '#E9E9EB',
  botBg:          '#EAF6EA',
  botBorder:      '#CFE9CF',
  card:           '#FFFFFF',
  frost:          'rgba(0,0,0,0.04)',
};

export function useTheme(): AppTheme {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? dark : light;
}
