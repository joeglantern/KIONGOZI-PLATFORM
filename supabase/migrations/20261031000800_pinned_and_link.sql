-- Pinned post and a link in bio.
-- profiles.pinned_post_id: the one post shown first on the profile (cleared when that post is deleted).
-- profiles.website: one link under the bio (http/https, the API keeps it at 100 characters or less).
-- Safe to run more than once.

alter table public.profiles
  add column if not exists pinned_post_id uuid,
  add column if not exists website text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_pinned_post_id_fkey' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_pinned_post_id_fkey
      foreign key (pinned_post_id) references public.posts(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_website_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_website_check
      check (website is null or (char_length(website) <= 200 and website ~* '^https?://'));
  end if;
end $$;

create index if not exists profiles_pinned_post_id_idx
  on public.profiles (pinned_post_id) where pinned_post_id is not null;
