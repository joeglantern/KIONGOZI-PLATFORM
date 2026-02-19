-- Database Improvements for Progress Tracking System
-- Kiongozi LMS
-- Date: 2026-02-11

-- ============================================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================================

-- Index for user_progress lookups by user and module
CREATE INDEX IF NOT EXISTS idx_user_progress_user_module
ON user_progress(user_id, module_id);

-- Index for user_progress lookups by module
CREATE INDEX IF NOT EXISTS idx_user_progress_module
ON user_progress(module_id);

-- Index for user_progress status filtering
CREATE INDEX IF NOT EXISTS idx_user_progress_status
ON user_progress(status) WHERE status = 'completed';

-- Index for course_enrollments lookups
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course
ON course_enrollments(user_id, course_id);

-- Index for course_enrollments by status
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status
ON course_enrollments(status);

-- ============================================================================
-- 2. UNIQUE CONSTRAINTS (if not already present)
-- ============================================================================

-- Ensure one progress record per user per module
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_module_progress
ON user_progress(user_id, module_id);

-- Ensure one enrollment per user per course
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_course_enrollment
ON course_enrollments(user_id, course_id);

-- ============================================================================
-- 3. AUTOMATIC PROGRESS UPDATE TRIGGER
-- ============================================================================

-- Function to automatically update course progress when module progress changes
CREATE OR REPLACE FUNCTION update_course_progress_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id UUID;
  v_module_ids UUID[];
  v_completed_count INT;
  v_total_count INT;
  v_progress_percentage INT;
BEGIN
  -- Get course_id from course_modules
  SELECT cm.course_id INTO v_course_id
  FROM course_modules cm
  WHERE cm.learning_modules = NEW.module_id
  LIMIT 1;

  -- If module is not part of any course, skip
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get all module IDs in the course
  SELECT ARRAY_AGG(cm.learning_modules) INTO v_module_ids
  FROM course_modules cm
  WHERE cm.course_id = v_course_id;

  -- Count total and completed modules
  v_total_count := ARRAY_LENGTH(v_module_ids, 1);

  SELECT COUNT(*) INTO v_completed_count
  FROM user_progress up
  WHERE up.user_id = NEW.user_id
    AND up.module_id = ANY(v_module_ids)
    AND up.status = 'completed';

  -- Calculate progress percentage
  IF v_total_count > 0 THEN
    v_progress_percentage := ROUND((v_completed_count::NUMERIC / v_total_count) * 100);
  ELSE
    v_progress_percentage := 0;
  END IF;

  -- Update or insert course enrollment
  INSERT INTO course_enrollments (
    user_id,
    course_id,
    progress_percentage,
    status,
    completed_at
  ) VALUES (
    NEW.user_id,
    v_course_id,
    v_progress_percentage,
    CASE WHEN v_progress_percentage = 100 THEN 'completed' ELSE 'active' END,
    CASE WHEN v_progress_percentage = 100 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    progress_percentage = EXCLUDED.progress_percentage,
    status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic course progress updates
DROP TRIGGER IF EXISTS update_course_progress_trigger ON user_progress;

CREATE TRIGGER update_course_progress_trigger
AFTER INSERT OR UPDATE OF status ON user_progress
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_course_progress_trigger_fn();

-- ============================================================================
-- 4. ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on user_progress table
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress
CREATE POLICY user_progress_select_own ON user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY user_progress_insert_own ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress
CREATE POLICY user_progress_update_own ON user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all progress
CREATE POLICY user_progress_select_admin ON user_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Enable RLS on course_enrollments table
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own enrollments
CREATE POLICY course_enrollments_select_own ON course_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own enrollments
CREATE POLICY course_enrollments_insert_own ON course_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own enrollments
CREATE POLICY course_enrollments_update_own ON course_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all enrollments
CREATE POLICY course_enrollments_select_admin ON course_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 5. DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure progress_percentage is between 0 and 100
ALTER TABLE user_progress
  ADD CONSTRAINT check_progress_percentage_range
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

ALTER TABLE course_enrollments
  ADD CONSTRAINT check_course_progress_percentage_range
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Ensure status is valid
ALTER TABLE user_progress
  ADD CONSTRAINT check_progress_status
  CHECK (status IN ('active', 'completed'));

ALTER TABLE course_enrollments
  ADD CONSTRAINT check_enrollment_status
  CHECK (status IN ('active', 'completed', 'suspended'));

-- ============================================================================
-- 6. HELPFUL VIEWS
-- ============================================================================

-- View: User progress summary
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT
  p.id,
  p.email,
  COUNT(DISTINCT ce.course_id) as enrolled_courses,
  COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.course_id END) as completed_courses,
  COUNT(DISTINCT up.module_id) as modules_started,
  COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.module_id END) as modules_completed,
  AVG(ce.progress_percentage)::INT as avg_course_progress
FROM profiles p
LEFT JOIN course_enrollments ce ON ce.user_id = p.id
LEFT JOIN user_progress up ON up.user_id = p.id
GROUP BY p.id, p.email;

-- View: Course enrollment details
CREATE OR REPLACE VIEW course_enrollment_details AS
SELECT
  ce.id,
  ce.user_id,
  p.email,
  ce.course_id,
  c.title as course_title,
  ce.progress_percentage,
  ce.status,
  ce.enrolled_at,
  ce.completed_at,
  (SELECT COUNT(*) FROM course_modules cm WHERE cm.course_id = ce.course_id) as total_modules,
  (SELECT COUNT(*) FROM user_progress up
   JOIN course_modules cm ON cm.learning_modules = up.module_id
   WHERE up.user_id = ce.user_id
   AND cm.course_id = ce.course_id
   AND up.status = 'completed') as completed_modules
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.user_id
JOIN courses c ON c.id = ce.course_id;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- To apply these improvements:
-- 1. Run this SQL script in Supabase SQL Editor
-- 2. Monitor performance improvements with EXPLAIN ANALYZE
-- 3. Adjust indexes based on actual query patterns
-- 4. Consider partitioning user_progress table if it grows very large (>1M rows)
--
-- Performance Tips:
-- - The trigger will automatically update course progress, so manual updates are no longer needed
-- - RLS policies ensure data security at the database level
-- - Indexes will significantly speed up progress lookups and calculations
-- - Views provide convenient access to commonly needed summary data
--
-- ============================================================================
