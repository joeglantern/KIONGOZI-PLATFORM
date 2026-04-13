-- Add thumbnail_url column to courses table (was missing from original schema)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
