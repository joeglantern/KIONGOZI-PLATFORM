ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read     BOOLEAN                   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at  TIMESTAMP WITH TIME ZONE           DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, read, created_at DESC);
