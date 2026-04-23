-- ============================================================
-- Performance & Security Migration
-- Findings from live DB audit (2026-04-23):
--   1. Drop duplicate indexes that shadow existing UNIQUE constraints
--   2. Add missing FK indexes on high-frequency join columns
--   3. Fix views to respect RLS (security_invoker = true, Postgres 15+)
-- ============================================================


-- ============================================================
-- SECTION 1: Drop redundant indexes
-- Each of these duplicates a UNIQUE constraint or an identical
-- non-unique index. They cost write I/O on every INSERT/UPDATE
-- with zero query benefit.
-- ============================================================

-- profiles.username: UNIQUE profiles_username_key already covers all lookups
DROP INDEX IF EXISTS public.profiles_username_idx;
DROP INDEX IF EXISTS public.idx_profiles_username;

-- user_progress(user_id, module_id): two UNIQUE constraints already exist
DROP INDEX IF EXISTS public.idx_user_progress_user_module;

-- course_modules(course_id, order_index): UNIQUE course_modules_course_id_order_index_key exists
DROP INDEX IF EXISTS public.idx_course_modules_course_order;
DROP INDEX IF EXISTS public.idx_course_modules_order;

-- course_enrollments(user_id, course_id): UNIQUE constraints already exist
DROP INDEX IF EXISTS public.idx_course_enrollments_user_course;

-- user_certificates.verification_code: UNIQUE user_certificates_verification_code_key exists
DROP INDEX IF EXISTS public.idx_user_certificates_verification;

-- course_tags.slug: UNIQUE course_tags_slug_key exists
DROP INDEX IF EXISTS public.idx_course_tags_slug;

-- hashtags.tag: UNIQUE hashtags_tag_key exists
DROP INDEX IF EXISTS public.idx_hashtags_tag;

-- social_comments(post_id): idx_social_comments_post is an identical index
DROP INDEX IF EXISTS public.idx_social_comments_post_id;


-- ============================================================
-- SECTION 2: Add missing FK indexes
-- These FK columns had no supporting index, causing sequential
-- scans on JOINs and slower ON DELETE CASCADE operations.
-- Ordered by query-path criticality.
-- ============================================================

-- Chat (high frequency — every message load and room participant lookup)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id   ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id  ON public.chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id  ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_id ON public.chat_sessions(conversation_id);

-- Quiz structure (loaded on every quiz page)
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id          ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id          ON public.quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id     ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id   ON public.quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answer_options_question_id ON public.quiz_answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id      ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id      ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_user_answers_selected_option_id ON public.quiz_user_answers(selected_option_id);

-- Learning sessions (time-on-task tracking)
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id   ON public.learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_course_id ON public.learning_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_module_id ON public.learning_sessions(module_id);

-- SCORM (course_id lookup on registrations)
CREATE INDEX IF NOT EXISTS idx_scorm_registrations_course_id ON public.scorm_registrations(course_id);

-- xAPI (module and package lookups)
CREATE INDEX IF NOT EXISTS idx_xapi_statements_module_id        ON public.xapi_statements(module_id);
CREATE INDEX IF NOT EXISTS idx_xapi_statements_scorm_package_id ON public.xapi_statements(scorm_package_id);

-- Social comments (author lookup)
CREATE INDEX IF NOT EXISTS idx_social_comments_user_id ON public.social_comments(user_id);

-- Social topic follows (topic feed)
CREATE INDEX IF NOT EXISTS idx_social_topic_follows_topic_id ON public.social_topic_follows(topic_id);
CREATE INDEX IF NOT EXISTS idx_social_topic_follows_user_id  ON public.social_topic_follows(user_id);

-- Discussion (threaded replies, user threads)
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent_reply_id ON public.discussion_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_user_id         ON public.discussion_threads(user_id);

-- DM participants
CREATE INDEX IF NOT EXISTS idx_dm_participants_conversation_id ON public.dm_participants(conversation_id);

