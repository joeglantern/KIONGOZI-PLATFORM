// Baraza themes: a clean white room by default, plus three made-up rooms people can switch to.
// Each theme is colour tokens plus an optional backdrop (a tiling texture or one painted image).
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BarazaThemeId = 'mchana' | 'usiku' | 'mti' | 'kanga';

export interface BarazaTheme {
  id: BarazaThemeId;
  name: string;
  blurb: string;
  dark: boolean;
  bg: string;
  /** texture laid over bg: a seamless tile, or one image that covers the screen */
  tile?: any;
  tileOpacity?: number;
  cover?: any;
  /** a soft top-to-bottom wash under everything (the default room) */
  gradient?: [string, string, string];
  /** a radial-ish glow laid over the top of the room (the night room) */
  sky?: string;
  ink: string;          // main text
  sub: string;          // secondary text
  faint: string;        // hints, labels
  accent: string;       // stick glow, primary buttons
  accentInk: string;    // text on accent
  soft: string;         // quiet button / chip background
  line: string;         // hairlines, empty beads
  card: string;         // raised surfaces (captions, sheets)
  danger: string;
  dangerSoft: string;
  glow: string;         // tint for the stick's light
}

const NIGHT = require('../../../assets/baraza/tile_night.jpg');
const KANGA = require('../../../assets/baraza/tile_kanga.jpg');
const ACACIA = require('../../../assets/baraza/bg_acacia.jpg');

export const BARAZA_THEMES: Record<BarazaThemeId, BarazaTheme> = {
  mchana: {
    id: 'mchana', name: 'Mchana', blurb: 'Clean daylight', dark: false,
    bg: '#FFFFFF', gradient: ['#FFFFFF', '#FBF7F1', '#F6EEDC'],
    ink: '#16130F', sub: '#5E574F', faint: '#8F877D', accent: '#E9A23B', accentInk: '#1C1408',
    soft: '#F3EFE8', line: 'rgba(22,19,15,0.10)', card: '#FFFFFF',
    danger: '#D9503A', dangerSoft: 'rgba(217,80,58,0.10)', glow: '#FFC65C',
  },
  usiku: {
    id: 'usiku', name: 'Usiku', blurb: 'Under the stars', dark: true,
    bg: '#141A33', tile: NIGHT, tileOpacity: 1, sky: '#243055',
    ink: '#F4F1EA', sub: 'rgba(244,241,234,0.68)', faint: 'rgba(244,241,234,0.45)', accent: '#F2B544', accentInk: '#1A1206',
    soft: 'rgba(255,255,255,0.09)', line: 'rgba(255,255,255,0.13)', card: 'rgba(255,255,255,0.07)',
    danger: '#FF8A6B', dangerSoft: 'rgba(255,138,107,0.16)', glow: '#FFD27A',
  },
  mti: {
    id: 'mti', name: 'Mti wa Baraza', blurb: 'In the shade of the tree', dark: false,
    bg: '#F6EEDC', cover: ACACIA,
    ink: '#2A1F12', sub: '#6B5B44', faint: '#9A8A70', accent: '#3FA845', accentInk: '#FFFFFF',
    soft: 'rgba(42,31,18,0.07)', line: 'rgba(42,31,18,0.12)', card: 'rgba(255,255,255,0.72)',
    danger: '#C9472F', dangerSoft: 'rgba(201,71,47,0.10)', glow: '#B6E36A',
  },
  kanga: {
    id: 'kanga', name: 'Kanga', blurb: 'Loud and proud', dark: false,
    bg: '#FFF4E6', tile: KANGA, tileOpacity: 0.16,
    ink: '#1D1A16', sub: '#5C4E3F', faint: '#8E7C68', accent: '#FF6A3D', accentInk: '#FFFFFF',
    soft: 'rgba(29,26,22,0.07)', line: 'rgba(29,26,22,0.12)', card: '#FFFFFF',
    danger: '#C93A2A', dangerSoft: 'rgba(201,58,42,0.10)', glow: '#FFB067',
  },
};

export const THEME_ORDER: BarazaThemeId[] = ['mchana', 'usiku', 'mti', 'kanga'];
const KEY = 'baraza_theme_v1';

export const useBarazaTheme = create<{ id: BarazaThemeId; set: (id: BarazaThemeId) => void }>((set) => ({
  id: 'mchana',
  set: (id) => { set({ id }); AsyncStorage.setItem(KEY, id).catch(() => {}); },
}));

// Remember the last room the person picked
AsyncStorage.getItem(KEY).then(v => {
  if (v && v in BARAZA_THEMES) useBarazaTheme.setState({ id: v as BarazaThemeId });
}).catch(() => {});

export const useBT = () => BARAZA_THEMES[useBarazaTheme(s => s.id)];
