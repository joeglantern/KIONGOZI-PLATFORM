-- Fix system_settings table structure
-- Add missing columns and constraints

-- Add missing columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_settings' AND column_name='display_name') THEN
        ALTER TABLE public.system_settings ADD COLUMN display_name text NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_settings' AND column_name='description') THEN
        ALTER TABLE public.system_settings ADD COLUMN description text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_settings' AND column_name='is_public') THEN
        ALTER TABLE public.system_settings ADD COLUMN is_public boolean NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_settings' AND column_name='requires_restart') THEN
        ALTER TABLE public.system_settings ADD COLUMN requires_restart boolean NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_settings' AND column_name='validation_rules') THEN
        ALTER TABLE public.system_settings ADD COLUMN validation_rules jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Insert default settings (only if they don't exist)
INSERT INTO public.system_settings (category, setting_key, setting_value, data_type, display_name, description, is_public, requires_restart) VALUES
-- General Settings
('general', 'site_name', '"Kiongozi LMS"', 'string', 'Site Name', 'The name of your LMS platform', true, false),
('general', 'site_description', '"AI-powered Learning Management System"', 'string', 'Site Description', 'Brief description of your platform', true, false),
('general', 'admin_email', '"admin@example.com"', 'string', 'Admin Email', 'Primary administrator email address', false, false),
('general', 'max_file_size', '10485760', 'number', 'Max File Size (bytes)', 'Maximum file upload size in bytes', false, false),
('general', 'timezone', '"UTC"', 'string', 'Default Timezone', 'Default timezone for the system', false, false),

-- AI/Chat Settings
('ai', 'model_provider', '"openai"', 'string', 'AI Model Provider', 'Primary AI model provider', false, true),
('ai', 'default_model', '"gpt-3.5-turbo"', 'string', 'Default AI Model', 'Default AI model for chat responses', false, true),
('ai', 'max_tokens', '2048', 'number', 'Max Response Tokens', 'Maximum tokens for AI responses', false, false),
('ai', 'temperature', '0.7', 'number', 'AI Temperature', 'Creativity/randomness of AI responses (0-1)', false, false),
('ai', 'conversation_history_limit', '10', 'number', 'Conversation History', 'Number of previous messages to include in context', false, false),

-- User Management Settings
('users', 'allow_registration', 'true', 'boolean', 'Allow User Registration', 'Allow new users to register accounts', true, false),
('users', 'require_email_verification', 'true', 'boolean', 'Require Email Verification', 'Require users to verify email before access', false, false),
('users', 'default_user_role', '"user"', 'string', 'Default User Role', 'Default role assigned to new users', false, false),
('users', 'session_timeout', '3600', 'number', 'Session Timeout (seconds)', 'User session timeout in seconds', false, false),
('users', 'max_login_attempts', '5', 'number', 'Max Login Attempts', 'Maximum failed login attempts before lockout', false, false),

-- Security Settings
('security', 'enable_rate_limiting', 'true', 'boolean', 'Enable Rate Limiting', 'Enable API rate limiting protection', false, true),
('security', 'rate_limit_requests', '100', 'number', 'Rate Limit Requests', 'Requests per minute per IP', false, true),
('security', 'enable_audit_logging', 'true', 'boolean', 'Enable Audit Logging', 'Log all admin actions for audit trail', false, false),
('security', 'password_min_length', '8', 'number', 'Minimum Password Length', 'Minimum required password length', false, false),
('security', 'require_2fa_admin', 'false', 'boolean', 'Require 2FA for Admins', 'Require two-factor authentication for admin accounts', false, false),

-- Notification Settings
('notifications', 'enable_email_notifications', 'true', 'boolean', 'Enable Email Notifications', 'Send email notifications to users', false, false),
('notifications', 'enable_push_notifications', 'false', 'boolean', 'Enable Push Notifications', 'Send browser push notifications', false, false),
('notifications', 'admin_notification_email', '"admin@example.com"', 'string', 'Admin Notification Email', 'Email address for system notifications', false, false),
('notifications', 'smtp_host', '""', 'string', 'SMTP Host', 'SMTP server hostname for email sending', false, true),
('notifications', 'smtp_port', '587', 'number', 'SMTP Port', 'SMTP server port', false, true),

-- Analytics Settings
('analytics', 'enable_analytics', 'true', 'boolean', 'Enable Analytics', 'Track user activity and system usage', false, false),
('analytics', 'data_retention_days', '90', 'number', 'Data Retention (days)', 'Number of days to retain analytics data', false, false),
('analytics', 'enable_performance_monitoring', 'true', 'boolean', 'Performance Monitoring', 'Monitor system performance metrics', false, false),

-- Chat Settings
('chat', 'max_conversation_length', '100', 'number', 'Max Conversation Length', 'Maximum messages per conversation', false, false),
('chat', 'enable_conversation_export', 'true', 'boolean', 'Enable Conversation Export', 'Allow users to export their conversations', true, false),
('chat', 'auto_archive_days', '30', 'number', 'Auto Archive (days)', 'Automatically archive conversations after X days', false, false),
('chat', 'enable_message_editing', 'false', 'boolean', 'Enable Message Editing', 'Allow users to edit their messages', true, false)

ON CONFLICT (category, setting_key) DO NOTHING;