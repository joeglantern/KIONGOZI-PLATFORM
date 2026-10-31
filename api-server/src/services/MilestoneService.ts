// Milestone moments: a first post, a first follower, a post passing 100 likes, 1K views, 50 followers.
// Each fires once (user_milestones primary key), only while it is fresh (a post that already had 300
// likes before this shipped doesn't suddenly "pass 100"), and only after the hooks migration has run.
import fs from 'fs';
import path from 'path';
import { supabaseServiceClient as db } from '../config/supabase';
import NotificationService from './NotificationService';
import { h, renderTree, cardAssets } from './ShareCardService';

export type MilestoneKind = 'first_post' | 'followers' | 'likes' | 'views';

const LIKES = [10, 50, 100, 500, 1000];
const VIEWS = [100, 1000, 10000];
const FOLLOWERS = [1, 10, 50, 100, 1000];

export const fmtCount = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));

/** The sentence for a milestone, used by the notification, the moment card and the share card */
export function milestoneTitle(kind: MilestoneKind, value: number) {
  if (kind === 'first_post') return 'Your first post is up';
  if (kind === 'followers') return value === 1 ? 'You got your first follower' : `You reached ${fmtCount(value)} followers`;
  if (kind === 'likes') return `Your post passed ${fmtCount(value)} likes`;
  return `Your post passed ${fmtCount(value)} views`;
}

/** Highest threshold reached, only if the count crossed it just now (within a small margin) */
function freshThreshold(list: number[], count: number) {
  const t = [...list].reverse().find(x => count >= x);
  if (!t) return null;
  const margin = Math.max(2, Math.ceil(t * 0.05));
  return count - t <= margin ? t : null;
}

async function claim(userId: string, key: string, kind: MilestoneKind, value: number, postId?: string | null) {
  const { data, error } = await db.from('user_milestones')
    .upsert({ user_id: userId, key, kind, value, post_id: postId || null }, { onConflict: 'user_id,key', ignoreDuplicates: true })
    .select('key');
  if (error) return false; // table not there yet: no milestones before the migration
  return (data || []).length > 0;
}

async function fire(userId: string, kind: MilestoneKind, value: number, postId?: string | null) {
  const key = postId ? `${kind}:${value}:${postId}` : kind === 'first_post' ? 'first_post' : `${kind}:${value}`;
  if (!(await claim(userId, key, kind, value, postId))) return;
  let snippet = '';
  if (postId) {
    const { data: p } = await db.from('posts').select('content').eq('id', postId).maybeSingle();
    snippet = Array.from(String((p as any)?.content || '').replace(/\s+/g, ' ').trim()).slice(0, 60).join('');
  }
  const title = milestoneTitle(kind, value);
  await NotificationService.notify({
    userId,
    type: 'milestone',
    title,
    message: title,
    // A first post is something you just did: it lands in Activity without a sound
    silent: kind === 'first_post',
    data: { milestone: kind, value, post_id: postId || undefined, snippet: snippet || undefined },
  });
}

const safe = (fn: () => Promise<void>) => { setImmediate(() => { fn().catch(e => console.warn('milestone check', e?.message || e)); }); };

export const Milestones = {
  /** After a like: the post's owner may have passed 10 / 50 / 100 / 500 / 1K likes */
  postLiked(postId: string) {
    safe(async () => {
      const { data: p } = await db.from('posts').select('user_id, like_count').eq('id', postId).maybeSingle();
      const t = p ? freshThreshold(LIKES, (p as any).like_count || 0) : null;
      if (p && t) await fire((p as any).user_id, 'likes', t, postId);
    });
  },
  /** After a counted view (the server already knows the new count) */
  postViewed(postId: string, ownerId: string, views: number) {
    const t = freshThreshold(VIEWS, views);
    if (t) safe(() => fire(ownerId, 'views', t, postId));
  },
  /** After a new follower */
  followed(userId: string) {
    safe(async () => {
      const { data: p } = await db.from('profiles').select('follower_count').eq('id', userId).maybeSingle();
      const t = p ? freshThreshold(FOLLOWERS, (p as any).follower_count || 0) : null;
      if (t) await fire(userId, 'followers', t);
    });
  },
  /** After a top-level post (not a reply or a plain repost): the very first one */
  posted(userId: string, postId: string) {
    safe(async () => {
      const { count } = await db.from('posts').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).is('parent_post_id', null);
      if (count === 1) await fire(userId, 'first_post', 1, postId);
    });
  },
};

