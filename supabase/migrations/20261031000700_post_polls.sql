-- Polls in feed posts (like X): the post text is the question, 2 to 4 choices, open 1 hour to 7 days.
-- One vote per person, final. Counts live on the poll row and move with a trigger, so feeds read
-- them in one query and two people voting at once never lose a vote.

CREATE TABLE IF NOT EXISTS public.post_polls (
  post_id    uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  options    jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 4),
  votes      integer[] NOT NULL DEFAULT '{0,0,0,0}',
  ends_at    timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_poll_votes (
  post_id    uuid NOT NULL REFERENCES public.post_polls(post_id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option     smallint NOT NULL CHECK (option BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_poll_votes_user_idx ON public.post_poll_votes (user_id);

ALTER TABLE public.post_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;
-- The API uses the service role. Polls are as public as their posts; a vote is private to its owner.
DROP POLICY IF EXISTS post_polls_read ON public.post_polls;
CREATE POLICY post_polls_read ON public.post_polls FOR SELECT USING (true);
DROP POLICY IF EXISTS post_poll_votes_read_own ON public.post_poll_votes;
CREATE POLICY post_poll_votes_read_own ON public.post_poll_votes FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.post_poll_vote_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_polls SET votes[NEW.option + 1] = COALESCE(votes[NEW.option + 1], 0) + 1
      WHERE post_id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_polls SET votes[OLD.option + 1] = GREATEST(COALESCE(votes[OLD.option + 1], 0) - 1, 0)
      WHERE post_id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS post_poll_votes_count ON public.post_poll_votes;
CREATE TRIGGER post_poll_votes_count
  AFTER INSERT OR DELETE ON public.post_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.post_poll_vote_count();
