-- Course System Implementation - Phase 1
-- Add courses, course_modules, and course_enrollments tables
-- This migration maintains backward compatibility with existing modules

-- 1) Courses table - Main course entity
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  overview text, -- Rich content overview (markdown)
  category_id uuid REFERENCES public.module_categories(id) ON DELETE SET NULL,
  difficulty_level text NOT NULL DEFAULT 'beginner',
  estimated_duration_hours integer DEFAULT 10,
  prerequisites text[], -- Array of prerequisite course titles or skills
  learning_outcomes text[], -- Array of learning outcomes/objectives
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  review_status text NOT NULL DEFAULT 'draft', -- For content approval workflow
  published_at timestamptz,
  featured boolean DEFAULT false,
  enrollment_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraints for courses
ALTER TABLE public.courses
ADD CONSTRAINT courses_difficulty_chk CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.courses
ADD CONSTRAINT courses_status_chk CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.courses
ADD CONSTRAINT courses_review_status_chk CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected'));

ALTER TABLE public.courses
ADD CONSTRAINT courses_duration_chk CHECK (estimated_duration_hours > 0);

-- Create indexes for courses
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_author_id ON public.courses(author_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_review_status ON public.courses(review_status);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_courses_published_at ON public.courses(published_at DESC) WHERE published_at IS NOT NULL;

-- 2) Course-Module junction table - Many-to-many relationship
CREATE TABLE IF NOT EXISTS public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  is_required boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique relationships and ordering
  UNIQUE(course_id, module_id),
  UNIQUE(course_id, order_index)
);

-- Create indexes for course_modules
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_module_id ON public.course_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON public.course_modules(course_id, order_index);

-- 3) Course enrollments table - Track user enrollments
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  progress_percentage integer DEFAULT 0,
  completed_at timestamptz,
  certificate_issued boolean DEFAULT false,
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate enrollments
  UNIQUE(user_id, course_id)
);

-- Add constraints for course_enrollments
ALTER TABLE public.course_enrollments
ADD CONSTRAINT course_enrollments_status_chk CHECK (status IN ('active', 'completed', 'dropped', 'suspended'));

ALTER TABLE public.course_enrollments
ADD CONSTRAINT course_enrollments_progress_chk CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Create indexes for course_enrollments
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_enrolled_at ON public.course_enrollments(enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_completed ON public.course_enrollments(completed_at DESC) WHERE completed_at IS NOT NULL;

-- 4) Add helpful functions for course management

