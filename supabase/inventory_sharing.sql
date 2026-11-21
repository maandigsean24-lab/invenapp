-- Run after schema.sql, stock_history.sql, and item_photos.sql to enable
-- invitations, shared inventory access, live updates, and in-app notifications.
create table if not exists public.inventory_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invited_user_id uuid not null references auth.users (id) on delete cascade,
  invited_email text not null check (invited_email = lower(trim(invited_email))),
  owner_name text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (owner_id, invited_user_id),
  check (owner_id <> invited_user_id)
);

create index if not exists inventory_shares_invited_status_idx
  on public.inventory_shares (invited_user_id, status);

alter table public.inventory_shares enable row level security;
grant select, delete on public.inventory_shares to authenticated;
grant update (status) on public.inventory_shares to authenticated;

drop policy if exists "Users can read their inventory shares" on public.inventory_shares;
create policy "Users can read their inventory shares"
  on public.inventory_shares for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or (select auth.uid()) = invited_user_id
  );

drop policy if exists "Invitees can respond to pending invitations" on public.inventory_shares;
create policy "Invitees can respond to pending invitations"
  on public.inventory_shares for update to authenticated
  using (
    (select auth.uid()) = invited_user_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = invited_user_id
    and status in ('accepted', 'declined')
  );

drop policy if exists "Owners can remove inventory shares" on public.inventory_shares;
create policy "Owners can remove inventory shares"
  on public.inventory_shares for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Invitees can leave accepted inventory shares" on public.inventory_shares;
create policy "Invitees can leave accepted inventory shares"
  on public.inventory_shares for delete to authenticated
  using (
    (select auth.uid()) = invited_user_id
    and status = 'accepted'
  );

