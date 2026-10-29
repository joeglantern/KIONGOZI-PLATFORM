-- Story interactions: question box answers, emoji slider votes, countdown reminders,
-- and close friends (a third story audience with a green ring).
-- Mention and post stickers need no table: they live in stories.overlays (mentions notify on create).
-- Like the other story tables, only the API (service role) touches these.

-- Close friends: owner picks people who can see their 'close_friends' stories
CREATE TABLE IF NOT EXISTS public.close_friends (
  owner_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, friend_id),
  CONSTRAINT close_friends_not_self CHECK (owner_id <> friend_id)
);
CREATE INDEX IF NOT EXISTS close_friends_friend_idx ON public.close_friends (friend_id);

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_audience_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_audience_check
  CHECK (audience IN ('everyone', 'followers', 'close_friends'));

-- Sticker-only text stories (e.g. a shared post card) carry an empty text_content
-- (still NOT NULL, so the existing stories_media_or_text check holds).

-- Question box: viewers send answers to the author (several per person allowed)
CREATE TABLE IF NOT EXISTS public.story_question_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer       text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 300),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS story_question_answers_story_idx ON public.story_question_answers (story_id, created_at DESC);

-- Emoji slider: one value 0..1 per person per story
CREATE TABLE IF NOT EXISTS public.story_slider_votes (
  story_id   uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  voter_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value      real NOT NULL CHECK (value >= 0 AND value <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, voter_id)
);

-- Countdown "Remind me": ends_at/title are copied so the reminder job never needs the story
CREATE TABLE IF NOT EXISTS public.story_countdown_reminders (
  story_id    uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text CHECK (char_length(title) <= 80),
  ends_at     timestamptz NOT NULL,
  notified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
CREATE INDEX IF NOT EXISTS story_countdown_reminders_due_idx
  ON public.story_countdown_reminders (ends_at) WHERE notified_at IS NULL;

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_slider_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_countdown_reminders ENABLE ROW LEVEL SECURITY;
