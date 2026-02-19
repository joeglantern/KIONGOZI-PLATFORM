-- Chat System RPCs

-- 1. Function to find a private chat room between two users
CREATE OR REPLACE FUNCTION get_private_chat_room(user_a UUID, user_b UUID)
RETURNS TABLE (room_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cp1.room_id
  FROM chat_participants cp1
  JOIN chat_participants cp2 ON cp1.room_id = cp2.room_id
  JOIN chat_rooms cr ON cp1.room_id = cr.id
  WHERE cr.type = 'private'
    AND cp1.user_id = user_a
    AND cp2.user_id = user_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get or create a course chat room
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
    VALUES ('group', v_course_title || ' Discussion', p_course_id, '{}'::jsonb)
    RETURNING id INTO v_room_id;
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
