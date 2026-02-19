-- DEFINITIVE LEADERBOARD FIX
-- Corrects 'user_id' vs 'id' discrepancy for profiles table

-- Drop old versions first
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);

-- 1. get_leaderboard_with_context
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
AS $$
DECLARE
  user_rank BIGINT;
BEGIN
  -- Get current user's rank
  SELECT r.rank INTO user_rank
  FROM (
    SELECT
      p.id,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
    FROM profiles p
  ) r
  WHERE r.id = p_user_id;

  IF user_rank IS NULL THEN
    user_rank := 9999;
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id as prof_id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'completed') as courses_completed_count,
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
      p.id as ret_user_id,
      p.email::TEXT,
      p.full_name::TEXT,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      COALESCE(p.level, 1)::INTEGER as level,
      COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
      COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
      COALESCE(p.current_streak, 0)::INTEGER as max_streak,
      COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank,
      (p.id = p_user_id) as is_current_user
    FROM profiles p
    LEFT JOIN user_stats us ON us.prof_id = p.id
  )
  SELECT * FROM ranked_users
  WHERE
    rank <= top_count
    OR (
      rank > top_count
      AND rank BETWEEN (user_rank - context_count) AND (user_rank + context_count)
    )
  ORDER BY rank
  LIMIT 50;
END;
$$;

-- 2. get_top_learners
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
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id as prof_id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'completed') as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.status = 'completed') as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    GROUP BY p.id
  )
  SELECT
    p.id as ret_user_id,
    p.email::TEXT,
    p.full_name::TEXT,
    COALESCE(p.total_xp, 0)::INTEGER as total_xp,
    COALESCE(p.level, 1)::INTEGER as level,
    COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
    COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
    COALESCE(p.current_streak, 0)::INTEGER as max_streak,
    COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
  FROM profiles p
  LEFT JOIN user_stats us ON us.prof_id = p.id
  ORDER BY rank
  LIMIT limit_count;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated, anon, service_role;
