-- Edited posts (X / Threads): a post changed after posting shows "Edited", and anyone who can see it
-- can read the earlier versions.
-- posts.edited_at: when the text was last changed (null = never edited).
-- post_edits: one row per replaced version: the text as it was, and when it was replaced.
-- The API allows text edits for 1 hour after posting and writes these rows (service role only).
-- Safe to run more than once.

alter table public.posts
  add column if not exists edited_at timestamptz;

create table if not exists public.post_edits (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  content text not null,
  edited_at timestamptz not null default now()
);

create index if not exists post_edits_post_id_idx
  on public.post_edits (post_id, edited_at);

-- Only the API (service role) reads and writes edit history; it checks who may see the post.
alter table public.post_edits enable row level security;
