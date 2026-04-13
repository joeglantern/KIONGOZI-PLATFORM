-- RLS Policies for the courses table
-- Allows instructors/admins to create and manage their own courses

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow idempotent re-runs
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Instructors can insert their own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update their own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete their own courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;

-- Anyone can view published courses; authors can see their own drafts
CREATE POLICY "Courses are viewable by everyone"
ON public.courses FOR SELECT
USING (
    status = 'published'
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Instructors can create courses (their own)
CREATE POLICY "Instructors can insert their own courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);

-- Instructors can update only their own courses
CREATE POLICY "Instructors can update their own courses"
ON public.courses FOR UPDATE
TO authenticated
USING (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);

-- Instructors can delete only their own courses
CREATE POLICY "Instructors can delete their own courses"
ON public.courses FOR DELETE
TO authenticated
USING (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);
