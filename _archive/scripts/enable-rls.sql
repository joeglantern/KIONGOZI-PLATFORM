-- Enable Row Level Security (RLS) on all tables
-- This fixes the issue where queries hang because RLS is disabled

-- Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on module_categories table
ALTER TABLE module_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on course_modules table
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on learning_modules table
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on course_enrollments table
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_progress table
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access to published content

-- Allow anyone to read published courses
CREATE POLICY "Public can view published courses"
ON courses FOR SELECT
USING (status = 'published');

-- Allow anyone to read all categories
CREATE POLICY "Public can view all categories"
ON module_categories FOR SELECT
USING (true);

-- Allow anyone to read course modules for published courses
CREATE POLICY "Public can view course modules"
ON course_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_modules.course_id
    AND courses.status = 'published'
  )
);

-- Allow anyone to read published learning modules
CREATE POLICY "Public can view published modules"
ON learning_modules FOR SELECT
USING (status = 'published');

-- Allow authenticated users to read their own enrollments
CREATE POLICY "Users can view their own enrollments"
ON course_enrollments FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own enrollments
CREATE POLICY "Users can create their own enrollments"
ON course_enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own enrollments
CREATE POLICY "Users can update their own enrollments"
ON course_enrollments FOR UPDATE
USING (auth.uid() = user_id);

-- Allow authenticated users to read their own progress
CREATE POLICY "Users can view their own progress"
ON user_progress FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own progress
CREATE POLICY "Users can create their own progress"
ON user_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own progress
CREATE POLICY "Users can update their own progress"
ON user_progress FOR UPDATE
USING (auth.uid() = user_id);
