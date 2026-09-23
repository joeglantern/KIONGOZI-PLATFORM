-- Optional political party captured at onboarding.
--
-- Party affiliation is political opinion, so it lives outside `profiles`,
-- whose rows other users can still read (see
-- 20260814000000_lock_down_pii_exposure.sql). A column-level REVOKE on
-- profiles wouldn't help: it is a no-op while anon/authenticated keep the
-- table-level SELECT grant Supabase gives them. Here RLS limits every row to
-- its owner; staff read through the service role.

CREATE TABLE IF NOT EXISTS public.learner_political_affiliation (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  political_party text CHECK (political_party IS NULL OR char_length(political_party) <= 120),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_political_affiliation ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.learner_political_affiliation FROM anon;

CREATE POLICY "Owner reads own affiliation"
  ON public.learner_political_affiliation FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Owner inserts own affiliation"
  ON public.learner_political_affiliation FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Owner updates own affiliation"
  ON public.learner_political_affiliation FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Owner deletes own affiliation"
  ON public.learner_political_affiliation FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
