-- Chat reactions: one reaction per person per message (tap another to change it, tap the same to remove)
CREATE TABLE IF NOT EXISTS public.dm_message_reactions (
  message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS dm_message_reactions_message_idx ON public.dm_message_reactions (message_id);
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;
-- The API uses the service role; members read their own conversations' reactions through it.
