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
  activeDays: number; streak: number;
  topPost: { id: string; content: string; likes: number } | null;
  topTag: string | null;
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
    db.from('posts').select('id, content, like_count, parent_post_id, created_at').eq('user_id', userId).gte('created_at', sinceIso).limit(500),
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
  return {
    since: sinceIso, until: until.toISOString(),
    posts: (recent || []).filter((r: any) => !r.parent_post_id).length,
    likes: likes || 0, comments: comments || 0, followers: followers || 0,
    storyViews: (stories || []).reduce((n: number, s: any) => n + (s.view_count || 0), 0),
    activeDays: Math.min(7, weekDays), streak: streakInfo.streak,
    topPost: top ? { id: top.id, content: top.content, likes: top.like_count || 0 } : null,
    topTag,
  };
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

export async function renderRecap(s: WeekStats, user: { username: string; name: string }, previewWidth?: number) {
  const { orb } = cardAssets();
  const A = arts();
  // Hero number: the most flattering of likes / views / comments
  const hero = s.likes >= s.storyViews && s.likes >= s.comments
    ? { n: s.likes, label: 'likes on your posts' }
    : s.storyViews >= s.comments ? { n: s.storyViews, label: 'views on your stories' } : { n: s.comments, label: 'replies to your posts' };

  const abs = (x: number, y: number, extra: Record<string, any> = {}) => ({ position: 'absolute', left: x, top: y, display: 'flex', ...extra });

  // Torn-paper sticker with a painted number and a marker label
  const SW = 440, SH = 250;
  const sticker = (paper: string, x: number, y: number, rot: number, value: string, label: string, icon?: string) =>
    h('div', abs(x, y, { width: SW, height: SH, transform: `rotate(${rot}deg)` }),
      img(A[`paper_${paper}`], SW, SH, { position: 'absolute', left: 0, top: 0 }),
      h('div', { position: 'absolute', left: 0, top: 0, width: SW, height: SH, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 40px 26px' },
        h('div', { display: 'flex', alignItems: 'center' },
          painted(value, 104, INK),
          ...(icon ? [img(A[icon], 74, Math.round(74 * A[icon].h / A[icon].w), { marginLeft: 10 })] : []),
        ),
        h('div', { fontFamily: 'Marker', fontSize: 34, color: INK, marginTop: 6 }, label),
      ),
    );

  const top = s.topPost ? excerpt(s.topPost.content, 110) : null;
  const titleW = 780, titleH = Math.round(titleW * A.title.h / A.title.w);
  const heroH = 220;
  const titleTop = 150;
  const heroTop = titleTop + titleH + 78;

  const tree = h('div', { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#15181F', fontFamily: 'Grotesk' },
    img(A.wall, W, H, { position: 'absolute', left: 0, top: 0, objectFit: 'cover' }),
    // brand + dates
    h('div', abs(80, 92, { width: W - 160, alignItems: 'center' }),
      { type: 'img', props: { src: orb, width: 52, height: 52, style: { width: 52, height: 52, borderRadius: 26 } } },
      h('div', { fontSize: 32, fontWeight: 700, color: CREAM, marginLeft: 14 }, 'KChat'),
      h('div', { fontFamily: 'Marker', fontSize: 34, color: CREAM, marginLeft: 'auto' }, range(s.since, s.until)),
    ),
    // sprayed title + whose week
    h('div', abs((W - titleW) / 2, titleTop, { transform: 'rotate(-3deg)' }), img(A.title, titleW, titleH)),
    h('div', abs(0, titleTop + titleH + 4, { width: W, justifyContent: 'center' }),
      h('div', { fontFamily: 'Marker', fontSize: 42, color: CREAM }, `@${user.username}’s week`),
    ),
    // hero number
    h('div', abs(0, heroTop, { width: W, justifyContent: 'center' }), painted(fmt(hero.n), heroH)),
    h('div', abs(0, heroTop + heroH + 6, { width: W, flexDirection: 'column', alignItems: 'center', transform: 'rotate(-2deg)' }),
      h('div', { fontFamily: 'Marker', fontSize: 50, color: GOLD }, hero.label),
      img(A.swoosh, 300, Math.round(300 * A.swoosh.h / A.swoosh.w), { marginTop: -24 }),
    ),
    // stickers
    sticker('cream', 74, 990, -3, fmt(s.posts), s.posts === 1 ? 'post' : 'posts'),
    sticker('yellow', 566, 980, 2.5, `+${fmt(s.followers)}`, 'new followers'),
    sticker('green', 82, 1255, 2, `${s.activeDays}/7`, 'days active'),
    s.streak > 1
      ? sticker('cream', 560, 1250, -2, String(s.streak), 'day streak', 'flame')
      : sticker('cream', 560, 1250, -2, fmt(s.comments), s.comments === 1 ? 'reply' : 'replies', 'heart'),
    // top post on paper
    ...(top ? [h('div', abs(90, 1540, { width: W - 180, height: 230, transform: 'rotate(-1deg)' }),
      img(A.paper_cream, W - 180, 230, { position: 'absolute', left: 0, top: 0 }),
      h('div', { position: 'absolute', left: 0, top: 0, width: W - 180, height: 230, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 48px' },
        h('div', { fontFamily: 'Marker', fontSize: 28, color: '#D9483B' }, `Top post · ${fmt(s.topPost!.likes)} likes`),
        h('div', { fontSize: 32, fontWeight: 500, color: INK, lineHeight: 1.3, marginTop: 8 }, top),
      ),
    )] : []),
    // footer
    h('div', abs(0, H - 112, { width: W, justifyContent: 'center', alignItems: 'center' }),
      h('div', { fontFamily: 'Marker', fontSize: 36, color: CREAM }, 'Get your recap on KChat'),
      img(A.arrow, 86, Math.round(86 * A.arrow.h / A.arrow.w), { marginLeft: 14 }),
    ),
  );
  return renderTree(tree, W, H, previewWidth);
}
