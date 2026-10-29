// Stories: 24-hour posts shown in the rail at the top of the feed.
// Mounted at /api/v1/social, so paths here are /stories/...
import { Router, Request, Response } from 'express';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import ModerationService from '../services/ModerationService';
import { optimizeStory } from '../services/ImageOptimizer';
import NotificationService from '../services/NotificationService';

const router = Router();

const PROFILE_FIELDS = 'id, username, full_name, avatar_url, is_verified, is_private';
const STORY_FIELDS = 'id, user_id, media_type, media_url, thumbnail_url, width, height, duration_ms, text_content, bg, text_color, font, text_style, overlays, caption, audience, view_count, created_at, expires_at, placeholder';
const MEDIA_HOST = (process.env.SUPABASE_URL || '').replace(/\/$/, '');

async function blockedIds(userId: string): Promise<Set<string>> {
  const { data } = await db.from('blocks').select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const out = new Set<string>();
  for (const b of data || []) out.add(b.blocker_id === userId ? b.blocked_id : b.blocker_id);
  return out;
}

async function followingIds(userId: string): Promise<Set<string>> {
  const { data } = await db.from('follows').select('following_id').eq('follower_id', userId);
  return new Set((data || []).map((f: any) => f.following_id));
}

/** Authors (of `authorIds`) who have put the viewer on their close friends list. */
async function closeFriendOf(viewerId: string, authorIds: string[]): Promise<Set<string>> {
  if (!authorIds.length) return new Set();
  const { data } = await db.from('close_friends').select('owner_id').eq('friend_id', viewerId).in('owner_id', authorIds);
  return new Set((data || []).map((r: any) => r.owner_id));
}

const hasOverlay = (s: any, type: string) => (s.overlays || []).some((o: any) => o.type === type);

