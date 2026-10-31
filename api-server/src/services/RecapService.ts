// "Your week on KChat" recap card (Spotify Wrapped idea): last 7 days of a user's activity,
// drawn as a 1080×1920 story image with the same Satori pipeline as the AI share cards.
import fs from 'fs';
import path from 'path';
import { supabaseServiceClient as db } from '../config/supabase';
import { h, renderTree, cardAssets, excerpt } from './ShareCardService';

const INK = '#12151C', CREAM = '#F4F1EA', GOLD = '#F5B83D';
const W = 1080, H = 1920;
const DAY = 24 * 3600 * 1000;

export type WeekStats = {
  since: string; until: string;
  posts: number; likes: number; comments: number; followers: number; storyViews: number;
  /** views on the posts you made this week */
  postViews?: number;
  activeDays: number; streak: number;
  topPost: { id: string; content: string; likes: number; view_count?: number; thumbnail_url?: string | null } | null;
  topTag: string | null;
  /** who liked and replied to you most this week (Wrapped's "your top fan") */
  topFan?: { id: string; username: string; full_name: string | null; avatar_url: string | null; count: number } | null;
  barazas?: number;
  /** your best day of the week by activity on your posts, e.g. "Friday" */
  bestDay?: string | null;
};

const dayKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

/** Days in a row (ending today or yesterday) with at least one post, reply or story. */
export async function activityStreak(userId: string) {
  const since = new Date(Date.now() - 60 * DAY).toISOString();
  const [{ data: p }, { data: s }] = await Promise.all([
    db.from('posts').select('created_at').eq('user_id', userId).gte('created_at', since).limit(1000),
    db.from('stories').select('created_at').eq('user_id', userId).gte('created_at', since).limit(500),
  ]);
  const days = new Set([...(p || []), ...(s || [])].map((r: any) => dayKey(r.created_at)));
  let streak = 0;
  let t = Date.now();
  if (!days.has(dayKey(new Date(t)))) t -= DAY; // today not done yet still keeps the streak alive
  while (days.has(dayKey(new Date(t)))) { streak++; t -= DAY; }
  return { streak, days };
}

export async function weekStats(userId: string): Promise<WeekStats> {
  const until = new Date();
  const since = new Date(until.getTime() - 7 * DAY);
  const sinceIso = since.toISOString();

  const [{ data: mine }, { data: recent }, { count: followers }, { data: stories }, streakInfo] = await Promise.all([
    // all my top-level posts (to count likes/comments they received this week)
    db.from('posts').select('id').eq('user_id', userId).is('parent_post_id', null).order('created_at', { ascending: false }).limit(500),
    db.from('posts').select('id, content, like_count, view_count, parent_post_id, created_at').eq('user_id', userId).gte('created_at', sinceIso).limit(500),
    db.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId).gte('created_at', sinceIso),
    db.from('stories').select('view_count, created_at').eq('user_id', userId).gte('created_at', sinceIso),
    activityStreak(userId),
  ]);
  const ids = (mine || []).map((r: any) => r.id);
  const [{ count: likes }, { count: comments }, { data: tags }] = ids.length ? await Promise.all([
    db.from('post_likes').select('id', { count: 'exact', head: true }).in('post_id', ids).neq('user_id', userId).gte('created_at', sinceIso),
    db.from('posts').select('id', { count: 'exact', head: true }).in('parent_post_id', ids).neq('user_id', userId).gte('created_at', sinceIso),
    db.from('post_hashtags').select('hashtags(tag)').in('post_id', (recent || []).map((r: any) => r.id).slice(0, 200)),
  ]) : [{ count: 0 }, { count: 0 }, { data: [] }] as any;

  const top = (recent || []).filter((r: any) => !r.parent_post_id && r.content)
    .sort((a: any, b: any) => (b.like_count || 0) - (a.like_count || 0))[0];
  const tagCount = new Map<string, number>();
  for (const t of tags || []) { const tag = (t as any).hashtags?.tag; if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + 1); }
  const topTag = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const weekDays = [...streakInfo.days].filter(d => d >= dayKey(since)).length;
  // the top post's first picture (a video's thumbnail), for the story card
  let thumb: string | null = null;
  if (top) {
    const { data: pm } = await db.from('post_media').select('media_type, url, thumbnail_url').eq('post_id', top.id).order('order_index', { ascending: true }).limit(1);
    const m: any = pm?.[0];
    thumb = m ? (m.media_type === 'video' ? m.thumbnail_url || null : m.thumbnail_url || m.url || null) : null;
  }
  return {
    since: sinceIso, until: until.toISOString(),
    posts: (recent || []).filter((r: any) => !r.parent_post_id).length,
    likes: likes || 0, comments: comments || 0, followers: followers || 0,
    storyViews: (stories || []).reduce((n: number, s: any) => n + (s.view_count || 0), 0),
    postViews: (recent || []).filter((r: any) => !r.parent_post_id).reduce((n: number, r: any) => n + (r.view_count || 0), 0),
    activeDays: Math.min(7, weekDays), streak: streakInfo.streak,
    topPost: top ? { id: top.id, content: top.content, likes: top.like_count || 0, view_count: top.view_count || 0, thumbnail_url: thumb } : null,
    topTag,
    ...(await wrappedExtras(userId, ids, sinceIso)),
  };
}

