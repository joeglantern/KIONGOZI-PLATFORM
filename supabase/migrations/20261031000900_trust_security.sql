-- Trust and security.
--  user_devices: one row per app install signed in to an account (Settings > Where you're logged in).
--    The app sends a stable install id (X-Device-Id) and pings on start/resume; logging a device out
--    sets revoked_at + revoked_session_id, and the API answers that session with 401 device_revoked.
--  muted_words: words, phrases and #tags a person never wants to see in feeds, replies or notifications.
-- Both are written only by the API (service connection); RLS is on with no policies.
-- Idempotent: safe to run more than once.

create table if not exists public.user_devices (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  device_id          text not null,
  session_id         uuid,
  model              text,
  os                 text,
  app_version        text,
  place              text,
  ip                 text,
  created_at         timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  revoked_at         timestamptz,
  revoked_session_id uuid
);

create unique index if not exists user_devices_user_device_key on public.user_devices (user_id, device_id);
create index if not exists user_devices_user_seen_idx on public.user_devices (user_id, last_seen_at desc);
alter table public.user_devices enable row level security;

create table if not exists public.muted_words (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  phrase     text not null check (char_length(phrase) between 1 and 60),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists muted_words_user_phrase_key on public.muted_words (user_id, lower(phrase));
alter table public.muted_words enable row level security;

notify pgrst, 'reload schema';
