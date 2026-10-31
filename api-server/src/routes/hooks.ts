// Real hooks: post insights for the author, share-tap counting, milestone share cards.
// Mounted at /api/v1/social. Every number here is something we actually count; anything we
// can't count (yet) is left out, never estimated.
import { Router, Request, Response } from 'express';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import UploadService from '../services/UploadService';
import { renderMilestoneCard, MilestoneKind } from '../services/MilestoneService';

const router = Router();

const nairobiDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });

// GET /posts/:id/insights — the author's numbers for one post
router.get('/posts/:id/insights', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { data: post } = await db.from('posts')
      .select('id, user_id, content, like_count, comment_count, view_count, created_at, post_media (media_type)')
      .eq('id', id).maybeSingle();
    const p: any = post;
    if (!p) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    if (p.user_id !== req.user!.id) { res.status(403).json({ success: false, error: 'Only the author can see insights' }); return; }

    const since = new Date(Date.now() - 6 * 864e5);
    const [reposts, quotes, stats] = await Promise.all([
      db.from('posts').select('id', { count: 'exact', head: true }).eq('repost_of_id', id),
      db.from('posts').select('id', { count: 'exact', head: true }).eq('repost_of_id', id).neq('content', ''),
      db.from('post_daily_stats').select('day, views, shares').eq('post_id', id),
    ]);
    const hasVideo = (p.post_media || []).some((m: any) => m.media_type === 'video');

    // Shares and the 7 day row only exist once the hooks migration has run
    let shares: number | null = null;
    let days: { day: string; views: number }[] | null = null;
    if (!stats.error) {
      const rows = stats.data || [];
      shares = rows.reduce((n: number, r: any) => n + (r.shares || 0), 0);
      if (hasVideo && rows.some((r: any) => r.views > 0)) {
        const byDay = new Map(rows.map((r: any) => [String(r.day), r.views || 0]));
        days = Array.from({ length: 7 }, (_, i) => {
          const d = nairobiDay(new Date(since.getTime() + i * 864e5));
          return { day: d, views: Number(byDay.get(d) || 0) };
        });
      }
    }

    res.json({
      success: true,
      data: {
        post_id: id,
        content: p.content || '',
        created_at: p.created_at,
        // Views are counted on video plays (2 seconds in); a text or photo post has none to show
        views: hasVideo ? p.view_count || 0 : null,
        likes: p.like_count || 0,
        replies: p.comment_count || 0,
        reposts: Math.max(0, (reposts.count || 0) - (quotes.count || 0)),
        quotes: quotes.count || 0,
        shares,
        days,
      },
    });
  } catch (e) { console.error('post insights', e); res.status(500).json({ success: false, error: 'Could not load insights' }); }
});

// POST /posts/:id/event { kind: 'share' } — a share tap, counted per day (fire and forget from the app)
const recentShares = new Map<string, number>();
router.post('/posts/:id/event', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.body?.kind !== 'share') { res.status(400).json({ success: false, error: 'Unknown event' }); return; }
    // One share per person per post per 10 minutes, so a double tap isn't two
    const key = `${req.params.id}:${req.user!.id}`, now = Date.now();
    if ((recentShares.get(key) ?? 0) > now - 10 * 60e3) { res.json({ success: true, counted: false }); return; }
    recentShares.set(key, now);
    if (recentShares.size > 20000) for (const [k, t] of recentShares) if (t < now - 10 * 60e3) recentShares.delete(k);
    const { error } = await db.rpc('bump_post_stat', { p_post: req.params.id, p_kind: 'share' });
    res.json({ success: true, counted: !error });
  } catch { res.json({ success: true, counted: false }); }
});

// POST /milestones/card { kind, value, post_id?, preview? } — a 9:16 card for a milestone you really reached
router.post('/milestones/card', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const kind = String(req.body?.kind || '') as MilestoneKind;
    const value = Number(req.body?.value) || 0;
    const postId = req.body?.post_id ? String(req.body.post_id) : null;
    if (!['first_post', 'followers', 'likes', 'views'].includes(kind)) { res.status(400).json({ success: false, error: 'Unknown milestone' }); return; }
    const key = postId ? `${kind}:${value}:${postId}` : kind === 'first_post' ? 'first_post' : `${kind}:${value}`;
    const [{ data: row }, { data: me }] = await Promise.all([
      db.from('user_milestones').select('key').eq('user_id', userId).eq('key', key).maybeSingle(),
      db.from('profiles').select('username').eq('id', userId).maybeSingle(),
    ]);
    if (!row) { res.status(404).json({ success: false, error: 'Milestone not found' }); return; }
    let snippet: string | undefined;
    if (postId) {
      const { data: p } = await db.from('posts').select('content').eq('id', postId).maybeSingle();
      const t = Array.from(String((p as any)?.content || '').replace(/\s+/g, ' ').trim());
      snippet = t.length ? t.slice(0, 80).join('') + (t.length > 80 ? '...' : '') : undefined;
    }
    const card = { kind, value, username: (me as any)?.username || 'kchat', snippet };
    if (req.body?.preview) {
      const png = await renderMilestoneCard(card, 540);
      res.json({ success: true, data: { uri: `data:image/png;base64,${png.toString('base64')}`, width: 1080, height: 1920 } });
      return;
    }
    const png = await renderMilestoneCard(card);
    const up = await UploadService.uploadFile(png, 'image/png', `posts/${userId}/milestone_${Date.now()}.png`);
    res.json({
      success: true,
      data: { url: up.url, storage_path: up.storagePath, width: 1080, height: 1920, share_url: postId ? `https://api.kiongozi.org/p/${postId}` : `https://api.kiongozi.org/u/${encodeURIComponent(card.username)}` },
    });
  } catch (e) { console.error('milestone card', e); res.status(500).json({ success: false, error: 'Could not make the card' }); }
});

export default router;
