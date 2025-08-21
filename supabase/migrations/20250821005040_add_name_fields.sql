-- Add first_name and last_name fields to profiles table
-- and update the trigger to handle the new structure

-- Add the new columns
alter table public.profiles 
add column if not exists first_name text,
add column if not exists last_name text;

-- Update the handle_new_user function to use first_name and last_name
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(
      concat(new.raw_user_meta_data->>'first_name', ' ', new.raw_user_meta_data->>'last_name'),
      new.raw_user_meta_data->>'full_name'
    ),
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Update existing profiles to split full_name into first_name and last_name where possible
update public.profiles 
set 
  first_name = split_part(full_name, ' ', 1),
  last_name = case 
    when position(' ' in full_name) > 0 
    then substring(full_name from position(' ' in full_name) + 1)
    else null
  end
where full_name is not null 
  and (first_name is null or last_name is null);