-- Policy polls structure
CREATE INDEX IF NOT EXISTS idx_poll_questions_poll_id   ON public.poll_questions(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_question_id ON public.poll_options(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_option_id ON public.poll_responses(option_id);

-- Post hashtags (fetch hashtags for a post)
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON public.post_hashtags(post_id);

-- User learning resources
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_course_id ON public.user_bookmarks(course_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_course_id     ON public.user_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_template_id ON public.user_certificates(template_id);

-- Impact and funds
CREATE INDEX IF NOT EXISTS idx_impact_points_user_id       ON public.impact_points(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_allocations_fund_id    ON public.fund_allocations(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_comments_fund_id       ON public.fund_comments(fund_id);
CREATE INDEX IF NOT EXISTS idx_public_projects_fund_id     ON public.public_projects(fund_id);
CREATE INDEX IF NOT EXISTS idx_project_media_project_id    ON public.project_media(project_id);
CREATE INDEX IF NOT EXISTS idx_project_media_update_id     ON public.project_media(update_id);

-- Moderation
CREATE INDEX IF NOT EXISTS idx_reports_reported_post_id ON public.reports(reported_post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);

-- Social civic features (created_by FKs)
CREATE INDEX IF NOT EXISTS idx_social_events_created_by        ON public.social_events(created_by);
CREATE INDEX IF NOT EXISTS idx_social_petitions_created_by     ON public.social_petitions(created_by);
CREATE INDEX IF NOT EXISTS idx_social_impact_reports_created_by ON public.social_impact_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_social_law_resources_created_by ON public.social_law_resources(created_by);

-- Mentions
CREATE INDEX IF NOT EXISTS idx_mentions_mentioner_user_id ON public.mentions(mentioner_user_id);

-- Misc
CREATE INDEX IF NOT EXISTS idx_scorm_packages_created_by   ON public.scorm_packages(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_archived_by   ON public.conversations(archived_by);


-- ============================================================
-- SECTION 3: Fix views — add security_invoker = true
-- Without this, views in the public schema run as the definer
-- and bypass RLS on every underlying table they touch.
-- Requires Postgres 15+ (this project runs Postgres 17).
-- ============================================================

-- learning_module_previews: exposes published modules to learners
CREATE OR REPLACE VIEW public.learning_module_previews
WITH (security_invoker = true)
AS
SELECT id,
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

-- course_details: aggregated course info used in admin/browse views
CREATE OR REPLACE VIEW public.course_details
WITH (security_invoker = true)
AS
SELECT c.id,
       c.title,
       c.description,
       c.overview,
       c.category_id,
       c.difficulty_level,
       c.estimated_duration_hours,
       c.prerequisites,
       c.learning_outcomes,
       c.author_id,
       c.status,
       c.review_status,
       c.published_at,
       c.featured,
       c.enrollment_count,
       c.view_count,
       c.created_at,
       c.updated_at,
       mc.name   AS category_name,
       mc.color  AS category_color,
       mc.icon   AS category_icon,
       p.full_name AS author_name,
       p.email     AS author_email,
       count(cm.module_id)  AS module_count,
       count(ce.user_id)    AS current_enrollments
FROM courses c
LEFT JOIN module_categories mc ON c.category_id = mc.id
LEFT JOIN profiles p            ON c.author_id = p.id
LEFT JOIN course_modules cm     ON c.id = cm.course_id
LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
GROUP BY c.id, mc.name, mc.color, mc.icon, p.full_name, p.email;

-- user_course_progress: per-user progress view used in dashboard
CREATE OR REPLACE VIEW public.user_course_progress
WITH (security_invoker = true)
AS
SELECT ce.id,
       ce.user_id,
       ce.course_id,
       ce.enrolled_at,
       ce.status,
       ce.progress_percentage,
       ce.completed_at,
       ce.certificate_issued,
       ce.last_accessed_at,
       ce.created_at,
       ce.updated_at,
       c.title               AS course_title,
       c.description         AS course_description,
       c.estimated_duration_hours,
       mc.name               AS category_name,
       calculate_course_progress(ce.user_id, ce.course_id) AS calculated_progress
FROM course_enrollments ce
JOIN courses c           ON ce.course_id = c.id
LEFT JOIN module_categories mc ON c.category_id = mc.id;

-- leaderboard_public: public leaderboard (reads from leaderboard view/table)
CREATE OR REPLACE VIEW public.leaderboard_public
WITH (security_invoker = true)
AS
SELECT user_id,
       email,
       full_name,
       total_xp,
       level,
       courses_completed,
       modules_completed,
       max_streak,
       total_badges,
       joined_at
FROM leaderboard;
