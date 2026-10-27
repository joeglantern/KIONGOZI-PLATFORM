-- Votes on a story's poll sticker (one vote per person per story; option 0 or 1).
CREATE TABLE IF NOT EXISTS public.story_poll_votes (
  story_id   uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  voter_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option     smallint NOT NULL CHECK (option IN (0, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, voter_id)
);

ALTER TABLE public.story_poll_votes ENABLE ROW LEVEL SECURITY;