/** The personal bits for the Wrapped-style story: top fan, barazas joined, best day. */
async function wrappedExtras(userId: string, ids: string[], sinceIso: string) {
  try {
    const [{ data: likers }, { data: repliers }, { count: barazas }] = await Promise.all([
      ids.length ? db.from('post_likes').select('user_id, created_at').in('post_id', ids).neq('user_id', userId).gte('created_at', sinceIso).limit(2000) : Promise.resolve({ data: [] } as any),
      ids.length ? db.from('posts').select('user_id, created_at').in('parent_post_id', ids).neq('user_id', userId).gte('created_at', sinceIso).limit(2000) : Promise.resolve({ data: [] } as any),
      db.from('baraza_participants').select('room_id', { count: 'exact', head: true }).eq('user_id', userId).gte('joined_at', sinceIso),
    ]);
    const score = new Map<string, number>();
    const byDay = new Map<number, number>();
    for (const r of [...(likers || []), ...(repliers || [])] as any[]) {
      score.set(r.user_id, (score.get(r.user_id) || 0) + 1);
      const d = new Date(new Date(r.created_at).getTime() + 3 * 3600_000).getUTCDay(); // Nairobi time
      byDay.set(d, (byDay.get(d) || 0) + 1);
    }
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
    let topFan = null;
    if (best && best[1] >= 2) {
      const { data: p } = await db.from('profiles').select('id, username, full_name, avatar_url').eq('id', best[0]).maybeSingle();
      if (p) topFan = { ...(p as any), count: best[1] };
    }
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bd = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    return { topFan, barazas: barazas || 0, bestDay: bd ? DAYS[bd[0]] : null };
  } catch {
    return { topFan: null, barazas: 0, bestDay: null };
  }
}

// ── Street-art look: hand-sprayed pieces made with gpt-image-1.5 (assets/recap), composed here.
// Readable text stays in real fonts: Permanent Marker for labels, Space Grotesk for sentences.
type Art = { uri: string; w: number; h: number };
let art: Record<string, Art> | null = null;
function arts() {
  if (art) return art;
  const dir = path.join(process.cwd(), 'assets', 'recap');
  const out: Record<string, Art> = {};
  for (const f of fs.readdirSync(dir)) {
    const buf = fs.readFileSync(path.join(dir, f));
    const png = f.endsWith('.png');
    // PNG size lives in the IHDR header; the wall is a JPEG drawn full-bleed so its size isn't needed
    const w = png ? buf.readUInt32BE(16) : 1080, ht = png ? buf.readUInt32BE(20) : 1620;
    out[f.replace(/\.(png|jpg)$/, '')] = { uri: `data:image/${png ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`, w, h: ht };
  }
  art = out;
  return art;
}

const img = (a: Art, w: number, ht: number, style: Record<string, any> = {}) =>
  ({ type: 'img', props: { src: a.uri, width: w, height: ht, style: { width: w, height: ht, ...style } } });

/** A number painted with the bubble-digit glyphs; other characters (+ / K .) in marker. */
function painted(text: string, height: number, other = CREAM) {
  const A = arts();
  return h('div', { display: 'flex', alignItems: 'flex-end' },
    ...Array.from(text).map((c, i) => {
      const g = A[`d${c}`];
      if (g) return img(g, Math.round(g.w * height / g.h), height, { marginLeft: i ? -height * 0.07 : 0 });
      return h('div', { fontFamily: 'Marker', fontSize: height * 0.72, color: other, lineHeight: 1, marginLeft: 4, marginRight: 4, marginBottom: height * 0.08 }, c);
    }),
  );
}