// ── Share card: cream paper, the number on a torn ink strip, a cut-paper heart / star / trophy ──
type Art = { uri: string; w: number; h: number };
let arts: Record<string, Art> | null = null;
function art() {
  if (arts) return arts;
  // Same cut-paper pieces as the app's "Your week" (assets/milestones), plus the recap paper grain
  const out: Record<string, Art> = {};
  for (const f of ['milestones/heart.png', 'milestones/star.png', 'milestones/sun.png', 'milestones/bubble.png', 'recap/pp_grain.jpg']) {
    try {
      const buf = fs.readFileSync(path.join(process.cwd(), 'assets', f));
      const png = f.endsWith('.png');
      out[path.basename(f).replace(/\.(png|jpg)$/, '')] = { uri: `data:image/${png ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`, w: png ? buf.readUInt32BE(16) : 1080, h: png ? buf.readUInt32BE(20) : 1920 };
    } catch { /* missing art: the card still renders without it */ }
  }
  arts = out;
  return arts;
}

const INK = '#1B1712', CREAM = '#F3EBDD';

export async function renderMilestoneCard(m: { kind: MilestoneKind; value: number; username: string; snippet?: string }, previewWidth?: number) {
  const W = 1080, H = 1920;
  const A = art();
  const { orb } = cardAssets();
  const pic = m.kind === 'likes' ? A.heart : m.kind === 'views' ? A.star : m.kind === 'followers' ? A.sun : A.bubble;
  const big = m.kind === 'first_post' ? '1st' : fmtCount(m.value);
  const title = milestoneTitle(m.kind, m.value).replace(/^Your /, 'My ').replace(/^You /, 'I ');
  const abs = (x: number, y: number, extra: Record<string, any> = {}) => ({ position: 'absolute', left: x, top: y, display: 'flex', ...extra });
  const img = (a: Art, w: number, ht: number, style: Record<string, any> = {}) =>
    ({ type: 'img', props: { src: a.uri, width: w, height: ht, style: { width: w, height: ht, ...style } } });
  const picW = 460, picH = pic ? Math.round(picW * pic.h / pic.w) : 0;

  const tree = h('div', { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: CREAM, fontFamily: 'Grotesk' },
    ...(A.pp_grain ? [img(A.pp_grain, W, H, { position: 'absolute', left: 0, top: 0, objectFit: 'cover', opacity: 0.85 })] : []),
    h('div', abs(80, 96, { width: W - 160, alignItems: 'center' }),
      { type: 'img', props: { src: orb, width: 56, height: 56, style: { width: 56, height: 56, borderRadius: 28 } } },
      h('div', { fontSize: 34, fontWeight: 700, color: INK, marginLeft: 16 }, 'KChat'),
      h('div', { fontSize: 32, fontWeight: 700, color: INK, marginLeft: 'auto', opacity: 0.7 }, `@${m.username}`),
    ),
    ...(pic ? [
      img(pic, picW, picH, { position: 'absolute', left: (W - picW) / 2 + 14, top: 330 + 18, transform: 'rotate(-8deg)', opacity: 0.18 }),
      img(pic, picW, picH, { position: 'absolute', left: (W - picW) / 2, top: 330, transform: 'rotate(-8deg)' }),
    ] : []),
    // torn ink strip with the number
    h('div', abs(110, 900, { width: W - 220, height: 300, backgroundColor: INK, transform: 'rotate(-2deg)', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }),
      h('div', { fontSize: 210, fontWeight: 700, color: CREAM, letterSpacing: -8, lineHeight: 1 }, big),
    ),
    h('div', abs(90, 1290, { width: W - 180, flexDirection: 'column', alignItems: 'center' }),
      h('div', { fontSize: 72, fontWeight: 700, color: INK, letterSpacing: -2, textAlign: 'center', lineHeight: 1.1 }, title),
      ...(m.snippet ? [h('div', { fontSize: 38, fontWeight: 500, color: INK, opacity: 0.68, marginTop: 34, textAlign: 'center', lineHeight: 1.3 }, `"${m.snippet}"`)] : []),
    ),
    h('div', abs(0, H - 150, { width: W, justifyContent: 'center' }),
      h('div', { fontSize: 38, fontWeight: 700, color: INK }, 'Find me on KChat'),
    ),
  );
  return renderTree(tree, W, H, previewWidth);
}
