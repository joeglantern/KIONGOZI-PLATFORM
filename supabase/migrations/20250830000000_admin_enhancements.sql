-- Admin Panel Enhancements - Complete Feature Set
-- This migration adds all tables needed for full admin functionality

-- 1. System Settings Table - Store admin panel configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'general', 'chatbot', 'users', 'security', 'notifications'
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  is_public BOOLEAN DEFAULT false, -- can non-admin users see this setting?
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category, setting_key)
);

-- 2. System Logs Table - Track system events and errors  
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success', 'debug')),
  category TEXT NOT NULL, -- 'auth', 'api', 'chat', 'admin', 'system'
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES public.profiles(id),
  conversation_id UUID REFERENCES public.conversations(id),
  ip_address INET,
  user_agent TEXT,
  stack_trace TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Chat Sessions Table - Track user sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Message Analytics Table - Track detailed message metrics
CREATE TABLE IF NOT EXISTS public.message_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  response_time_ms INTEGER,
  token_count INTEGER,
  character_count INTEGER,
  word_count INTEGER,
  sentiment_score DECIMAL(3,2),
  intent_detected TEXT,
  confidence_score DECIMAL(3,2),
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. User Activities Table - Track user actions
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  details JSONB,
  conversation_id UUID REFERENCES public.conversations(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Admin Actions Table - Audit trail for admin panel
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO public.system_settings (category, setting_key, setting_value, description, data_type) VALUES
('general', 'bot_name', '"AI Assistant"', 'The display name of the chatbot', 'string'),
('general', 'default_response', '"I''m here to help you with any questions you may have."', 'Default response when bot cannot understand', 'string'),
('general', 'enable_logging', 'true', 'Enable system logging', 'boolean'),
('general', 'enable_analytics', 'true', 'Enable analytics tracking', 'boolean'),

('chatbot', 'api_provider', '"openai"', 'AI API provider', 'string'),
('chatbot', 'model', '"gpt-4"', 'AI model to use', 'string'),
('chatbot', 'temperature', '0.7', 'AI response creativity (0-1)', 'number'),
('chatbot', 'max_tokens', '1000', 'Maximum tokens per response', 'number'),
('chatbot', 'max_response_time', '30', 'Maximum response time in seconds', 'number'),

('users', 'rate_limit_per_hour', '100', 'Maximum messages per user per hour', 'number'),
('users', 'auto_archive_days', '30', 'Days before conversations are auto-archived', 'number'),
('users', 'enable_user_registration', 'true', 'Allow new user registrations', 'boolean'),

('security', 'enable_moderation', 'true', 'Enable content moderation', 'boolean'),
('security', 'blocked_words', '[]', 'List of blocked words', 'json'),
('security', 'require_email_verification', 'false', 'Require email verification for new users', 'boolean'),

('notifications', 'enable_notifications', 'true', 'Enable admin notifications', 'boolean'),
('notifications', 'notify_on_errors', 'true', 'Send notifications for system errors', 'boolean'),
('notifications', 'notify_on_new_users', 'false', 'Send notifications for new user registrations', 'boolean')

ON CONFLICT (category, setting_key) DO NOTHING;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON public.system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON public.chat_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_analytics_message_id ON public.message_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON public.admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

-- Add updated_at triggers
CREATE TRIGGER set_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for all new tables
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- System Settings (public settings visible to all, admin-only for management)
CREATE POLICY system_settings_select_policy ON public.system_settings
  FOR SELECT USING (
    is_public = true OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

CREATE POLICY system_settings_admin_only ON public.system_settings
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- System Logs (admin only)
CREATE POLICY system_logs_admin_only ON public.system_logs
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- Chat Sessions (users see their own, admins see all)
CREATE POLICY chat_sessions_select_policy ON public.chat_sessions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

-- Message Analytics (admin only)
CREATE POLICY message_analytics_admin_only ON public.message_analytics
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- User Activities (users see their own, admins see all)
CREATE POLICY user_activities_select_policy ON public.user_activities
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

-- Admin Actions (admin only)
CREATE POLICY admin_actions_admin_only ON public.admin_actions
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- Helper Functions

-- Function to get system setting value
CREATE OR REPLACE FUNCTION public.get_system_setting(setting_category TEXT, setting_key TEXT)
RETURNS JSONB AS $$
DECLARE
  setting_value JSONB;
BEGIN
  SELECT s.setting_value INTO setting_value
  FROM public.system_settings s
  WHERE s.category = setting_category AND s.setting_key = setting_key;
  
  RETURN COALESCE(setting_value, 'null'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update system setting
CREATE OR REPLACE FUNCTION public.update_system_setting(
  setting_category TEXT,
  setting_key TEXT,
  new_value JSONB,
  updated_by_user UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin privileges
  IF public.jwt_role() NOT IN ('admin', 'org_admin') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.system_settings
  SET 
    setting_value = new_value,
    updated_by = updated_by_user,
    updated_at = NOW()
  WHERE category = setting_category AND setting_key = setting_key;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system events
CREATE OR REPLACE FUNCTION public.log_system_event(
  log_level TEXT,
  log_category TEXT,
  log_message TEXT,
  log_details JSONB DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  conversation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.system_logs (
    level, category, message, details, user_id, conversation_id
  ) VALUES (
    log_level, log_category, log_message, log_details, user_id, conversation_id
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  admin_id UUID,
  action_type TEXT,
  target_type TEXT DEFAULT NULL,
  target_id UUID DEFAULT NULL,
  details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  action_id UUID;
BEGIN
  INSERT INTO public.admin_actions (
    admin_user_id, action_type, target_type, target_id, details
  ) VALUES (
    admin_id, action_type, target_type, target_id, details
  ) RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;