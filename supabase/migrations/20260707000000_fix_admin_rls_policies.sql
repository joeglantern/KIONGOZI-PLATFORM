-- Fix admin RLS policies to check profiles.role instead of JWT metadata
-- This aligns with the admin guard implementation in the app

-- Update policies table RLS
DROP POLICY IF EXISTS "Admin write policies" ON public.policies;
CREATE POLICY "Admin write policies" ON public.policies FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Update policy_briefs table RLS
DROP POLICY IF EXISTS "Public read published briefs" ON public.policy_briefs;
CREATE POLICY "Public read published briefs" ON public.policy_briefs FOR SELECT USING (
    status = 'published'
    OR auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Manage briefs" ON public.policy_briefs;
CREATE POLICY "Manage briefs" ON public.policy_briefs FOR UPDATE
USING (
    auth.uid() = generated_by
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
    auth.uid() = generated_by
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Ensure all admin API tables have proper RLS
ALTER TABLE public.policy_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_law_resources ENABLE ROW LEVEL SECURITY;

-- Policy polls - admins can create/edit/delete
DROP POLICY IF EXISTS "Auth read policy polls" ON public.policy_polls;
CREATE POLICY "Auth read policy polls" ON public.policy_polls FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage policy polls" ON public.policy_polls;
CREATE POLICY "Admin manage policy polls" ON public.policy_polls FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Poll comments - authenticated users can read, only their own or admins can manage
DROP POLICY IF EXISTS "Public read poll comments" ON public.poll_comments;
CREATE POLICY "Public read poll comments" ON public.poll_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owner manage poll comments" ON public.poll_comments;
CREATE POLICY "Owner manage poll comments" ON public.poll_comments FOR DELETE
USING (
    auth.uid() = user_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Social law resources - authenticated read, admin write
DROP POLICY IF EXISTS "Auth read resources" ON public.social_law_resources;
CREATE POLICY "Auth read resources" ON public.social_law_resources FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage resources" ON public.social_law_resources;
CREATE POLICY "Admin manage resources" ON public.social_law_resources FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
