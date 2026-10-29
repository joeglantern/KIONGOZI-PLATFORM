// The 5 numbers that say whether KChat is working, per sign-up week (admin only):
// signed up → posted → followed someone → sent a DM → came back the next day.
// Worked out from data we already have (no extra tracking in the app).
//  GET /api/v1/admin/funnel?weeks=8
import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);
router.use(requireRole(['admin', 'super_admin']));

router.get('/', async (req: Request, res: Response) => {
  const weeks = Math.min(Math.max(Number(req.query.weeks) || 8, 1), 26);
  try {
    const rows: any[] = await prisma.$queryRaw`
      with u as (
        select p.id, p.created_at,
               date_trunc('week', p.created_at at time zone 'Africa/Nairobi') as week,
               (p.created_at at time zone 'Africa/Nairobi')::date as day
        from profiles p
        where coalesce(p.is_bot, false) = false
          and p.created_at > now() - make_interval(weeks => ${weeks}::int)
      )
      select to_char(u.week, 'YYYY-MM-DD') as week,
        count(*)::int as signed_up,
        count(*) filter (where exists (select 1 from posts x where x.user_id = u.id))::int as posted,
        count(*) filter (where exists (select 1 from follows f where f.follower_id = u.id))::int as followed,
        count(*) filter (where exists (select 1 from dm_messages d where d.sender_id = u.id))::int as messaged,
        count(*) filter (where exists (
          select 1 from user_login_logs l
          where l.user_id = u.id and (l.created_at at time zone 'Africa/Nairobi')::date = u.day + 1
        ))::int as came_back_next_day
      from u
      group by u.week
      order by u.week desc`;
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('funnel failed:', e);
    res.status(500).json({ success: false, error: 'Could not build the funnel' });
  }
});

export default router;
