-- Add course_id to chat_rooms for context
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_course_id ON chat_rooms(course_id);

-- Update RLS to allow access if course author? 
-- Existing policies use 'is_chat_member', which checks participants.
-- That should still hold true (participants are added explicitly).
-- So no RLS change needed for access, just for context.
