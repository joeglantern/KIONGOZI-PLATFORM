-- ============================================================
-- Civic Engagement Features: Policy Pulse, Funds Tracker, Project Monitor
-- ============================================================

-- ─────────────────────────────────────────
-- FEATURE 1: Youth Policy Pulse
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS policy_polls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    category text NOT NULL DEFAULT 'general',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    closes_at timestamptz,
    response_count int DEFAULT 0,
    ai_insights text,
    insights_generated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES policy_polls(id) ON DELETE CASCADE NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL DEFAULT 'single_choice'
        CHECK (question_type IN ('single_choice', 'multiple_choice', 'scale', 'text')),
    question_order int DEFAULT 0,
    required boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id uuid REFERENCES poll_questions(id) ON DELETE CASCADE NOT NULL,
    option_text text NOT NULL,
    option_order int DEFAULT 0,
    vote_count int DEFAULT 0
);

-- NOTE: No UNIQUE on (question_id, user_id) — multi_choice questions allow multiple rows per user.
-- One-response-per-user-per-poll uniqueness is enforced by poll_submissions instead.
CREATE TABLE IF NOT EXISTS poll_responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES policy_polls(id) ON DELETE CASCADE NOT NULL,
    question_id uuid REFERENCES poll_questions(id) ON DELETE CASCADE NOT NULL,
    option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE,
    text_response text,
    scale_value int CHECK (scale_value BETWEEN 1 AND 10),
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Track who has completed a full poll (to show results)
CREATE TABLE IF NOT EXISTS poll_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES policy_polls(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (poll_id, user_id)
);

