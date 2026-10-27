-- Text-story text background style: plain (default), pill (filled box) or outline.
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS text_style text CHECK (text_style IN ('plain', 'pill', 'outline'));
