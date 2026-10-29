-- Photo descriptions for screen readers, written by the server when a post is created
alter table public.post_media add column if not exists alt_text text;
