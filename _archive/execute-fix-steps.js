const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeFix() {
  console.log('🔧 Executing Leaderboard Fix Step by Step...\n');

  // Step 1: Drop existing functions
  console.log('Step 1: Dropping old functions...');
  try {
    await supabase.rpc('get_top_learners'); // This will fail, which is fine
  } catch (e) {}

  // Since we can't execute raw SQL via the JS client, let's create a helper function
  // We'll need to use the SQL editor or create via migration

  console.log('\n⚠️  Cannot execute raw SQL via Supabase JS client.');
  console.log('📋 You need to run the SQL script in Supabase Dashboard manually.\n');
  console.log('Here is the CORRECTED SQL based on your actual schema:\n');
  console.log('='.repeat(80));

  const correctedSQL = `
-- ============================================
-- CORRECTED LEADERBOARD FIX
-- Based on actual schema: profiles has 'id' column (not 'user_id')
-- ============================================

-- Step 1: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select_anon" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;

-- Step 3: Create read policy for everyone
CREATE POLICY "profiles_select_all"
ON profiles
FOR SELECT
USING (true);

-- Step 4: Allow users to update their own profile
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 5: Drop existing leaderboard functions
DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- Step 6: Create get_top_learners function
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
      COUNT(DISTINCT up.id) FILTER (WHERE up.completed = true) as modules_completed_count,
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

-- Step 7: Create get_leaderboard_with_context function
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

  -- Return leaderboard
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.completed = true) as modules_completed_count,
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
    rank <= top_count
    OR (
      rank > top_count
      AND rank BETWEEN (user_rank - context_count) AND (user_rank + context_count)
    )
  ORDER BY rank
  LIMIT 50;
END;
$$;

-- Step 8: Create get_user_rank function
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
      COUNT(DISTINCT up.id) FILTER (WHERE up.completed = true) as modules_completed_count,
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

-- Step 9: Create refresh_leaderboard placeholder
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN;
END;
$$;

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO authenticated, anon, service_role;

-- Step 11: Test
SELECT * FROM get_top_learners(10);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Leaderboard fix complete!';
  RAISE NOTICE '✅ Correct level formula applied';
  RAISE NOTICE '✅ Stats calculated dynamically';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh your dashboard now (Ctrl+Shift+R)';
END $$;
`;

  console.log(correctedSQL);
  console.log('='.repeat(80));
  console.log('\n📝 Instructions:');
  console.log('1. Copy the SQL above');
  console.log('2. Go to: https://supabase.com/dashboard/project/jdncfyagppohtksogzkx/sql/new');
  console.log('3. Paste the SQL');
  console.log('4. Click "Run"');
  console.log('5. Refresh your LMS dashboard\n');
}

executeFix();
