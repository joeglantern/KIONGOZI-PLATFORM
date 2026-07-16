-- =====================================================================
-- KIONGOZI LMS, DATABASE AUDIT REMEDIATION
-- Project: jdncfyagppohtksogzkx (Kiongozi Platform, SHARED by LMS + chatbot + social + civic apps)
-- Generated: 2026-06-19
--
-- This database is SHARED by multiple applications. Review each tier before
-- applying. Statements are idempotent (IF EXISTS / IF NOT EXISTS) where possible.
-- Recommended: run in a staging branch first, then merge.
-- =====================================================================


-- =====================================================================
-- TIER 1, ZERO-RISK (advisor-recommended, behavior-preserving). Apply anytime.
-- =====================================================================

-- 1.1 Drop duplicate indexes/constraints (Supabase advisor: duplicate_index).
--     Each pair is byte-identical; the surviving one preserves all behavior.
ALTER TABLE public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_user_course_unique;  -- keeps *_user_id_course_id_key
ALTER TABLE public.user_progress      DROP CONSTRAINT IF EXISTS user_progress_user_module_unique;        -- keeps *_user_id_module_id_key
DROP INDEX IF EXISTS public.quizzes_module_id_idx;                                                        -- keeps idx_quizzes_module_id

-- 1.2 Add covering indexes for unindexed foreign keys (advisor: unindexed_foreign_keys).
--     Speeds up joins and ON DELETE/UPDATE cascade checks. Pure win.
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id                      ON public.blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id                     ON public.bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_deliberation_recommendations_created_by ON public.deliberation_recommendations(created_by);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_user_id              ON public.discussion_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_alerts_fund_id                   ON public.fund_alerts(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_comments_user_id                 ON public.fund_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_mutes_muted_id                        ON public.mutes(muted_id);
CREATE INDEX IF NOT EXISTS idx_policies_created_by                   ON public.policies(created_by);
CREATE INDEX IF NOT EXISTS idx_policy_briefs_generated_by            ON public.policy_briefs(generated_by);
CREATE INDEX IF NOT EXISTS idx_policy_briefs_poll_id                 ON public.policy_briefs(poll_id);
CREATE INDEX IF NOT EXISTS idx_policy_polls_created_by               ON public.policy_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_poll_comment_votes_user_id            ON public.poll_comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_parent_id               ON public.poll_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_poll_id                 ON public.poll_comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_question_id             ON public.poll_comments(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_user_id                 ON public.poll_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_user_id                ON public.poll_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_by                    ON public.profiles(banned_by);
CREATE INDEX IF NOT EXISTS idx_profiles_deactivated_by               ON public.profiles(deactivated_by);
CREATE INDEX IF NOT EXISTS idx_project_media_uploaded_by             ON public.project_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_update_upvotes_user_id        ON public.project_update_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_submitted_by          ON public.project_updates(submitted_by);
CREATE INDEX IF NOT EXISTS idx_public_funds_created_by               ON public.public_funds(created_by);
CREATE INDEX IF NOT EXISTS idx_public_projects_created_by            ON public.public_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_recommendation_votes_user_id          ON public.recommendation_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id          ON public.review_helpful_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_conversation_id           ON public.system_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved_by               ON public.system_logs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id                   ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by            ON public.system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_user_activities_conversation_id       ON public.user_activities(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_module_id                  ON public.user_notes(module_id);

-- NOTE: 96 "unused_index" entries were also reported by the advisor. Do NOT bulk-drop
-- them, several back features that simply have low traffic today. Review individually
-- against pg_stat_user_indexes.idx_scan over a representative period before dropping.


-- =====================================================================
-- TIER 2, SECURITY HARDENING (review impact on sibling apps first).
-- =====================================================================

-- 2.1 CRITICAL: tables with RLS DISABLED in a public (PostgREST-exposed) schema.
--     Currently readable AND writable by anyone holding the anon key.
--     Enabling RLS with a read-only policy preserves public reads, blocks anon writes.
--     >>> Verify which app writes to these before applying; add INSERT policies as needed. <<<
ALTER TABLE public.welfare_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read welfare_funds" ON public.welfare_funds FOR SELECT USING (true);

ALTER TABLE public.fund_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fund_alerts"   ON public.fund_alerts FOR SELECT USING (true);
-- fund_alerts is reporter-submitted; uncomment if anonymous reporting is intended:
-- CREATE POLICY "Anyone can file a fund alert" ON public.fund_alerts FOR INSERT WITH CHECK (true);

ALTER TABLE public.youth_inputs ENABLE ROW LEVEL SECURITY;
-- youth_inputs holds raw public submissions (possible PII). Default to no anon read.
CREATE POLICY "Anyone can submit youth input" ON public.youth_inputs FOR INSERT WITH CHECK (true);
-- Admin/analyst read should go through a SECURITY DEFINER RPC or service role.

-- 2.2 quiz_user_answers: RLS enabled but ZERO policies (table is fully locked out).
--     This table is part of an ABANDONED quiz design (see Tier 3); the live app uses
--     quiz_options/quiz_attempts. If you keep it, add a policy; otherwise drop it (Tier 3).
-- CREATE POLICY "Users read own quiz answers" ON public.quiz_user_answers
--   FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.quiz_attempts a WHERE a.id = attempt_id));

-- 2.3 Defense-in-depth: privileged SECURITY DEFINER functions are currently EXECUTE-able
--     by anon. Their bodies DO check jwt_role(), so this is not an open exploit, but anon
--     has no business calling them. Revoke to remove the attack surface.
REVOKE EXECUTE ON FUNCTION public.ban_user(uuid, uuid, text)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.unban_user(uuid, uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_user_role(uuid, uuid, text)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_user(uuid, uuid)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.deactivate_user(uuid, uuid)          FROM anon;
-- (Adjust argument signatures if overloads exist; check with \df in psql.)

-- 2.4 function_search_path_mutable (57 functions). Pin search_path to prevent
--     search-path hijacking of SECURITY DEFINER functions. Apply per function, e.g.:
-- ALTER FUNCTION public.award_lms_action(uuid, integer) SET search_path = public, pg_temp;
--     Generate the full list with:
--     SELECT 'ALTER FUNCTION '||oid::regprocedure||' SET search_path = public, pg_temp;'
--     FROM pg_proc WHERE pronamespace='public'::regnamespace AND proconfig IS NULL;

-- 2.5 Over-permissive policies flagged by advisor (review intent):
--     - notifications "System can insert notifications" : INSERT WITH CHECK (true)
--       -> should be restricted to service_role, or CHECK (auth.uid() = user_id).
--     - dm_conversations "Anyone can create a conversation" : INSERT WITH CHECK (true)
--     - leaderboard (materialized view) is exposed via the API (materialized_view_in_api).
--       Consider revoking SELECT from anon/authenticated and serving via leaderboard_public.

-- 2.6 auth_rls_initplan (200) + multiple_permissive_policies (169): the single biggest
--     query-performance lever. Replace bare auth.uid()/auth.role() in RLS policies with
--     (SELECT auth.uid()) so the planner evaluates them once per query instead of per row,
--     and consolidate redundant permissive policies. Do this table-by-table.


-- =====================================================================
-- TIER 3, CLEANUP (DESTRUCTIVE, back up first; confirm no sibling app uses them).
-- =====================================================================

-- 3.1 Orphaned / redundant tables (no application code references them; verified
--     against both the LMS and landing repos). Back up, then drop.
--     * quiz_answer_options / quiz_user_answers : superseded parallel quiz schema
--       (live app uses quiz_options + quiz_attempts). 24 / 2 rows.
--     * module_tags : superseded by learning_modules.keywords (text[]).
-- CREATE TABLE _archive.quiz_answer_options AS TABLE public.quiz_answer_options;  -- backup
-- DROP TABLE IF EXISTS public.quiz_user_answers;   -- drop child first (FK to quiz_answer_options)
-- DROP TABLE IF EXISTS public.quiz_answer_options;
-- DROP TABLE IF EXISTS public.module_tags;

-- 3.2 notifications: REDUNDANT boolean columns. The app reads/writes ONLY `is_read`,
--     but the table also has `read` (NOT NULL) and `read_at`. They drift because the
--     app never updates `read`. Pick ONE canonical column. To standardize on `is_read`:
-- UPDATE public.notifications SET is_read = COALESCE(is_read, read);   -- reconcile history
-- ALTER TABLE public.notifications DROP COLUMN read;
-- ALTER TABLE public.notifications DROP COLUMN read_at;   -- only if unused server-side
-- (Or the reverse, if server-side code depends on `read`. Grep all repos sharing this DB first.)

-- 3.3 Other orphaned LMS-domain features present in the DB (with triggers) but with NO
--     frontend in either audited repo. Decide keep-and-build vs. drop:
--       discussion_threads / discussion_replies / discussion_votes (course forum)
--       review_helpful_votes (course-review helpfulness)
--       learning_sessions (xAPI/SCORM session log; app uses scorm_registrations instead)
--       course_tags / course_tag_mappings (only the BROKEN landing /api/courses touches them)
--       user_notes (note-taking; /notes UI does not query it)
