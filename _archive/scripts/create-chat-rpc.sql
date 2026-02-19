-- Helper to create a room and add participants in one transaction
-- This bypasses RLS visibility issues during the creation process
CREATE OR REPLACE FUNCTION initialize_chat_room(p_course_id UUID, p_participant_ids UUID[])
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- 1. Create the room
  INSERT INTO chat_rooms (course_id)
  VALUES (p_course_id)
  RETURNING id INTO v_room_id;

  -- 2. Add all participants (idempotently)
  -- Filter out nulls and duplicates
  INSERT INTO chat_participants (room_id, user_id)
  SELECT DISTINCT v_room_id, u_id
  FROM unnest(p_participant_ids) AS u_id
  WHERE u_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
