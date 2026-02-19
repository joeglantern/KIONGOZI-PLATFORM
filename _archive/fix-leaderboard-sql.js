const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
-- Fix Leaderboard Functions and View
-- 1. Create Rank View for performance
DROP VIEW IF EXISTS leaderboard_view CASCADE;
CREATE VIEW leaderboard_view AS
SELECT 
    p.id as user_id,
    p.email,
    COALESCE(
        NULLIF(TRIM(p.full_name), ''),
        NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
        INITCAP(SPLIT_PART(p.email, '@', 1))
    ) as display_name,
    COALESCE(p.total_xp, 0) as total_xp,
    COALESCE(p.level, 1) as level,
    (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.user_id = p.id AND ce.status = 'completed') as courses_completed,
    (SELECT COUNT(*) FROM user_progress up WHERE up.user_id = p.id AND up.status = 'completed') as modules_completed,
    (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id) as total_badges,
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
FROM profiles p
WHERE COALESCE(p.total_xp, 0) > 0;

-- 2. Drop existing functions
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);

-- 3. Create get_top_learners
CREATE OR REPLACE FUNCTION get_top_learners(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed BIGINT,
  modules_completed BIGINT,
  total_badges BIGINT,
  rank BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        l.user_id,
        l.email,
        l.display_name,
        l.total_xp::INTEGER,
        l.level::INTEGER,
        l.courses_completed::BIGINT,
        l.modules_completed::BIGINT,
        l.total_badges::BIGINT,
        l.rank
    FROM leaderboard_view l
    ORDER BY l.rank
    LIMIT limit_count;
$$;

-- 4. Create get_leaderboard_with_context
CREATE OR REPLACE FUNCTION get_leaderboard_with_context(
  p_user_id UUID,
  top_count INTEGER DEFAULT 10,
  context_count INTEGER DEFAULT 3
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
  user_rank BIGINT;
BEGIN
  -- Get current user's rank
  SELECT l.rank INTO user_rank
  FROM leaderboard_view l
  WHERE l.user_id = p_user_id;

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
    l.rank <= top_count
    OR (user_rank IS NOT NULL AND l.rank BETWEEN (user_rank - context_count) AND (user_rank + context_count))
  ORDER BY l.rank;
END;
$$;

-- 5. Grant permissions
GRANT SELECT ON leaderboard_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated, anon;
`;

async function runFix() {
  console.log('🚀 Running Leaderboard SQL Fix...');

  // Split SQL by semicolon and run sequentially if needed, or just use one big call if using pg-typed or raw rpc
  // Since I don't have a raw SQL execution endpoint, I usually have to use rpc or similar.
  // However, I can try to run it via an edge function or if I have a specific tool.
  // In this environment, I'll use the supabase-js query builder to run it if possible, 
  // but usually you can't run raw SQL via supabase-js without an RPC.

  // I'll check if there is a 'exec_sql' RPC or similar.
  const { data: rpcCheck, error: rpcError } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });

  if (rpcError && rpcError.message.includes('function public.exec_sql(sql_query => text) does not exist')) {
    console.error('❌ exec_sql function not found in DB.');
    console.log('Please run the SQL manually in the Supabase Dashboard.');
    return;
  }

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ SQL Fix Failed:', error.message);
  } else {
    console.log('✅ Leaderboard SQL Fix Applied Successfully!');
  }
}

runFix();