/** Stories the viewer may see, grouped by author, each story flagged seen/unseen. */
async function buildGroups(viewerId: string, authorIds: string[], following: Set<string>) {
  if (!authorIds.length) return [];
  const now = new Date().toISOString();
  const [{ data: stories }, { data: profiles }, closeOf] = await Promise.all([
    db.from('stories').select(STORY_FIELDS).in('user_id', authorIds).gt('expires_at', now).order('created_at', { ascending: true }),
    db.from('profiles').select(PROFILE_FIELDS).in('id', authorIds),
    closeFriendOf(viewerId, authorIds),
  ]);
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
  const visible = (stories || []).filter((s: any) => {
    if (s.user_id === viewerId) return true;
    const p: any = profileById.get(s.user_id);
    if (!p) return false;
    if (s.audience === 'close_friends') return closeOf.has(s.user_id);
    if ((p.is_private || s.audience === 'followers') && !following.has(s.user_id)) return false;
    return true;
  });
  if (!visible.length) return [];

  const { data: views } = await db.from('story_views').select('story_id, reaction')
    .eq('viewer_id', viewerId).in('story_id', visible.map((s: any) => s.id));
  const seen = new Map((views || []).map((v: any) => [v.story_id, v.reaction]));

  // Poll results for stories that carry a poll sticker
  const pollIds = visible.filter((s: any) => (s.overlays || []).some((o: any) => o.type === 'poll')).map((s: any) => s.id);
  const pollCounts = new Map<string, [number, number]>();
  const myVotes = new Map<string, number>();
  if (pollIds.length) {
    const { data: votes } = await db.from('story_poll_votes').select('story_id, voter_id, option').in('story_id', pollIds);
    for (const v of votes || []) {
      const c = pollCounts.get(v.story_id) || [0, 0];
      c[v.option] += 1;
      pollCounts.set(v.story_id, c);
      if (v.voter_id === viewerId) myVotes.set(v.story_id, v.option);
    }
  }

  // Emoji slider: average + count, and where the viewer let go
  const sliderIds = visible.filter((s: any) => hasOverlay(s, 'slider')).map((s: any) => s.id);
  const sliders = new Map<string, { sum: number; count: number; mine: number | null }>();
  if (sliderIds.length) {
    const { data: votes } = await db.from('story_slider_votes').select('story_id, voter_id, value').in('story_id', sliderIds);
    for (const v of votes || []) {
      const c = sliders.get(v.story_id) || { sum: 0, count: 0, mine: null };
      c.sum += Number(v.value); c.count += 1;
      if (v.voter_id === viewerId) c.mine = Number(v.value);
      sliders.set(v.story_id, c);
    }
  }
  // Countdown: has the viewer asked to be reminded
  const countdownIds = visible.filter((s: any) => hasOverlay(s, 'countdown') && s.user_id !== viewerId).map((s: any) => s.id);
  const reminded = new Set<string>();
  if (countdownIds.length) {
    const { data: rows } = await db.from('story_countdown_reminders').select('story_id').eq('user_id', viewerId).in('story_id', countdownIds);
    for (const r of rows || []) reminded.add(r.story_id);
  }

  const groups = new Map<string, any>();
  for (const s of visible) {
    const g = groups.get(s.user_id) || { user: profileById.get(s.user_id), stories: [] as any[] };
    const own = s.user_id === viewerId;
    const poll = pollIds.includes(s.id) ? { counts: pollCounts.get(s.id) || [0, 0], mine: myVotes.has(s.id) ? myVotes.get(s.id) : null } : undefined;
    const sl = sliders.get(s.id);
    const slider = sliderIds.includes(s.id) ? { avg: sl && sl.count ? sl.sum / sl.count : null, count: sl?.count ?? 0, mine: sl?.mine ?? null } : undefined;
    const countdown = hasOverlay(s, 'countdown') ? { reminded: reminded.has(s.id) } : undefined;
    g.stories.push({ ...s, poll, slider, countdown, seen: own || seen.has(s.id), my_reaction: seen.get(s.id) ?? null, ...(own ? {} : { view_count: undefined }) });
    groups.set(s.user_id, g);
  }
  return [...groups.values()].map(g => {
    const { is_private, ...user } = g.user || {};
    return {
      user,
      stories: g.stories,
      has_unseen: g.stories.some((s: any) => !s.seen),
      // Green ring in the rail (IG style) while a close-friends story is up
      close_friends: g.stories.some((s: any) => s.audience === 'close_friends'),
      latest_at: g.stories[g.stories.length - 1].created_at,
    };
  });
}

// GET /stories/feed — the rail: you first, then unseen (newest first), then seen
router.get('/stories/feed', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [following, blocked, { data: verified }] = await Promise.all([
      followingIds(userId),
      blockedIds(userId),
      // Verified accounts' public stories show for everyone, so the rail is never empty
      db.from('profiles').select('id').eq('is_verified', true).eq('is_private', false).limit(50),
    ]);
    const authors = new Set<string>([userId, ...following, ...(verified || []).map((v: any) => v.id)]);
    blocked.forEach(id => authors.delete(id));

    const groups = await buildGroups(userId, [...authors], following);
    const mine = groups.filter(g => g.user?.id === userId);
    const others = groups.filter(g => g.user?.id !== userId)
      .sort((a, b) => (Number(b.has_unseen) - Number(a.has_unseen)) || b.latest_at.localeCompare(a.latest_at));
    res.json({ success: true, data: [...mine, ...others] });
  } catch (err) {
    console.error('Stories feed error:', err);
    res.status(500).json({ success: false, error: 'Failed to load stories' });
  }
});

// GET /stories/user/:userId — one person's active stories (profile ring)
router.get('/stories/user/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { userId: authorId } = req.params;
    if ((await blockedIds(userId)).has(authorId)) { res.json({ success: true, data: null }); return; }
    const following = await followingIds(userId);
    const [group] = await buildGroups(userId, [authorId], following);
    res.json({ success: true, data: group || null });
  } catch (err) {
    console.error('User stories error:', err);
    res.status(500).json({ success: false, error: 'Failed to load stories' });
  }
});

