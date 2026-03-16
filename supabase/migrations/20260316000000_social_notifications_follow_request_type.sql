-- Add 'follow_request' to the social_notifications type CHECK constraint.
-- The original constraint omitted this type, causing follow request
-- notifications to be silently rejected by the database.

ALTER TABLE social_notifications DROP CONSTRAINT IF EXISTS social_notifications_type_check;

ALTER TABLE social_notifications
  ADD CONSTRAINT social_notifications_type_check
  CHECK (type IN (
    'like', 'comment', 'repost', 'follow', 'follow_request',
    'mention', 'dm', 'info', 'warning', 'error'
  ));
