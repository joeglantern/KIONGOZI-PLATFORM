ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, target_id),
  CHECK (requester_id != target_id)
);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON follow_requests(requester_id);
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requester sees own requests" ON follow_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Requester inserts own requests" ON follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target updates own requests" ON follow_requests FOR UPDATE USING (auth.uid() = target_id);
CREATE POLICY "Parties can delete" ON follow_requests FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);
