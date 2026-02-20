-- Create social_petitions table
create table if not exists social_petitions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  image_url text,
  target_signatures integer default 100,
  current_signatures integer default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('active', 'victory', 'closed')) default 'active'
);

-- Create social_petition_signatures table
create table if not exists social_petition_signatures (
  id uuid default gen_random_uuid() primary key,
  petition_id uuid references social_petitions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  signed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(petition_id, user_id)
);

-- Enable RLS
alter table social_petitions enable row level security;
alter table social_petition_signatures enable row level security;

-- Policies for social_petitions
create policy "Anyone can view active petitions" on social_petitions
  for select using (true);

create policy "Users can create petitions" on social_petitions
  for insert with check (auth.uid() = created_by);

create policy "Creators can update their petitions" on social_petitions
  for update using (auth.uid() = created_by);

-- Policies for signatures
create policy "Anyone can view signatures" on social_petition_signatures
  for select using (true);

create policy "Users can sign petitions" on social_petition_signatures
  for insert with check (auth.uid() = user_id);

-- Function to auto-increment signature count
create or replace function increment_petition_signatures()
returns trigger as $$
begin
  update social_petitions
  set current_signatures = current_signatures + 1
  where id = new.petition_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for signature increment
create trigger on_petition_sign
after insert on social_petition_signatures
for each row execute procedure increment_petition_signatures();