const clampNum = (v: any, min: number, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

// Interactive stickers: at most one of each per story
const ONE_EACH = ['poll', 'question', 'slider', 'countdown', 'post'];
const KINDS = ['sticker', 'text', 'link', 'mention', ...ONE_EACH];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanOverlays(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  const once = new Set<string>();
  let mentions = 0;
  const kept = raw.filter((o: any) => {
    const t = KINDS.includes(o?.type) ? o.type : 'sticker';
    if (ONE_EACH.includes(t)) { if (once.has(t)) return false; once.add(t); }
    if (t === 'mention' && ++mentions > 10) return false;
    return true;
  });
  // Interactive ones go last so the 20 cap never drops them
  const rest = kept.filter((o: any) => !ONE_EACH.includes(o?.type));
  const interactive = kept.filter((o: any) => ONE_EACH.includes(o?.type));
  const safeUrl = (u: any) => {
    if (typeof u !== 'string') return undefined;
    const t = u.trim().slice(0, 300);
    return /^https?:\/\/[^\s]+$/i.test(t) ? t : undefined;
  };
  const str = (v: any, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const iso = (v: any) => (typeof v === 'string' && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : undefined);
  return [...rest, ...interactive].slice(0, 20).map((o: any) => {
    let type = KINDS.includes(o?.type) ? o.type : 'sticker';
    if (type === 'link' && !safeUrl(o?.url)) type = 'sticker';
    const ends_at = type === 'countdown' ? iso(o?.ends_at) : undefined;
    return {
      type,
      url: type === 'link' ? safeUrl(o?.url) : undefined,
      options: type === 'poll' && Array.isArray(o.options)
        ? o.options.slice(0, 2).map((x: any) => String(x ?? '').slice(0, 40))
        : undefined,
      key: str(o?.key, 40),
      text: str(o?.text, 200),
      color: str(o?.color, 20),
      bg: str(o?.bg, 20),
      user_id: type === 'mention' && UUID.test(String(o?.user_id || '')) ? o.user_id : undefined,
      emoji: type === 'slider' ? (str(o?.emoji, 16) || '😍') : undefined,
      ends_at,
      post_id: type === 'post' && UUID.test(String(o?.post_id || '')) ? o.post_id : undefined,
      x: clampNum(o?.x, 0, 1, 0.5),
      y: clampNum(o?.y, 0, 1, 0.5),
      scale: clampNum(o?.scale, 0.2, 5, 1),
      rotation: clampNum(o?.rotation, -360, 360, 0),
    };
  }).filter((o: any) =>
    (o.type !== 'mention' || o.user_id) && (o.type !== 'post' || o.post_id) && (o.type !== 'countdown' || o.ends_at));
}

/** Mentions get the real username from the database; unknown or blocked people are dropped. */
async function resolveMentions(overlays: any[], userId: string) {
  const ids = [...new Set(overlays.filter(o => o.type === 'mention').map(o => o.user_id))];
  if (!ids.length) return overlays;
  const [{ data: people }, blocked] = await Promise.all([
    db.from('profiles').select('id, username').in('id', ids),
    blockedIds(userId),
  ]);
  const byId = new Map((people || []).filter((p: any) => !blocked.has(p.id)).map((p: any) => [p.id, p.username]));
  return overlays
    .filter(o => o.type !== 'mention' || byId.has(o.user_id))
    .map(o => (o.type === 'mention' ? { ...o, text: byId.get(o.user_id) } : o));
}

/** Post sticker: the card is a server-made snapshot of a post you may share (never trusted from the app). */
async function resolvePost(overlays: any[], userId: string) {
  const o = overlays.find(x => x.type === 'post');
  if (!o) return overlays;
  const { data: p } = await db.from('posts')
    .select('id, user_id, content, visibility, profiles:user_id (username, full_name, avatar_url, is_verified, is_private), post_media (url, media_type, thumbnail_url, order_index)')
    .eq('id', o.post_id).maybeSingle();
  const author: any = (p as any)?.profiles;
  const ok = p && (p.user_id === userId || (p.visibility === 'public' && !author?.is_private));
  if (!ok) return overlays.filter(x => x !== o);
  const media: any = [...((p as any).post_media || [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];
  const post = {
    id: p.id,
    username: author?.username || '',
    full_name: author?.full_name || null,
    avatar_url: author?.avatar_url || null,
    is_verified: !!author?.is_verified,
    text: String(p.content || '').slice(0, 280),
    image: media ? (media.media_type === 'video' ? media.thumbnail_url : media.url) || null : null,
  };
  return overlays.map(x => (x === o ? { ...x, post } : x));
}

/** Tell each mentioned person (who can see the story) that they were tagged. */
async function notifyMentions(story: any, authorId: string) {
  const ids: string[] = [...new Set<string>((story.overlays || []).filter((o: any) => o.type === 'mention').map((o: any) => o.user_id))]
    .filter(id => id !== authorId);
  if (!ids.length) return;
  let allowed = ids;
  if (story.audience === 'close_friends') {
    const { data } = await db.from('close_friends').select('friend_id').eq('owner_id', authorId).in('friend_id', ids);
    const ok = new Set((data || []).map((r: any) => r.friend_id));
    allowed = ids.filter(id => ok.has(id));
  } else if (story.audience === 'followers') {
    const { data } = await db.from('follows').select('follower_id').eq('following_id', authorId).in('follower_id', ids);
    const ok = new Set((data || []).map((r: any) => r.follower_id));
    allowed = ids.filter(id => ok.has(id));
  }
  if (!allowed.length) return;
  const { data: me } = await db.from('profiles').select('full_name, username, avatar_url').eq('id', authorId).maybeSingle();
  for (const uid of allowed) {
    await NotificationService.notify({
      userId: uid,
      type: 'mention',
      title: 'You were mentioned',
      message: `${me?.full_name || me?.username || 'Someone'} mentioned you in their story`,
      data: { story_id: story.id, from_user_id: authorId, from_username: me?.username, from_avatar_url: me?.avatar_url },
    });
  }
}

// POST /stories — create a story (media is already uploaded to storage by the app)
router.post('/stories', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const b = req.body || {};
    const media_type = b.media_type;
    if (!['image', 'video', 'text'].includes(media_type)) {
      res.status(400).json({ success: false, error: 'media_type must be image, video or text' }); return;
    }
    let text_content = typeof b.text_content === 'string' ? b.text_content.trim().slice(0, 700) : null;
    const caption = typeof b.caption === 'string' ? b.caption.trim().slice(0, 200) : null;
    let overlays = cleanOverlays(b.overlays);
    // A text story may be stickers only (e.g. a shared post card); it stores an empty text
    if (media_type === 'text' && !text_content && overlays.length) text_content = '';
    if (media_type === 'text' && text_content === null) {
      res.status(400).json({ success: false, error: 'Write something for a text story' }); return;
    }
    if (media_type !== 'text') {
      if (typeof b.media_url !== 'string' || !MEDIA_HOST || !b.media_url.startsWith(MEDIA_HOST)) {
        res.status(400).json({ success: false, error: 'Upload the photo or video first' }); return;
      }
    }
    if (media_type === 'image') {
      const img = await ModerationService.checkImages([b.media_url]);
      if (img.flagged) { res.status(422).json({ success: false, error: img.reason }); return; }
    }
    const wantedPost = overlays.some(o => o.type === 'post');
    overlays = await resolvePost(await resolveMentions(overlays, userId), userId);
    if (wantedPost && !overlays.some(o => o.type === 'post')) {
      res.status(403).json({ success: false, error: "This post can't be shared to a story" }); return;
    }
    if (media_type === 'text' && !text_content && !overlays.length) {
      res.status(400).json({ success: false, error: 'Write something for a text story' }); return;
    }
    // Usernames and the shared post were already published, so only the author's own words are checked
    const allText = [text_content, caption, ...overlays.filter(o => o.type !== 'mention' && o.type !== 'post').map(o => o.text)].filter(Boolean).join('\n');
    if (allText) {
      const moderation = await ModerationService.checkText(allText);
      if (moderation.flagged) { res.status(422).json({ success: false, error: moderation.reason }); return; }
    }

    const { data, error } = await db.from('stories').insert({
      user_id: userId,
      media_type,
      media_url: media_type === 'text' ? null : b.media_url,
      storage_path: media_type === 'text' ? null : (typeof b.storage_path === 'string' ? b.storage_path : null),
      thumbnail_url: typeof b.thumbnail_url === 'string' && b.thumbnail_url.startsWith(MEDIA_HOST) ? b.thumbnail_url : null,
      width: b.width ? Math.round(clampNum(b.width, 1, 10000, 0)) : null,
      height: b.height ? Math.round(clampNum(b.height, 1, 10000, 0)) : null,
      duration_ms: b.duration_ms ? Math.round(clampNum(b.duration_ms, 500, 60000, 5000)) : null,
      text_content,
      bg: typeof b.bg === 'string' ? b.bg.slice(0, 40) : null,
      text_color: typeof b.text_color === 'string' ? b.text_color.slice(0, 20) : null,
      font: typeof b.font === 'string' ? b.font.slice(0, 40) : null,
      text_style: ['plain', 'pill', 'outline'].includes(b.text_style) ? b.text_style : null,
      overlays,
      caption,
      audience: ['followers', 'close_friends'].includes(b.audience) ? b.audience : 'everyone',
    }).select(STORY_FIELDS).single();
    if (error || !data) { console.error('Create story error:', error); res.status(500).json({ success: false, error: 'Failed to post story' }); return; }
    if (media_type === 'image') setImmediate(() => { optimizeStory((data as any).id).catch(() => {}); });
    setImmediate(() => { notifyMentions(data, userId).catch(e => console.error('Story mention notify error:', e)); });
    const extras: any = {};
    if (overlays.some(o => o.type === 'slider')) extras.slider = { avg: null, count: 0, mine: null };
    if (overlays.some(o => o.type === 'countdown')) extras.countdown = { reminded: false };
    res.status(201).json({ success: true, data: { ...data, ...extras, seen: true, my_reaction: null } });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ success: false, error: 'Failed to post story' });
  }
});

