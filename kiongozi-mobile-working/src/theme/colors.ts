// Instagram/TikTok-style dark theme — true black backgrounds, white text, green accent
export const colors = {
  // Backgrounds
  background: '#000000',       // main screen background
  surface: '#111111',          // cards, post cards
  surfaceElevated: '#1A1A1A',  // modals, bottom sheets
  inputBg: '#1A1A1A',          // text inputs, search bars
  overlay: 'rgba(0,0,0,0.6)',  // modal backdrops

  // Borders & dividers
  border: '#2A2A2A',
  borderLight: '#1A1A1A',

  // Text
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#636366',
  placeholder: '#555555',

  // Brand accent (green)
  primary: '#5CB85C',
  primaryDark: '#4A9A4A',
  primaryLight: '#7DCF7D',

  // Semantic
  error: '#FF3B30',
  like: '#E53E3E',
  success: '#34C759',
  warning: '#FF9500',

  // Tab bar
  tabBar: '#000000',
  tabBarBorder: '#1A1A1A',
  tabIconActive: '#FFFFFF',
  tabIconInactive: '#555555',

  // Create post button (white circle on black bar, like TikTok)
  createBtn: '#FFFFFF',
  createBtnIcon: '#000000',

  // Header
  header: '#000000',
  headerBorder: '#1A1A1A',

  // Chat specific
  userBubble: '#1A1A1A',
  aiBubble: '#0D1F0D',         // very dark green tint for AI messages
  aiBubbleBorder: '#2A3A2A',
} as const;
