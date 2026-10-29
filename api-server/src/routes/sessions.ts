// "Where you're logged in": the phones and browsers signed in to this account, and signing one out.
//  GET    /api/v1/user/sessions        list (this device first)
//  DELETE /api/v1/user/sessions/:id    sign that device out (its next refresh fails; within the hour it's out)
//  DELETE /api/v1/user/sessions        sign out everywhere else
import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/** The session id inside the caller's (already verified) access token */
function currentSessionId(req: Request): string | null {
  try {
    const token = (req.headers.authorization || '').slice(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.session_id === 'string' ? payload.session_id : null;
  } catch {
    return null;
  }
}

/** Turn a user agent into something a person recognises */
function describe(ua: string | null): { device: string; kind: 'phone' | 'computer' | 'unknown' } {
  const s = ua || '';
  if (/okhttp|Android/i.test(s)) return { device: 'Android phone', kind: 'phone' };
  if (/iPad/i.test(s)) return { device: 'iPad', kind: 'phone' };
  if (/CFNetwork|Darwin|iPhone|iOS/i.test(s)) return { device: 'iPhone', kind: 'phone' };
  if (/Windows/i.test(s)) return { device: 'Windows computer', kind: 'computer' };
  if (/Macintosh|Mac OS/i.test(s)) return { device: 'Mac', kind: 'computer' };
  if (/Linux/i.test(s)) return { device: 'Linux computer', kind: 'computer' };
  return { device: 'Unknown device', kind: 'unknown' };
}

const maskIp = (ip: string | null) => {
  if (!ip) return null;
  const v4 = ip.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  return v4 ? `${v4[1]}.${v4[2]}.x.x` : ip.split(':').slice(0, 3).join(':') + ':…';
};

router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = currentSessionId(req);
    const rows: any[] = await prisma.$queryRaw`
      select id::text, created_at, updated_at, refreshed_at, user_agent, host(ip)::text as ip
      from auth.sessions
      where user_id = ${req.user!.id}::uuid and (not_after is null or not_after > now())
      order by coalesce(refreshed_at, updated_at, created_at) desc
      limit 30`;
    const data = rows.map(r => ({
      id: r.id,
      ...describe(r.user_agent),
      current: r.id === me,
      signed_in_at: r.created_at,
      last_active_at: r.refreshed_at || r.updated_at || r.created_at,
      ip: maskIp(r.ip),
    }));
    data.sort((a, b) => Number(b.current) - Number(a.current));
    res.json({ success: true, data });
  } catch (e) {
    console.error('sessions list failed:', e);
    res.status(500).json({ success: false, error: 'Could not load your devices' });
  }
});

router.delete('/sessions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.id === currentSessionId(req)) {
      res.status(400).json({ success: false, error: 'Use Log out to sign out this phone' });
      return;
    }
    const n = await prisma.$executeRaw`
      delete from auth.sessions where id = ${req.params.id}::uuid and user_id = ${req.user!.id}::uuid`;
    res.json({ success: true, data: { removed: n } });
  } catch (e) {
    console.error('session delete failed:', e);
    res.status(500).json({ success: false, error: 'Could not sign that device out' });
  }
});

router.delete('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = currentSessionId(req);
    if (!me) { res.status(400).json({ success: false, error: 'Could not tell which device this is' }); return; }
    const n = await prisma.$executeRaw`
      delete from auth.sessions where user_id = ${req.user!.id}::uuid and id <> ${me}::uuid`;
    res.json({ success: true, data: { removed: n } });
  } catch (e) {
    console.error('sessions delete-all failed:', e);
    res.status(500).json({ success: false, error: 'Could not sign the other devices out' });
  }
});

export default router;