// POST /stories/:id/view — mark seen, optionally with a reaction emoji
router.post('/stories/:id/view', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const reaction = typeof req.body?.reaction === 'string' ? req.body.reaction.slice(0, 16) : undefined;
    const { data: story } = await db.from('stories').select('user_id, expires_at').eq('id', id).maybeSingle();
    if (!story) { res.status(404).json({ success: false, error: 'Story not found' }); return; }
    if (story.user_id === userId) { res.json({ success: true }); return; }

    const row: any = { story_id: id, viewer_id: userId };
    if (reaction !== undefined) row.reaction = reaction || null;
    // Insert once (counts the view); later calls only update the reaction
    const { error } = await db.from('story_views').insert(row);
    if (error && reaction !== undefined) {
      await db.from('story_views').update({ reaction: row.reaction }).eq('story_id', id).eq('viewer_id', userId);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Story view error:', err);
    res.status(500).json({ success: false, error: 'Failed to record view' });
  }
});

// POST /stories/:id/vote — vote on the story's poll (0 or 1); returns fresh counts
router.post('/stories/:id/vote', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const option = Number(req.body?.option);
    if (option !== 0 && option !== 1) { res.status(400).json({ success: false, error: 'option must be 0 or 1' }); return; }
    const { data: story } = await db.from('stories').select('overlays, expires_at').eq('id', id).maybeSingle();
    if (!story || !(story.overlays || []).some((o: any) => o.type === 'poll')) {
      res.status(404).json({ success: false, error: 'Poll not found' }); return;
    }
    await db.from('story_poll_votes').upsert({ story_id: id, voter_id: userId, option }, { onConflict: 'story_id,voter_id' });
    const { data: votes } = await db.from('story_poll_votes').select('option').eq('story_id', id);
    const counts = [0, 0];
    for (const v of votes || []) counts[v.option] += 1;
    res.json({ success: true, data: { counts, mine: option } });
  } catch (err) {
    console.error('Story vote error:', err);
    res.status(500).json({ success: false, error: 'Failed to vote' });
  }
});

