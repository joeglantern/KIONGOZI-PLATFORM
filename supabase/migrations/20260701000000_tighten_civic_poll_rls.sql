-- Tighten civic RLS: poll questions and options may only be created, updated or
-- deleted by the OWNER of the parent poll — not by any authenticated user, as
-- the original crowd-sourced policies allowed.
--
-- Scope: LMS-owned civic tables only. No table drops (the database is shared
-- across apps per DATABASE_MAP.md). Idempotent: DROP POLICY IF EXISTS first.

-- ─────────────────────────────────────────────────────────────
-- Prerequisite: the vote-count trigger writes to poll_options on every vote.
-- It ran as the (non-owner) voter, so once we restrict UPDATE on poll_options
-- to the poll owner it would be blocked by RLS. Make it SECURITY DEFINER with a
-- locked search_path so it bypasses RLS and always increments correctly.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_option_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.option_id IS NOT NULL THEN
        UPDATE public.poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    END IF;
    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- poll_questions: writes require ownership of the parent poll.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.poll_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone auth can create questions" ON public.poll_questions;
DROP POLICY IF EXISTS "Authenticated create questions" ON public.poll_questions;
DROP POLICY IF EXISTS "Poll owner create questions" ON public.poll_questions;
CREATE POLICY "Poll owner create questions" ON public.poll_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.policy_polls p
            WHERE p.id = poll_id AND p.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Poll owner update questions" ON public.poll_questions;
CREATE POLICY "Poll owner update questions" ON public.poll_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.policy_polls p
            WHERE p.id = poll_id AND p.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Poll owner delete questions" ON public.poll_questions;
CREATE POLICY "Poll owner delete questions" ON public.poll_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.policy_polls p
            WHERE p.id = poll_id AND p.created_by = auth.uid()
        )
    );

-- ─────────────────────────────────────────────────────────────
-- poll_options: writes require ownership of the poll behind the question.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone auth can create options" ON public.poll_options;
DROP POLICY IF EXISTS "Authenticated create options" ON public.poll_options;
DROP POLICY IF EXISTS "Poll owner create options" ON public.poll_options;
CREATE POLICY "Poll owner create options" ON public.poll_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.poll_questions q
            JOIN public.policy_polls p ON p.id = q.poll_id
            WHERE q.id = question_id AND p.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Poll owner update options" ON public.poll_options;
CREATE POLICY "Poll owner update options" ON public.poll_options
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.poll_questions q
            JOIN public.policy_polls p ON p.id = q.poll_id
            WHERE q.id = question_id AND p.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Poll owner delete options" ON public.poll_options;
CREATE POLICY "Poll owner delete options" ON public.poll_options
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.poll_questions q
            JOIN public.policy_polls p ON p.id = q.poll_id
            WHERE q.id = question_id AND p.created_by = auth.uid()
        )
    );
