-- Extend the type CHECK constraint to include social notification types

-- Normalise any existing rows whose type is not in the new allowed set
UPDATE notifications
SET type = 'info'
WHERE type NOT IN (
  'success', 'info', 'warning', 'error', 'security',
  'like', 'repost', 'comment', 'follow', 'mention', 'dm'
);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'success', 'info', 'warning', 'error', 'security',
    'like', 'repost', 'comment', 'follow', 'mention', 'dm'
  ));
