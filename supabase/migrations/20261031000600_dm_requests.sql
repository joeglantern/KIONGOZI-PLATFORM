-- Message requests and "Who can message me".
-- A first message from someone the recipient doesn't follow waits in Requests (the recipient's
-- participant row is 'pending') until they accept. 'declined' hides it; the sender isn't told.
-- Existing chats stay as they are ('accepted').

ALTER TABLE dm_participants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';

ALTER TABLE dm_participants DROP CONSTRAINT IF EXISTS dm_participants_status_check;
ALTER TABLE dm_participants
  ADD CONSTRAINT dm_participants_status_check CHECK (status IN ('accepted', 'pending', 'declined'));

CREATE INDEX IF NOT EXISTS idx_dm_participants_user_status ON dm_participants(user_id, status);

-- Who can start a chat with me: everyone (strangers go to Requests), people I follow, or no one
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dm_policy text NOT NULL DEFAULT 'everyone';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_dm_policy_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_dm_policy_check CHECK (dm_policy IN ('everyone', 'following', 'none'));

-- Off: people don't see when I've read their messages
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dm_read_receipts boolean NOT NULL DEFAULT true;
