-- Fix for chat_rooms table
-- Add missing course_id column to associate group chats with courses

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_rooms' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE chat_rooms ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
        CREATE INDEX idx_chat_rooms_course_id ON chat_rooms(course_id);
    END IF;
END $$;

-- Re-verify RPC functions are correctly defined with the new column
-- (Re-running the same definitions from chat_rpcs.sql to ensure they use the new column)

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
