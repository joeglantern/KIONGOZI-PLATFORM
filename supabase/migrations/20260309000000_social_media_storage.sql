-- Create the social-media storage bucket and set it to public.
-- This bucket stores post images, post videos, and user avatars.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media',
  'social-media',
  true,
  104857600, -- 100 MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/mpeg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/mpeg'
  ];

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Anyone (including unauthenticated) can read public media
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for social media' AND tablename = 'objects') THEN
    CREATE POLICY "Public read access for social media"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'social-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload social media' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload social media"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'social-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own social media' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update own social media"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'social-media' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own social media' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete own social media"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'social-media' AND owner = auth.uid());
  END IF;
END $$;
