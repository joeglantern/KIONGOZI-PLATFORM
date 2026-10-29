-- Voice notes in DMs: audio messages with their length and a transcript written by the server.
ALTER TABLE public.dm_messages DROP CONSTRAINT IF EXISTS dm_messages_media_type_check;
ALTER TABLE public.dm_messages ADD CONSTRAINT dm_messages_media_type_check
  CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, NULL::text]));

ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS transcript text;
