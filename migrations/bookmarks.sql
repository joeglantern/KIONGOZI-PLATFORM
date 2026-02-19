-- User Bookmarks Table
-- This table allows users to save various items (courses, modules, chats) for quick access.

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL, -- ID of the course, module, or room
  item_type TEXT NOT NULL, -- 'course', 'module', 'chat'
  metadata JSONB, -- Stores { title: string, icon: string, link: string }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only bookmark an item once
  UNIQUE(user_id, item_id, item_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_item ON user_bookmarks(item_id, item_type);

-- Row Level Security
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own bookmarks" 
ON user_bookmarks FOR ALL 
USING (auth.uid() = user_id);
