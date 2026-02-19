-- Complete Leaderboard Setup
-- This script creates all necessary functions for the leaderboard to work

-- ============================================
-- 1. Drop existing functions (if any)
-- ============================================
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- ============================================
-- 2. Create get_leaderboard_with_context function
-- ============================================
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
) AS $$
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
  WHERE r.user_id = p_user_id;

  -- If user not found, set rank to max
  IF user_rank IS NULL THEN
    user_rank := 9999;
  END IF;

  -- Return top users + context around current user
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      p.id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      -- Correct level calculation: floor(sqrt(total_xp / 50))
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(p.courses_completed, 0)::INTEGER as courses_completed,
      COALESCE(p.modules_completed, 0)::INTEGER as modules_completed,
      COALESCE(p.max_streak, 0)::INTEGER as max_streak,
      COALESCE(p.total_badges, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank,
      (p.id = p_user_id) as is_current_user
    FROM profiles p
  )
  SELECT * FROM ranked_users
  WHERE
    rank <= top_count
    OR (
      rank > top_count
      AND rank BETWEEN (user_rank - context_count) AND (user_rank + context_count)
    )
  ORDER BY rank
  LIMIT 50; -- Safety limit
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Create get_top_learners function
-- ============================================
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    COALESCE(p.total_xp, 0)::INTEGER as total_xp,
    -- Correct level calculation: floor(sqrt(total_xp / 50))
    GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
    COALESCE(p.courses_completed, 0)::INTEGER as courses_completed,
    COALESCE(p.modules_completed, 0)::INTEGER as modules_completed,
    COALESCE(p.max_streak, 0)::INTEGER as max_streak,
    COALESCE(p.total_badges, 0)::INTEGER as total_badges,
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
  FROM profiles p
  ORDER BY rank
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Create get_user_rank function
-- ============================================
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
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      p.id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      -- Correct level calculation: floor(sqrt(total_xp / 50))
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(p.courses_completed, 0)::INTEGER as courses_completed,
      COALESCE(p.modules_completed, 0)::INTEGER as modules_completed,
      COALESCE(p.max_streak, 0)::INTEGER as max_streak,
      COALESCE(p.total_badges, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
    FROM profiles p
  )
  SELECT * FROM ranked_users
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Create refresh_leaderboard function (optional)
-- ============================================
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  -- This function can be used to refresh materialized views if you add them later
  -- For now, it's a placeholder
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO authenticated;

-- Also grant to anon for public leaderboards (optional)
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO anon;

-- ============================================
-- 7. Test the functions
-- ============================================
-- Uncomment to test:
-- SELECT * FROM get_top_learners(10);
-- SELECT * FROM get_user_rank('your-user-id-here');

-- ============================================
-- 8. Verify level calculation
-- ============================================
-- Run this to see all users with their calculated levels:
-- SELECT
--   email,
--   total_xp,
--   GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(total_xp, 0), 0) / 50.0))::INTEGER) as calculated_level
-- FROM profiles
-- ORDER BY total_xp DESC
-- LIMIT 10;
