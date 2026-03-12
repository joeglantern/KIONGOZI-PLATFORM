-- Dedicated table for social platform notifications (likes, follows,
-- comments, reposts, mentions, DMs). Kept separate from the LMS
-- notifications table to avoid schema conflicts.

CREATE TABLE IF NOT EXISTS social_notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN (
                'like','comment','repost','follow','mention','dm',
                'info','warning','error'
              )),
  title       text NOT NULL,
  message     text NOT NULL,
  data        jsonb DEFAULT NULL,
  read        boolean NOT NULL DEFAULT false,
  read_at     timestamptz DEFAULT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_notifications_user_id  ON social_notifications(user_id);
CREATE INDEX idx_social_notifications_user_read ON social_notifications(user_id, read, created_at DESC);

-- RLS: users see/update only their own rows
ALTER TABLE social_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_notifications_select"
  ON social_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "social_notifications_update"
  ON social_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (backend) can insert freely — no INSERT policy needed
-- because service role bypasses RLS.

-- Realtime: allow filtered subscriptions (user_id=eq.<id>)
ALTER TABLE social_notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE social_notifications;
