-- Leaderboard RPCs, replace client-side aggregation that pulled every user's
-- email/total_xp to the browser. These SECURITY DEFINER functions return only
-- safe display fields (no email) and support all-time and weekly scopes.
-- Weekly XP is summed from the reward_claims ledger over the trailing 7 days.

-- Ranked top-N leaderboard.
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text DEFAULT 'all', p_limit int DEFAULT 10)
RETURNS TABLE (user_id uuid, display_name text, total_xp int, level int, rank int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH scored AS (
    SELECT
      p.id AS user_id,
      COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(p.username), ''), 'Learner') AS display_name,
      CASE
        WHEN p_scope = 'weekly' THEN COALESCE((
          SELECT SUM(rc.xp_awarded)
          FROM public.reward_claims rc
          WHERE rc.user_id = p.id AND rc.created_at >= (now() - interval '7 days')
        ), 0)
        ELSE COALESCE(p.total_xp, 0)
      END AS xp,
      COALESCE(p.level, 1) AS level
    FROM public.profiles p
  )
  SELECT
    user_id,
    display_name,
    xp::int AS total_xp,
    level,
    (RANK() OVER (ORDER BY xp DESC))::int AS rank
  FROM scored
  WHERE p_scope = 'all' OR xp > 0
  ORDER BY xp DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

-- The calling user's own rank + xp for the pinned "your position" row.
CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank(p_scope text DEFAULT 'all')
RETURNS TABLE (total_xp int, level int, rank int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT
      CASE
        WHEN p_scope = 'weekly' THEN COALESCE((
          SELECT SUM(rc.xp_awarded)
          FROM public.reward_claims rc
          WHERE rc.user_id = auth.uid() AND rc.created_at >= (now() - interval '7 days')
        ), 0)
        ELSE COALESCE((SELECT total_xp FROM public.profiles WHERE id = auth.uid()), 0)
      END AS xp,
      COALESCE((SELECT level FROM public.profiles WHERE id = auth.uid()), 1) AS level
  ),
  ahead AS (
    SELECT COUNT(*) AS c
    FROM public.profiles p
    WHERE (
      CASE
        WHEN p_scope = 'weekly' THEN COALESCE((
          SELECT SUM(rc.xp_awarded)
          FROM public.reward_claims rc
          WHERE rc.user_id = p.id AND rc.created_at >= (now() - interval '7 days')
        ), 0)
        ELSE COALESCE(p.total_xp, 0)
      END
    ) > (SELECT xp FROM me)
  )
  SELECT (SELECT xp FROM me)::int, (SELECT level FROM me)::int, ((SELECT c FROM ahead) + 1)::int;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_leaderboard_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank(text) TO authenticated;
