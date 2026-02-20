-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create an index to quickly look up usernames (essential for handles/mentions later)
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
