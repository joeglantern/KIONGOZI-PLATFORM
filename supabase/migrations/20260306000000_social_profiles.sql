-- Social profiles extension
-- Extends the profiles table with social platform columns

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS follower_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_bot ON profiles(is_bot);

-- Insert @kiongozi bot profile
-- Note: This requires an existing auth.users entry for the bot.
-- The bot user must be created via Supabase Auth Admin API or SQL.
-- BOT_USER_ID env var should be set to this UUID.
DO $$
DECLARE
  bot_id uuid;
BEGIN
  -- Check if bot user already exists in auth.users
  SELECT id INTO bot_id FROM auth.users WHERE email = 'bot@kiongozi.app' LIMIT 1;

  IF bot_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'bot@kiongozi.app',
      extensions.crypt('bot-secure-password-change-in-production', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Kiongozi AI","username":"kiongozi"}',
      false,
      'authenticated'
    );
    bot_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- Upsert bot profile
  INSERT INTO profiles (
    id,
    full_name,
    username,
    bio,
    is_bot,
    is_verified,
    follower_count,
    following_count,
    post_count
  ) VALUES (
    bot_id,
    'Kiongozi AI',
    'kiongozi',
    'Kenya''s civic AI. Ask me about the Constitution, Vision 2030, or the Green Economy. @mention me anywhere.',
    true,
    true,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    bio = EXCLUDED.bio,
    is_bot = EXCLUDED.is_bot,
    is_verified = EXCLUDED.is_verified,
    full_name = EXCLUDED.full_name;

END $$;
