-- Leaderboard System for Kiongozi LMS
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. CREATE LEADERBOARD VIEW (Real-time rankings)
-- =============================================

-- Drop view if exists
DROP VIEW IF EXISTS leaderboard CASCADE;

-- Create materialized view for better performance (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  p.total_xp,
  p.level,
  COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'completed') as courses_completed,
  COUNT(DISTINCT up.id) FILTER (WHERE up.status = 'completed') as modules_completed,
  COALESCE(
    (
      SELECT MAX(consecutive_days)
      FROM (
        SELECT
          COUNT(*) as consecutive_days
        FROM (
          SELECT
            DATE(completed_at) as completion_date,
            DATE(completed_at) - (ROW_NUMBER() OVER (ORDER BY DATE(completed_at)))::integer as grp
          FROM user_progress
          WHERE user_id = p.id
            AND status = 'completed'
            AND completed_at IS NOT NULL
          GROUP BY DATE(completed_at)
        ) dates
        GROUP BY grp
        ORDER BY consecutive_days DESC
        LIMIT 1
      ) streaks
    ), 0
  ) as max_streak,
  (
    SELECT COUNT(*)
    FROM user_badges ub
    WHERE ub.user_id = p.id
  ) as total_badges,
  p.created_at as joined_at
FROM profiles p
LEFT JOIN course_enrollments ce ON ce.user_id = p.id
LEFT JOIN user_progress up ON up.user_id = p.id
WHERE p.total_xp > 0  -- Only show users who have earned XP
GROUP BY p.id, p.email, p.full_name, p.total_xp, p.level, p.created_at
ORDER BY p.total_xp DESC, p.level DESC;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON profiles(level DESC);

-- =============================================
-- 2. CREATE FUNCTION TO REFRESH LEADERBOARD
-- =============================================

CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW leaderboard;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. CREATE FUNCTION TO GET TOP LEARNERS
-- =============================================

CREATE OR REPLACE FUNCTION get_top_learners(limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_xp integer,
  level integer,
  courses_completed bigint,
  modules_completed bigint,
  max_streak bigint,
  total_badges bigint,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.user_id,
    l.email,
    l.full_name,
    l.total_xp,
    l.level,
    l.courses_completed,
    l.modules_completed,
    l.max_streak,
    l.total_badges,
    ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.level DESC) as rank
  FROM leaderboard l
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. CREATE FUNCTION TO GET USER RANK
-- =============================================

CREATE OR REPLACE FUNCTION get_user_rank(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_xp integer,
  level integer,
  rank bigint,
  total_users bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      l.user_id,
      l.email,
      l.full_name,
      l.total_xp,
      l.level,
      ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.level DESC) as rank
    FROM leaderboard l
  )
  SELECT
    r.user_id,
    r.email,
    r.full_name,
    r.total_xp,
    r.level,
    r.rank,
    (SELECT COUNT(*) FROM leaderboard) as total_users
  FROM ranked_users r
  WHERE r.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. CREATE FUNCTION TO GET LEADERBOARD WITH CONTEXT
-- (Shows top users + user's position + nearby users)
-- =============================================

CREATE OR REPLACE FUNCTION get_leaderboard_with_context(
  p_user_id uuid,
  top_count integer DEFAULT 10,
  context_count integer DEFAULT 3
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_xp integer,
  level integer,
  courses_completed bigint,
  modules_completed bigint,
  max_streak bigint,
  total_badges bigint,
  rank bigint,
  is_current_user boolean
) AS $$
DECLARE
  user_rank bigint;
BEGIN
  -- Get current user's rank
  SELECT r.rank INTO user_rank
  FROM (
    SELECT
      l.user_id,
      ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.level DESC) as rank
    FROM leaderboard l
  ) r
  WHERE r.user_id = p_user_id;

  RETURN QUERY
  WITH ranked_leaderboard AS (
    SELECT
      l.user_id,
      l.email,
      l.full_name,
      l.total_xp,
      l.level,
      l.courses_completed,
      l.modules_completed,
      l.max_streak,
      l.total_badges,
      ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.level DESC) as rank
    FROM leaderboard l
  )
  SELECT DISTINCT
    r.user_id,
    r.email,
    r.full_name,
    r.total_xp,
    r.level,
    r.courses_completed,
    r.modules_completed,
    r.max_streak,
    r.total_badges,
    r.rank,
    (r.user_id = p_user_id) as is_current_user
  FROM ranked_leaderboard r
  WHERE
    r.rank <= top_count  -- Top users
    OR (r.rank BETWEEN user_rank - context_count AND user_rank + context_count)  -- Context around user
  ORDER BY r.rank;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. ENABLE RLS ON LEADERBOARD (Public read)
-- =============================================

-- Note: Materialized views don't support RLS directly,
-- but we can create a regular view with RLS if needed

CREATE OR REPLACE VIEW leaderboard_public AS
SELECT * FROM leaderboard;

ALTER VIEW leaderboard_public OWNER TO postgres;

-- Grant public read access
GRANT SELECT ON leaderboard_public TO anon, authenticated;

-- =============================================
-- 7. CREATE TRIGGER TO AUTO-REFRESH LEADERBOARD
-- (Optional - refreshes when XP is updated)
-- =============================================

CREATE OR REPLACE FUNCTION trigger_refresh_leaderboard()
RETURNS trigger AS $$
BEGIN
  -- Refresh in background (non-blocking)
  PERFORM refresh_leaderboard();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger can be expensive on high traffic
-- Consider using a scheduled job instead (pg_cron)
-- Uncomment to enable auto-refresh:

-- DROP TRIGGER IF EXISTS profiles_xp_update_trigger ON profiles;
-- CREATE TRIGGER profiles_xp_update_trigger
--   AFTER UPDATE OF total_xp ON profiles
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION trigger_refresh_leaderboard();

-- =============================================
-- 8. INITIAL REFRESH
-- =============================================

SELECT refresh_leaderboard();

-- =============================================
-- 9. VERIFICATION QUERIES
-- =============================================

-- View top 10 learners
SELECT * FROM get_top_learners(10);

-- Check if leaderboard was created
SELECT COUNT(*) as total_learners FROM leaderboard;

-- Test getting user rank (replace with actual user ID)
-- SELECT * FROM get_user_rank('your-user-id-here');

-- Test leaderboard with context (replace with actual user ID)
-- SELECT * FROM get_leaderboard_with_context('your-user-id-here', 10, 3);
