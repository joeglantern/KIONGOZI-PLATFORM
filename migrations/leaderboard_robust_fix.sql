-- ROBUST LEADERBOARD RPC FIX
-- Prevents name shadowing and ensures correct field mapping for the frontend

-- Drop existing functions to ensure clean slate
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
SET search_path = public
AS $$
DECLARE
  v_user_rank BIGINT;
BEGIN
  -- 1. Get current user's rank
  SELECT r.rank INTO v_user_rank
  FROM (
    SELECT
      id,
      RANK() OVER (ORDER BY COALESCE(total_xp, 0) DESC, id) as rank
    FROM profiles
  ) r
  WHERE r.id = p_user_id;

  -- 2. Default rank if user not found (e.g., new user with 0 XP)
  IF v_user_rank IS NULL THEN
    v_user_rank := 999999;
  END IF;

  -- 3. Return the leaderboard
  RETURN QUERY
  WITH all_ranked AS (
    SELECT
      p.id,
      COALESCE(p.full_name, COALESCE(p.first_name || ' ' || p.last_name, split_part(p.email, '@', 1)))::TEXT as d_name,
      COALESCE(p.total_xp, 0)::INTEGER as t_xp,
      COALESCE(p.level, 1)::INTEGER as lvl,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rnk,
      (p.id = p_user_id) as is_me
    FROM profiles p
  )
  SELECT 
    id,
    d_name,
    t_xp,
    lvl,
    rnk,
    is_me
  FROM all_ranked
  WHERE
    rnk <= top_count
    OR (
      rnk BETWEEN (v_user_rank - context_count) AND (v_user_rank + context_count)
    )
  ORDER BY rnk
  LIMIT 50;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO service_role;