/** A live story the viewer is allowed to see, or null. */
async function visibleStory(id: string, viewerId: string, fields = 'id, user_id, overlays, audience, expires_at') {
  const { data: s } = await db.from('stories').select(fields).eq('id', id).maybeSingle();
  const story: any = s;
  if (!story || new Date(story.expires_at).getTime() < Date.now()) return null;
  if (story.user_id === viewerId) return story;
  if ((await blockedIds(viewerId)).has(story.user_id)) return null;
  if (story.audience === 'close_friends') {
    const { data } = await db.from('close_friends').select('owner_id').eq('owner_id', story.user_id).eq('friend_id', viewerId).maybeSingle();
    return data ? story : null;
  }
  const { data: author } = await db.from('profiles').select('is_private').eq('id', story.user_id).maybeSingle();
  if (story.audience === 'followers' || author?.is_private) {
    const { data: f } = await db.from('follows').select('follower_id').eq('follower_id', viewerId).eq('following_id', story.user_id).maybeSingle();
    if (!f) return null;
  }
  return story;
}

// POST /stories/:id/answer — answer the question box; only the author sees answers
router.post('/stories/:id/answer', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim().slice(0, 300) : '';
    if (!answer) { res.status(400).json({ success: false, error: 'Write an answer first' }); return; }
    const story = await visibleStory(req.params.id, userId);
    if (!story || !hasOverlay(story, 'question')) { res.status(404).json({ success: false, error: 'Question not found' }); return; }
    if (story.user_id === userId) { res.status(400).json({ success: false, error: "You can't answer your own question" }); return; }
    const { count } = await db.from('story_question_answers').select('id', { count: 'exact', head: true })
      .eq('story_id', story.id).eq('responder_id', userId);
    if ((count ?? 0) >= 10) { res.status(429).json({ success: false, error: 'That is plenty of answers for one story' }); return; }
    const moderation = await ModerationService.checkText(answer);
    if (moderation.flagged) { res.status(422).json({ success: false, error: moderation.reason }); return; }
    const { error } = await db.from('story_question_answers').insert({ story_id: story.id, responder_id: userId, answer });
    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Story answer error:', err);
    res.status(500).json({ success: false, error: 'Failed to send answer' });
  }
});