create or replace function public.leave_inventory_share(p_share_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Log in before leaving a shared inventory.';
  end if;

  delete from public.inventory_shares share
  where share.id = p_share_id
    and share.invited_user_id = v_user_id
    and share.status = 'accepted';

  return found;
end;
$$;

revoke all on function public.leave_inventory_share(uuid) from public;
grant execute on function public.leave_inventory_share(uuid) to authenticated;

-- This helper is security-definer to avoid recursive RLS checks on inventory_shares.
create or replace function public.can_access_inventory(p_owner_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid())::text = p_owner_id
    or exists (
      select 1
      from public.inventory_shares share
      where share.owner_id::text = p_owner_id
        and share.invited_user_id = (select auth.uid())
        and share.status = 'accepted'
    );
$$;

revoke all on function public.can_access_inventory(text) from public;
grant execute on function public.can_access_inventory(text) to authenticated;

create or replace function public.invite_inventory_collaborator(p_invited_email text)
returns public.inventory_shares
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_invited_email text := lower(trim(p_invited_email));
  v_invited_user_id uuid;
  v_owner_name text;
  v_share public.inventory_shares;
begin
  if v_owner_id is null then
    raise exception 'Log in before inviting someone to your inventory.';
  end if;
  if v_invited_email is null or v_invited_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  select account.id
    into v_invited_user_id
    from auth.users account
    where lower(account.email) = v_invited_email
    limit 1;
  if v_invited_user_id is null then
    raise exception 'No InvenApp account was found for that email. The person must register first.';
  end if;
  if v_invited_user_id = v_owner_id then
    raise exception 'You cannot invite your own account.';
  end if;

  select coalesce(profile.full_name, '')
    into v_owner_name
    from public.profiles profile
    where profile.id = v_owner_id;

  insert into public.inventory_shares (
    owner_id, invited_user_id, invited_email, owner_name, status
  )
  values (
    v_owner_id,
    v_invited_user_id,
    v_invited_email,
    coalesce(v_owner_name, ''),
    'pending'
  )
  on conflict (owner_id, invited_user_id) do update
    set invited_email = excluded.invited_email,
        owner_name = excluded.owner_name,
        status = 'pending',
        created_at = now()
    where public.inventory_shares.status = 'declined'
  returning * into v_share;

  if v_share.id is null then
    raise exception 'This account already has access or has a pending invitation.';
  end if;
  return v_share;
end;
$$;

revoke all on function public.invite_inventory_collaborator(text) from public;
grant execute on function public.invite_inventory_collaborator(text) to authenticated;

create or replace function public.prevent_inventory_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'An inventory item cannot be moved to another account.';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_items_prevent_owner_change on public.inventory_items;
create trigger inventory_items_prevent_owner_change
  before update of user_id on public.inventory_items
  for each row execute function public.prevent_inventory_owner_change();

drop policy if exists "Users can read their own inventory" on public.inventory_items;
drop policy if exists "Users can read owned or shared inventory" on public.inventory_items;
create policy "Users can read owned or shared inventory"
  on public.inventory_items for select to authenticated
  using (public.can_access_inventory(user_id::text));

drop policy if exists "Users can add to their own inventory" on public.inventory_items;
drop policy if exists "Users can add to owned or shared inventory" on public.inventory_items;
create policy "Users can add to owned or shared inventory"
  on public.inventory_items for insert to authenticated
  with check (public.can_access_inventory(user_id::text));

drop policy if exists "Users can update their own inventory" on public.inventory_items;
drop policy if exists "Users can update owned or shared inventory" on public.inventory_items;
create policy "Users can update owned or shared inventory"
  on public.inventory_items for update to authenticated
  using (public.can_access_inventory(user_id::text))
  with check (public.can_access_inventory(user_id::text));

drop policy if exists "Users can delete items from their own inventory" on public.inventory_items;
drop policy if exists "Users can delete their own inventory" on public.inventory_items;
drop policy if exists "Users can delete items from owned or shared inventory" on public.inventory_items;
create policy "Users can delete items from owned or shared inventory"
  on public.inventory_items for delete to authenticated
  using (public.can_access_inventory(user_id::text));

alter table public.stock_logs
  add column if not exists actor_id uuid references auth.users (id) on delete set null,
  add column if not exists actor_name text not null default '';

create or replace function public.log_inventory_quantity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
begin
  select nullif(btrim(profile.full_name), '')
    into v_actor_name
    from public.profiles profile
    where profile.id = v_actor_id;

  v_actor_name := coalesce(v_actor_name, 'Unknown user');

  if tg_op = 'INSERT' then
    insert into public.stock_logs (
      user_id, item_id, actor_id, actor_name,
      previous_quantity, new_quantity, change_amount, previous_price, new_price
    )
    values (
      new.user_id, new.id, v_actor_id, v_actor_name,
      null, new.quantity, new.quantity, null, new.price
    );
  else
    insert into public.stock_logs (
      user_id, item_id, actor_id, actor_name,
      previous_quantity, new_quantity, change_amount, previous_price, new_price
    )
    values (
      new.user_id, new.id, v_actor_id, v_actor_name,
      old.quantity, new.quantity, new.quantity - old.quantity, old.price, new.price
    );
  end if;
  return new;
end;
$$;

create table if not exists public.inventory_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null default '',
  inventory_owner_id uuid references auth.users (id) on delete set null,
  share_id uuid references public.inventory_shares (id) on delete cascade,
  type text not null check (type in ('inventory_invite', 'stock_added', 'stock_deleted')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.inventory_notifications
  add column if not exists actor_name text not null default '';

update public.inventory_notifications notification
set actor_name = case
  when notification.type = 'inventory_invite' then coalesce(
    (
      select nullif(share.owner_name, '')
      from public.inventory_shares share
      where share.id = notification.share_id
    ),
    'An InvenApp user'
  )
  when position(' removed "' in notification.message) > 0 then
    left(notification.message, position(' removed "' in notification.message) - 1)
  when position(' added "' in notification.message) > 0 then
    left(notification.message, position(' added "' in notification.message) - 1)
  else ''
end
where notification.actor_name = '';

alter table public.inventory_notifications
  drop constraint if exists inventory_notifications_type_check;
alter table public.inventory_notifications
  add constraint inventory_notifications_type_check
  check (type in ('inventory_invite', 'stock_added', 'stock_deleted'));

create index if not exists inventory_notifications_recipient_created_idx
  on public.inventory_notifications (recipient_id, created_at desc);
create unique index if not exists inventory_notifications_share_invite_idx
  on public.inventory_notifications (share_id)
  where type = 'inventory_invite';

alter table public.inventory_notifications enable row level security;
grant select on public.inventory_notifications to authenticated;
grant update (is_read) on public.inventory_notifications to authenticated;

drop policy if exists "Users can read their notifications" on public.inventory_notifications;
create policy "Users can read their notifications"
  on public.inventory_notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "Users can mark their notifications as read" on public.inventory_notifications;
create policy "Users can mark their notifications as read"
  on public.inventory_notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

create or replace function public.notify_inventory_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_should_notify boolean;
begin
  if tg_op = 'INSERT' then
    v_should_notify := new.status = 'pending';
  else
    v_should_notify := new.status = 'pending'
      and old.status is distinct from 'pending';
  end if;

  if v_should_notify then
    insert into public.inventory_notifications (
      recipient_id, actor_id, actor_name, inventory_owner_id, share_id, type, title, message
    )
    values (
      new.invited_user_id,
      new.owner_id,
      coalesce(nullif(new.owner_name, ''), 'An InvenApp user'),
      new.owner_id,
      new.id,
      'inventory_invite',
      'Inventory invitation',
      coalesce(nullif(new.owner_name, ''), 'An InvenApp user')
        || ' invited you to view and edit their inventory.'
    )
    on conflict (share_id) where type = 'inventory_invite' do update
      set recipient_id = excluded.recipient_id,
          actor_id = excluded.actor_id,
          actor_name = excluded.actor_name,
          inventory_owner_id = excluded.inventory_owner_id,
          title = excluded.title,
          message = excluded.message,
          is_read = false,
          created_at = now();
  elsif tg_op = 'UPDATE' then
    update public.inventory_notifications
      set is_read = true
      where share_id = new.id
        and type = 'inventory_invite';
  end if;
  return new;
end;
$$;

revoke all on function public.notify_inventory_invitation() from public;
drop trigger if exists inventory_shares_notify_invitation on public.inventory_shares;
create trigger inventory_shares_notify_invitation
  after insert or update of status on public.inventory_shares
  for each row execute function public.notify_inventory_invitation();

insert into public.inventory_notifications (
  recipient_id, actor_id, actor_name, inventory_owner_id, share_id, type, title, message
)
select share.invited_user_id,
       share.owner_id,
       coalesce(nullif(share.owner_name, ''), 'An InvenApp user'),
       share.owner_id,
       share.id,
       'inventory_invite',
       'Inventory invitation',
       coalesce(nullif(share.owner_name, ''), 'An InvenApp user')
         || ' invited you to view and edit their inventory.'
from public.inventory_shares share
where share.status = 'pending'
on conflict (share_id) where type = 'inventory_invite' do nothing;

create or replace function public.notify_shared_stock_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_message text;
begin
  select coalesce(nullif(profile.full_name, ''), 'A collaborator')
    into v_actor_name
    from public.profiles profile
    where profile.id = v_actor_id;

  v_message := coalesce(v_actor_name, 'A collaborator')
    || ' removed "' || old.name || '" from a shared inventory.';

  insert into public.inventory_notifications (
    recipient_id, actor_id, actor_name, inventory_owner_id, type, title, message
  )
  select recipients.recipient_id,
         v_actor_id,
         coalesce(v_actor_name, 'A collaborator'),
         old.user_id,
         'stock_deleted',
         'Shared stock removed',
         v_message
  from (
    select old.user_id as recipient_id
    union
    select share.invited_user_id
    from public.inventory_shares share
    where share.owner_id = old.user_id
      and share.status = 'accepted'
  ) recipients
  where recipients.recipient_id is distinct from v_actor_id;

  return old;
end;
$$;

revoke all on function public.notify_shared_stock_deleted() from public;
drop trigger if exists inventory_items_notify_shared_stock_deleted on public.inventory_items;
create trigger inventory_items_notify_shared_stock_deleted
  after delete on public.inventory_items
  for each row execute function public.notify_shared_stock_deleted();

create or replace function public.notify_shared_stock_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_message text;
begin
  select coalesce(nullif(profile.full_name, ''), 'A collaborator')
    into v_actor_name
    from public.profiles profile
    where profile.id = v_actor_id;

  v_message := coalesce(v_actor_name, 'A collaborator')
    || ' added "' || new.name || '" to a shared inventory.';

  insert into public.inventory_notifications (
    recipient_id, actor_id, actor_name, inventory_owner_id, type, title, message
  )
  select recipients.recipient_id,
         v_actor_id,
         coalesce(v_actor_name, 'A collaborator'),
         new.user_id,
         'stock_added',
         'Shared stock added',
         v_message
  from (
    select new.user_id as recipient_id
    union
    select share.invited_user_id
    from public.inventory_shares share
    where share.owner_id = new.user_id
      and share.status = 'accepted'
  ) recipients
  where recipients.recipient_id is distinct from v_actor_id;

  return new;
end;
$$;

revoke all on function public.notify_shared_stock_added() from public;
drop trigger if exists inventory_items_notify_shared_stock_added on public.inventory_items;
create trigger inventory_items_notify_shared_stock_added
  after insert on public.inventory_items
  for each row execute function public.notify_shared_stock_added();

drop policy if exists "Users can read their own stock history" on public.stock_logs;
drop policy if exists "Users can read owned or shared stock history" on public.stock_logs;
create policy "Users can read owned or shared stock history"
  on public.stock_logs for select to authenticated
  using (public.can_access_inventory(user_id::text));

drop policy if exists "Users can view their own item photos" on storage.objects;
drop policy if exists "Users can view owned or shared item photos" on storage.objects;
create policy "Users can view owned or shared item photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'item-photos'
    and public.can_access_inventory((storage.foldername(name))[1])
  );

drop policy if exists "Users can upload their own item photos" on storage.objects;
drop policy if exists "Users can upload owned or shared item photos" on storage.objects;
create policy "Users can upload owned or shared item photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and public.can_access_inventory((storage.foldername(name))[1])
  );

drop policy if exists "Users can update their own item photos" on storage.objects;
drop policy if exists "Users can update owned or shared item photos" on storage.objects;
create policy "Users can update owned or shared item photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-photos'
    and public.can_access_inventory((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'item-photos'
    and public.can_access_inventory((storage.foldername(name))[1])
  );

drop policy if exists "Users can delete their own item photos" on storage.objects;
drop policy if exists "Users can delete owned or shared item photos" on storage.objects;
create policy "Users can delete owned or shared item photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and public.can_access_inventory((storage.foldername(name))[1])
  );

do $$
begin
  alter publication supabase_realtime add table public.inventory_items;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.inventory_shares;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.inventory_notifications;
exception
  when duplicate_object then null;
end;
$$;
