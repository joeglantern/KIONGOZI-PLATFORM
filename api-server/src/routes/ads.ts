// In-feed ads, run like the big apps:
// - The app asks for a few ad slots per feed page; the server decides which ads (paid first, house ads fill).
// - Same ad at most once per `frequency_hours` per person; hidden ads never return; ≤ 12 ads a day per person.
// - Impressions are counted by the app only when ≥50% of the ad is on screen for 1s (IAB standard).
// - Admin endpoints manage campaigns and show stats (impressions, reach, clicks, CTR, hides).
import { Router, Request, Response } from 'express';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { prisma } from '../config/prisma';

const router = Router();
const DAILY_CAP = 12;
const PUBLIC_FIELDS = 'id, advertiser_name, advertiser_avatar_url, headline, body, media_url, media_type, thumbnail_url, width, height, placeholder, cta_label, cta_url, is_house, why_text, weight, frequency_hours, max_impressions';

async function adsEnabled() {
  const row = await prisma.system_settings.findFirst({ where: { category: 'app_config', setting_key: 'config' } }).catch(() => null);
  return (row?.setting_value as any)?.features?.ads !== false;
}

/** Weighted pick without replacement */
function pickWeighted<T extends { weight: number }>(items: T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + Math.max(1, x.weight), 0);
    let r = Math.random() * total;
    const i = pool.findIndex(x => (r -= Math.max(1, x.weight)) <= 0);
    out.push(pool.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return out;
}

// GET /api/v1/ads/slots?count=2 — ads for the next feed page
router.get('/slots', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = Math.min(Math.max(parseInt(String(req.query.count)) || 1, 1), 4);
    if (!(await adsEnabled())) { res.json({ success: true, data: [] }); return; }

    const now = new Date().toISOString();
    const since24 = new Date(Date.now() - 864e5).toISOString();
    const [{ data: live }, { data: mine }] = await Promise.all([
      db.from('ad_campaigns').select(PUBLIC_FIELDS).eq('status', 'active')
        .or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`).limit(100),
      db.from('ad_events').select('campaign_id, kind, created_at').eq('user_id', userId)
        .in('kind', ['impression', 'hide', 'report']).order('created_at', { ascending: false }).limit(500),
    ]);
    const events = mine || [];
    const todayCount = events.filter((e: any) => e.kind === 'impression' && e.created_at >= since24).length;
    if (todayCount >= DAILY_CAP || !live?.length) { res.json({ success: true, data: [] }); return; }

    const hidden = new Set(events.filter((e: any) => e.kind !== 'impression').map((e: any) => e.campaign_id));
    const lastSeen: Record<string, number> = {};
    for (const e of events as any[]) if (e.kind === 'impression' && !lastSeen[e.campaign_id]) lastSeen[e.campaign_id] = new Date(e.created_at).getTime();

    // Budget: drop campaigns that reached their impression cap
    const capped = (live as any[]).filter(c => c.max_impressions);
    const reached = new Set<string>();
    await Promise.all(capped.map(async c => {
      const { count: n } = await db.from('ad_events').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('kind', 'impression');
      if ((n || 0) >= c.max_impressions) reached.add(c.id);
    }));

    const eligible = (live as any[]).filter(c =>
      !hidden.has(c.id) && !reached.has(c.id) &&
      (!lastSeen[c.id] || Date.now() - lastSeen[c.id] > (c.frequency_hours || 6) * 3600e3));
    const paid = eligible.filter(c => !c.is_house);
    const house = eligible.filter(c => c.is_house);
    const want = Math.min(count, DAILY_CAP - todayCount);
    const chosen = [...pickWeighted(paid, want)];
    if (chosen.length < want) chosen.push(...pickWeighted(house, want - chosen.length));
    res.json({ success: true, data: chosen.map(({ weight, frequency_hours, max_impressions, ...ad }) => ad) });
  } catch (e) {
    console.error('ad slots error', e);
    res.json({ success: true, data: [] }); // ads never break the feed
  }
});

// POST /api/v1/ads/:id/events { kind }
router.post('/:id/events', authenticateToken, async (req: Request, res: Response) => {
  const kind = String(req.body?.kind || '');
  if (!['impression', 'click', 'hide', 'report'].includes(kind)) { res.status(400).json({ success: false, error: 'Bad kind' }); return; }
  try {
    await db.from('ad_events').insert({ campaign_id: req.params.id, user_id: req.user!.id, kind });
    res.json({ success: true });
  } catch { res.json({ success: true }); }
});

// ── Admin ──────────────────────────────────────────────────────────────────
const admin = Router();
admin.use(authenticateToken);
admin.use(requireRole(['admin', 'super_admin']));

const EDITABLE = ['advertiser_name', 'advertiser_avatar_url', 'headline', 'body', 'media_url', 'media_type', 'thumbnail_url', 'width', 'height', 'placeholder',
  'cta_label', 'cta_url', 'is_house', 'status', 'weight', 'starts_at', 'ends_at', 'frequency_hours', 'max_impressions', 'why_text'];
const clean = (b: any) => Object.fromEntries(Object.entries(b || {}).filter(([k]) => EDITABLE.includes(k)));

// GET /api/v1/admin/ads — campaigns with stats
admin.get('/', async (_req: Request, res: Response) => {
  const { data: camps, error } = await db.from('ad_campaigns').select('*').order('created_at', { ascending: false });
  if (error) { res.status(500).json({ success: false, error: error.message }); return; }
  const stats = await Promise.all((camps || []).map(async (c: any) => {
    const counts: Record<string, number> = {};
    await Promise.all(['impression', 'click', 'hide', 'report'].map(async k => {
      const { count } = await db.from('ad_events').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('kind', k);
      counts[k] = count || 0;
    }));
    const { data: reachRows } = await db.from('ad_events').select('user_id').eq('campaign_id', c.id).eq('kind', 'impression').limit(10000);
    const reach = new Set((reachRows || []).map((r: any) => r.user_id)).size;
    return { ...c, stats: { ...counts, reach, ctr: counts.impression ? +(100 * counts.click / counts.impression).toFixed(2) : 0 } };
  }));
  res.json({ success: true, data: stats });
});

admin.post('/', async (req: Request, res: Response) => {
  const body = clean(req.body);
  if (!body.headline || !body.media_url || !body.cta_url || !body.advertiser_name) {
    res.status(400).json({ success: false, error: 'advertiser_name, headline, media_url and cta_url are required' }); return;
  }
  const { data, error } = await db.from('ad_campaigns').insert({ ...body, created_by: req.user!.id }).select().single();
  if (error) { res.status(500).json({ success: false, error: error.message }); return; }
  res.json({ success: true, data });
});

admin.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await db.from('ad_campaigns').update({ ...clean(req.body), updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
  if (error) { res.status(500).json({ success: false, error: error.message }); return; }
  res.json({ success: true, data });
});

admin.delete('/:id', async (req: Request, res: Response) => {
  // Ended, not deleted, so stats stay
  const { error } = await db.from('ad_campaigns').update({ status: 'ended', updated_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) { res.status(500).json({ success: false, error: error.message }); return; }
  res.json({ success: true });
});

export { admin as adsAdminRoutes };
export default router;
