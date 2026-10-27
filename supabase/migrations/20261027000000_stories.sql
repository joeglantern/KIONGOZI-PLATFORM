-- Stories: 24h posts shown in a rail at the top of the feed.
-- Media is uploaded by the app to the social-media bucket (stories/<user_id>/...);
-- text stories have no media and render from text/bg/font fields.
-- Overlays (stickers, text pills) are stored as JSON and drawn by the app.

CREATE TABLE IF NOT EXISTS public.stories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_type    text NOT NULL CHECK (media_type IN ('image', 'video', 'text')),
  media_url     text,
  storage_path  text,
  thumbnail_url text,
  width         int,
  height        int,
  duration_ms   int,
  text_content  text CHECK (char_length(text_content) <= 700),
  bg            text,
  text_color    text,
  font          text,
  overlays      jsonb NOT NULL DEFAULT '[]'::jsonb,
  caption       text CHECK (char_length(caption) <= 200),
  audience      text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone', 'followers')),
  view_count    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT stories_media_or_text CHECK (
    (media_type = 'text' AND text_content IS NOT NULL) OR (media_type <> 'text' AND media_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS stories_user_active_idx ON public.stories (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS stories_expires_idx ON public.stories (expires_at);

CREATE TABLE IF NOT EXISTS public.story_views (
  story_id   uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction   text CHECK (char_length(reaction) <= 16),
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS story_views_viewer_idx ON public.story_views (viewer_id, viewed_at DESC);

-- Count unique viewers on the story row
CREATE OR REPLACE FUNCTION public.story_views_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET view_count = view_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET view_count = GREATEST(0, view_count - 1) WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS story_views_count_trg ON public.story_views;
CREATE TRIGGER story_views_count_trg
  AFTER INSERT OR DELETE ON public.story_views
  FOR EACH ROW EXECUTE FUNCTION public.story_views_count();

-- The API uses the service role; nobody reads these tables directly from the app.
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
