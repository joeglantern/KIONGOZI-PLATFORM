// Public pages behind shared links, and their link-preview images. One short https URL per object:
//   /@username   profile          /p/<postId>    post or clip     /s/<storyId>   story
//   /b/<roomId>  baraza           /i/<username>  invite link      /t/<tag>       hashtag      /week  Your week
// Legacy paths (/u/:username, /posts/:id, /api/v1/social/stories/:id/share, /api/v1/baraza/:id/share)
// keep working forever: links already sitting in WhatsApp chats must never break.
// A phone with KChat opens the app before it ever reaches these pages (universal links / app links,
// see /.well-known in index.ts). Everyone else lands here: chat apps read the og: tags, people get
// "Open in KChat" and the store button. Only public content shows real details.
import { Router, Request, Response } from 'express';
import { supabaseServiceClient as db } from '../config/supabase';
import { postPreview, profilePreview } from '../services/OgImageService';

const router = Router();
const BASE = 'https://api.kiongozi.org';
// The live App Store listing (the older 6758945664 listing was removed). IOS_APP_STORE_ID overrides it.
export const IOS_APP_ID = process.env.IOS_APP_STORE_ID || '6789518676';
const APP_STORE = `https://apps.apple.com/app/id${IOS_APP_ID}`;
const ANDROID_PACKAGE = 'com.kiongozi.mobile';
const PLAY_STORE = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-z0-9_.]{1,30}$/i;
const TAG = /^[\p{L}\p{N}_]{1,60}$/u;
const clip = (s: string, n: number) => Array.from(String(s || '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');

async function publicPost(id: string) {
  if (!UUID.test(id) || !db) return null;
  const { data } = await db.from('posts')
    .select('id, content, visibility, profiles:user_id(username, full_name, avatar_url, is_private, is_verified), post_media(media_type, url, thumbnail_url, order_index)')
    .eq('id', id).maybeSingle();
  const p: any = data;
  if (!p || p.visibility !== 'public' || p.profiles?.is_private) return null;
  return p;
}

async function publicProfile(username: string) {
  if (!USERNAME.test(username) || !db) return null;
  const { data } = await db.from('profiles')
    .select('username, full_name, bio, avatar_url, is_private, is_verified, follower_count, post_count')
    .ilike('username', username).maybeSingle();
  const u: any = data;
  if (!u || u.is_private) return null;
  return u;
}

type Page = {
  title: string; desc: string; image: string;
  /** Canonical https URL of the object (og:url, canonical, smart app banner argument) */
  url: string;
  /** In-app path for the kiongozi:// scheme, no leading slash. Store builds up to 2.1.0 only route
   *  "u/<name>" and "posts/<id>", so profiles and posts keep those. */
  app: string;
  heading: string; sub: string;
  /** Rides along to Google Play as the install referrer, for deferred deep linking later */
  referrer: string;
  accent?: string;
};

function page(o: Page, userAgent: string) {
  const ios = /iphone|ipad|ipod/i.test(userAgent), android = /android/i.test(userAgent);
  const play = `${PLAY_STORE}&referrer=${encodeURIComponent(`utm_source=link&utm_content=${o.referrer}`)}`;
  const scheme = `kiongozi://${o.app}`;
  // Android: an intent: URL opens the app when it is installed and goes to Play when it isn't (no error page).
  // iOS: jumping to kiongozi:// without the app shows "Safari cannot open the page", so iOS gets no auto-jump;
  // with the app installed the universal link opens it before this page loads anyway.
  const intent = (fallback: boolean) => `intent://${o.app}#Intent;scheme=kiongozi;package=${ANDROID_PACKAGE};${fallback ? `S.browser_fallback_url=${encodeURIComponent(play)};` : ''}end`;
  const open = android ? intent(true) : scheme;
  const accent = o.accent || '#5CB85C';
  const stores = ios ? `<a class="s" href="${APP_STORE}">Get KChat on the App Store</a>`
    : android ? `<a class="s" href="${esc(play)}">Get KChat on Google Play</a>`
    : `<a class="s" href="${APP_STORE}">App Store</a><a class="s" href="${esc(play)}">Google Play</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<link rel="canonical" href="${esc(o.url)}">
<meta name="description" content="${esc(o.desc)}">
<meta name="apple-itunes-app" content="app-id=${IOS_APP_ID}, app-argument=${esc(o.url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="KChat">
<meta property="og:url" content="${esc(o.url)}"><meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}">
<meta property="og:image" content="${esc(o.image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.desc)}"><meta name="twitter:image" content="${esc(o.image)}">
<meta property="al:ios:url" content="${esc(scheme)}"><meta property="al:ios:app_store_id" content="${IOS_APP_ID}"><meta property="al:ios:app_name" content="KChat">
<meta property="al:android:url" content="${esc(scheme)}"><meta property="al:android:package" content="${ANDROID_PACKAGE}"><meta property="al:android:app_name" content="KChat">
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0E1116;color:#F4F1EA;font-family:-apple-system,system-ui,sans-serif;padding:24px}
main{width:100%;max-width:380px;text-align:center}img{width:100%;border-radius:18px;margin-bottom:22px}h1{font-size:21px;margin:0 0 6px}p{color:#A4A9B6;margin:0 0 24px;line-height:1.45}
a{display:block;padding:15px;border-radius:26px;text-decoration:none;font-weight:700;margin-top:10px}.p{background:${accent};color:#0E1116}.s{border:1px solid #2A2F3A;color:#F4F1EA}small{display:block;margin-top:18px;color:#6B7180;font-size:13px}</style></head>
<body><main><img src="${esc(o.image)}" alt=""><h1>${esc(o.heading)}</h1><p>${esc(o.sub)}</p>
<a class="p" href="${esc(open)}">Open in KChat</a>
${stores}
${ios || android ? '<small>Just installed KChat? Come back and tap Open in KChat.</small>' : ''}
</main>${android ? `<script>setTimeout(function(){location.href=${JSON.stringify(intent(false))}},250)</script>` : ''}</body></html>`;
}

const GENERIC_IMG = `${BASE}/og/brand.png`;
const send = (res: Response, html: string) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(html);
};
const agent = (req: Request) => String(req.headers['user-agent'] || '');

