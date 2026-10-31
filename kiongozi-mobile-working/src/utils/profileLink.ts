// The link in bio: one http(s) link, up to 100 characters. Same rules as the API (profiles-social.ts).
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { openInApp } from './links';

export const LINK_MAX = 100;

/** "kiongozi.org" becomes "https://kiongozi.org". '' means no link. null when it isn't a usable link. */
export function normaliseLink(raw: string): string | '' | null {
  let v = (raw || '').trim();
  if (!v) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = `https://${v}`;
  if (!/^https?:\/\//i.test(v) || /\s/.test(v) || v.length > LINK_MAX) return null;
  const host = v.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return null;
  return v;
}

/** How the link reads under the bio: no https:// or www, no trailing slash, shortened */
export function displayLink(url: string, max = 34) {
  const s = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** KChat links (api.kiongozi.org/...) open inside the app; anything else in the in-app browser */
export function openProfileLink(url: string) {
  if (openInApp(url)) return;
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
}
