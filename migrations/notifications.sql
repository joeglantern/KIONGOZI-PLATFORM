-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

-- Drop existing table (it was created with wrong column name 'read' instead of 'is_read')
DROP TABLE IF EXISTS notifications CASCADE;

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- Triggers insert on behalf of users

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- TRIGGER: New chat message → notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_participant RECORD;
BEGIN
  -- Get sender name
  SELECT COALESCE(full_name, first_name, email) INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- Notify all other participants in the room
  FOR v_participant IN
    SELECT user_id FROM chat_participants
    WHERE room_id = NEW.room_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_participant.user_id,
      'message',
      'New Message',
      v_sender_name || ' sent you a message',
      '/messages',
      jsonb_build_object('room_id', NEW.room_id, 'sender_id', NEW.sender_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON chat_messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- ============================================
-- TRIGGER: Badge earned → notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
  v_badge_name TEXT;
BEGIN
  SELECT name INTO v_badge_name FROM badges WHERE id = NEW.badge_id;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.user_id,
    'badge_earned',
    'Badge Earned! 🏅',
    'You earned the "' || COALESCE(v_badge_name, 'Mystery') || '" badge!',
    '/profile/achievements',
    jsonb_build_object('badge_id', NEW.badge_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON user_badges;
CREATE TRIGGER trigger_notify_badge_earned
AFTER INSERT ON user_badges
FOR EACH ROW EXECUTE FUNCTION notify_on_badge_earned();

-- ============================================
-- TRIGGER: Certificate issued → notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_certificate_issued()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
BEGIN
  SELECT title INTO v_course_title FROM courses WHERE id = NEW.course_id;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.user_id,
    'certificate',
    'Certificate Ready! 🎓',
    'Your certificate for "' || COALESCE(v_course_title, 'a course') || '" is ready to download.',
    '/certificates',
    jsonb_build_object('certificate_id', NEW.id, 'course_id', NEW.course_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_certificate ON user_certificates;
CREATE TRIGGER trigger_notify_certificate
AFTER INSERT ON user_certificates
FOR EACH ROW EXECUTE FUNCTION notify_on_certificate_issued();

-- ============================================
-- TRIGGER: New course published → notify all users
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_new_course()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Only trigger when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    FOR v_user IN
      SELECT id FROM profiles WHERE role = 'user'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        v_user.id,
        'new_course',
        'New Course Available! 📚',
        '"' || NEW.title || '" has just been published. Check it out!',
        '/courses/' || NEW.id,
        jsonb_build_object('course_id', NEW.id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_course ON courses;
CREATE TRIGGER trigger_notify_new_course
AFTER INSERT OR UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION notify_on_new_course();

-- ============================================
-- TRIGGER: Level up → notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_level_up()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.level IS NOT NULL AND (OLD.level IS NULL OR NEW.level > OLD.level) THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.id,
      'level_up',
      'Level Up! ⬆️',
      'Congratulations! You reached Level ' || NEW.level || '!',
      '/profile/achievements',
      jsonb_build_object('new_level', NEW.level)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_level_up ON profiles;
CREATE TRIGGER trigger_notify_level_up
AFTER UPDATE OF level ON profiles
FOR EACH ROW EXECUTE FUNCTION notify_on_level_up();
