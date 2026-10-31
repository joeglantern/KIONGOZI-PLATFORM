-- Real hooks: milestones that fire once, quote / invite / milestone notifications,
-- per-day post stats for insights, and a marker for the honest "while you were away" push.
-- Safe to run more than once. The API works before this runs (it skips these features).

-- 1. Milestones: one row per milestone reached, so each fires exactly once.
--    key examples: 'first_post', 'followers:10', 'likes:100:<post id>', 'views:1000:<post id>'
CREATE TABLE IF NOT EXISTS user_milestones (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key        text NOT NULL,
  kind       text NOT NULL,
  value      integer NOT NULL DEFAULT 0,
  post_id    uuid REFERENCES posts(id) ON DELETE CASCADE,
  reached_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_milestones_own ON user_milestones;
CREATE POLICY user_milestones_own ON user_milestones FOR SELECT USING (auth.uid() = user_id);

-- 2. Per-day stats for post insights (Nairobi days). Views are video plays past 2s; shares are share taps.
CREATE TABLE IF NOT EXISTS post_daily_stats (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  day     date NOT NULL,
  views   integer NOT NULL DEFAULT 0,
  shares  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, day)
);
ALTER TABLE post_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION bump_post_stat(p_post uuid, p_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'Africa/Nairobi')::date;
BEGIN
  IF p_kind = 'view' THEN
    INSERT INTO post_daily_stats (post_id, day, views) VALUES (p_post, d, 1)
    ON CONFLICT (post_id, day) DO UPDATE SET views = post_daily_stats.views + 1;
  ELSIF p_kind = 'share' THEN
    INSERT INTO post_daily_stats (post_id, day, shares) VALUES (p_post, d, 1)
    ON CONFLICT (post_id, day) DO UPDATE SET shares = post_daily_stats.shares + 1;
  END IF;
END $$;
REVOKE ALL ON FUNCTION bump_post_stat(uuid, text) FROM PUBLIC, anon, authenticated;

-- 3. When we last sent someone a "while you were away" push (at most one every 3 days)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_nudge_at timestamptz;

-- Activity log lookups by person (usual hour of day)
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_created ON user_login_logs(user_id, created_at DESC);

-- 4. Notification types: keep every type already allowed (including any added by migrations
--    that ran before this one) and add quote, invite_joined and milestone.
DO $$
DECLARE
  def text;
  types text[] := ARRAY[
    'like', 'comment', 'repost', 'follow', 'follow_request',
    'mention', 'dm', 'info', 'warning', 'error', 'baraza_live',
    'quote', 'invite_joined', 'milestone'
  ];
  t text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'social_notifications_type_check' AND conrelid = 'social_notifications'::regclass;

  IF def IS NOT NULL THEN
    FOR t IN SELECT (regexp_matches(def, '''([a-z_]+)''', 'g'))[1] LOOP
      IF NOT t = ANY(types) THEN types := types || t; END IF;
    END LOOP;
  END IF;

  ALTER TABLE social_notifications DROP CONSTRAINT IF EXISTS social_notifications_type_check;
  EXECUTE format(
    'ALTER TABLE social_notifications ADD CONSTRAINT social_notifications_type_check CHECK (type IN (%s))',
    (SELECT string_agg(quote_literal(x), ', ') FROM unnest(types) AS x)
  );
END $$;
