-- Allow truly anonymous poll voting.
-- Run in: Supabase Dashboard → SQL Editor

-- 1. Make user_id nullable on both tables (anon submissions have no user_id)
ALTER TABLE public.poll_responses   ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.poll_submissions ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add an anon_session_id column (a UUID generated client-side and stored in
--    the browser's localStorage) so we can soft-dedupe anonymous votes later
--    without requiring identity.
ALTER TABLE public.poll_responses   ADD COLUMN IF NOT EXISTS anon_session_id TEXT;
ALTER TABLE public.poll_submissions ADD COLUMN IF NOT EXISTS anon_session_id TEXT;

-- 3. Open RLS on INSERT for anon + authenticated.
--    The check: either it's an authenticated user inserting their own row,
--    OR it's a fully-anonymous row (no user_id) with an anon_session_id present.
DROP POLICY IF EXISTS "anon_or_self_insert_responses"   ON public.poll_responses;
DROP POLICY IF EXISTS "anon_or_self_insert_submissions" ON public.poll_submissions;

CREATE POLICY "anon_or_self_insert_responses"
  ON public.poll_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
       (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL     AND user_id IS NULL AND anon_session_id IS NOT NULL)
  );

CREATE POLICY "anon_or_self_insert_submissions"
  ON public.poll_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
       (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL     AND user_id IS NULL AND anon_session_id IS NOT NULL)
  );

-- 4. Allow anon + authenticated to SELECT submissions and responses (so the page
--    can read aggregate state). Skip if your existing read policy already covers anon.
--    Uncomment the two blocks below if needed:
-- DROP POLICY IF EXISTS "public_read_poll_responses"   ON public.poll_responses;
-- CREATE POLICY "public_read_poll_responses"   ON public.poll_responses   FOR SELECT TO anon, authenticated USING (true);
-- DROP POLICY IF EXISTS "public_read_poll_submissions" ON public.poll_submissions;
-- CREATE POLICY "public_read_poll_submissions" ON public.poll_submissions FOR SELECT TO anon, authenticated USING (true);
