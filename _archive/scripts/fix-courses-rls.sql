-- FIX COURSES RLS (Safer Version)
-- Run this in Supabase SQL Editor

-- 1. Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
-- We use a function to drop policies by name pattern if needed, but dropping specific names is safer.
DROP POLICY IF EXISTS "Enable read access for all users" ON courses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON courses;
DROP POLICY IF EXISTS "Enable update for authors" ON courses;
DROP POLICY IF EXISTS "Enable delete for authors" ON courses;

DROP POLICY IF EXISTS "Enable read access for all users" ON learning_modules;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON learning_modules;
DROP POLICY IF EXISTS "Enable update for authors" ON learning_modules;
DROP POLICY IF EXISTS "Enable delete for authors" ON learning_modules;

DROP POLICY IF EXISTS "Enable read access for all users" ON course_modules;
DROP POLICY IF EXISTS "Enable insert for course authors" ON course_modules;
DROP POLICY IF EXISTS "Enable update for course authors" ON course_modules;
DROP POLICY IF EXISTS "Enable delete for course authors" ON course_modules;

-- 3. Create Allow Policies

-- COURSES
CREATE POLICY "Enable read access for all users" ON courses
  FOR SELECT USING (true);

-- Allow insert ONLY if you set yourself as author
CREATE POLICY "Enable insert for authenticated users" ON courses
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable update for authors" ON courses
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Enable delete for authors" ON courses
  FOR DELETE USING (auth.uid() = author_id);

-- LEARNING MODULES
CREATE POLICY "Enable read access for all users" ON learning_modules
  FOR SELECT USING (true);

-- Allow insert ONLY if you set yourself as author
CREATE POLICY "Enable insert for authenticated users" ON learning_modules
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable update for authors" ON learning_modules
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Enable delete for authors" ON learning_modules
  FOR DELETE USING (auth.uid() = author_id);

-- COURSE MODULES (Join Table)
-- Access logic: If you can edit the course, you can edit the mapping.
CREATE POLICY "Enable read access for all users" ON course_modules
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for course authors" ON course_modules
  FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM courses WHERE id = course_id AND author_id = auth.uid() )
  );

CREATE POLICY "Enable update for course authors" ON course_modules
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM courses WHERE id = course_id AND author_id = auth.uid() )
  );

CREATE POLICY "Enable delete for course authors" ON course_modules
  FOR DELETE USING (
    EXISTS ( SELECT 1 FROM courses WHERE id = course_id AND author_id = auth.uid() )
  );