const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n);
const range = (a: string, b: string) => {
  const m = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'Africa/Nairobi' });
  const da = new Date(a), dbb = new Date(b);
  const day = (d: Date) => Number(d.toLocaleString('en-GB', { day: 'numeric', timeZone: 'Africa/Nairobi' }));
  return m(da) === m(dbb) ? `${day(da)}–${day(dbb)} ${m(dbb)}` : `${day(da)} ${m(da)} – ${day(dbb)} ${m(dbb)}`;
};

/** Same persona the app shows on the "This week you were" slide (keep in sync with wrappedData.ts personaFor) */
function personaFor(st: WeekStats) {
  const likes = st.likes || 0, comments = st.comments || 0, stories = st.storyViews || 0;
  if ((st.barazas ?? 0) >= 2) return { name: 'The Voice', line: 'When the stools came out, you spoke up. People pulled up to hear what you had to say.' };
  if (comments > likes * 0.4 && comments >= 5) return { name: 'The Connector', line: 'You start conversations. People did not just like your posts, they replied, and that is rarer.' };
  if (likes >= 20) return { name: 'The Crowd Favourite', line: 'People kept coming back to tap the heart on what you shared. You gave them something worth it.' };
  if (stories >= likes && stories >= 10) return { name: 'The Storyteller', line: 'Your stories pulled people in. They kept watching to see what you would share next.' };
  if ((st.activeDays || 0) >= 5) return { name: 'The Regular', line: 'You showed up day after day. That is how a place starts to feel like home.' };
  return { name: 'The Newcomer', line: 'A quiet week, and that is fine. Pull up a stool and say your piece this week.' };
}

// Cut-paper look, matching the app's "Your week" summary card: cream table, a torn violet sheet,
// cut-paper trophy, coloured paper tiles, one coral brush stroke. Pieces live in assets/recap as pp_*.
const P_INK = '#1B1712', P_CREAM = '#F3E9D2', P_CORAL = '#F2643D', P_LIME = '#B5DC5C', P_AMBER = '#EFA51E', P_PINK = '#F4A3B4';

