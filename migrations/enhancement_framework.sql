-- ============================================================
-- KIONGOZI PLATFORM ENHANCEMENT MIGRATIONS
-- ============================================================

-- 1. Poll context modifications
ALTER TABLE policy_polls ADD COLUMN IF NOT EXISTS what_context TEXT;
ALTER TABLE policy_polls ADD COLUMN IF NOT EXISTS why_context TEXT;
ALTER TABLE policy_polls ADD COLUMN IF NOT EXISTS how_context TEXT;
ALTER TABLE policy_polls ADD COLUMN IF NOT EXISTS impact_context TEXT;

-- 2. Question context modifications
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS why_important TEXT;
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS relation_context TEXT;
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS expected_action TEXT;

-- 3. Deliberation Recommendations & Voting
CREATE TABLE IF NOT EXISTS deliberation_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track TEXT NOT NULL CHECK (track IN ('funding', 'governance')),
    parent_type TEXT NOT NULL CHECK (parent_type IN ('poll', 'post', 'fund', 'project', 'petition', 'course', 'policy')),
    parent_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    consensus_score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendation_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recommendation_id UUID REFERENCES deliberation_recommendations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (recommendation_id, user_id)
);

-- 4. Poll discussions (Threaded Comments & Upvotes)
CREATE TABLE IF NOT EXISTS poll_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES policy_polls(id) ON DELETE CASCADE,
    question_id UUID REFERENCES poll_questions(id) ON DELETE CASCADE, -- Optional (question-level comment)
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES poll_comments(id) ON DELETE CASCADE, -- Self-referencing reply chain
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    likes_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES poll_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

-- 5. Policies & FAQ
CREATE TABLE IF NOT EXISTS policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    why_matters TEXT NOT NULL,
    impact_on_youth TEXT NOT NULL,
    opportunities TEXT NOT NULL,
    risks_challenges TEXT NOT NULL,
    real_world_examples TEXT NOT NULL,
    faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
    brief_file_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Policy Briefs (multi-version log with status flow)
CREATE TABLE IF NOT EXISTS policy_briefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES policy_polls(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'published')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Extend social_law_resources for Research Library
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS governance_sector TEXT;
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS sdg TEXT;
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS policy_references TEXT;
ALTER TABLE social_law_resources ADD COLUMN IF NOT EXISTS is_youth_kb BOOLEAN DEFAULT false;

-- ============================================================
-- Enable RLS and Configure Policies
-- ============================================================

ALTER TABLE deliberation_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_briefs ENABLE ROW LEVEL SECURITY;

-- Deliberation Recommendations Policies
DROP POLICY IF EXISTS "Public read recommendations" ON deliberation_recommendations;
CREATE POLICY "Public read recommendations" ON deliberation_recommendations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert recommendations" ON deliberation_recommendations;
CREATE POLICY "Auth insert recommendations" ON deliberation_recommendations FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Owner update recommendations" ON deliberation_recommendations;
CREATE POLICY "Owner update recommendations" ON deliberation_recommendations FOR UPDATE USING (auth.uid() = created_by);

-- Recommendation Votes Policies
DROP POLICY IF EXISTS "Public read rec votes" ON recommendation_votes;
CREATE POLICY "Public read rec votes" ON recommendation_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert rec votes" ON recommendation_votes;
CREATE POLICY "Auth insert rec votes" ON recommendation_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete rec votes" ON recommendation_votes;
CREATE POLICY "Owner delete rec votes" ON recommendation_votes FOR DELETE USING (auth.uid() = user_id);

-- Poll Comments Policies
DROP POLICY IF EXISTS "Public read poll comments" ON poll_comments;
CREATE POLICY "Public read poll comments" ON poll_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert poll comments" ON poll_comments;
CREATE POLICY "Auth insert poll comments" ON poll_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner update poll comments" ON poll_comments;
CREATE POLICY "Owner update poll comments" ON poll_comments FOR UPDATE USING (auth.uid() = user_id);

-- Poll Comment Votes Policies
DROP POLICY IF EXISTS "Public read comment votes" ON poll_comment_votes;
CREATE POLICY "Public read comment votes" ON poll_comment_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert comment votes" ON poll_comment_votes;
CREATE POLICY "Auth insert comment votes" ON poll_comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete comment votes" ON poll_comment_votes;
CREATE POLICY "Owner delete comment votes" ON poll_comment_votes FOR DELETE USING (auth.uid() = user_id);

-- Policies Table Policies
DROP POLICY IF EXISTS "Public read policies" ON policies;
CREATE POLICY "Public read policies" ON policies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write policies" ON policies;
CREATE POLICY "Admin write policies" ON policies FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Policy Briefs Table Policies
DROP POLICY IF EXISTS "Public read published briefs" ON policy_briefs;
CREATE POLICY "Public read published briefs" ON policy_briefs FOR SELECT USING (
    status = 'published' OR auth.uid() = generated_by OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
DROP POLICY IF EXISTS "Auth insert briefs" ON policy_briefs;
CREATE POLICY "Auth insert briefs" ON policy_briefs FOR INSERT WITH CHECK (auth.uid() = generated_by);
DROP POLICY IF EXISTS "Manage briefs" ON policy_briefs;
CREATE POLICY "Manage briefs" ON policy_briefs FOR UPDATE USING (
    auth.uid() = generated_by OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ============================================================
-- Triggers for counts
-- ============================================================

-- Trigger to increment consensus score on vote insert
CREATE OR REPLACE FUNCTION update_recommendation_consensus()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE deliberation_recommendations SET consensus_score = consensus_score + 1 WHERE id = NEW.recommendation_id;
        ELSE
            UPDATE deliberation_recommendations SET consensus_score = consensus_score - 1 WHERE id = NEW.recommendation_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE deliberation_recommendations SET consensus_score = consensus_score - 1 WHERE id = OLD.recommendation_id;
        ELSE
            UPDATE deliberation_recommendations SET consensus_score = consensus_score + 1 WHERE id = OLD.recommendation_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recommendation_consensus ON recommendation_votes;
CREATE TRIGGER trg_recommendation_consensus
AFTER INSERT OR DELETE ON recommendation_votes
FOR EACH ROW EXECUTE FUNCTION update_recommendation_consensus();
