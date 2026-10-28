-- Growth + speed batch (2026-10-28)

-- Tiny blurred preview (data URI, ~1KB) shown while a photo loads. Filled by the API's image pipeline.
alter table public.post_media add column if not exists placeholder text;
alter table public.stories add column if not exists placeholder text;

-- Invites: who brought this person to KChat
alter table public.profiles add column if not exists invited_by uuid references public.profiles(id) on delete set null;
create index if not exists idx_profiles_invited_by on public.profiles(invited_by);
