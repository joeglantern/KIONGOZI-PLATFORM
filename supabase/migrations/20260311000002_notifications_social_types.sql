-- Extend the type CHECK constraint to include social notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'success', 'info', 'warning', 'error', 'security',
    'like', 'repost', 'comment', 'follow', 'mention', 'dm'
  ));
