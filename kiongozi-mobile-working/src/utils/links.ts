// KChat links, all in one place: what a share URL looks like, how any incoming URL is read, and where it opens.
//
//   https://api.kiongozi.org/@joe        profile       (legacy /u/joe)
//   https://api.kiongozi.org/p/<id>      post or clip  (legacy /posts/<id>)
//   https://api.kiongozi.org/s/<id>      story         (legacy /api/v1/social/stories/<id>/share)
//   https://api.kiongozi.org/b/<id>      baraza: the live room, or its minutes once it ended (legacy /api/v1/baraza/<id>/share)
//   https://api.kiongozi.org/i/joe       invite from joe (credits joe, opens his profile)
//   https://api.kiongozi.org/t/<tag>     hashtag
//   https://api.kiongozi.org/week        your own Your week
//
// The same paths work with kiongozi://, kchat:// (ads), kiongozi.org / www.kiongozi.org (future domain) and dev builds.
// Every way into the app goes through route(): universal / app links, push taps and taps on links inside posts.
// A link that arrives before the app can show it (signed out, still loading) waits and opens after sign-in.
import { Linking, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { toast } from './alert';

export const LINK_BASE = 'https://api.kiongozi.org';

export const kchatLink = {
  profile: (username: string) => `${LINK_BASE}/@${username}`,
  post: (id: string) => `${LINK_BASE}/p/${id}`,
  story: (id: string) => `${LINK_BASE}/s/${id}`,
  baraza: (id: string) => `${LINK_BASE}/b/${id}`,
  invite: (username: string) => `${LINK_BASE}/i/${username}`,
  tag: (tag: string) => `${LINK_BASE}/t/${encodeURIComponent(tag.replace(/^#/, ''))}`,
  week: `${LINK_BASE}/week`,
};

export type LinkRoute =
  | { kind: 'post'; id: string }
  | { kind: 'profile'; username: string; ref?: string }
  | { kind: 'story'; id: string }
  | { kind: 'baraza'; id: string }
  | { kind: 'tag'; tag: string }
  | { kind: 'week' };

const HOST = /^(?:api\.|www\.)?kiongozi\.org$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME = /^[a-z0-9_.]{1,30}$/i;
const SCHEMES = ['kiongozi', 'kchat', 'exp+kiongozi-mobile-working'];

/** Read any URL. Returns null for anything that isn't a KChat object (auth callbacks, other sites, ...). */
export function parseLink(raw?: string | null): LinkRoute | null {
  if (!raw) return null;
  const url = raw.trim().replace(/[.,;:!?)\]]+$/, '');
  let rest: string | null = null;
  const m = url.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/i);
  if (!m) {
    const bare = url.match(/^((?:api\.|www\.)?kiongozi\.org)(\/.*)?$/i); // "api.kiongozi.org/p/..." typed in a post
    if (!bare) return null;
    rest = bare[2] || '/';
  } else {
    const scheme = m[1].toLowerCase();
    if (scheme === 'https' || scheme === 'http') {
      const h = m[2].match(/^([^/?#]+)(.*)$/);
      if (!h || !HOST.test(h[1])) return null;
      rest = h[2] || '/';
    } else if (SCHEMES.includes(scheme)) {
      rest = `/${m[2]}`;
    } else if (scheme === 'exp' || scheme === 'exps') {
      const i = m[2].indexOf('/--/'); // Expo Go / dev client: exp://host:8081/--/p/<id>
      if (i < 0) return null;
      rest = m[2].slice(i + 3);
    } else return null;
  }
  const [pathPart, query = ''] = rest.split('#')[0].split('?');
  const seg = pathPart.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch { return s; } });
  const ref = query.match(/(?:^|&)ref=([a-z0-9_.]{1,30})(?:&|$)/i)?.[1]?.toLowerCase();
  const [a, b, c, d, e, f] = seg;
  if (!a) return null;
  if (a.startsWith('@') && NAME.test(a.slice(1))) return { kind: 'profile', username: a.slice(1), ref };
  if ((a === 'u' || a === 'profile') && b && NAME.test(b)) return { kind: 'profile', username: b, ref };
  if (a === 'i' && b && NAME.test(b)) return { kind: 'profile', username: b, ref: b.toLowerCase() };
  if ((a === 'p' || a === 'posts') && b && UUID.test(b)) return { kind: 'post', id: b };
  if ((a === 's' || a === 'stories') && b && UUID.test(b)) return { kind: 'story', id: b };
  if ((a === 'b' || a === 'baraza') && b && UUID.test(b)) return { kind: 'baraza', id: b };
  if (a === 'api' && b === 'v1') {
    // Only the old share pages; other API URLs (card images, JSON) stay out of the app
    if (c === 'social' && d === 'stories' && e && UUID.test(e) && f === 'share' && seg.length === 6) return { kind: 'story', id: e };
    if (c === 'baraza' && d && UUID.test(d) && e === 'share' && seg.length === 5) return { kind: 'baraza', id: d };
    return null;
  }
  if (a === 't' && b) return { kind: 'tag', tag: b.replace(/^#/, '') };
  if (a === 'week' || a === 'recap') return { kind: 'week' };
  return null;
}

/** Share a link the way each OS wants it: iOS takes `url` (rich preview, no link pasted twice);
 *  Android ignores `url`, so the link has to be in the message. */
export function shareLink(url: string, text?: string) {
  const body = text?.trim();
  return Share.share(Platform.OS === 'ios'
    ? (body ? { message: body, url } : { url })
    : { message: body ? `${body}\n${url}` : url });
}

// ─── Routing ─────────────────────────────────────────────────────────────────

type Nav = { navigate: (...args: any[]) => void };
let nav: Nav | null = null;
let waiting: ((n: Nav) => void)[] = [];
let pendingUrl: string | null = null;
const PENDING_KEY = 'kchat.pendingLink';
const PENDING_TTL = 24 * 3600_000;

/** Run something that needs the navigator: now, or as soon as the app (signed in) is on screen. */
export function whenNavReady(fn: (n: Nav) => void) {
  if (nav) { try { fn(nav); } catch {} } else waiting.push(fn);
}

/** AppNavigator calls this once its NavigationContainer is ready. */
export function attachLinkRouter(n: Nav) {
  nav = n;
  const q = waiting; waiting = [];
  q.forEach(fn => { try { fn(n); } catch {} });
  if (pendingUrl) {
    const url = pendingUrl; pendingUrl = null;
    AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    setTimeout(() => openUrl(url), 350);
    return;
  }
  // A link opened before sign-up, then the app was closed while making the account
  AsyncStorage.getItem(PENDING_KEY).then(v => {
    if (!v) return;
    AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    const p = JSON.parse(v);
    if (p?.url && Date.now() - (p.at || 0) < PENDING_TTL) setTimeout(() => openUrl(p.url), 350);
  }).catch(() => {});
}

/** AppNavigator unmounts on sign-out: links wait again. */
export function detachLinkRouter() { nav = null; }

/** In-app taps (post text, story link stickers): our own links open inside the app. False for anything else. */
export function openInApp(url?: string | null): boolean {
  const r = parseLink(url);
  if (!r) return false;
  whenNavReady(n => go(r, n));
  return true;
}

function openUrl(url: string) {
  const r = parseLink(url);
  if (r) whenNavReady(n => go(r, n));
}

/** Open a KChat object. Overlays (stories, barazas) live outside the tab stacks, so they get opened directly. */
export function go(r: LinkRoute, n: Nav) {
  // A link tapped inside a story or Mitaa: get the full-screen viewer out of the way first
  let delay = 0;
  try {
    const stories = require('../stores/storyStore').useStoryStore.getState();
    if (stories.viewer && r.kind !== 'story') { stories.closeViewer(); delay = 280; }
  } catch {}
  try {
    const clips = require('../stores/clipStore').useClipStore.getState();
    if (clips.hiveOpen && typeof clips.closeHive === 'function') { clips.closeHive(); delay = Math.max(delay, 120); }
  } catch {}
  const run = () => {
    switch (r.kind) {
      case 'post': n.navigate('Feed', { screen: 'PostDetail', params: { postId: r.id } }); return;
      case 'profile': n.navigate('Feed', { screen: 'PublicProfile', params: { username: r.username } }); return;
      case 'tag': n.navigate('Explore', { screen: 'ExploreMain', params: { initialQuery: `#${r.tag}` } }); return;
      case 'week': n.navigate('Profile', { screen: 'ProfileMain', params: { openRecap: Date.now() } }); return;
      case 'story': openStory(r.id, n); return;
      case 'baraza': openBaraza(r.id); return;
    }
  };
  if (delay) setTimeout(run, delay); else run();
}

async function openStory(id: string, n: Nav) {
  try {
    const res: any = await (apiClient as any).request(`/api/v1/social/stories/${id}/link`, { method: 'GET' });
    const d = res?.success ? res.data : null;
    if (!d) { toast('This story is no longer available'); return; }
    const opened = d.active ? await require('../stores/storyStore').useStoryStore.getState().openUser(d.user_id) : false;
    if (!opened) {
      if (d.username) n.navigate('Feed', { screen: 'PublicProfile', params: { username: d.username } });
      toast('This story has ended');
    }
  } catch { toast('This story is no longer available'); }
}

async function openBaraza(id: string) {
  const baraza = require('../stores/barazaStore');
  try {
    const res: any = await baraza.barazaApi(`/${id}`);
    if (res?.success && res.data?.room?.status === 'live') { baraza.useBarazaStore.getState().open(id); return; }
  } catch {}
  baraza.useBarazaStore.getState().openMinutes(id);
}

// ─── Incoming links (universal links, app links, kiongozi://) ────────────────

let watching = false;
let last = { url: '', at: 0 };

function incoming(url: string | null) {
  if (!url || !parseLink(url)) return;
  if (url === last.url && Date.now() - last.at < 2000) return; // some Android launches deliver the same link twice
  last = { url, at: Date.now() };
  if (nav) { openUrl(url); return; }
  pendingUrl = url;
  AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ url, at: Date.now() })).catch(() => {});
  try {
    const auth = require('../stores/authStore').useAuthStore.getState();
    if (auth.initialized && !auth.user) toast('Sign in to open this link', { message: 'It opens as soon as you are in.' });
  } catch {}
}

/** App.tsx, once: the launch link and every link after it. Signed out, the link waits for sign-in. */
export function watchIncomingLinks() {
  if (watching) return () => {};
  watching = true;
  Linking.getInitialURL().then(incoming).catch(() => {});
  const sub = Linking.addEventListener('url', e => incoming(e.url));
  return () => { sub.remove(); watching = false; };
}
