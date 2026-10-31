-- "@joe is live in a baraza": followers get a baraza_live notification when someone they follow starts a room.
ALTER TABLE social_notifications DROP CONSTRAINT IF EXISTS social_notifications_type_check;
ALTER TABLE social_notifications
  ADD CONSTRAINT social_notifications_type_check
  CHECK (type IN (
    'like', 'comment', 'repost', 'follow', 'follow_request',
    'mention', 'dm', 'info', 'warning', 'error', 'baraza_live'
  ));
