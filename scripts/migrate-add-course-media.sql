-- Add course-level media columns for the multi-mode delivery feature
-- (Text mode uses learning_modules.content; Slides/Video modes use these new columns)

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS slides_url  TEXT,
  ADD COLUMN IF NOT EXISTS slides_type TEXT,
  ADD COLUMN IF NOT EXISTS video_url   TEXT;

COMMENT ON COLUMN public.courses.slides_url  IS 'Public URL to course-level slide deck (PDF or PPTX) in the courses bucket';
COMMENT ON COLUMN public.courses.slides_type IS 'Format of the slide deck: pdf | pptx';
COMMENT ON COLUMN public.courses.video_url   IS 'Public URL to course-level walkthrough video (MP4) in the courses bucket';
