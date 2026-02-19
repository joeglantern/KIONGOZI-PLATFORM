-- Add transcription and content_type to learning_modules
ALTER TABLE learning_modules
ADD COLUMN IF NOT EXISTS transcription TEXT,
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text'; -- 'text', 'video', 'audio'

-- Also ensure media_url and media_type exist (though they seem to from my research)
ALTER TABLE learning_modules
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Update existing modules to 'text' if they have no media_url
UPDATE learning_modules SET content_type = 'text' WHERE media_url IS NULL;
UPDATE learning_modules SET content_type = 'video' WHERE media_url IS NOT NULL AND (media_type LIKE 'video%' OR media_url LIKE '%.mp4');
