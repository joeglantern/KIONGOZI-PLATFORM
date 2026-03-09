-- Social tables for Kiongozi platform
-- Creates all social features: posts, likes, follows, DMs, bookmarks, hashtags, mentions

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 280),
  parent_post_id uuid REFERENCES posts(id) ON DELETE CASCADE, -- replies
  repost_of_id uuid REFERENCES posts(id) ON DELETE SET NULL,  -- reposts
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers')),
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  repost_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  is_bot_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_repost_of_id ON posts(repost_of_id);

-- ============================================================
-- POST MEDIA
-- ============================================================
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  url text NOT NULL,
  storage_path text NOT NULL,
  width integer,
  height integer,
  duration_seconds numeric,
  thumbnail_url text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- ============================================================
-- MENTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioner_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON mentions(mentioned_user_id);

-- ============================================================
-- HASHTAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hashtags_use_count ON hashtags(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);

-- ============================================================
-- POST_HASHTAGS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- ============================================================
-- DM CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

-- ============================================================
-- DM PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_participants_user_id ON dm_participants(user_id);

-- ============================================================
-- DM MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video', NULL)),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation_id ON dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_id ON dm_messages(sender_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- ============================================================
-- TRIGGERS — COUNT MAINTENANCE
-- ============================================================

-- Update post like_count on insert/delete
CREATE OR REPLACE FUNCTION increment_post_like_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_like_count ON post_likes;
CREATE TRIGGER trg_post_like_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_like_count();

-- Update parent post comment_count when a reply is inserted/deleted
CREATE OR REPLACE FUNCTION increment_post_comment_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_post_id IS NOT NULL THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.parent_post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_post_id IS NOT NULL THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.parent_post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comment_count ON posts;
CREATE TRIGGER trg_post_comment_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION increment_post_comment_count();

-- Update repost_count when a repost is inserted/deleted
CREATE OR REPLACE FUNCTION increment_post_repost_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.repost_of_id IS NOT NULL THEN
    UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.repost_of_id;
  ELSIF TG_OP = 'DELETE' AND OLD.repost_of_id IS NOT NULL THEN
    UPDATE posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = OLD.repost_of_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_repost_count ON posts;
CREATE TRIGGER trg_post_repost_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION increment_post_repost_count();

-- Update follower/following counts on follows insert/delete
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_follower_counts ON follows;
CREATE TRIGGER trg_follower_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Update hashtag use_count on post_hashtags insert/delete
CREATE OR REPLACE FUNCTION update_hashtag_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET use_count = use_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET use_count = GREATEST(use_count - 1, 0) WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_hashtag_count ON post_hashtags;
CREATE TRIGGER trg_hashtag_count
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_count();

-- Update user post_count on posts insert/delete
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_post_count ON posts;
CREATE TRIGGER trg_user_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_user_post_count();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- POSTS
CREATE POLICY "Public posts are readable by everyone"
  ON posts FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Followers can read follower-only posts"
  ON posts FOR SELECT
  USING (
    visibility = 'followers' AND (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid() AND following_id = user_id
      )
    )
  );

CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

-- POST MEDIA
CREATE POLICY "Post media readable with post"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
        AND (posts.visibility = 'public' OR posts.user_id = auth.uid())
    )
  );

CREATE POLICY "Post owner can insert media"
  ON post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

-- POST LIKES
CREATE POLICY "Anyone can read post likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- FOLLOWS
CREATE POLICY "Anyone can read follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- MENTIONS
CREATE POLICY "Anyone can read mentions"
  ON mentions FOR SELECT
  USING (true);

CREATE POLICY "System can insert mentions"
  ON mentions FOR INSERT
  WITH CHECK (auth.uid() = mentioner_user_id);

-- HASHTAGS
CREATE POLICY "Anyone can read hashtags"
  ON hashtags FOR SELECT
  USING (true);

-- POST HASHTAGS
CREATE POLICY "Anyone can read post hashtags"
  ON post_hashtags FOR SELECT
  USING (true);

-- DM CONVERSATIONS — participants only
CREATE POLICY "Participants can read their conversations"
  ON dm_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_participants
      WHERE conversation_id = dm_conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create a conversation"
  ON dm_conversations FOR INSERT
  WITH CHECK (true);

-- DM PARTICIPANTS
CREATE POLICY "Users can read their own participation"
  ON dm_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations"
  ON dm_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- DM MESSAGES
CREATE POLICY "Participants can read messages"
  ON dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_participants
      WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON dm_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM dm_participants
      WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- BOOKMARKS — owner only
CREATE POLICY "Users can read their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);
