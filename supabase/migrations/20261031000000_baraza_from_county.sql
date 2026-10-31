-- Baraza: listeners can choose to show which county they're listening from (null = private)
ALTER TABLE public.baraza_participants ADD COLUMN IF NOT EXISTS from_county text;