// ── Get the app ──
// GET /get?src=ad_city: one link for QR codes and posters, sends phones to the right store
router.get('/get', (req: Request, res: Response) => {
  const ua = agent(req);
  const src = String(req.query.src || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
  console.log('get-app', src || 'direct', /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'ios' : 'other');
  if (/android/i.test(ua)) { res.redirect(302, `${PLAY_STORE}&referrer=${encodeURIComponent(`utm_source=${src || 'qr'}`)}`); return; }
  if (/iphone|ipad|ipod/i.test(ua)) { res.redirect(302, APP_STORE); return; }
  res.set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Get KChat</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:system-ui,sans-serif}
a{display:block;margin:10px auto;padding:14px 22px;border-radius:14px;background:#F2F2F2;color:#000;text-decoration:none;font-weight:600;width:220px;text-align:center}
a.alt{background:#0F0F10;color:#fff;border:1px solid #2C2C2E}</style></head><body><div style="text-align:center"><h1 style="font-weight:700">Get KChat</h1>
<a href="${PLAY_STORE}">Android · Google Play</a><a class="alt" href="${APP_STORE}">iPhone · App Store</a></div></body></html>`);
});

// ── Posts and clips: /p/:id (canonical), /posts/:id (legacy) ──
async function postPage(req: Request, res: Response) {
  const id = String(req.params.id || '');
  const p = await publicPost(id).catch(() => null);
  const name = p ? (p.profiles?.full_name || p.profiles?.username) : null;
  send(res, page({
    title: p ? `${name} on KChat` : 'KChat, Kiongozi Chat',
    desc: p ? clip(p.content, 180) : 'Posts, stories and conversations from young Kenyans.',
    image: p ? `${BASE}/og/post/${p.id}.png` : GENERIC_IMG,
    url: `${BASE}/p/${encodeURIComponent(id)}`,
    app: `posts/${encodeURIComponent(id)}`,
    heading: p ? `${name} posted on KChat` : 'Open in KChat',
    sub: p ? 'Join the conversation in the app.' : 'This post is only visible in the app.',
    referrer: `p/${id}`,
  }, agent(req)));
}
router.get('/p/:id', postPage);
router.get('/posts/:id', postPage);

// ── Profiles: /@username (canonical), /u/username (legacy). ?ref= still credits an inviter. ──
async function profilePage(req: Request, res: Response, raw: string, inviteFrom?: string) {
  const username = String(raw || '').replace(/^@/, '');
  const u = await publicProfile(username).catch(() => null);
  const name = u ? (u.full_name || u.username) : null;
  const queryRef = typeof req.query.ref === 'string' && USERNAME.test(req.query.ref) ? req.query.ref : null;
  const ref = inviteFrom || queryRef;
  const q = ref ? `?ref=${encodeURIComponent(ref.toLowerCase())}` : '';
  const invite = !!ref && !!u;
  send(res, page({
    title: invite ? `${name} invited you to KChat` : u ? `${name} (@${u.username}) on KChat` : `@${username} on KChat`,
    desc: u?.bio ? clip(u.bio, 180) : 'Follow them on KChat, the app for young Kenyans who lead.',
    image: u ? `${BASE}/og/u/${encodeURIComponent(u.username)}.png` : GENERIC_IMG,
    url: inviteFrom ? `${BASE}/i/${encodeURIComponent(username)}` : `${BASE}/@${encodeURIComponent(u?.username || username)}`,
    // u/<name>?ref=<name>: what every app build understands, and what credits the inviter
    app: `u/${encodeURIComponent(u?.username || username)}${q}`,
    heading: invite ? `${name} invited you to KChat` : u ? `${name} is on KChat` : `@${username} is on KChat`,
    sub: ref ? 'Get the app, then come back and tap Open in KChat so they get the credit.' : 'Follow them and join the conversation.',
    referrer: ref ? `i/${ref}` : `@${username}`,
  }, agent(req)));
}
// Express matches the raw path, so /@joe and /%40joe (some apps escape the @) both need catching
router.get(/^\/(?:@|%40)([^/]{1,40})\/?$/i, (req, res) => { let u = String((req.params as any)[0] || ''); try { u = decodeURIComponent(u); } catch {} return profilePage(req, res, u); });
router.get('/u/:username', (req, res) => profilePage(req, res, String(req.params.username || '')));
// Invite link: /i/<inviter>. The person who shares it is the profile and the credit.
router.get('/i/:username', (req, res) => {
  const u = String(req.params.username || '');
  return profilePage(req, res, u, USERNAME.test(u) ? u : undefined);
});

// ── Stories: /s/:id ──
async function storyPage(req: Request, res: Response) {
  const id = String(req.params.id || '');
  let s: any = null;
  if (UUID.test(id) && db) {
    const { data } = await db.from('stories')
      .select('id, media_type, media_url, thumbnail_url, text_content, audience, expires_at, profiles:user_id(username, full_name, is_private)')
      .eq('id', id).maybeSingle();
    s = data;
  }
  const p: any = s?.profiles;
  const live = !!s && new Date(s.expires_at).getTime() > Date.now() && s.audience === 'everyone' && !p?.is_private;
  const name = live ? (p?.full_name || p?.username || 'Someone') : null;
  const img = live ? (s.media_type === 'image' ? s.media_url : s.thumbnail_url) : null;
  send(res, page({
    title: name ? `${name}'s story on KChat` : 'A story on KChat',
    desc: live && s.text_content ? clip(s.text_content, 140) : 'Stories, posts and conversations from young Kenyans.',
    image: img || GENERIC_IMG,
    url: `${BASE}/s/${encodeURIComponent(id)}`,
    app: `s/${encodeURIComponent(id)}`,
    heading: name ? `${name} shared a story` : 'Open in KChat',
    sub: live ? 'Stories last 24 hours. Watch it in the app.' : 'This story has ended or is only visible in the app.',
    referrer: `s/${id}`,
  }, agent(req)));
}
router.get('/s/:id', (req, res) => { storyPage(req, res).catch(() => res.redirect(302, PLAY_STORE)); });

