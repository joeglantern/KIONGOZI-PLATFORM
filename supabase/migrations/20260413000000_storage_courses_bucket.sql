-- Create the 'courses' storage bucket for course thumbnails and content media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'courses',
    'courses',
    true,
    NULL, -- No bucket-level limit; rely on Supabase plan limit (up to 5GB on Pro)
    ARRAY[
        -- Images (thumbnails)
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        -- Video
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
        -- Audio
        'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
        -- Documents
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = NULL,
        allowed_mime_types = ARRAY[
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
            'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];

-- Drop existing policies first (idempotent re-run)
DROP POLICY IF EXISTS "Authenticated users can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own course files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own course files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for course files" ON storage.objects;

-- Allow authenticated users (instructors/admins) to upload files
CREATE POLICY "Authenticated users can upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'courses');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'courses' AND auth.uid() = owner);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own course files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'courses' AND auth.uid() = owner);

-- Allow public read access (since bucket is public)
CREATE POLICY "Public read access for course files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'courses');
