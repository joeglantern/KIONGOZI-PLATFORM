-- Fix RLS policy to allow enrolled users to see modules in their courses
-- This addresses the issue where draft modules in courses are not visible to enrolled students

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS learning_modules_select_published ON public.learning_modules;

-- Create updated policy that allows:
-- 1. Published modules (public access)
-- 2. Modules authored by the current user
-- 3. Modules visible to moderators/admins
-- 4. Modules in courses the user is enrolled in (NEW - fixes the root issue)
CREATE POLICY learning_modules_select_published ON public.learning_modules
FOR SELECT USING (
  status = 'published'
  OR author_id = auth.uid()
  OR public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin')
  OR EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.course_enrollments ce ON cm.course_id = ce.course_id
    WHERE cm.module_id = learning_modules.id
    AND ce.user_id = auth.uid()
  )
);

-- Also update the existing draft module to published status so it's immediately visible
UPDATE public.learning_modules
SET status = 'published', published_at = NOW()
WHERE id = '38869900-a31a-479a-96c4-2f92ea5f290d';
