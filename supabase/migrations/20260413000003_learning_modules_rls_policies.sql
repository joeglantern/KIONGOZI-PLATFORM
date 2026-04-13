-- RLS Policies for learning_modules and course_modules tables

-- ─────────────────────────────────────────
-- learning_modules
-- ─────────────────────────────────────────
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published modules are viewable by everyone" ON public.learning_modules;
DROP POLICY IF EXISTS "Instructors can insert their own modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Instructors can update their own modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Instructors can delete their own modules" ON public.learning_modules;

-- Anyone can read published modules; authors see their own drafts
CREATE POLICY "Published modules are viewable by everyone"
ON public.learning_modules FOR SELECT
USING (
    status = 'published'
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Instructors can create modules
CREATE POLICY "Instructors can insert their own modules"
ON public.learning_modules FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);

-- Instructors can update their own modules
CREATE POLICY "Instructors can update their own modules"
ON public.learning_modules FOR UPDATE
TO authenticated
USING (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);

-- Instructors can delete their own modules
CREATE POLICY "Instructors can delete their own modules"
ON public.learning_modules FOR DELETE
TO authenticated
USING (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);

-- ─────────────────────────────────────────
-- course_modules (join table)
-- ─────────────────────────────────────────
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course modules are viewable by everyone" ON public.course_modules;
DROP POLICY IF EXISTS "Instructors can manage their course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Instructors can insert course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Instructors can update course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Instructors can delete course modules" ON public.course_modules;

-- Anyone can read (needed for students viewing course outlines)
CREATE POLICY "Course modules are viewable by everyone"
ON public.course_modules FOR SELECT
USING (true);

-- Only the course author (instructor/admin) can link modules to their course
CREATE POLICY "Instructors can insert course modules"
ON public.course_modules FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_id
          AND author_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
);

CREATE POLICY "Instructors can update course modules"
ON public.course_modules FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_id
          AND author_id = auth.uid()
    )
);

CREATE POLICY "Instructors can delete course modules"
ON public.course_modules FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_id
          AND author_id = auth.uid()
    )
);
