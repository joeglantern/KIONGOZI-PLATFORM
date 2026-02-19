-- FIX CHAT RLS RECURSION
-- Run this in Supabase SQL Editor

-- 1. Create a helper function to bypass RLS for membership checks
-- This breaks the infinite recursion loop in policies
CREATE OR REPLACE FUNCTION is_chat_member(_room_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants
    WHERE room_id = _room_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop potentially problematic recursive policies
DROP POLICY IF EXISTS "Users can view rooms they are in" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON chat_messages;

-- 3. Create new optimized policies using the Security Definer function

-- Chat Rooms: View if you are a participant
CREATE POLICY "view_my_rooms" ON chat_rooms
  FOR SELECT USING ( is_chat_member(id) );

-- Chat Rooms: Insert new rooms (Anyone authenticated)
CREATE POLICY "insert_rooms" ON chat_rooms
  FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );

-- Participants: View if you are in the same room
CREATE POLICY "view_room_participants" ON chat_participants
  FOR SELECT USING ( is_chat_member(room_id) );

-- Participants: Insert (e.g. adding yourself or student to a room)
CREATE POLICY "insert_participants" ON chat_participants
  FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );

-- Messages: View if you are in the room
CREATE POLICY "view_room_messages" ON chat_messages
  FOR SELECT USING ( is_chat_member(room_id) );

-- Messages: Insert if you are in the room
CREATE POLICY "insert_room_messages" ON chat_messages
  FOR INSERT WITH CHECK ( is_chat_member(room_id) );

-- 4. Ensure Profiles are visible (needed for UI names/avatars)
DROP POLICY IF EXISTS "Public profiles" ON profiles;
CREATE POLICY "Public profiles" ON profiles
  FOR SELECT USING (true);
