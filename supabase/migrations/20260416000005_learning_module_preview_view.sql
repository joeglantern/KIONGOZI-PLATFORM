-- Split public lesson previews from private lesson body access.
-- Browser clients should use learning_module_previews for outlines/cards
-- and server routes for full lesson content.

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published modules are viewable by everyone" ON public.learning_modules;
DROP POLICY IF EXISTS "Authors and admins can view modules directly" ON public.learning_modules;

CREATE POLICY "Authors and admins can view modules directly"
ON public.learning_modules FOR SELECT
TO authenticated
USING (
    auth.uid() = author_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

DROP VIEW IF EXISTS public.learning_module_previews;

CREATE VIEW public.learning_module_previews AS
SELECT
    id,
    author_id,
    title,
    description,
    estimated_duration_minutes,
    media_type,
    status,
    created_at,
    updated_at
FROM public.learning_modules
WHERE status = 'published';

GRANT SELECT ON public.learning_module_previews TO anon, authenticated;
