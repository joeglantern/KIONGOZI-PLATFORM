// Growth + retention endpoints: weekly recap card, activity streak, invites, watermarked shares.
// Mounted at /api/v1/social. Feature switches live in /api/v1/health/app-config → features.
import { Router, Request, Response } from 'express';
import sharp from 'sharp';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import UploadService from '../services/UploadService';
import { weekStats, renderRecap, activityStreak } from '../services/RecapService';
import { h, renderTree, cardAssets } from '../services/ShareCardService';
import NotificationService from '../services/NotificationService';
import { Milestones } from '../services/MilestoneService';

const router = Router();

async function me(userId: string) {
  const { data } = await db.from('profiles').select('username, full_name').eq('id', userId).maybeSingle();
  return { username: (data as any)?.username || 'kchat', name: (data as any)?.full_name || (data as any)?.username || 'KChat' };
}

// GET /recap — this week's numbers (for the in-app recap sheet)
router.get('/recap', authenticateToken, async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await weekStats(req.user!.id) });
  } catch (e) { console.error('recap stats', e); res.status(500).json({ success: false, error: 'Could not load your week' }); }
});

// POST /recap/card { preview?: boolean } — preview → small data URI; else uploaded PNG for story/post/share
router.post('/recap/card', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const [stats, user] = await Promise.all([weekStats(userId), me(userId)]);
    if (req.body?.preview) {
      const png = await renderRecap(stats, user, 540);
      res.json({ success: true, data: { uri: `data:image/png;base64,${png.toString("base64")}`, stats } });
      return;
    }
    const png = await renderRecap(stats, user);
    const up = await UploadService.uploadFile(png, 'image/png', `posts/${userId}/recap_${Date.now()}.png`);
    res.json({ success: true, data: { url: up.url, storage_path: up.storagePath, width: 1080, height: 1920 } });
  } catch (e) { console.error('recap card', e); res.status(500).json({ success: false, error: 'Could not make your recap' }); }
});

// GET /streak — days in a row with a post, reply or story
router.get('/streak', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { streak, days } = await activityStreak(req.user!.id);
    const today = new Date().toISOString().slice(0, 10);
    res.json({ success: true, data: { streak, today: days.has(today) } });
  } catch { res.json({ success: true, data: { streak: 0, today: false } }); }
});

// ── Invites ──
// GET /invites — my invite link + how many people joined through it
router.get('/invites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const [{ username }, { count }, { data: recent }] = await Promise.all([
      me(userId),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('invited_by', userId),
      db.from('profiles').select('id, username, full_name, avatar_url').eq('invited_by', userId).order('created_at', { ascending: false }).limit(12),
    ]);
    res.json({ success: true, data: { link: `https://api.kiongozi.org/i/${encodeURIComponent(username)}`, count: count || 0, recent: recent || [] } });
  } catch (e) { console.error('invites', e); res.status(500).json({ success: false, error: 'Could not load invites' }); }
});

