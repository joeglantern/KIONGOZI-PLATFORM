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
  // Semantic
  error: string;
  // Navigation
  tabBar: string;
  tabBarBorder: string;
  tabIconActive: string;
  tabIconInactive: string;
  // Chat
  userBubble: string;
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
  error:          '#FF3B30',
  tabBar:         '#000000',
  tabBarBorder:   '#1A1A1A',
  tabIconActive:  '#FFFFFF',
  tabIconInactive:'#555555',
  userBubble:     '#1A1A1A',
};

const light: AppTheme = {
  bg:             '#FFFFFF',
  surface:        '#F2F2F7',
  surface2:       '#E5E5EA',
  inputBg:        '#F2F2F7',
  border:         '#D1D1D6',
  borderLight:    '#E5E5EA',
  text:           '#000000',
  textSub:        '#6C6C70',
  textMuted:      '#8E8E93',
  placeholder:    '#AEAEB2',
  accent:         '#5CB85C',
  error:          '#FF3B30',
  tabBar:         '#F9F9F9',
  tabBarBorder:   '#D1D1D6',
  tabIconActive:  '#000000',
  tabIconInactive:'#AEAEB2',
  userBubble:     '#E9E9EB',
};

export function useTheme(): AppTheme {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? dark : light;
}