-- Indexes for common filters / joins
CREATE INDEX IF NOT EXISTS idx_poll_questions_poll ON poll_questions(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_question ON poll_options(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_question ON poll_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_user ON poll_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_submissions_user ON poll_submissions(user_id);

-- Trigger: increment response_count on submission
CREATE OR REPLACE FUNCTION increment_poll_response_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE policy_polls SET response_count = response_count + 1 WHERE id = NEW.poll_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_poll_response_count ON poll_submissions;
CREATE TRIGGER trg_poll_response_count
AFTER INSERT ON poll_submissions
FOR EACH ROW EXECUTE FUNCTION increment_poll_response_count();

-- Trigger: increment option vote_count
CREATE OR REPLACE FUNCTION increment_option_vote_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.option_id IS NOT NULL THEN
        UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_option_vote_count ON poll_responses;
CREATE TRIGGER trg_option_vote_count
AFTER INSERT ON poll_responses
FOR EACH ROW EXECUTE FUNCTION increment_option_vote_count();


-- ─────────────────────────────────────────
-- FEATURE 2: Youth Fund Transparency Tracker
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public_funds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    fund_source text,
    managing_body text,
    total_amount numeric(15,2),
    currency text DEFAULT 'KES',
    target_beneficiaries text,
    sector text,
    status text DEFAULT 'active'
        CHECK (status IN ('active', 'disbursing', 'closed', 'suspended')),
    application_deadline timestamptz,
    disbursement_start timestamptz,
    amount_disbursed numeric(15,2) DEFAULT 0,
    official_url text,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fund_allocations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id uuid REFERENCES public_funds(id) ON DELETE CASCADE NOT NULL,
    category text NOT NULL,
    amount numeric(15,2),
    percentage numeric(5,2),
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fund_disbursements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id uuid REFERENCES public_funds(id) ON DELETE CASCADE NOT NULL,
    disbursement_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    recipient_description text,
    disbursement_type text DEFAULT 'direct'
        CHECK (disbursement_type IN ('direct', 'voucher', 'equipment', 'training', 'infrastructure')),
    verified boolean DEFAULT false,
    source_url text,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fund_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id uuid REFERENCES public_funds(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    content text NOT NULL,
    comment_type text DEFAULT 'comment'
        CHECK (comment_type IN ('comment', 'concern', 'feedback')),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_allocations_fund ON fund_allocations(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_fund ON fund_disbursements(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_comments_fund ON fund_comments(fund_id);

-- Trigger: recompute amount_disbursed on INSERT, UPDATE, and DELETE
CREATE OR REPLACE FUNCTION update_fund_disbursed_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    target_fund_id uuid := COALESCE(NEW.fund_id, OLD.fund_id);
BEGIN
    UPDATE public_funds
    SET amount_disbursed = (
        SELECT COALESCE(SUM(amount), 0)
        FROM fund_disbursements
        WHERE fund_id = target_fund_id
    )
    WHERE id = target_fund_id;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_fund_disbursed_amount ON fund_disbursements;
CREATE TRIGGER trg_fund_disbursed_amount
AFTER INSERT OR UPDATE OR DELETE ON fund_disbursements
FOR EACH ROW EXECUTE FUNCTION update_fund_disbursed_amount();


-- ─────────────────────────────────────────
-- FEATURE 3: Community Project Monitoring Tool
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public_projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    project_type text NOT NULL DEFAULT 'infrastructure'
        CHECK (project_type IN ('infrastructure', 'social', 'environment', 'health', 'education', 'other')),
    implementing_body text,
    fund_id uuid REFERENCES public_funds(id) ON DELETE SET NULL,
    location_name text,
    location_lat numeric(10,7),
    location_lng numeric(10,7),
    budget numeric(15,2),
    currency text DEFAULT 'KES',
    milestone text DEFAULT 'announced'
        CHECK (milestone IN ('announced', 'funded', 'in_progress', 'stalled', 'completed', 'audited')),
    start_date date,
    expected_end_date date,
    actual_end_date date,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    follower_count int DEFAULT 0,
    update_count int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_updates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public_projects(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    update_type text DEFAULT 'progress'
        CHECK (update_type IN ('progress', 'concern', 'milestone', 'official_response')),
    new_milestone text,
    submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    upvote_count int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_media (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public_projects(id) ON DELETE CASCADE NOT NULL,
    update_id uuid REFERENCES project_updates(id) ON DELETE CASCADE,
    media_url text NOT NULL,
    media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document')),
    caption text,
    uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_follows (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public_projects(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_update_upvotes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    update_id uuid REFERENCES project_updates(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (update_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_media_project ON project_media(project_id);
CREATE INDEX IF NOT EXISTS idx_project_media_update ON project_media(update_id);
CREATE INDEX IF NOT EXISTS idx_project_follows_user ON project_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_project_upvotes_update ON project_update_upvotes(update_id);

-- Trigger: follower_count
CREATE OR REPLACE FUNCTION update_project_follower_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public_projects SET follower_count = follower_count + 1 WHERE id = NEW.project_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public_projects SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.project_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_project_follower_count ON project_follows;
CREATE TRIGGER trg_project_follower_count
AFTER INSERT OR DELETE ON project_follows
FOR EACH ROW EXECUTE FUNCTION update_project_follower_count();

-- Trigger: update_count
CREATE OR REPLACE FUNCTION update_project_update_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public_projects SET update_count = update_count + 1 WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_update_count ON project_updates;
CREATE TRIGGER trg_project_update_count
AFTER INSERT ON project_updates
FOR EACH ROW EXECUTE FUNCTION update_project_update_count();

-- Trigger: upvote_count on updates
CREATE OR REPLACE FUNCTION update_project_update_upvote_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE project_updates SET upvote_count = upvote_count + 1 WHERE id = NEW.update_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE project_updates SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.update_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_upvote_count ON project_update_upvotes;
CREATE TRIGGER trg_update_upvote_count
AFTER INSERT OR DELETE ON project_update_upvotes
FOR EACH ROW EXECUTE FUNCTION update_project_update_upvote_count();


-- ─────────────────────────────────────────
-- RLS Policies  (idempotent: DROP first, then CREATE)
-- ─────────────────────────────────────────

-- Policy Polls
ALTER TABLE policy_polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read polls" ON policy_polls;
CREATE POLICY "Public read polls" ON policy_polls FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create polls" ON policy_polls;
CREATE POLICY "Authenticated create polls" ON policy_polls FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Owner update polls" ON policy_polls;
CREATE POLICY "Owner update polls" ON policy_polls FOR UPDATE USING (auth.uid() = created_by);

-- Poll questions/options — any authenticated user can contribute (crowd-sourced)
ALTER TABLE poll_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read questions" ON poll_questions;
CREATE POLICY "Public read questions" ON poll_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create questions" ON poll_questions;
DROP POLICY IF EXISTS "Poll owner create questions" ON poll_questions;
CREATE POLICY "Anyone auth can create questions" ON poll_questions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read options" ON poll_options;
CREATE POLICY "Public read options" ON poll_options FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create options" ON poll_options;
DROP POLICY IF EXISTS "Poll owner create options" ON poll_options;
CREATE POLICY "Anyone auth can create options" ON poll_options FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read responses" ON poll_responses;
CREATE POLICY "Public read responses" ON poll_responses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated submit responses" ON poll_responses;
CREATE POLICY "Authenticated submit responses" ON poll_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE poll_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read submissions" ON poll_submissions;
CREATE POLICY "Public read submissions" ON poll_submissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated submit" ON poll_submissions;
CREATE POLICY "Authenticated submit" ON poll_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public Funds
ALTER TABLE public_funds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read funds" ON public_funds;
CREATE POLICY "Public read funds" ON public_funds FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create funds" ON public_funds;
CREATE POLICY "Authenticated create funds" ON public_funds FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Owner update funds" ON public_funds;
CREATE POLICY "Owner update funds" ON public_funds FOR UPDATE USING (auth.uid() = created_by);

ALTER TABLE fund_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read allocations" ON fund_allocations;
CREATE POLICY "Public read allocations" ON fund_allocations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create allocations" ON fund_allocations;
CREATE POLICY "Authenticated create allocations" ON fund_allocations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE fund_disbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read disbursements" ON fund_disbursements;
CREATE POLICY "Public read disbursements" ON fund_disbursements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create disbursements" ON fund_disbursements;
CREATE POLICY "Authenticated create disbursements" ON fund_disbursements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE fund_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read fund comments" ON fund_comments;
CREATE POLICY "Public read fund comments" ON fund_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create fund comments" ON fund_comments;
CREATE POLICY "Authenticated create fund comments" ON fund_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete fund comment" ON fund_comments;
CREATE POLICY "Owner delete fund comment" ON fund_comments FOR DELETE USING (auth.uid() = user_id);

-- Public Projects
ALTER TABLE public_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read projects" ON public_projects;
CREATE POLICY "Public read projects" ON public_projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create projects" ON public_projects;
CREATE POLICY "Authenticated create projects" ON public_projects FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Owner update projects" ON public_projects;
CREATE POLICY "Owner update projects" ON public_projects FOR UPDATE USING (auth.uid() = created_by);

ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read project updates" ON project_updates;
CREATE POLICY "Public read project updates" ON project_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated submit project updates" ON project_updates;
CREATE POLICY "Authenticated submit project updates" ON project_updates FOR INSERT WITH CHECK (auth.uid() = submitted_by);

ALTER TABLE project_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read project media" ON project_media;
CREATE POLICY "Public read project media" ON project_media FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated upload project media" ON project_media;
CREATE POLICY "Authenticated upload project media" ON project_media FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

ALTER TABLE project_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read follows" ON project_follows;
CREATE POLICY "Public read follows" ON project_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated follow" ON project_follows;
CREATE POLICY "Authenticated follow" ON project_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own unfollow" ON project_follows;
CREATE POLICY "Own unfollow" ON project_follows FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE project_update_upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read upvotes" ON project_update_upvotes;
CREATE POLICY "Public read upvotes" ON project_update_upvotes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated upvote" ON project_update_upvotes;
CREATE POLICY "Authenticated upvote" ON project_update_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own remove upvote" ON project_update_upvotes;
CREATE POLICY "Own remove upvote" ON project_update_upvotes FOR DELETE USING (auth.uid() = user_id);
