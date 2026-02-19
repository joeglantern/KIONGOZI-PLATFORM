-- Fix Profiles Table RLS Policies for Leaderboard Access
-- This ensures the leaderboard functions can read profile data

-- ============================================
-- 1. Check if RLS is enabled on profiles table
-- ============================================
-- To check: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- ============================================
-- 2. Create/Update RLS policies for profiles table
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create a policy that allows ALL authenticated users to read ALL profiles
-- This is needed for leaderboards to work
CREATE POLICY "Enable read access for authenticated users"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Also allow anonymous users to view profiles (for public leaderboards)
CREATE POLICY "Enable read access for anonymous users"
ON profiles
FOR SELECT
TO anon
USING (true);

-- ============================================
-- 3. Ensure users can update their own profiles
-- ============================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Ensure users can insert their own profile
-- ============================================
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Verify RLS is enabled
-- ============================================
-- If RLS is not enabled, enable it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Test query - Verify you can read profiles
-- ============================================
-- Run this to test if you can now read all profiles:
-- SELECT user_id, email, full_name, total_xp FROM profiles LIMIT 5;

-- ============================================
-- 7. Test the leaderboard function again
-- ============================================
-- SELECT * FROM get_top_learners(10);
