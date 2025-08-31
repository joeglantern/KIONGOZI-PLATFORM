-- Admin User Management Enhancement
-- Adds user status tracking, activity logs, and admin management features

-- Add status tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS banned_at timestamptz,
ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS ban_reason text,
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES public.profiles(id);

-- Add constraint for status
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_chk CHECK (status IN ('active', 'inactive', 'banned', 'pending'));

-- Create admin_actions table for audit trail (drop and recreate to ensure consistency)
DROP TABLE IF EXISTS public.admin_actions CASCADE;
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target_user_id ON public.admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_action_type ON public.admin_actions(action_type);

-- Add constraint for action types
ALTER TABLE public.admin_actions 
ADD CONSTRAINT admin_actions_type_chk CHECK (action_type IN (
  'user_created', 'user_updated', 'user_deleted', 'user_banned', 'user_unbanned', 
  'user_deactivated', 'user_activated', 'role_changed', 'password_reset',
  'conversation_deleted', 'conversation_archived', 'message_deleted'
));

-- Create user_login_logs table for activity tracking
CREATE TABLE IF NOT EXISTS public.user_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  login_success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON public.user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_created_at ON public.user_login_logs(created_at DESC);

-- Enable RLS on new tables
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_actions (only admins can see)
DROP POLICY IF EXISTS admin_actions_select_admin ON public.admin_actions;
CREATE POLICY admin_actions_select_admin ON public.admin_actions
FOR SELECT USING (public.jwt_role() IN ('admin', 'org_admin'));

DROP POLICY IF EXISTS admin_actions_insert_admin ON public.admin_actions;
CREATE POLICY admin_actions_insert_admin ON public.admin_actions
FOR INSERT WITH CHECK (public.jwt_role() IN ('admin', 'org_admin'));

-- RLS policies for user_login_logs (users see own, admins see all)
DROP POLICY IF EXISTS user_login_logs_select ON public.user_login_logs;
CREATE POLICY user_login_logs_select ON public.user_login_logs
FOR SELECT USING (
  user_id = auth.uid() OR public.jwt_role() IN ('admin', 'org_admin')
);

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  admin_id uuid,
  target_user_id uuid,
  action_type text,
  action_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  action_id uuid;
BEGIN
  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, action_details)
  VALUES (admin_id, target_user_id, action_type, action_details)
  RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user login tracking
CREATE OR REPLACE FUNCTION public.update_user_login(
  user_id uuid,
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update profile login tracking
  UPDATE public.profiles 
  SET 
    last_login_at = now(),
    login_count = login_count + 1,
    updated_at = now()
  WHERE id = user_id;
  
  -- Log the login
  INSERT INTO public.user_login_logs (user_id, ip_address, user_agent)
  VALUES (user_id, ip_address, user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user (admin only)
CREATE OR REPLACE FUNCTION public.ban_user(
  target_user_id uuid,
  admin_user_id uuid,
  reason text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  -- Check if caller is admin
  IF public.jwt_role() NOT IN ('admin', 'org_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Update user status
  UPDATE public.profiles 
  SET 
    status = 'banned',
    banned_at = now(),
    banned_by = admin_user_id,
    ban_reason = reason,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    admin_user_id,
    target_user_id,
    'user_banned',
    jsonb_build_object('reason', reason)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user (admin only)
CREATE OR REPLACE FUNCTION public.unban_user(
  target_user_id uuid,
  admin_user_id uuid
)
RETURNS boolean AS $$
BEGIN
  -- Check if caller is admin
  IF public.jwt_role() NOT IN ('admin', 'org_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Update user status
  UPDATE public.profiles 
  SET 
    status = 'active',
    banned_at = NULL,
    banned_by = NULL,
    ban_reason = NULL,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    admin_user_id,
    target_user_id,
    'user_unbanned',
    '{}'::jsonb
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate a user (admin only)
CREATE OR REPLACE FUNCTION public.deactivate_user(
  target_user_id uuid,
  admin_user_id uuid
)
RETURNS boolean AS $$
BEGIN
  -- Check if caller is admin
  IF public.jwt_role() NOT IN ('admin', 'org_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Update user status
  UPDATE public.profiles 
  SET 
    status = 'inactive',
    deactivated_at = now(),
    deactivated_by = admin_user_id,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    admin_user_id,
    target_user_id,
    'user_deactivated',
    '{}'::jsonb
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate a user (admin only)
CREATE OR REPLACE FUNCTION public.activate_user(
  target_user_id uuid,
  admin_user_id uuid
)
RETURNS boolean AS $$
BEGIN
  -- Check if caller is admin
  IF public.jwt_role() NOT IN ('admin', 'org_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Update user status
  UPDATE public.profiles 
  SET 
    status = 'active',
    deactivated_at = NULL,
    deactivated_by = NULL,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    admin_user_id,
    target_user_id,
    'user_activated',
    '{}'::jsonb
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change user role (admin only)
CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id uuid,
  admin_user_id uuid,
  new_role text
)
RETURNS boolean AS $$
DECLARE
  old_role text;
BEGIN
  -- Check if caller is admin
  IF public.jwt_role() NOT IN ('admin', 'org_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('user', 'admin', 'content_editor', 'moderator', 'org_admin', 'analyst', 'researcher') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Get old role for logging
  SELECT role INTO old_role FROM public.profiles WHERE id = target_user_id;
  
  -- Update user role
  UPDATE public.profiles 
  SET 
    role = new_role,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    admin_user_id,
    target_user_id,
    'role_changed',
    jsonb_build_object('old_role', old_role, 'new_role', new_role)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add archive functionality to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON public.profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON public.conversations(archived_at) WHERE archived_at IS NOT NULL;

-- Add some sample admin actions for existing admin users
INSERT INTO public.admin_actions (admin_id, action_type, action_details)
SELECT 
  id as admin_id,
  'system_initialized' as action_type,
  jsonb_build_object('message', 'Admin user management system initialized') as action_details
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT DO NOTHING;