-- ============================================
-- FIXED LEADERBOARD RPCs
-- Corrects the "column p.user_id does not exist" bug
-- Run this in Supabase SQL Editor (optional — the
-- client-side leaderboard.ts already works without these)
-- ============================================

-- Drop existing broken functions
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- =====================
-- get_top_learners
-- =====================
CREATE OR REPLACE FUNCTION get_top_learners(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed INTEGER,
  modules_completed INTEGER,
  max_streak INTEGER,
  total_badges INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.status = 'completed') as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    GROUP BY p.id
  )
  SELECT
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE(p.total_xp, 0)::INTEGER as total_xp,
    GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
    COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
    COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
    0::INTEGER as max_streak,
    COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
  FROM profiles p
  LEFT JOIN user_stats us ON us.id = p.id
  ORDER BY rank
  LIMIT limit_count;
END;
$$;

-- =====================
-- get_leaderboard_with_context
-- =====================
CREATE OR REPLACE FUNCTION get_leaderboard_with_context(
  p_user_id UUID,
  top_count INTEGER DEFAULT 10,
  context_count INTEGER DEFAULT 3
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed INTEGER,
  modules_completed INTEGER,
  max_streak INTEGER,
  total_badges INTEGER,
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
  -- Get current user's rank
  SELECT r.rank INTO v_user_rank
  FROM (
    SELECT
      p.id,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
    FROM profiles p
  ) r
  WHERE r.id = p_user_id;

  IF v_user_rank IS NULL THEN
    v_user_rank := 9999;
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.status = 'completed') as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    GROUP BY p.id
  ),
  ranked_users AS (
    SELECT
      p.id as user_id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
      COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
      0::INTEGER as max_streak,
      COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank,
      (p.id = p_user_id) as is_current_user
    FROM profiles p
    LEFT JOIN user_stats us ON us.id = p.id
  )
  SELECT * FROM ranked_users
  WHERE
    ranked_users.rank <= top_count
    OR (
      ranked_users.rank > top_count
      AND ranked_users.rank BETWEEN (v_user_rank - context_count) AND (v_user_rank + context_count)
    )
  ORDER BY ranked_users.rank
  LIMIT 50;
END;
$$;

-- =====================
-- get_user_rank
-- =====================
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed INTEGER,
  modules_completed INTEGER,
  max_streak INTEGER,
  total_badges INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.status = 'completed') as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.id
  ),
  ranked_users AS (
    SELECT
      p.id as user_id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
      COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
      0::INTEGER as max_streak,
      COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
    FROM profiles p
    LEFT JOIN user_stats us ON us.id = p.id
  )
  SELECT * FROM ranked_users
  WHERE ranked_users.user_id = p_user_id;
END;
$$;

-- =====================
-- refresh_leaderboard (no-op placeholder)
-- =====================
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO authenticated, anon, service_role;

-- Quick test
SELECT * FROM get_top_learners(5);
