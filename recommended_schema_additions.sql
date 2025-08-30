-- Recommended Additional Tables for Better Chatbot/Admin Sync
-- These tables will enhance analytics, monitoring, and admin functionality

-- 1. Chat Sessions Table - Track user sessions and their duration
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER, -- calculated field
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- mobile, desktop, tablet
  browser TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Message Analytics Table - Track detailed message metrics
CREATE TABLE IF NOT EXISTS public.message_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  response_time_ms INTEGER, -- time to generate AI response
  token_count INTEGER, -- number of tokens in message
  character_count INTEGER, -- number of characters
  word_count INTEGER, -- number of words
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 sentiment analysis
  intent_detected TEXT, -- detected user intent
  confidence_score DECIMAL(3,2), -- AI confidence in response
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. System Logs Table - Track system events and errors
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
  category TEXT NOT NULL, -- 'chat', 'auth', 'api', 'admin', etc.
  message TEXT NOT NULL,
  details JSONB, -- additional structured data
  user_id UUID REFERENCES public.profiles(id),
  conversation_id UUID REFERENCES public.conversations(id),
  ip_address INET,
  user_agent TEXT,
  stack_trace TEXT, -- for errors
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. User Activity Table - Track detailed user actions
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'chat_start', 'chat_end', 'message_sent'
  details JSONB, -- additional data specific to activity type
  conversation_id UUID REFERENCES public.conversations(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Admin Actions Table - Track admin panel actions for audit
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL, -- 'view_users', 'edit_user', 'delete_chat', 'export_data'
  target_type TEXT, -- 'user', 'conversation', 'message', 'system'
  target_id UUID, -- ID of the affected resource
  details JSONB, -- additional action details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Feedback Table - User feedback on chatbot responses
CREATE TABLE IF NOT EXISTS public.message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 1-5 star rating
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'inappropriate', 'accurate', 'inaccurate')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Chat Topics/Categories Table - Automatically categorize conversations
CREATE TABLE IF NOT EXISTS public.conversation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, -- 'support', 'general', 'technical', etc.
  confidence_score DECIMAL(3,2), -- AI confidence in topic classification
  detected_keywords TEXT[], -- array of keywords that led to this classification
  is_manual BOOLEAN DEFAULT false, -- was this manually assigned?
  assigned_by UUID REFERENCES public.profiles(id), -- who assigned it (if manual)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. API Usage Statistics - Track API calls and performance
CREATE TABLE IF NOT EXISTS public.api_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL, -- '/api/chat/message', '/api/admin/users', etc.
  method TEXT NOT NULL, -- GET, POST, PUT, DELETE
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  user_id UUID REFERENCES public.profiles(id),
  ip_address INET,
  user_agent TEXT,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON public.chat_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_analytics_message_id ON public.message_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON public.system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON public.admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON public.message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_conversation_id ON public.conversation_topics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_topic ON public.conversation_topics(topic);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON public.api_usage_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_created_at ON public.api_usage_stats(created_at DESC);

-- Add updated_at triggers for tables that need them
DROP TRIGGER IF EXISTS set_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add RLS policies for new tables (restrictive by default)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can see their own data, admins can see everything

-- Chat Sessions
CREATE POLICY chat_sessions_select_policy ON public.chat_sessions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

-- Message Analytics (only admins can see this sensitive data)
CREATE POLICY message_analytics_admin_only ON public.message_analytics
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- System Logs (admin only)
CREATE POLICY system_logs_admin_only ON public.system_logs
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- User Activities (users can see their own, admins see all)
CREATE POLICY user_activities_select_policy ON public.user_activities
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

-- Admin Actions (admin only)
CREATE POLICY admin_actions_admin_only ON public.admin_actions
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- Message Feedback (users can see their own feedback, admins see all)
CREATE POLICY message_feedback_select_policy ON public.message_feedback
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

CREATE POLICY message_feedback_insert_policy ON public.message_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Conversation Topics (users can see topics for their conversations, admins see all)
CREATE POLICY conversation_topics_select_policy ON public.conversation_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    ) OR 
    public.jwt_role() IN ('admin', 'org_admin')
  );

-- API Usage Stats (admin only)
CREATE POLICY api_usage_stats_admin_only ON public.api_usage_stats
  FOR ALL USING (public.jwt_role() IN ('admin', 'org_admin'));

-- Example functions to help with analytics

-- Function to calculate session duration when session ends
CREATE OR REPLACE FUNCTION public.end_chat_session(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chat_sessions 
  SET 
    ended_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
    is_active = false,
    updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions automatically
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