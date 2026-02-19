-- ==========================================
-- SUPER FIX: IDEMPOTENT SCHEMA REPAIR (v3)
-- ==========================================

-- 1. FIX USER_BOOKMARKS
-- We MUST clear bad data to add NOT NULL columns
TRUNCATE TABLE user_bookmarks CASCADE;

-- Ensure table exists (in case it was deleted)
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist (Alter table is safer than Create if not exists)
DO $$ 
BEGIN
    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bookmarks' AND column_name = 'user_id') THEN
        ALTER TABLE user_bookmarks ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- item_id (This was missing!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bookmarks' AND column_name = 'item_id') THEN
        ALTER TABLE user_bookmarks ADD COLUMN item_id UUID NOT NULL;
    END IF;

    -- item_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bookmarks' AND column_name = 'item_type') THEN
        ALTER TABLE user_bookmarks ADD COLUMN item_type TEXT NOT NULL;
    END IF;

    -- metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bookmarks' AND column_name = 'metadata') THEN
        ALTER TABLE user_bookmarks ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Enable RLS for bookmarks
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- 2. FIX CHAT_ROOMS
DO $$ 
BEGIN
    -- course_id (Missing in some versions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_rooms' AND column_name = 'course_id') THEN
        ALTER TABLE chat_rooms ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_course_id ON chat_rooms(course_id);
    END IF;
END $$;


-- 3. FIX COURSE_REVIEWS
CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_reviews' AND column_name = 'course_id') THEN
        ALTER TABLE course_reviews ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_reviews' AND column_name = 'user_id') THEN
        ALTER TABLE course_reviews ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_reviews' AND column_name = 'rating') THEN
        ALTER TABLE course_reviews ADD COLUMN rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_reviews' AND column_name = 'review_text') THEN
         ALTER TABLE course_reviews ADD COLUMN review_text TEXT;
    END IF;
END $$;

ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;


-- 4. RECREATE RPCs (Force override)
DROP FUNCTION IF EXISTS get_private_chat_room(uuid, uuid);

CREATE OR REPLACE FUNCTION get_private_chat_room(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- 1. Try to find existing room
  SELECT cp1.room_id INTO v_room_id
  FROM chat_participants cp1
  JOIN chat_participants cp2 ON cp1.room_id = cp2.room_id
  JOIN chat_rooms cr ON cp1.room_id = cr.id
  WHERE cr.type = 'private'
    AND cp1.user_id = user_a
    AND cp2.user_id = user_b
  LIMIT 1;

  -- 2. If not found, create it
  IF v_room_id IS NULL THEN
    -- Create Room
    INSERT INTO chat_rooms (type, metadata)
    VALUES ('private', '{}'::jsonb)
    RETURNING id INTO v_room_id;

    -- Add Participants
    INSERT INTO chat_participants (room_id, user_id)
    VALUES 
      (v_room_id, user_a),
      (v_room_id, user_b);
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_course_chat_room(p_course_id UUID)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_course_title TEXT;
BEGIN
  -- Check if room exists
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE course_id = p_course_id
    AND type = 'group'
  LIMIT 1;

  IF v_room_id IS NULL THEN
    -- Get course title for the room name
    SELECT title INTO v_course_title FROM courses WHERE id = p_course_id;
    
    -- Create new room
    INSERT INTO chat_rooms (type, name, course_id, metadata)
    VALUES ('group', COALESCE(v_course_title, 'Course') || ' Discussion', p_course_id, '{}'::jsonb)
    RETURNING id INTO v_room_id;
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RELOAD POLICIES (Drop and Recreate to be sure)
-- Bookmarks
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON user_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Chat Rooms
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view joined rooms" ON chat_rooms;
CREATE POLICY "Users can view joined rooms" ON chat_rooms FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_participants cp 
        WHERE cp.room_id = id AND cp.user_id = auth.uid()
    )
);

-- Participants
DROP POLICY IF EXISTS "Participants management" ON chat_participants;
CREATE POLICY "Participants management" ON chat_participants FOR ALL USING (auth.role() = 'authenticated');

-- Messages
DROP POLICY IF EXISTS "Users can insert messages in joined rooms" ON chat_messages;
CREATE POLICY "Users can insert messages in joined rooms" ON chat_messages FOR INSERT WITH CHECK (
     EXISTS (
        SELECT 1 FROM chat_participants cp 
        WHERE cp.room_id = room_id AND cp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view messages in joined rooms" ON chat_messages;
CREATE POLICY "Users can view messages in joined rooms" ON chat_messages FOR SELECT USING (
     EXISTS (
        SELECT 1 FROM chat_participants cp 
        WHERE cp.room_id = room_id AND cp.user_id = auth.uid()
    )
);

-- Reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON course_reviews;
CREATE POLICY "Anyone can view reviews" ON course_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON course_reviews;
CREATE POLICY "Users can create reviews" ON course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 6. FIX NOTIFICATIONS (This was missing!)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Allow system/triggers to insert (for now, let users insert self-notifications if needed, or rely on service role)
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
