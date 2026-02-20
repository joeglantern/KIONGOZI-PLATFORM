-- 1. Add comments_count to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 2. Populate initial counts for existing posts
UPDATE social_posts p
SET comments_count = (
  SELECT count(*)
  FROM social_comments c
  WHERE c.post_id = p.id
);

-- 3. Trigger function to maintain comment count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE social_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS on_social_comment_change ON social_comments;
CREATE TRIGGER on_social_comment_change
AFTER INSERT OR DELETE ON social_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 5. Extra Safety: Public Profiles for Social Features (Public Read Only)
-- This ensures that 'full_name' is readable even without a complex join if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON profiles
          FOR SELECT USING (true);
    END IF;
END $$;
