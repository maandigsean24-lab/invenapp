-- Run this after the original schema.sql; it also upgrades an existing stock_history.sql setup.
create table if not exists public.stock_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  previous_quantity integer,
  new_quantity integer not null check (new_quantity >= 0),
  change_amount integer not null,
  previous_price numeric(12, 2),
  new_price numeric(12, 2),
  created_at timestamptz not null default now()
);

alter table public.stock_logs enable row level security;
grant select on public.stock_logs to authenticated;

drop policy if exists "Users can read their own stock history" on public.stock_logs;
create policy "Users can read their own stock history"
  on public.stock_logs for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.inventory_items
  add column if not exists low_stock_threshold integer;

-- Preserve each account's current default threshold for its existing items.
update public.inventory_items as item
set low_stock_threshold = coalesce(profile.low_stock_threshold, 10)
from public.profiles as profile
where profile.id = item.user_id
  and item.low_stock_threshold is null;

update public.inventory_items
set low_stock_threshold = 10
where low_stock_threshold is null;

alter table public.inventory_items
  alter column low_stock_threshold set default 10,
  alter column low_stock_threshold set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_low_stock_threshold_range'
      and conrelid = 'public.inventory_items'::regclass
  ) then
    alter table public.inventory_items
      add constraint inventory_items_low_stock_threshold_range
      check (low_stock_threshold between 0 and 999999);
  end if;
end;
$$;

alter table public.stock_logs
  add column if not exists previous_price numeric(12, 2),
  add column if not exists new_price numeric(12, 2);

-- The trigger records quantity and price changes in the same transaction as the item update.
create or replace function public.log_inventory_quantity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stock_logs (
      user_id, item_id, previous_quantity, new_quantity, change_amount,
      previous_price, new_price
    )
    values (new.user_id, new.id, null, new.quantity, new.quantity, null, new.price);
  else
    insert into public.stock_logs (
      user_id, item_id, previous_quantity, new_quantity, change_amount,
      previous_price, new_price
    )
    values (
      new.user_id,
      new.id,
      old.quantity,
      new.quantity,
      new.quantity - old.quantity,
      old.price,
      new.price
    );
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_items_log_initial_quantity on public.inventory_items;
create trigger inventory_items_log_initial_quantity
  after insert on public.inventory_items
  for each row execute function public.log_inventory_quantity_change();

drop trigger if exists inventory_items_log_quantity_update on public.inventory_items;
drop trigger if exists inventory_items_log_quantity_price_update on public.inventory_items;
create trigger inventory_items_log_quantity_price_update
  after update of quantity, price on public.inventory_items
  for each row
  when (
    old.quantity is distinct from new.quantity
    or old.price is distinct from new.price
  )
  execute function public.log_inventory_quantity_change();
