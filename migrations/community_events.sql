-- Create social_events table
create table if not exists social_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  event_type text check (event_type in ('protest', 'cleanup', 'townhall', 'workshop', 'meetup')) not null,
  location text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  image_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create social_event_rsvps table
create table if not exists social_event_rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references social_events(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  status text check (status in ('going', 'interested')) default 'going',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, user_id)
);

-- Enable RLS
alter table social_events enable row level security;
alter table social_event_rsvps enable row level security;

-- Policies for social_events
create policy "Anyone can view events" on social_events
  for select using (true);

create policy "Users can create events" on social_events
  for insert with check (auth.uid() = created_by);

create policy "Creators can update their events" on social_events
  for update using (auth.uid() = created_by);

create policy "Creators can delete their events" on social_events
  for delete using (auth.uid() = created_by);

-- Policies for RSVPs
create policy "Anyone can view rsvps" on social_event_rsvps
  for select using (true);

create policy "Users can rsvp" on social_event_rsvps
  for insert with check (auth.uid() = user_id);

create policy "Users can update their rsvp" on social_event_rsvps
  for update using (auth.uid() = user_id);

create policy "Users can remove their rsvp" on social_event_rsvps
  for delete using (auth.uid() = user_id);
