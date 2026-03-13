CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON blocks FOR ALL USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id != muted_id)
);
CREATE INDEX IF NOT EXISTS idx_mutes_muter ON mutes(muter_id);
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mutes" ON mutes FOR ALL USING (auth.uid() = muter_id);
