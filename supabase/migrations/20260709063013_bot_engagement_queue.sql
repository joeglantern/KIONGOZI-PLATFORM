CREATE TABLE IF NOT EXISTS public.bot_engagement_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_table text NOT NULL
        CHECK (target_table IN ('social_posts', 'policy_polls', 'public_funds', 'public_projects')),
    target_record_id uuid NOT NULL,
    action_type text NOT NULL
        CHECK (action_type IN ('social_comment', 'poll_comment', 'fund_comment', 'project_update')),
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'drafted', 'approved', 'published', 'rejected', 'failed', 'skipped')),
    scheduled_for timestamptz NOT NULL DEFAULT now(),
    draft_content text,
    published_table_name text,
    published_record_key text,
    published_record_id uuid,
    model_used text,
    generated_at timestamptz,
    published_at timestamptz,
    error_message text,
    safety_notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_engagement_queue_status_due
    ON public.bot_engagement_queue(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_bot_engagement_queue_persona
    ON public.bot_engagement_queue(persona_user_id);

CREATE INDEX IF NOT EXISTS idx_bot_engagement_queue_target
    ON public.bot_engagement_queue(target_table, target_record_id);

CREATE TABLE IF NOT EXISTS public.bot_engagement_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    mode text NOT NULL DEFAULT 'draft'
        CHECK (mode IN ('draft', 'auto_publish', 'publish_approved')),
    requested_limit integer NOT NULL DEFAULT 0,
    planned_count integer NOT NULL DEFAULT 0,
    drafted_count integer NOT NULL DEFAULT 0,
    published_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    skipped_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed')),
    error_message text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bot_engagement_runs_started
    ON public.bot_engagement_runs(started_at DESC);

ALTER TABLE public.bot_engagement_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_engagement_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read bot engagement queue" ON public.bot_engagement_queue;
CREATE POLICY "Admins can read bot engagement queue"
ON public.bot_engagement_queue
FOR SELECT
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins can manage bot engagement queue" ON public.bot_engagement_queue;
CREATE POLICY "Admins can manage bot engagement queue"
ON public.bot_engagement_queue
FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins can read bot engagement runs" ON public.bot_engagement_runs;
CREATE POLICY "Admins can read bot engagement runs"
ON public.bot_engagement_runs
FOR SELECT
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins can manage bot engagement runs" ON public.bot_engagement_runs;
CREATE POLICY "Admins can manage bot engagement runs"
ON public.bot_engagement_runs
FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
