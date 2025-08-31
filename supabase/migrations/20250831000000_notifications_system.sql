-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('success', 'info', 'warning', 'error', 'security')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  data JSONB DEFAULT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Create composite index for common queries
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Admin policies (assuming admin role exists)
CREATE POLICY "Admins can create notifications for any user" 
ON notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can view all notifications" 
ON notifications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create system notifications
CREATE OR REPLACE FUNCTION create_system_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type VARCHAR(20) DEFAULT 'info',
  p_priority VARCHAR(10) DEFAULT 'medium',
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, priority, data)
  VALUES (p_user_id, p_title, p_message, p_type, p_priority, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notifications (security alerts, etc.)
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_title TEXT,
  p_message TEXT,
  p_type VARCHAR(20) DEFAULT 'info',
  p_priority VARCHAR(10) DEFAULT 'medium',
  p_data JSONB DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  admin_count INT := 0;
  admin_user RECORD;
BEGIN
  -- Send notification to all admin users
  FOR admin_user IN 
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, data)
    VALUES (admin_user.id, p_title, p_message, p_type, p_priority, p_data);
    admin_count := admin_count + 1;
  END LOOP;
  
  RETURN admin_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notifications (keep last 1000 per user)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INT AS $$
DECLARE
  deleted_count INT := 0;
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM notifications
  LOOP
    -- Delete old notifications, keeping the 1000 most recent per user
    WITH old_notifications AS (
      SELECT id 
      FROM notifications 
      WHERE user_id = user_record.user_id 
      ORDER BY created_at DESC 
      OFFSET 1000
    )
    DELETE FROM notifications 
    WHERE id IN (SELECT id FROM old_notifications);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create some sample notifications for testing (remove in production)
-- INSERT INTO notifications (user_id, title, message, type, priority)
-- SELECT 
--   id as user_id,
--   'Welcome to the Platform' as title,
--   'Your account has been successfully created. Explore all the features!' as message,
--   'success' as type,
--   'medium' as priority
-- FROM auth.users 
-- LIMIT 5;