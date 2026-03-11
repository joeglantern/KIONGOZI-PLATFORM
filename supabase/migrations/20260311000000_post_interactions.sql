CREATE TABLE IF NOT EXISTS post_interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN (
                'view', 'like', 'repost', 'reply', 'share',
                'bookmark', 'profile_click', 'scroll_past')),
  duration_ms integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_interactions_user_id ON post_interactions(user_id);
CREATE INDEX idx_post_interactions_post_id ON post_interactions(post_id);
CREATE INDEX idx_post_interactions_event   ON post_interactions(event_type);
CREATE INDEX idx_post_interactions_created ON post_interactions(created_at DESC);
ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own interactions"
  ON post_interactions FOR SELECT USING (auth.uid() = user_id);