// ── Barazas: /b/:id (live room, or its minutes once it has ended) ──
async function barazaPage(req: Request, res: Response) {
  const id = String(req.params.id || '');
  let room: any = null, summary = '';
  if (UUID.test(id) && db) {
    const { data } = await db.from('baraza_rooms').select('id, title, status, minutes_status, minutes_post_id').eq('id', id).maybeSingle();
    room = data;
    if (room) {
      const { data: m } = await db.from('baraza_minutes').select('summary').eq('room_id', room.id).maybeSingle();
      summary = String((m as any)?.summary || '');
    }
  }
  const live = room?.status === 'live';
  const title = room ? `Baraza: ${room.title}` : 'A baraza on KChat';
  send(res, page({
    title,
    desc: summary ? clip(summary, 160) : live ? 'Live now on KChat. Come and listen.' : 'A baraza on KChat.',
    image: room?.minutes_post_id && room.minutes_status === 'ready' ? `${BASE}/api/v1/baraza/${room.id}/minutes/card.png` : GENERIC_IMG,
    url: `${BASE}/b/${encodeURIComponent(id)}`,
    app: `b/${encodeURIComponent(id)}`,
    heading: title,
    sub: live ? 'Live now. Open KChat to listen in.' : 'Read the minutes in KChat.',
    referrer: `b/${id}`,
    accent: '#F2B544',
  }, agent(req)));
}
router.get('/b/:id', (req, res) => { barazaPage(req, res).catch(() => res.redirect(302, PLAY_STORE)); });

