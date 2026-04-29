-- Allow authenticated users to post anonymously (user_id = null).
-- The existing INSERT policy only covers auth.uid() = user_id, which rejects
-- rows where user_id is intentionally null (anonymous post by a logged-in user).

DROP POLICY IF EXISTS "authenticated_users_can_post_anonymously" ON social_posts;

CREATE POLICY "authenticated_users_can_post_anonymously"
ON social_posts FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id IS NULL
);
