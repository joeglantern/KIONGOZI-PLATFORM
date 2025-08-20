-- Kiongozi Platform core schema
-- profiles, conversations, messages with RLS

-- Extensions
create extension if not exists pgcrypto;

-- 1) profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user', -- app-level role: user | admin | content_editor | moderator | org_admin | analyst | researcher
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles (email);
create unique index if not exists idx_profiles_email_unique on public.profiles (lower(email)) where email is not null;

-- keep email in sync when possible (optional convenience)
create or replace function public.sync_profile_email()
returns trigger as $$
begin
  if new.email is distinct from old.email then
    update public.profiles p set email = new.email, updated_at = now() where p.id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 2) conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);

-- 3) messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  is_user boolean not null default true,
  type text not null default 'chat', -- chat | research
  constraint messages_type_chk check (type in ('chat','research')),
  research_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_user_id on public.messages(user_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

-- Helper: get app role from JWT
create or replace function public.jwt_role()
returns text as $$
  select coalesce(current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::json ->> 'role');
$$ language sql stable;

-- RLS enable
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS policies
-- profiles: owner can select/update their row. admins can manage.
drop policy if exists profiles_select_owner on public.profiles;
create policy profiles_select_owner on public.profiles
for select using (
  auth.uid() = id
  or public.jwt_role() in ('admin', 'org_admin')
);

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles
for update using (
  auth.uid() = id
  or public.jwt_role() in ('admin', 'org_admin')
);

-- conversations: owner can CRUD. admins can manage.
drop policy if exists conversations_select_owner on public.conversations;
create policy conversations_select_owner on public.conversations
for select using (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

drop policy if exists conversations_insert_owner on public.conversations;
create policy conversations_insert_owner on public.conversations
for insert with check (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

drop policy if exists conversations_update_owner on public.conversations;
create policy conversations_update_owner on public.conversations
for update using (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

drop policy if exists conversations_delete_owner on public.conversations;
create policy conversations_delete_owner on public.conversations
for delete using (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

-- messages: only owner of conversation can CRUD. admins can manage.
drop policy if exists messages_select_owner on public.messages;
create policy messages_select_owner on public.messages
for select using (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

drop policy if exists messages_insert_owner on public.messages;
create policy messages_insert_owner on public.messages
for insert with check (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

drop policy if exists messages_delete_owner on public.messages;
create policy messages_delete_owner on public.messages
for delete using (
  user_id = auth.uid() or public.jwt_role() in ('admin', 'org_admin')
);

-- Optional: trigger to auto-create profile on signup (if not using edge functions)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync if email on auth.users changes
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Updated at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- end
