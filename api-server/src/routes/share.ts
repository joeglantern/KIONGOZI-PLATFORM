// Public pages behind shared links (api.kiongozi.org/posts/:id, /u/:username) and their
// link-preview images. Chat apps read the og: tags; people tapping the link get "Open in KChat".
// Only public posts and public profiles show real content; everything else gets a generic preview.
import { Router, Request, Response } from 'express';
import { supabaseServiceClient as db } from '../config/supabase';
import { postPreview, profilePreview } from '../services/OgImageService';

const router = Router();
const BASE = 'https://api.kiongozi.org';
const APP_STORE = 'https://apps.apple.com/app/id6789518676';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile';

const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const UUID = /^[0-9a-f-]{36}$/i;
const USERNAME = /^[a-z0-9_.]{1,30}$/i;

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

function page(o: { title: string; desc: string; image: string; url: string; deep: string; heading: string; sub: string }, ua: string) {
  const ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  const store = ios ? APP_STORE : PLAY_STORE;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="KChat">
<meta property="og:url" content="${esc(o.url)}"><meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}">
<meta property="og:image" content="${esc(o.image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.desc)}"><meta name="twitter:image" content="${esc(o.image)}">
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0E1116;color:#F4F1EA;font-family:-apple-system,system-ui,sans-serif;padding:24px}
main{width:100%;max-width:380px;text-align:center}img{width:100%;border-radius:18px;margin-bottom:22px}h1{font-size:21px;margin:0 0 6px}p{color:#A4A9B6;margin:0 0 24px;line-height:1.45}
a{display:block;padding:15px;border-radius:26px;text-decoration:none;font-weight:700;margin-top:10px}.p{background:#5CB85C;color:#0E1116}.s{border:1px solid #2A2F3A;color:#F4F1EA}</style></head>
<body><main><img src="${esc(o.image)}" alt=""><h1>${esc(o.heading)}</h1><p>${esc(o.sub)}</p>
<a class="p" href="${esc(o.deep)}">Open in KChat</a>
${ios || android ? `<a class="s" href="${store}">Get KChat</a>` : `<a class="s" href="${APP_STORE}">App Store</a><a class="s" href="${PLAY_STORE}">Google Play</a>`}
</main>${ios || android ? `<script>setTimeout(function(){location.href=${JSON.stringify(o.deep)}},400)</script>` : ''}</body></html>`;
}

const GENERIC_IMG = `${BASE}/og/brand.png`;

// ── Landing pages ──
router.get('/posts/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const p = await publicPost(id).catch(() => null);
  const name = p ? (p.profiles?.full_name || p.profiles?.username) : null;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(page({
    title: p ? `${name} on KChat` : 'KChat — Kiongozi Chat',
    desc: p ? String(p.content || '').replace(/\s+/g, ' ').slice(0, 180) : 'Posts, stories and conversations from young Kenyans.',
    image: p ? `${BASE}/og/post/${p.id}.png` : GENERIC_IMG,
    url: `${BASE}/posts/${encodeURIComponent(id)}`,
    deep: `kiongozi://posts/${encodeURIComponent(id)}`,
    heading: p ? `${name} posted on KChat` : 'Open in KChat',
    sub: p ? 'Join the conversation in the app.' : 'This post is only visible in the app.',
  }, req.headers['user-agent'] || ''));
});

router.get('/u/:username', async (req: Request, res: Response) => {
  const username = String(req.params.username || '').replace(/^@/, '');
  const u = await publicProfile(username).catch(() => null);
  const name = u ? (u.full_name || u.username) : null;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(page({
    title: u ? `${name} (@${u.username}) on KChat` : `@${username} on KChat`,
    desc: u?.bio ? String(u.bio).slice(0, 180) : 'Follow them on KChat, the app for young Kenyans who lead.',
    image: u ? `${BASE}/og/u/${encodeURIComponent(u.username)}.png` : GENERIC_IMG,
    url: `${BASE}/u/${encodeURIComponent(username)}`,
    deep: `kiongozi://u/${encodeURIComponent(username)}`,
    heading: u ? `${name} is on KChat` : `@${username} is on KChat`,
    sub: 'Follow them and join the conversation.',
  }, req.headers['user-agent'] || ''));
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