// POST /invites/claim { ref } — credit whoever invited me (once, only for new accounts)
router.post('/invites/claim', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const ref = String(req.body?.ref || '').replace(/^@/, '').toLowerCase().slice(0, 30);
    if (!/^[a-z0-9_.]{1,30}$/.test(ref)) { res.json({ success: true, data: { credited: false } }); return; }
    const [{ data: self }, { data: inviter }] = await Promise.all([
      db.from('profiles').select('id, invited_by, created_at').eq('id', userId).maybeSingle(),
      db.from('profiles').select('id, is_private').ilike('username', ref).maybeSingle(),
    ]);
    const s: any = self, inv: any = inviter;
    const fresh = s && Date.now() - new Date(s.created_at).getTime() < 7 * 24 * 3600 * 1000;
    if (!s || !inv || s.invited_by || inv.id === userId || !fresh) { res.json({ success: true, data: { credited: false } }); return; }
    const { data: credited } = await db.from('profiles').update({ invited_by: inv.id }).eq('id', userId).is('invited_by', null).select('id');
    // New people follow whoever invited them (public accounts only; private ones keep approving requests)
    if (!inv.is_private) {
      await db.from('follows').upsert({ follower_id: userId, following_id: inv.id }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });
      Milestones.followed(inv.id);
    }
    // Tell the inviter their link worked ("@wanjiru joined KChat from your link"), once
    if (credited?.length) {
      setImmediate(async () => {
        try {
          const { data: joined } = await db.from('profiles').select('full_name, username, avatar_url').eq('id', userId).maybeSingle();
          const j: any = joined;
          await NotificationService.notify({
            userId: inv.id,
            type: 'invite_joined',
            fallbackType: 'info',
            title: 'Your invite worked',
            message: `@${j?.username || 'someone'} joined KChat from your link`,
            data: { from_user_id: userId, from_username: j?.username, from_avatar_url: j?.avatar_url, from_full_name: j?.full_name },
          });
        } catch (e) { console.error('invite joined notification', e); }
      });
    }
    res.json({ success: true, data: { credited: true } });
  } catch (e) { console.error('invite claim', e); res.json({ success: true, data: { credited: false } }); }
});

// ── Watermarked share (TikTok trick): photo + "KChat · @author" tag, for sharing outside the app ──
router.post('/media/:mediaId/share-image', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { data } = await db.from('post_media')
      .select('id, url, media_type, posts:post_id(user_id, visibility, profiles:user_id(username, is_private))')
      .eq('id', mediaId).maybeSingle();
    const m: any = data;
    const post = m?.posts;
    if (!m || m.media_type !== 'image') { res.status(404).json({ success: false, error: 'Photo not found' }); return; }
    const own = post?.user_id === req.user!.id;
    if (!own && (post?.visibility !== 'public' || post?.profiles?.is_private)) { res.status(403).json({ success: false, error: 'This photo can’t be shared' }); return; }

    const path = `shares/${m.id}.jpg`;
    const r = await fetch(m.url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    const { data: base, info } = await sharp(Buffer.from(await r.arrayBuffer()), { failOn: 'none' })
      .rotate().resize({ width: 1440, height: 1920, fit: 'inside', withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    // Tag scales with the photo and sits bottom-left like TikTok's. Drawn with Satori (the server has no system fonts).
    const u = Math.max(0.6, Math.min(width, height) / 1080);
    const label = `@${post?.profiles?.username || 'kchat'}`;
    const th = Math.round(64 * u), pad = Math.round(28 * u);
    const tw = Math.min(width - pad * 2, Math.round((170 + Array.from(label).length * 17) * u));
    const { orb } = cardAssets();
    const tag = await renderTree(h('div', {
      width: tw, height: th, display: 'flex', alignItems: 'center', borderRadius: th / 2, backgroundColor: 'rgba(14,17,22,0.62)',
      paddingLeft: th * 0.18, fontFamily: 'Grotesk',
    },
      { type: 'img', props: { src: orb, width: th * 0.64, height: th * 0.64, style: { width: th * 0.64, height: th * 0.64, borderRadius: th * 0.32 } } },
      h('div', { fontSize: 26 * u, fontWeight: 700, color: '#F4F1EA', marginLeft: 12 * u }, 'KChat'),
      h('div', { fontSize: 24 * u, fontWeight: 500, color: '#C9CDD6', marginLeft: 10 * u }, label),
    ), tw, th);
    const out = await sharp(base).composite([{ input: tag, left: pad, top: height - th - pad }]).jpeg({ quality: 86 }).toBuffer();
    const up = await UploadService.uploadFile(out, 'image/jpeg', path);
    res.json({ success: true, data: { url: `${up.url}?v=${Date.now()}` } });
  } catch (e) { console.error('share image', e); res.status(500).json({ success: false, error: 'Could not prepare the photo' }); }
});

export default router;
