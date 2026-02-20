-- 1. Ensure profiles are publicly readable for social features
-- This is needed for joins on posts, events, and petitions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Profiles are viewable by everyone" ON profiles
          FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Update social_events to ensure recording_url is handled
-- (Column already exists from community_phase3.sql)

-- 3. Add a more robust policy for social_events just in case
DROP POLICY IF EXISTS "Anyone can view events" ON social_events;
CREATE POLICY "Anyone can view events" ON social_events
  FOR SELECT USING (true);
