-- 1. Updates to social_events for Town Halls
alter table social_events 
add column if not exists meeting_url text, -- For live links
add column if not exists recording_url text; -- For past archives

-- 2. Impact Reports Table (Impact Map)
create table if not exists social_impact_reports (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  report_type text check (report_type in ('infrastructure', 'safety', 'environment', 'praise')) not null,
  location_lat float,
  location_lng float,
  location_name text,
  image_url text,
  status text check (status in ('pending', 'verified', 'resolved')) default 'pending',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Law Library / Resources Table
create table if not exists social_law_resources (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  category text check (category in ('constitution', 'local_bylaws', 'human_rights', 'environmental', 'forms')) not null,
  file_url text not null, -- URL to PDF or external link
  resource_type text default 'pdf',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table social_impact_reports enable row level security;
alter table social_law_resources enable row level security;

-- Policies for Impact Reports
create policy "Anyone can view impact reports" on social_impact_reports
  for select using (true);

create policy "Users can create impact reports" on social_impact_reports
  for insert with check (auth.uid() = created_by);

create policy "Creators can update their reports" on social_impact_reports
  for update using (auth.uid() = created_by);

-- Policies for Law Library
create policy "Anyone can view law resources" on social_law_resources
  for select using (true);

-- Only admins should strictly be able to add laws, but for this demo users can add
create policy "Users can add law resources" on social_law_resources
  for insert with check (auth.uid() = created_by);
