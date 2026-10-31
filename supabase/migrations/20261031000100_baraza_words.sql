-- Baraza: word timings for each transcribed chunk, so captions can light up word by word
ALTER TABLE public.baraza_segments ADD COLUMN IF NOT EXISTS words jsonb;
