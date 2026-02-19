-- UNIVERSAL LEADERBOARD RPC
-- Extremely robust, minimizes column dependencies

DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_leaderboard_with_context(
  p_user_id UUID,
  top_count INTEGER DEFAULT 10,
  context_count INTEGER DEFAULT 3
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  rank BIGINT,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_rank BIGINT;
BEGIN
  -- 1. Find the rank of the target user
  SELECT r.rnk INTO v_user_rank
  FROM (
    SELECT id, RANK() OVER (ORDER BY COALESCE(total_xp, 0) DESC, id) as rnk
    FROM profiles
  ) r
  WHERE r.id = p_user_id;

  -- 2. Return mixed result: Top X + Context around User
  RETURN QUERY
  WITH ranked_list AS (
    SELECT
      p.id as uid,
      COALESCE(p.full_name, split_part(p.email, '@', 1))::TEXT as dname,
      COALESCE(p.total_xp, 0)::INTEGER as xp,
      COALESCE(p.level, 1)::INTEGER as lvl,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rnk
    FROM profiles p
  )
  SELECT
    uid,
    dname,
    xp,
    lvl,
    rnk,
    (uid = p_user_id)
  FROM ranked_list
  WHERE
    rnk <= top_count
    OR (
      v_user_rank IS NOT NULL 
      AND rnk BETWEEN (v_user_rank - context_count) AND (v_user_rank + context_count)
    )
  ORDER BY rnk ASC
  LIMIT 50;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO service_role;