-- Function to update course enrollment count
CREATE OR REPLACE FUNCTION public.update_course_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses 
    SET enrollment_count = enrollment_count + 1,
        updated_at = now()
    WHERE id = NEW.course_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses 
    SET enrollment_count = GREATEST(enrollment_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update enrollment count
DROP TRIGGER IF EXISTS trigger_update_course_enrollment_count ON public.course_enrollments;
CREATE TRIGGER trigger_update_course_enrollment_count
  AFTER INSERT OR DELETE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_course_enrollment_count();

-- Function to calculate course progress based on module completion
CREATE OR REPLACE FUNCTION public.calculate_course_progress(p_user_id uuid, p_course_id uuid)
RETURNS integer AS $$
DECLARE
  total_modules integer;
  completed_modules integer;
  progress_percentage integer;
BEGIN
  -- Get total required modules in the course
  SELECT COUNT(*) INTO total_modules
  FROM public.course_modules cm
  WHERE cm.course_id = p_course_id AND cm.is_required = true;
  
  -- If no required modules, return 0
  IF total_modules = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get completed required modules for the user
  SELECT COUNT(*) INTO completed_modules
  FROM public.course_modules cm
  JOIN public.user_progress up ON cm.module_id = up.module_id
  WHERE cm.course_id = p_course_id 
    AND cm.is_required = true
    AND up.user_id = p_user_id 
    AND up.status = 'completed';
  
  -- Calculate percentage
  progress_percentage := ROUND((completed_modules::decimal / total_modules::decimal) * 100);
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Insert sample course data for testing (optional - can be removed in production)
-- This helps validate the schema works correctly

INSERT INTO public.courses (
  title, 
  description, 
  overview,
  category_id, 
  difficulty_level, 
  estimated_duration_hours,
  prerequisites,
  learning_outcomes,
  author_id,
  status,
  featured
) VALUES (
  'Green Technology Foundations',
  'A comprehensive introduction to sustainable technology and environmental solutions.',
  '# Green Technology Foundations

This course provides a comprehensive introduction to sustainable technology and environmental solutions. You''ll learn about renewable energy systems, sustainable agriculture practices, and digital tools for environmental monitoring.

## What You''ll Learn
- Fundamentals of renewable energy
- Sustainable agriculture techniques  
- Environmental monitoring tools
- Green business practices

## Prerequisites
- Basic understanding of environmental concepts
- No technical background required

## Course Structure
This course consists of multiple modules covering different aspects of green technology.',
  (SELECT id FROM public.module_categories WHERE name = 'Green Economy Fundamentals' LIMIT 1),
  'beginner',
  20,
  ARRAY['Basic environmental awareness'],
  ARRAY[
    'Understand renewable energy principles',
    'Apply sustainable agriculture practices',
    'Use digital tools for environmental monitoring',
    'Develop green business strategies'
  ],
  (SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator', 'content_editor') LIMIT 1),
  'published',
  true
) ON CONFLICT DO NOTHING;

-- Add some modules to the sample course (if sample course was created)
INSERT INTO public.course_modules (course_id, module_id, order_index, is_required)
SELECT 
  c.id as course_id,
  lm.id as module_id,
  ROW_NUMBER() OVER (ORDER BY lm.created_at) as order_index,
  true as is_required
FROM public.courses c
CROSS JOIN public.learning_modules lm
WHERE c.title = 'Green Technology Foundations'
  AND lm.category_id = (SELECT id FROM public.module_categories WHERE name = 'Green Economy Fundamentals' LIMIT 1)
  AND lm.status = 'published'
LIMIT 5
ON CONFLICT DO NOTHING;

-- 6) Add helpful views for common queries

-- View for course details with category and author info
CREATE OR REPLACE VIEW public.course_details AS
SELECT 
  c.*,
  mc.name as category_name,
  mc.color as category_color,
  mc.icon as category_icon,
  p.full_name as author_name,
  p.email as author_email,
  COUNT(cm.module_id) as module_count,
  COUNT(ce.user_id) as current_enrollments
FROM public.courses c
LEFT JOIN public.module_categories mc ON c.category_id = mc.id
LEFT JOIN public.profiles p ON c.author_id = p.id
LEFT JOIN public.course_modules cm ON c.id = cm.course_id
LEFT JOIN public.course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
GROUP BY c.id, mc.name, mc.color, mc.icon, p.full_name, p.email;

-- View for user course progress
CREATE OR REPLACE VIEW public.user_course_progress AS
SELECT 
  ce.*,
  c.title as course_title,
  c.description as course_description,
  c.estimated_duration_hours,
  mc.name as category_name,
  public.calculate_course_progress(ce.user_id, ce.course_id) as calculated_progress
FROM public.course_enrollments ce
JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN public.module_categories mc ON c.category_id = mc.id;

-- 7) Update existing tables to maintain compatibility (if needed)
-- Add course_id to existing user_progress for future course-aware progress tracking
-- This is optional and maintains backward compatibility

DO $$
BEGIN
  -- Check if course_id column doesn't exist in user_progress
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' 
    AND column_name = 'course_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_progress 
    ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON public.user_progress(course_id);
  END IF;
END $$;

-- Add updated_at trigger for courses table
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_enrollments_updated_at ON public.course_enrollments;
CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Course system tables created successfully!';
  RAISE NOTICE 'Tables added: courses, course_modules, course_enrollments';
  RAISE NOTICE 'Views added: course_details, user_course_progress';
  RAISE NOTICE 'Functions added: update_course_enrollment_count, calculate_course_progress';
  RAISE NOTICE 'All existing functionality preserved - no breaking changes';
END $$;