// POST /stories/:id/slide — emoji slider value 0..1 (one per person); returns the new average
router.post('/stories/:id/slide', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const value = Number(req.body?.value);
    if (!Number.isFinite(value) || value < 0 || value > 1) { res.status(400).json({ success: false, error: 'value must be 0 to 1' }); return; }
    const story = await visibleStory(req.params.id, userId);
    if (!story || !hasOverlay(story, 'slider')) { res.status(404).json({ success: false, error: 'Slider not found' }); return; }
    if (story.user_id !== userId) {
      await db.from('story_slider_votes').upsert({ story_id: story.id, voter_id: userId, value: Math.round(value * 1000) / 1000 }, { onConflict: 'story_id,voter_id' });
    }
    const { data: votes } = await db.from('story_slider_votes').select('value').eq('story_id', story.id);
    const vals = (votes || []).map((v: any) => Number(v.value));
    res.json({ success: true, data: { avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, count: vals.length, mine: story.user_id === userId ? null : value } });
  } catch (err) {
    console.error('Story slide error:', err);
    res.status(500).json({ success: false, error: 'Failed to save' });
  }
});

// POST /stories/:id/remind — { on: boolean } countdown "Remind me" (push when it ends: jobs/storyCountdownReminders)
router.post('/stories/:id/remind', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const on = req.body?.on !== false;
    const story = await visibleStory(req.params.id, userId);
    const c = (story?.overlays || []).find((o: any) => o.type === 'countdown');
    if (!story || !c) { res.status(404).json({ success: false, error: 'Countdown not found' }); return; }
    if (!on) {
      await db.from('story_countdown_reminders').delete().eq('story_id', story.id).eq('user_id', userId);
      res.json({ success: true, data: { reminded: false } }); return;
    }
    if (new Date(c.ends_at).getTime() <= Date.now()) { res.status(400).json({ success: false, error: 'This countdown has ended' }); return; }
    await db.from('story_countdown_reminders').upsert({
      story_id: story.id, user_id: userId, author_id: story.user_id, title: String(c.text || '').slice(0, 80) || null, ends_at: c.ends_at, notified_at: null,
    }, { onConflict: 'story_id,user_id' });
    res.json({ success: true, data: { reminded: true } });
  } catch (err) {
    console.error('Story remind error:', err);
    res.status(500).json({ success: false, error: 'Failed to save reminder' });
  }
});

