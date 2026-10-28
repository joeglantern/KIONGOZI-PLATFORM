// Stories: 24-hour posts shown in the rail at the top of the feed.
// Mounted at /api/v1/social, so paths here are /stories/...
import { Router, Request, Response } from 'express';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import ModerationService from '../services/ModerationService';
import { optimizeStory } from '../services/ImageOptimizer';

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

/** Stories the viewer may see, grouped by author, each story flagged seen/unseen. */
async function buildGroups(viewerId: string, authorIds: string[], following: Set<string>) {
  if (!authorIds.length) return [];
  const now = new Date().toISOString();
  const [{ data: stories }, { data: profiles }] = await Promise.all([
    db.from('stories').select(STORY_FIELDS).in('user_id', authorIds).gt('expires_at', now).order('created_at', { ascending: true }),
    db.from('profiles').select(PROFILE_FIELDS).in('id', authorIds),
  ]);
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
  const visible = (stories || []).filter((s: any) => {
    if (s.user_id === viewerId) return true;
    const p: any = profileById.get(s.user_id);
    if (!p) return false;
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

  const groups = new Map<string, any>();
  for (const s of visible) {
    const g = groups.get(s.user_id) || { user: profileById.get(s.user_id), stories: [] as any[] };
    const own = s.user_id === viewerId;
    const poll = pollIds.includes(s.id) ? { counts: pollCounts.get(s.id) || [0, 0], mine: myVotes.has(s.id) ? myVotes.get(s.id) : null } : undefined;
    g.stories.push({ ...s, poll, seen: own || seen.has(s.id), my_reaction: seen.get(s.id) ?? null, ...(own ? {} : { view_count: undefined }) });
    groups.set(s.user_id, g);
  }
  return [...groups.values()].map(g => {
    const { is_private, ...user } = g.user || {};
    return {
      user,
      stories: g.stories,
      has_unseen: g.stories.some((s: any) => !s.seen),
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

function cleanOverlays(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  const polls = raw.filter((o: any) => o?.type === 'poll').slice(0, 1); // at most one poll
  const rest = raw.filter((o: any) => o?.type !== 'poll');
  const safeUrl = (u: any) => {
    if (typeof u !== 'string') return undefined;
    const t = u.trim().slice(0, 300);
    return /^https?:\/\/[^\s]+$/i.test(t) ? t : undefined;
  };
  return [...rest, ...polls].slice(0, 20).map((o: any) => ({
    type: o?.type === 'text' ? 'text' : o?.type === 'poll' ? 'poll' : o?.type === 'link' && safeUrl(o?.url) ? 'link' : 'sticker',
    url: o?.type === 'link' ? safeUrl(o?.url) : undefined,
    options: o?.type === 'poll' && Array.isArray(o.options)
      ? o.options.slice(0, 2).map((x: any) => String(x ?? '').slice(0, 40))
      : undefined,
    key: typeof o?.key === 'string' ? o.key.slice(0, 40) : undefined,
    text: typeof o?.text === 'string' ? o.text.slice(0, 200) : undefined,
    color: typeof o?.color === 'string' ? o.color.slice(0, 20) : undefined,
    bg: typeof o?.bg === 'string' ? o.bg.slice(0, 20) : undefined,
    x: clampNum(o?.x, 0, 1, 0.5),
    y: clampNum(o?.y, 0, 1, 0.5),
    scale: clampNum(o?.scale, 0.2, 5, 1),
    rotation: clampNum(o?.rotation, -360, 360, 0),
  }));
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
    const text_content = typeof b.text_content === 'string' ? b.text_content.trim().slice(0, 700) : null;
    const caption = typeof b.caption === 'string' ? b.caption.trim().slice(0, 200) : null;
    if (media_type === 'text' && !text_content) {
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
    const overlays = cleanOverlays(b.overlays);
    const allText = [text_content, caption, ...overlays.map(o => o.text)].filter(Boolean).join('\n');
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
      audience: b.audience === 'followers' ? 'followers' : 'everyone',
    }).select(STORY_FIELDS).single();
    if (error || !data) { console.error('Create story error:', error); res.status(500).json({ success: false, error: 'Failed to post story' }); return; }
    if (media_type === 'image') setImmediate(() => { optimizeStory((data as any).id).catch(() => {}); });
    res.status(201).json({ success: true, data: { ...data, seen: true, my_reaction: null } });
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

// GET /stories/:id/viewers — owner only; people who reacted first, then newest
router.get('/stories/:id/viewers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { data: story } = await db.from('stories').select('user_id, view_count').eq('id', id).maybeSingle();
    if (!story || story.user_id !== userId) { res.status(404).json({ success: false, error: 'Story not found' }); return; }
    const { data } = await db.from('story_views')
      .select('reaction, viewed_at, profiles:viewer_id(id, username, full_name, avatar_url, is_verified)')
      .eq('story_id', id).order('viewed_at', { ascending: false }).limit(500);
    const rows = (data || []).sort((a: any, b: any) => Number(!!b.reaction) - Number(!!a.reaction));
    res.json({ success: true, data: { count: story.view_count, viewers: rows } });
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
