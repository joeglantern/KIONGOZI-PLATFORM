-- Indexes for the actual sort/filter patterns on community feed and civic engagement list pages.
-- All list pages order by created_at DESC; civic pages also filter by status/milestone.

-- Social feed
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_likes_post_user ON social_likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_user ON social_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id);

-- Petitions
CREATE INDEX IF NOT EXISTS idx_social_petitions_status_created ON social_petitions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petition_signatures_user ON social_petition_signatures(user_id, petition_id);

-- Events
CREATE INDEX IF NOT EXISTS idx_social_events_end_time ON social_events(end_time, start_time);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON social_event_rsvps(user_id, event_id);

-- Policy Pulse
CREATE INDEX IF NOT EXISTS idx_policy_polls_status_created ON policy_polls(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_submissions_user_poll ON poll_submissions(user_id, poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_question ON poll_responses(question_id);

-- Funds
CREATE INDEX IF NOT EXISTS idx_public_funds_created ON public_funds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_fund ON fund_disbursements(fund_id, disbursement_date DESC);

-- Projects
CREATE INDEX IF NOT EXISTS idx_public_projects_milestone_created ON public_projects(milestone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_follows_user ON project_follows(user_id, project_id);
