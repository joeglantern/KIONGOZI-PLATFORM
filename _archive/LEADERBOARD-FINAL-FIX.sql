-- FINAL CORRECTED LEADERBOARD SQL (v3)
-- FIXES: "column p.user_id does not exist" and "Lvl 1 showing as name"

-- 1. Drop EVERYTHING related to the leaderboard to ensure a clean slate
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_top_learners(INTEGER) CASCADE;
DROP VIEW IF EXISTS leaderboard_view CASCADE;

-- 2. Create the View using 'p.id' (CRITICAL: Profiles table uses 'id', not 'user_id')
CREATE VIEW leaderboard_view AS
SELECT 
    p.id as user_id, -- Alias id to user_id for the view and frontend
    p.email,
    -- Robust name fallback
    COALESCE(
        NULLIF(TRIM(p.full_name), ''),
        NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
        INITCAP(SPLIT_PART(p.email, '@', 1))
    ) as display_name,
    COALESCE(p.total_xp, 0) as total_xp,
    COALESCE(p.level, 1) as level,
    -- Aggregated stats
    (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.user_id = p.id AND ce.status = 'completed')::BIGINT as courses_completed,
    (SELECT COUNT(*) FROM user_progress up WHERE up.user_id = p.id AND up.status = 'completed')::BIGINT as modules_completed,
    (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id)::BIGINT as total_badges,
    -- Rank calculation (distinct for each user)
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
FROM profiles p
WHERE COALESCE(p.total_xp, 0) >= 0; -- Keep >= 0 for now to avoid excluding users if their rank is needed, but we can filter in the RPC

-- 3. Create the Context-Aware Function
CREATE OR REPLACE FUNCTION get_leaderboard_with_context(
  p_user_id UUID,
  top_count INTEGER DEFAULT 5,
  context_count INTEGER DEFAULT 2
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  total_xp INTEGER,
  level INTEGER, 
  courses_completed BIGINT,
  modules_completed BIGINT,
  total_badges BIGINT, 
  rank BIGINT,
  is_current_user BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  current_user_rank BIGINT;
BEGIN
  -- 1. Get current user's rank from our view
  SELECT l.rank INTO current_user_rank 
  FROM leaderboard_view l 
  WHERE l.user_id = p_user_id;

  -- 2. Return Top 5 + Context (Surrounding Ranks)
  RETURN QUERY 
  SELECT 
    l.user_id,
    l.email,
    l.display_name,
    l.total_xp::INTEGER,
    l.level::INTEGER,
    l.courses_completed::BIGINT,
    l.modules_completed::BIGINT,
    l.total_badges::BIGINT,
    l.rank,
    (l.user_id = p_user_id) as is_current_user
  FROM leaderboard_view l
  WHERE 
    l.total_xp > 0  -- Filter 0 XP users at result stage
    AND (
      l.rank <= top_count 
      OR (current_user_rank IS NOT NULL AND l.rank BETWEEN (current_user_rank - context_count) AND (current_user_rank + context_count))
    )
  ORDER BY l.rank;
END; 
$$;

-- 4. Grant Permissions
GRANT SELECT ON leaderboard_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated, anon;
