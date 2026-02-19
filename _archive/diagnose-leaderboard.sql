-- Leaderboard Diagnostics
-- Run these queries one by one to diagnose the issue

-- ============================================
-- 1. Check if functions exist
-- ============================================
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN (
  'get_leaderboard_with_context',
  'get_top_learners',
  'get_user_rank'
);
-- Expected: Should return 3 rows

-- ============================================
-- 2. Check profiles table structure
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
-- Expected: Should show columns including total_xp, courses_completed, etc.

-- ============================================
-- 3. Check if RLS is enabled on profiles
-- ============================================
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';
-- Expected: rls_enabled should be true or false

-- ============================================
-- 4. Check RLS policies on profiles table
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';
-- Expected: Should show at least one SELECT policy

-- ============================================
-- 5. Check if you have data in profiles table
-- ============================================
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE total_xp > 0) as profiles_with_xp,
  MAX(total_xp) as highest_xp,
  AVG(total_xp) as average_xp
FROM profiles;
-- Expected: Should show at least 1 profile

-- ============================================
-- 6. Test direct query (same as leaderboard function)
-- ============================================
SELECT
  user_id,
  email,
  full_name,
  COALESCE(total_xp, 0) as total_xp,
  GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(total_xp, 0), 0) / 50.0))::INTEGER) as level,
  RANK() OVER (ORDER BY COALESCE(total_xp, 0) DESC, user_id) as rank
FROM profiles
ORDER BY rank
LIMIT 10;
-- If this fails, it's an RLS issue
-- If this works, the function call is the problem

-- ============================================
-- 7. Test get_top_learners function
-- ============================================
SELECT * FROM get_top_learners(10);
-- If this fails with "permission denied", it's a function permission issue
-- If this fails with "function does not exist", the function wasn't created

-- ============================================
-- 8. Test get_leaderboard_with_context function
-- ============================================
-- Replace 'YOUR_USER_ID' with your actual user ID
-- SELECT * FROM get_leaderboard_with_context('YOUR_USER_ID'::uuid, 10, 3);
-- If this fails, note the exact error message

-- ============================================
-- 9. Check function permissions
-- ============================================
SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  CASE
    WHEN p.proacl IS NULL THEN 'No specific grants (public by default)'
    ELSE p.proacl::text
  END as access_privileges
FROM pg_proc p
WHERE p.proname LIKE '%leaderboard%' OR p.proname LIKE '%learner%';
-- Should show the functions with their access privileges

-- ============================================
-- 10. Check your user ID (for testing)
-- ============================================
SELECT
  id as user_id,
  email
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
-- Use one of these user IDs to test the leaderboard function
