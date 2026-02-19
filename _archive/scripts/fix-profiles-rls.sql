-- FIX PROFILES RLS
-- Run this in Supabase SQL Editor

-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to be safe
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles; 
-- (Some apps allow public profiles, but for now let's ensure own profile is readable)

-- 3. Create Allow Policies

-- READ: Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- UPDATE: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- INSERT: Handled by Trigger usually, but if needed:
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- OPTIONAL: Allow instructors to view students?
-- For now, let's just make sure YOU can view YOURSELF.

-- Grant access to authenticated users
GRANT SELECT, UPDATE, INSERT ON profiles TO authenticated;