// GET /stories/people?q= — mention search: people you follow first
router.get('/stories/people', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    // Only characters usernames/names use, so the value is safe inside the .or() filter
    const q = String(req.query.q || '').replace(/^@/, '').replace(/[^\p{L}\p{N}_. -]/gu, '').trim().slice(0, 30);
    const [following, blocked] = await Promise.all([followingIds(userId), blockedIds(userId)]);
    let rows: any[] = [];
    if (q) {
      const { data } = await db.from('profiles').select('id, username, full_name, avatar_url, is_verified')
        .or(`username.ilike.${q}%,full_name.ilike.%${q}%`).limit(30);
      rows = data || [];
    } else if (following.size) {
      const { data } = await db.from('profiles').select('id, username, full_name, avatar_url, is_verified')
        .in('id', [...following].slice(0, 200)).limit(12);
      rows = data || [];
    }
    rows = rows.filter(p => p.id !== userId && !blocked.has(p.id) && p.username)
      .sort((a, b) => Number(following.has(b.id)) - Number(following.has(a.id)))
      .slice(0, 12);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Story people search error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /stories/close-friends — your close friends list
router.get('/stories/close-friends', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data } = await db.from('close_friends')
      .select('created_at, profiles:friend_id(id, username, full_name, avatar_url, is_verified)')
      .eq('owner_id', req.user!.id).order('created_at', { ascending: false }).limit(1000);
    res.json({ success: true, data: (data || []).map((r: any) => r.profiles).filter(Boolean) });
  } catch (err) {
    console.error('Close friends error:', err);
    res.status(500).json({ success: false, error: 'Failed to load close friends' });
  }
});

// POST /stories/close-friends/:userId — add someone (they are not told, like IG)
router.post('/stories/close-friends/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { userId: friendId } = req.params;
    if (!UUID.test(friendId) || friendId === userId) { res.status(400).json({ success: false, error: 'Pick someone else' }); return; }
    if ((await blockedIds(userId)).has(friendId)) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const { error } = await db.from('close_friends').upsert({ owner_id: userId, friend_id: friendId }, { onConflict: 'owner_id,friend_id', ignoreDuplicates: true });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Add close friend error:', err);
    res.status(500).json({ success: false, error: 'Failed to add' });
  }
});

// DELETE /stories/close-friends/:userId
router.delete('/stories/close-friends/:userId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await db.from('close_friends').delete().eq('owner_id', req.user!.id).eq('friend_id', req.params.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove close friend error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove' });
  }
});

