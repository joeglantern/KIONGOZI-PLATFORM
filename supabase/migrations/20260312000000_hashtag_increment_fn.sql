-- Function to atomically increment hashtag use_count
create or replace function increment_hashtag_use_count(hashtag_tag text)
returns void
language plpgsql
security definer
as $$
begin
  update hashtags
  set use_count = use_count + 1
  where tag = hashtag_tag;
end;
$$;
