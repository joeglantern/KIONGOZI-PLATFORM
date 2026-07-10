CREATE TABLE IF NOT EXISTS public.course_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id uuid REFERENCES public.learning_modules(id) ON DELETE SET NULL,
    file_type text NOT NULL
        CHECK (file_type IN ('pdf', 'pptx', 'infographic', 'scorm', 'video', 'image', 'other')),
    purpose text NOT NULL
        CHECK (purpose IN ('learner_guide', 'facilitator_deck', 'quick_reference', 'interactive_scorm', 'companion_visual', 'course_video', 'other')),
    version text NOT NULL DEFAULT 'v1',
    title text NOT NULL,
    description text,
    storage_bucket text NOT NULL DEFAULT 'courses',
    storage_path text NOT NULL,
    public_url text NOT NULL,
    replaces_url text,
    source text NOT NULL DEFAULT 'generated_course_upgrade',
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, file_type, purpose, version)
);

CREATE INDEX IF NOT EXISTS idx_course_assets_course
    ON public.course_assets(course_id);

CREATE INDEX IF NOT EXISTS idx_course_assets_active
    ON public.course_assets(course_id, is_active);

ALTER TABLE public.course_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published course assets are readable" ON public.course_assets;
CREATE POLICY "Published course assets are readable"
ON public.course_assets
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins and instructors manage course assets" ON public.course_assets;
CREATE POLICY "Admins and instructors manage course assets"
ON public.course_assets
FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'instructor')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'instructor')
);
