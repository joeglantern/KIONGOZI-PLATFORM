-- Add parent_id to social_comments for threading
alter table social_comments
add column if not exists parent_id uuid references social_comments(id) on delete cascade;

-- Create index for parent_id for faster lookups of replies
create index if not exists idx_social_comments_parent_id on social_comments(parent_id);

-- Create social_topic_follows table
create table if not exists social_topic_follows (
  user_id uuid references profiles(id) on delete cascade not null,
  topic_id uuid references social_topics(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, topic_id)
);

-- Enable RLS for topic follows
alter table social_topic_follows enable row level security;

-- Policies for social_topic_follows
create policy "Users can view their own follows" on social_topic_follows
  for select using (auth.uid() = user_id);

create policy "Users can follow topics" on social_topic_follows
  for insert with check (auth.uid() = user_id);

create policy "Users can unfollow topics" on social_topic_follows
  for delete using (auth.uid() = user_id);
