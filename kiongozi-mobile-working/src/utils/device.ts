// This install, for "Where you're logged in": a stable id kept in SecureStore (sent with every API
// call as X-Device-Id), what the phone is called, and a light check-in on start and resume so the
// devices list stays current. When the server says this phone was logged out from another device,
// we sign out quietly and say why once.
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

const KEY = 'kchat.device_id';
let cached: string | null = null;
let loading: Promise<string | null> | null = null;

function newId() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/** Stable per install. Null only if SecureStore is unavailable (then requests just go without it). */
export function getDeviceId(): Promise<string | null> {
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    loading = (async () => {
      try {
        let id = await SecureStore.getItemAsync(KEY);
        if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
          id = newId();
          await SecureStore.setItemAsync(KEY, id);
        }
        cached = id;
        return id;
      } catch {
        return null;
      } finally {
        loading = null;
      }
    })();
  }
  return loading;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Pixel 7", "Samsung SM-A145F", "iPhone"; "Android 14", "iOS 18.1"; "2.1.0" */
export function deviceInfo() {
  const c: any = Platform.constants || {};
  let model = 'Phone';
  let os = '';
  if (Platform.OS === 'android') {
    const m = String(c.Model || '').trim();
    const maker = String(c.Manufacturer || c.Brand || '').trim();
    model = !m ? cap(maker) || 'Android phone'
      : /^pixel/i.test(m) || !maker || m.toLowerCase().includes(maker.toLowerCase()) ? m
      : `${cap(maker.toLowerCase())} ${m}`;
    os = c.Release ? `Android ${c.Release}` : 'Android';
  } else if (Platform.OS === 'ios') {
    model = c.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
    os = `iOS ${c.osVersion || Platform.Version || ''}`.trim();
  }
  const app_version = Constants.expoConfig?.version || '';
  return { model, os, app_version };
}

// ─── Check-in on start and resume ────────────────────────────────────────────
const PING_EVERY = 15 * 60_000;
let lastPing = 0;
let lastSession: string | null = null;

async function checkIn(force = false) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const sessionKey = session.user.id;
    if (!force && sessionKey === lastSession && Date.now() - lastPing < PING_EVERY) return;
    lastPing = Date.now();
    lastSession = sessionKey;
    const apiClient = require('./apiClient').default;
    await apiClient.pingDevice(deviceInfo());
  } catch { /* best effort */ }
}

let started = false;
/** Called once from apiClient's module load; safe to call again */
export function startDeviceCheckIns() {
  if (started) return;
  started = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) { lastSession = null; return; }
    // A brand new sign-in reports at once (that's what triggers the new sign-in alert elsewhere)
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setTimeout(() => checkIn(event === 'SIGNED_IN'), 1500);
  });
  AppState.addEventListener('change', s => { if (s === 'active') checkIn(); });
}

// ─── Logged out from another device ──────────────────────────────────────────
let handlingRevoke = false;
export function handleDeviceRevoked() {
  if (handlingRevoke) return;
  handlingRevoke = true;
  (async () => {
    try {
      await require('../stores/authStore').useAuthStore.getState().signOut();
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
    setTimeout(() => {
      try {
        require('./alert').appAlert(
          'Logged out on this phone',
          'You were logged out from another device. Sign in again to carry on.',
          [{ text: 'OK' }],
        );
      } catch {}
      handlingRevoke = false;
    }, 600);
  })();
}