// GET /stories/:id/viewers — owner only; people who reacted first, then newest
router.get('/stories/:id/viewers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { data: story } = await db.from('stories').select('user_id, view_count, overlays').eq('id', id).maybeSingle();
    if (!story || story.user_id !== userId) { res.status(404).json({ success: false, error: 'Story not found' }); return; }
    const P = 'profiles:PK(id, username, full_name, avatar_url, is_verified)';
    const [{ data }, answers, votes] = await Promise.all([
      db.from('story_views')
        .select(`reaction, viewed_at, ${P.replace('PK', 'viewer_id')}`)
        .eq('story_id', id).order('viewed_at', { ascending: false }).limit(500),
      hasOverlay(story, 'question')
        ? db.from('story_question_answers').select(`id, answer, created_at, ${P.replace('PK', 'responder_id')}`)
          .eq('story_id', id).order('created_at', { ascending: false }).limit(200)
        : Promise.resolve({ data: null }),
      hasOverlay(story, 'slider')
        ? db.from('story_slider_votes').select('voter_id, value').eq('story_id', id)
        : Promise.resolve({ data: null }),
    ]);
    // Each viewer row carries where they left the slider, if they did
    const slideBy = new Map(((votes as any).data || []).map((v: any) => [v.voter_id, Number(v.value)]));
    const rows = (data || [])
      .map((r: any) => (slideBy.has(r.profiles?.id) ? { ...r, slide: slideBy.get(r.profiles?.id) } : r))
      .sort((a: any, b: any) => Number(!!b.reaction || b.slide !== undefined) - Number(!!a.reaction || a.slide !== undefined));
    const vals = [...slideBy.values()] as number[];
    res.json({
      success: true,
      data: {
        count: story.view_count,
        viewers: rows,
        responses: (answers as any).data ?? undefined,
        slider: hasOverlay(story, 'slider') ? { avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, count: vals.length } : undefined,
      },
    });
  } catch (err) {
    console.error('Story viewers error:', err);
    res.status(500).json({ success: false, error: 'Failed to load viewers' });
  }
});

// DELETE /stories/:id — owner only
router.delete('/stories/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { data: story } = await db.from('stories').select('user_id, storage_path').eq('id', id).maybeSingle();
    if (!story || story.user_id !== userId) { res.status(404).json({ success: false, error: 'Story not found' }); return; }
    await db.from('stories').delete().eq('id', id);
    if (story.storage_path) await db.storage.from('social-media').remove([story.storage_path]).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error('Delete story error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete story' });
  }
});

// GET /stories/:id/share — public link preview page (opens the app, else the store)
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
router.get('/stories/:id/share', async (req: Request, res: Response): Promise<void> => {
  const store = 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile';
  try {
    const { id } = req.params;
    const { data: s } = await db.from('stories')
      .select('id, media_type, media_url, thumbnail_url, text_content, audience, expires_at, profiles:user_id(username, full_name, is_private)')
      .eq('id', id).maybeSingle();
    const p: any = (s as any)?.profiles;
    const live = s && new Date((s as any).expires_at).getTime() > Date.now() && (s as any).audience === 'everyone' && !p?.is_private;
    const name = live ? (p?.full_name || p?.username || 'Someone') : 'KChat';
    const title = live ? `${name}'s story on KChat` : 'KChat — Kiongozi Chat';
    const desc = live && (s as any).text_content ? String((s as any).text_content).slice(0, 140) : 'Stories, posts and conversations from young Kenyans. Open in KChat.';
    const img = live ? ((s as any).media_type === 'image' ? (s as any).media_url : (s as any).thumbnail_url) : null;
    const deep = `kiongozi://stories/${encodeURIComponent(id)}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:-apple-system,system-ui,sans-serif}
main{max-width:360px;padding:32px 24px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{color:#a1a1a6;margin:0 0 24px;line-height:1.4}
a{display:block;padding:14px;border-radius:26px;text-decoration:none;font-weight:700;margin-top:10px}.p{background:#5CB85C;color:#000}.s{border:1px solid #333;color:#fff}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(desc)}</p><a class="p" href="${deep}">Open in KChat</a><a class="s" href="${store}">Get KChat on Google Play</a></main>
<script>setTimeout(function(){location.href=${JSON.stringify(deep)}},300)</script></body></html>`);
  } catch {
    res.redirect(store);
  }
});

export default router;
