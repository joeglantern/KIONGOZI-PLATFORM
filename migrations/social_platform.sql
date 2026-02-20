-- Create social_topics table
create table if not exists social_topics (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create social_posts table
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null, -- Nullable for anonymous posts
  topic_id uuid references social_topics(id) on delete cascade not null,
  content text not null,
  anonymous_name text, -- For anonymous users
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create social_comments table
create table if not exists social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references social_posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null, -- Nullable for anonymous comments
  content text not null,
  anonymous_name text, -- For anonymous users
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create social_likes table (many-to-many user <-> post)
create table if not exists social_likes (
  user_id uuid references profiles(id) on delete cascade not null,
  post_id uuid references social_posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

-- Indexes for performance
create index if not exists idx_social_posts_topic_id on social_posts(topic_id);
create index if not exists idx_social_posts_user_id on social_posts(user_id);
create index if not exists idx_social_comments_post_id on social_comments(post_id);

-- Initialize some default topics
insert into social_topics (name, slug, description) values
  ('General Discussion', 'general', 'Talk about anything related to learning and tech.'),
  ('Study Help', 'study-help', 'Get help with your courses and assignments.'),
  ('Career Advice', 'career', 'Discuss career paths, job hunting, and interviews.'),
  ('Tech News', 'tech-news', 'Latest updates from the technology world.')
on conflict (slug) do nothing;

-- RLS Policies

-- Enable RLS
alter table social_topics enable row level security;
alter table social_posts enable row level security;
alter table social_comments enable row level security;
alter table social_likes enable row level security;

-- Topics: Public read
create policy "Topics are viewable by everyone" on social_topics
  for select using (true);

-- Posts: Public read
create policy "Posts are viewable by everyone" on social_posts
  for select using (true);

-- Posts: Insert (Authenticated users)
create policy "Authenticated users can create posts" on social_posts
  for insert with check (auth.uid() = user_id);

-- Posts: Insert (Anonymous users)
-- Note: Supabase Anon Key allows role 'anon'. We need to ensure user_id is null for anon inserts.
create policy "Anonymous users can create posts" on social_posts
  for insert with check (auth.role() = 'anon' and user_id is null);

-- Comments: Public read
create policy "Comments are viewable by everyone" on social_comments
  for select using (true);

-- Comments: Insert (Authenticated users)
create policy "Authenticated users can create comments" on social_comments
  for insert with check (auth.uid() = user_id);

-- Comments: Insert (Anonymous users)
create policy "Anonymous users can create comments" on social_comments
  for insert with check (auth.role() = 'anon' and user_id is null);

-- Likes: Public read
create policy "Likes are viewable by everyone" on social_likes
  for select using (true);

-- Likes: Insert (Authenticated users only - anon users can't like to prevent spam/abuse easily)
create policy "Authenticated users can like posts" on social_likes
  for insert with check (auth.uid() = user_id);

-- Likes: Delete (Users can unlike their own likes)
create policy "Users can remove their own likes" on social_likes
  for delete using (auth.uid() = user_id);

-- Trigger to update likes_count on social_posts
create or replace function update_post_likes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update social_posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update social_posts set likes_count = likes_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_social_like_change
after insert or delete on social_likes
for each row execute function update_post_likes_count();
