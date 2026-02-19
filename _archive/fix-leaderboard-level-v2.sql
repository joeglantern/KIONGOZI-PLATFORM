-- Fix Leaderboard Level Calculation (Version 2)
-- Drop existing functions first, then recreate with correct level calculation

-- Drop existing functions
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);

-- Recreate get_leaderboard_with_context with correct level calculation
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
      p.user_id,
      RANK() OVER (ORDER BY p.total_xp DESC, p.user_id) as rank
    FROM profiles p
    WHERE p.total_xp > 0
  ) r
  WHERE r.user_id = p_user_id;

  -- Return top users + context around current user
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      p.user_id,
      p.email,
      p.full_name,
      p.total_xp,
      -- Correct level calculation: floor(sqrt(total_xp / 50))
      GREATEST(1, FLOOR(SQRT(GREATEST(p.total_xp, 0) / 50.0))::INTEGER) as level,
      p.courses_completed,
      p.modules_completed,
      p.max_streak,
      p.total_badges,
      RANK() OVER (ORDER BY p.total_xp DESC, p.user_id) as rank,
      (p.user_id = p_user_id) as is_current_user
    FROM profiles p
    WHERE p.total_xp > 0
  )
  SELECT * FROM ranked_users
  WHERE
    rank <= top_count
    OR (
      rank > top_count
      AND rank BETWEEN (user_rank - context_count) AND (user_rank + context_count)
    )
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql;

-- Recreate get_top_learners function
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
    p.user_id,
    p.email,
    p.full_name,
    p.total_xp,
    -- Correct level calculation: floor(sqrt(total_xp / 50))
    GREATEST(1, FLOOR(SQRT(GREATEST(p.total_xp, 0) / 50.0))::INTEGER) as level,
    p.courses_completed,
    p.modules_completed,
    p.max_streak,
    p.total_badges,
    RANK() OVER (ORDER BY p.total_xp DESC, p.user_id) as rank
  FROM profiles p
  WHERE p.total_xp > 0
  ORDER BY rank
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Recreate get_user_rank function
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
      p.user_id,
      p.email,
      p.full_name,
      p.total_xp,
      -- Correct level calculation: floor(sqrt(total_xp / 50))
      GREATEST(1, FLOOR(SQRT(GREATEST(p.total_xp, 0) / 50.0))::INTEGER) as level,
      p.courses_completed,
      p.modules_completed,
      p.max_streak,
      p.total_badges,
      RANK() OVER (ORDER BY p.total_xp DESC, p.user_id) as rank
    FROM profiles p
    WHERE p.total_xp > 0
  )
  SELECT * FROM ranked_users
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Test query to verify the fix
-- Uncomment and run this to see your corrected level:
-- SELECT
--   email,
--   total_xp,
--   FLOOR(SQRT(GREATEST(total_xp, 0) / 50.0)) as calculated_level
-- FROM profiles
-- WHERE total_xp > 0
-- ORDER BY total_xp DESC
-- LIMIT 10;