export async function renderRecap(s: WeekStats, user: { username: string; name: string }, previewWidth?: number) {
  const { orb } = cardAssets();
  const A = arts();
  const p = personaFor(s);
  const abs = (x: number, y: number, extra: Record<string, any> = {}) => ({ position: 'absolute', left: x, top: y, display: 'flex', ...extra });
  const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const tiles = [
    { v: s.likes, n: fmt(s.likes), l: pl(s.likes, 'like', 'likes') },
    { v: s.followers, n: `+${fmt(s.followers)}`, l: pl(s.followers, 'follower', 'followers') },
    { v: s.postViews || 0, n: fmt(s.postViews || 0), l: pl(s.postViews || 0, 'view', 'views') },
    { v: s.comments, n: fmt(s.comments), l: pl(s.comments, 'reply', 'replies') },
    { v: s.barazas || 0, n: fmt(s.barazas || 0), l: pl(s.barazas || 0, 'baraza', 'barazas') },
    { v: s.activeDays, n: `${s.activeDays}/7`, l: 'days active' },
    { v: s.storyViews, n: fmt(s.storyViews), l: pl(s.storyViews, 'story view', 'story views') },
  ].filter(t => t.v > 0).slice(0, 4);
  const TILE = [P_CORAL, P_LIME, P_AMBER, P_PINK];
  const cardX = 70, cardY = 540, cardW = 940, cardH = 1170;
  const tileW = (cardW - 120 - 28) / 2, tileH = 190;
  const words = p.name.split(' ');
  const nameLines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : [p.name];
  const tilesTop = 420;
  const lineTop = tilesTop + (tiles.length > 2 ? 2 : tiles.length ? 1 : 0) * (tileH + 28) + 36;
  const weekOf = new Date(s.since).toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

  const tree = h('div', { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: P_CREAM, fontFamily: 'Grotesk' },
    img(A.pp_grain, W, H, { position: 'absolute', left: 0, top: 0, objectFit: 'cover', opacity: 0.9 }),
    // brand + dates
    h('div', abs(80, 92, { width: W - 160, alignItems: 'center' }),
      { type: 'img', props: { src: orb, width: 56, height: 56, style: { width: 56, height: 56, borderRadius: 28 } } },
      h('div', { fontSize: 34, fontWeight: 700, color: P_INK, marginLeft: 16 }, 'KChat'),
      h('div', { fontSize: 32, fontWeight: 700, color: P_INK, marginLeft: 'auto', opacity: 0.7 }, range(s.since, s.until)),
    ),
    // title with one brush stroke under "week"
    h('div', abs(80, 190, { flexDirection: 'column' }),
      h('div', { fontSize: 150, fontWeight: 700, color: P_INK, letterSpacing: -6, lineHeight: 1 }, 'Your week'),
      h('div', { fontSize: 40, fontWeight: 700, color: P_INK, opacity: 0.72, marginTop: 64 }, `@${user.username} · week of ${weekOf}`),
    ),
    img(A.pp_underline, 400, 52, { position: 'absolute', left: 476, top: 338, transform: 'rotate(-2deg)' }),
    // the torn violet sheet: its shadow, then the sheet
    img(A.pp_patch_shadow, cardW, cardH, { position: 'absolute', left: cardX + 16, top: cardY + 22, transform: 'rotate(-2deg)' }),
    h('div', abs(cardX, cardY, { width: cardW, height: cardH, transform: 'rotate(-2deg)' }),
      img(A.pp_patch_violet, cardW, cardH, { position: 'absolute', left: 0, top: 0 }),
      img(A.pp_trophy, 290, Math.round(290 * A.pp_trophy.h / A.pp_trophy.w), { position: 'absolute', right: 34, top: 36, transform: 'rotate(8deg)' }),
      h('div', abs(70, 86, { flexDirection: 'column' }),
        h('div', { fontSize: 30, fontWeight: 700, color: '#FFFFFF', opacity: 0.86, letterSpacing: 2 }, 'THIS WEEK YOU WERE'),
        ...nameLines.map(t => h('div', { fontSize: 112, fontWeight: 700, color: '#FFFFFF', letterSpacing: -4, lineHeight: 1.02 }, t)),
      ),
      h('div', abs(60, tilesTop, { width: cardW - 120, flexWrap: 'wrap', gap: 28 }),
        ...tiles.map((t, i) => h('div', { display: 'flex', position: 'relative', width: tileW, height: tileH, transform: `rotate(${i % 2 ? 2 : -2}deg)` },
          h('div', { position: 'absolute', left: 8, top: 10, width: tileW, height: tileH, backgroundColor: 'rgba(27,23,18,0.25)', borderRadius: 6 }),
          h('div', { position: 'absolute', left: 0, top: 0, width: tileW, height: tileH, backgroundColor: TILE[i], borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 34px' },
            h('div', { fontSize: 92, fontWeight: 700, color: P_INK, letterSpacing: -3, lineHeight: 1 }, t.n),
            h('div', { fontSize: 32, fontWeight: 700, color: P_INK, marginTop: 6 }, t.l),
          ),
        )),
      ),
      h('div', abs(70, lineTop, { width: cardW - 140, fontSize: 36, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }), p.line),
      ...(s.topTag || s.bestDay ? [h('div', abs(70, cardH - 104, { width: cardW - 140, fontSize: 32, fontWeight: 500, color: '#FFFFFF' }),
        ...(s.topTag ? [h('div', { display: 'flex' }, 'Top topic', h('div', { color: P_LIME, fontWeight: 700, marginLeft: 10 }, `#${s.topTag.replace(/^#/, '')}`))] : []),
        ...(s.topTag && s.bestDay ? [h('div', { marginLeft: 18, marginRight: 18 }, '·')] : []),
        ...(s.bestDay ? [h('div', { display: 'flex' }, 'Best day', h('div', { color: P_AMBER, fontWeight: 700, marginLeft: 10 }, s.bestDay))] : []),
      )] : []),
    ),
    // footer
    h('div', abs(0, H - 150, { width: W, justifyContent: 'center', alignItems: 'center' }),
      h('div', { fontSize: 40, fontWeight: 700, color: P_INK }, 'Get your week on KChat'),
      img(A.pp_arrow, 90, Math.round(90 * A.pp_arrow.h / A.pp_arrow.w), { marginLeft: 18 }),
    ),
  );
  return renderTree(tree, W, H, previewWidth);
}
