CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reported_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','hate_speech','misinformation','explicit_content','other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT report_type_check CHECK (
    (reported_user_id IS NOT NULL AND reported_post_id IS NULL) OR
    (reported_user_id IS NULL AND reported_post_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
