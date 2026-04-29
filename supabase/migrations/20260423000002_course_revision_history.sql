-- Lightweight revision history for course authoring.
-- Captures periodic snapshots for course settings, lessons, quizzes, and publish actions.

CREATE TABLE IF NOT EXISTS public.course_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    entity_type text NOT NULL CHECK (entity_type IN ('course', 'module', 'quiz', 'publish', 'scorm')),
    entity_id uuid,
    summary text NOT NULL,
    snapshot jsonb,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_course_revisions_course_created_at
    ON public.course_revisions(course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_revisions_entity_created_at
    ON public.course_revisions(course_id, entity_type, entity_id, created_at DESC);

ALTER TABLE public.course_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course authors and admins can view course revisions" ON public.course_revisions;
CREATE POLICY "Course authors and admins can view course revisions"
ON public.course_revisions FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_revisions.course_id
          AND c.author_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Course authors and admins can insert course revisions" ON public.course_revisions;
CREATE POLICY "Course authors and admins can insert course revisions"
ON public.course_revisions FOR INSERT
WITH CHECK (
    created_by = auth.uid()
    AND (
        EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE c.id = course_revisions.course_id
              AND c.author_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    )
);
