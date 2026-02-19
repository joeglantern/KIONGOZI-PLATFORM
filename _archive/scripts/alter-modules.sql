-- Add media support to learning_modules
ALTER TABLE learning_modules
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'video', 'image', 'pdf', etc.

-- Optional: Add size or duration if needed, but these are good for now.
