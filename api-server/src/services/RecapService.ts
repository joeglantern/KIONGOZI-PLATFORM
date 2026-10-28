// "Your week on KChat" recap card (Spotify Wrapped idea): last 7 days of a user's activity,
// drawn as a 1080×1920 story image with the same Satori pipeline as the AI share cards.
import fs from 'fs';
import path from 'path';
import { supabaseServiceClient as db } from '../config/supabase';
import { h, renderTree, cardAssets, excerpt } from './ShareCardService';

const INK = '#0E1116', CREAM = '#F4F1EA', SUB = '#A4A9B6', GREEN = '#5CB85C', GOLD = '#F5B83D', PANEL = '#191D25';
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

let bg: string | null = null;
function background() {
  if (bg) return bg;
  const f = path.join(process.cwd(), 'assets', 'cards', 'recap.jpg');
  bg = fs.existsSync(f) ? `data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}` : '';
  return bg;
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
  const back = background();
  // Hero number: the most flattering of likes / views / comments
  const hero = s.likes >= s.storyViews && s.likes >= s.comments
    ? { n: s.likes, label: 'likes on your posts' }
    : s.storyViews >= s.comments ? { n: s.storyViews, label: 'views on your stories' } : { n: s.comments, label: 'replies to your posts' };

  const tile = (n: string, label: string, color = CREAM) => h('div', {
    display: 'flex', flexDirection: 'column', width: 438, backgroundColor: PANEL, borderRadius: 36, padding: '34px 36px', marginBottom: 24,
  },
    h('div', { fontSize: 72, fontWeight: 700, color, letterSpacing: -2, lineHeight: 1 }, n),
    h('div', { fontSize: 28, fontWeight: 500, color: SUB, marginTop: 12 }, label),
  );

  const top = s.topPost ? excerpt(s.topPost.content, 120) : null;
  const tree = h('div', { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: INK, fontFamily: 'Grotesk' },
    ...(back ? [{ type: 'img', props: { src: back, width: W, height: H, style: { position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' } } }] : []),
    h('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', flexDirection: 'column', padding: '150px 84px 120px' },
      // brand + range
      h('div', { display: 'flex', alignItems: 'center' },
        { type: 'img', props: { src: orb, width: 56, height: 56, style: { width: 56, height: 56, borderRadius: 28 } } },
        h('div', { fontSize: 32, fontWeight: 700, color: CREAM, marginLeft: 16 }, 'KChat'),
        h('div', { fontSize: 28, fontWeight: 700, color: CREAM, marginLeft: 'auto' }, range(s.since, s.until)),
      ),
      h('div', { fontSize: 104, fontWeight: 700, color: CREAM, letterSpacing: -4, lineHeight: 0.98, marginTop: 70 }, 'Wiki yako'),
      h('div', { fontSize: 40, fontWeight: 500, color: SUB, marginTop: 14 }, `@${user.username}'s week on KChat`),
      // hero
      h('div', { display: 'flex', flexDirection: 'column', marginTop: 70 },
        h('div', { fontSize: 220, fontWeight: 700, color: GREEN, letterSpacing: -10, lineHeight: 0.9 }, fmt(hero.n)),
        h('div', { fontSize: 40, fontWeight: 500, color: CREAM, marginTop: 10 }, hero.label),
      ),
      // tiles
      h('div', { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 64 },
        tile(fmt(s.posts), s.posts === 1 ? 'post' : 'posts'),
        tile(`+${fmt(s.followers)}`, 'new followers'),
        tile(`${s.activeDays}/7`, 'days active'),
        tile(s.streak > 1 ? `${s.streak}🔥` : fmt(s.comments), s.streak > 1 ? 'day streak' : 'replies', s.streak > 1 ? GOLD : CREAM),
      ),
      // top post or top tag
      ...(top ? [h('div', { display: 'flex', flexDirection: 'column', backgroundColor: CREAM, borderRadius: 36, padding: '34px 38px', marginTop: 4 },
        h('div', { fontSize: 24, fontWeight: 700, color: '#5A5F6B', letterSpacing: 2 }, `TOP POST · ${fmt(s.topPost!.likes)} LIKES`),
        h('div', { fontSize: 34, fontWeight: 500, color: '#1F2430', lineHeight: 1.3, marginTop: 12 }, top),
      )] : s.topTag ? [h('div', { fontSize: 40, fontWeight: 700, color: GOLD, marginTop: 10 }, `#${s.topTag}`)] : []),
      h('div', { display: 'flex', marginTop: 'auto', justifyContent: 'center' },
        h('div', { fontSize: 26, fontWeight: 700, color: INK, backgroundColor: GREEN, borderRadius: 30, padding: '14px 30px', letterSpacing: 2 }, 'GET YOUR RECAP ON KCHAT'),
      ),
    ),
  );
  return renderTree(tree, W, H, previewWidth);
}
