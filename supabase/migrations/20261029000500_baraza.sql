-- Baraza: turn-based audio rooms with one talking stick (Kijiti), a fair hand queue,
-- live captions and minutes (summary, key points, Ahadi) when the host ends it.
-- All writes go through the API (service role). The app reads state through the API too;
-- realtime is used only as a ping, so the app needs SELECT on just two tables:
--   baraza_rooms     (public listings: any signed-in user)
--   baraza_segments  (audio turns: only people who joined that room and were not removed)

CREATE TABLE IF NOT EXISTS public.baraza_rooms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  status         text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  turn_seconds   integer NOT NULL DEFAULT 120 CHECK (turn_seconds IN (60, 120, 180)),
  -- Who holds the stick right now; the host's own turn is not timed (turn_ends_at null)
  holder_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  turn_started_at timestamptz,
  turn_ends_at   timestamptz,
  -- Last person to hand the stick on, so their final segment can still land
  prev_holder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prev_turn_ended_at timestamptz,
  -- Bumped on every change; the app refetches state when it sees an UPDATE
  version        integer NOT NULL DEFAULT 0,
  minutes_status text NOT NULL DEFAULT 'none' CHECK (minutes_status IN ('none', 'building', 'ready', 'failed')),
  minutes_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz
);
CREATE INDEX IF NOT EXISTS baraza_rooms_live_idx ON public.baraza_rooms (created_at DESC) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS baraza_rooms_host_idx ON public.baraza_rooms (host_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.baraza_participants (
  room_id        uuid NOT NULL REFERENCES public.baraza_rooms(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role           text NOT NULL DEFAULT 'listener' CHECK (role IN ('host', 'listener')),
  hand_raised_at timestamptz,
  spoke          boolean NOT NULL DEFAULT false,
  removed        boolean NOT NULL DEFAULT false,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  left_at        timestamptz,
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS baraza_participants_user_idx ON public.baraza_participants (user_id);
CREATE INDEX IF NOT EXISTS baraza_participants_queue_idx ON public.baraza_participants (room_id, hand_raised_at) WHERE hand_raised_at IS NOT NULL;

-- One row per recorded chunk (~6 s) of a turn, played back in seq order
CREATE TABLE IF NOT EXISTS public.baraza_segments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq          bigint GENERATED ALWAYS AS IDENTITY,
  room_id      uuid NOT NULL REFERENCES public.baraza_rooms(id) ON DELETE CASCADE,
  speaker_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url          text NOT NULL,
  duration_ms  integer NOT NULL CHECK (duration_ms BETWEEN 200 AND 20000),
  transcript   text,
  transcribed  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS baraza_segments_room_idx ON public.baraza_segments (room_id, seq);

CREATE TABLE IF NOT EXISTS public.baraza_minutes (
  room_id     uuid PRIMARY KEY REFERENCES public.baraza_rooms(id) ON DELETE CASCADE,
  summary     text NOT NULL DEFAULT '',
  key_points  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ text, by_user_id }]
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ahadi: commitments made in the baraza (who promised what)
CREATE TABLE IF NOT EXISTS public.baraza_ahadi (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES public.baraza_rooms(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  who_name    text,
  text        text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
  done        boolean NOT NULL DEFAULT false,
  remind_at   timestamptz,
  notified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS baraza_ahadi_room_idx ON public.baraza_ahadi (room_id);
CREATE INDEX IF NOT EXISTS baraza_ahadi_due_idx ON public.baraza_ahadi (remind_at) WHERE notified_at IS NULL AND done = false;

ALTER TABLE public.baraza_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baraza_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baraza_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baraza_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baraza_ahadi ENABLE ROW LEVEL SECURITY;

-- Membership check that skips RLS on participants (no policy recursion)
CREATE OR REPLACE FUNCTION public.is_baraza_member(p_room uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.baraza_participants
    WHERE room_id = p_room AND user_id = auth.uid() AND NOT removed
  );
$$;
REVOKE ALL ON FUNCTION public.is_baraza_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_baraza_member(uuid) TO authenticated;

DROP POLICY IF EXISTS baraza_rooms_select ON public.baraza_rooms;
CREATE POLICY baraza_rooms_select ON public.baraza_rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS baraza_segments_select ON public.baraza_segments;
CREATE POLICY baraza_segments_select ON public.baraza_segments
  FOR SELECT TO authenticated USING (public.is_baraza_member(room_id));

-- Turn audio is uploaded by the app to social-media/baraza/<room>/<user>/... as AAC (audio/mp4)
UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT array_agg(DISTINCT t) FROM unnest(coalesce(allowed_mime_types, '{}'::text[]) || ARRAY['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac']) AS t
)
WHERE id = 'social-media' AND allowed_mime_types IS NOT NULL;

-- Realtime pings: room state changes and new/captioned segments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'baraza_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.baraza_rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'baraza_segments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.baraza_segments;
  END IF;
END $$;
