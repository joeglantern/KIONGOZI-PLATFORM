import { Platform } from 'react-native';

export const C = {
  paper:      '#F3EBDC',
  surface:    '#FFFDF7',
  surface2:   '#FAF3E6',
  ink:        '#221C15',
  inkSoft:    '#6E6354',
  inkFaint:   '#9C8E7A',
  line:       '#E6D9C2',
  lineStrong: '#D8C7A9',
  navy:       '#1a365d',
  navy100:    '#E3E9F1',
  ochre:      '#BE7327',
  ochreSoft:  '#F3E2C6',
  clay:       '#A8492C',
  claySoft:   '#F2D9CC',
  olive:      '#5E7540',
  oliveSoft:  '#E0E7CE',
  plum:       '#7A3B5A',
  pos:        '#5E7540',
  neg:        '#A8492C',
  warn:       '#B0791F',
};

export const F = {
  display: Platform.select({ ios: undefined, android: undefined }),
  mono: Platform.select({ ios: 'Courier New', android: 'monospace' }),
};

export const shadow = {
  sm: {
    shadowColor: '#221C15',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#221C15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#221C15',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};
