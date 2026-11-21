-- Run this once in the Supabase SQL Editor to create the app's cloud tables.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  low_stock_threshold integer not null default 10
    check (low_stock_threshold between 0 and 999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  quantity integer not null check (quantity >= 0),
  price numeric(12, 2) not null check (price >= 0),
  low_stock_threshold integer not null default 10
    check (low_stock_threshold between 0 and 999999),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_user_created_idx
  on public.inventory_items (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their own inventory"
  on public.inventory_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own inventory"
  on public.inventory_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own inventory"
  on public.inventory_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own inventory"
  on public.inventory_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- New auth users receive a profile row for their account name and stock threshold.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute procedure public.set_updated_at();