// ── Hashtags: /t/:tag ──
router.get('/t/:tag', (req: Request, res: Response) => {
  const tag = String(req.params.tag || '').replace(/^#/, '');
  const ok = TAG.test(tag);
  send(res, page({
    title: ok ? `#${tag} on KChat` : 'KChat',
    desc: 'See what young Kenyans are saying on KChat.',
    image: GENERIC_IMG,
    url: `${BASE}/t/${encodeURIComponent(tag)}`,
    app: ok ? `t/${encodeURIComponent(tag)}` : '',
    heading: ok ? `#${tag}` : 'Open in KChat',
    sub: 'See the conversation in the app.',
    referrer: `t/${tag}`,
  }, agent(req)));
});

// ── Your week: /week (the "See your week" sticker) ──
router.get('/week', (req: Request, res: Response) => {
  send(res, page({
    title: 'Your week on KChat',
    desc: 'Your posts, your people and your best moments of the week.',
    image: GENERIC_IMG,
    url: `${BASE}/week`,
    app: 'week',
    heading: 'See your week',
    sub: 'Open KChat to see your own week.',
    referrer: 'week',
  }, agent(req)));
});

// ── Preview images ──
const sendPng = (res: Response, png: Buffer) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.send(png);
};

router.get('/og/post/:id.png', async (req: Request, res: Response) => {
  try {
    const p = await publicPost(req.params.id);
    if (!p) return res.redirect(302, GENERIC_IMG);
    const media = (p.post_media || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))[0];
    const imageUrl = media ? (media.media_type === 'video' ? media.thumbnail_url : media.url) : null;
    sendPng(res, await postPreview({
      id: p.id, content: p.content || '', name: p.profiles?.full_name || p.profiles?.username || 'KChat',
      username: p.profiles?.username || 'kchat', avatarUrl: p.profiles?.avatar_url, imageUrl, verified: !!p.profiles?.is_verified,
    }));
  } catch (e) { console.warn('og post failed', e); res.redirect(302, GENERIC_IMG); }
});

router.get('/og/u/:username.png', async (req: Request, res: Response) => {
  try {
    const u = await publicProfile(req.params.username);
    if (!u) return res.redirect(302, GENERIC_IMG);
    sendPng(res, await profilePreview({
      username: u.username, name: u.full_name || u.username, bio: u.bio, avatarUrl: u.avatar_url,
      followers: u.follower_count, posts: u.post_count, verified: !!u.is_verified,
    }));
  } catch (e) { console.warn('og profile failed', e); res.redirect(302, GENERIC_IMG); }
});

// Generic brand preview (private content, missing posts)
let brandPng: Buffer | null = null;
router.get('/og/brand.png', async (_req: Request, res: Response) => {
  try {
    if (!brandPng) {
      brandPng = await profilePreview({ username: 'kchat', name: 'KChat', bio: 'Posts, stories and conversations from young Kenyans who lead. Ask Kiongozi AI anything.' });
    }
    sendPng(res, brandPng);
  } catch { res.status(500).end(); }
});

export default router;
