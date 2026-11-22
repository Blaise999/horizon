-- Horizon: Supabase-only data model. Run in the Supabase SQL Editor before using the app.
-- Important: operations are ledger/pending-approval records only, NOT real bank payouts.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  onboarding_complete boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('checking','savings')),
  currency text not null default 'USD' check (currency='USD'),
  balance numeric(18,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  unique(user_id,kind)
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rail text not null check (rail in ('ach','wire','international','zelle','paypal','venmo','cashapp','revolut','wise','alipay','wechat','crypto','billpay','internal')),
  from_account text not null default 'checking' check(from_account in ('checking','savings')),
  beneficiary text not null check(length(btrim(beneficiary)) between 2 and 160),
  amount numeric(18,2) not null check(amount>0),
  note text not null default '',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists transfers_user_created_idx on public.transfers(user_id,created_at desc);
create index if not exists transfers_status_created_idx on public.transfers(status,created_at desc);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_kind text not null check(account_kind in ('checking','savings')),
  amount numeric(18,2) not null check(amount <> 0),
  description text not null,
  category text not null default 'Transfer',
  transfer_id uuid references public.transfers(id),
  created_at timestamptz not null default now()
);
create unique index if not exists unique_transfer_transaction on public.transactions(transfer_id) where transfer_id is not null;
create index if not exists transactions_user_created_idx on public.transactions(user_id,created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit(created_at desc);

-- Creates a profile and two ZERO-balance internal ledger accounts on signup.
-- No real bank/card numbers are issued by this schema.
create or replace function public.horizon_on_auth_user_created()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles (id,email,first_name,last_name)
  values (new.id, coalesce(new.email,''), left(coalesce(new.raw_user_meta_data->>'first_name',''),100), left(coalesce(new.raw_user_meta_data->>'last_name',''),100))
  on conflict (id) do nothing;
  insert into public.accounts (user_id,kind) values (new.id,'checking'),(new.id,'savings')
  on conflict(user_id,kind) do nothing;
  return new;
end $$;
drop trigger if exists on_horizon_auth_user_created on auth.users;
create trigger on_horizon_auth_user_created after insert on auth.users
  for each row execute function public.horizon_on_auth_user_created();

-- Backfill profiles for users created before the migration.
insert into public.profiles(id,email,first_name,last_name)
select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'first_name',''),100),left(coalesce(raw_user_meta_data->>'last_name',''),100)
from auth.users on conflict(id) do nothing;
insert into public.accounts(user_id,kind)
select p.id,k.kind from public.profiles p cross join (values ('checking'),('savings')) k(kind)
on conflict(user_id,kind) do nothing;

create or replace function public.horizon_is_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.horizon_is_admin() from public;
grant execute on function public.horizon_is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transfers enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit enable row level security;

drop policy if exists profile_read on public.profiles;
create policy profile_read on public.profiles for select to authenticated
using (id=auth.uid() or public.horizon_is_admin());
drop policy if exists profile_self_update on public.profiles;
create policy profile_self_update on public.profiles for update to authenticated
using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists account_read on public.accounts;
create policy account_read on public.accounts for select to authenticated
using (user_id=auth.uid() or public.horizon_is_admin());
drop policy if exists transfer_read on public.transfers;
create policy transfer_read on public.transfers for select to authenticated
using (user_id=auth.uid() or public.horizon_is_admin());
drop policy if exists transaction_read on public.transactions;
create policy transaction_read on public.transactions for select to authenticated
using (user_id=auth.uid() or public.horizon_is_admin());
drop policy if exists notification_read on public.notifications;
create policy notification_read on public.notifications for select to authenticated
using (user_id=auth.uid() or public.horizon_is_admin());
drop policy if exists notification_self_read on public.notifications;
create policy notification_self_read on public.notifications for update to authenticated
using (user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists audit_admin_read on public.admin_audit;
create policy audit_admin_read on public.admin_audit for select to authenticated
using(public.horizon_is_admin());

-- Restrict column-level updates; users cannot self-appoint admin or edit balances.
revoke all on public.profiles,public.accounts,public.transfers,public.transactions,public.notifications,public.admin_audit from anon,authenticated;
grant select on public.profiles,public.accounts,public.transfers,public.transactions,public.notifications,public.admin_audit to authenticated;
grant update (first_name,last_name,phone,avatar_url,preferences,onboarding_complete) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.horizon_request_transfer(
  p_rail text, p_amount numeric, p_beneficiary text,
  p_account text default 'checking', p_note text default '', p_details jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Please sign in'; end if;
  if p_rail not in ('ach','wire','international','zelle','paypal','venmo','cashapp','revolut','wise','alipay','wechat','crypto','billpay','internal')
     then raise exception 'Unsupported payment method'; end if;
  if p_account not in ('checking','savings') then raise exception 'Unsupported account'; end if;
  if p_amount is null or p_amount<=0 or p_amount>1000000 or round(p_amount,2)<>p_amount then raise exception 'Invalid amount'; end if;
  if length(btrim(coalesce(p_beneficiary,''))) not between 2 and 160 then raise exception 'Recipient is required'; end if;
  if length(coalesce(p_note,''))>500 then raise exception 'Note is too long'; end if;
  if not exists(select 1 from public.accounts where user_id=v_user and kind=p_account) then raise exception 'Account missing'; end if;
  insert into public.transfers(user_id,rail,from_account,beneficiary,amount,note,details)
  values(v_user,p_rail,p_account,btrim(p_beneficiary),p_amount,coalesce(p_note,''),coalesce(p_details,'{}'::jsonb))
  returning id into v_id;
  insert into public.notifications(user_id,title,message)
  values(v_user,'Transfer request received','Your transfer request is pending review. This is not a confirmation of payment.');
  return v_id;
end $$;

create or replace function public.horizon_review_transfer(p_transfer_id uuid,p_action text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_transfer public.transfers%rowtype; v_balance numeric; v_admin uuid:=auth.uid();
begin
  if not public.horizon_is_admin() then raise exception 'Admin access required'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid review action'; end if;
  select * into v_transfer from public.transfers where id=p_transfer_id for update;
  if not found then raise exception 'Transfer not found'; end if;
  if v_transfer.status<>'pending' then raise exception 'Transfer already reviewed'; end if;
  if p_action='approve' then
    select balance into v_balance from public.accounts
    where user_id=v_transfer.user_id and kind=v_transfer.from_account for update;
    if not found or v_balance<v_transfer.amount then raise exception 'Insufficient available balance'; end if;
    update public.accounts set balance=balance-v_transfer.amount where user_id=v_transfer.user_id and kind=v_transfer.from_account;
    insert into public.transactions(user_id,account_kind,amount,description,category,transfer_id)
    values(v_transfer.user_id,v_transfer.from_account,-v_transfer.amount,'Transfer to '||v_transfer.beneficiary,'Transfer',v_transfer.id);
  end if;
  update public.transfers set status=case when p_action='approve' then 'approved' else 'rejected' end,
    reviewed_by=v_admin, reviewed_at=now() where id=v_transfer.id;
  insert into public.notifications(user_id,title,message) values
    (v_transfer.user_id,case when p_action='approve' then 'Transfer approved' else 'Transfer declined' end,
     case when p_action='approve' then 'Your internal account ledger has been debited. External payment requires a provider.' else 'Your transfer request was not approved.' end);
  insert into public.admin_audit(admin_id,action,target_id,details)
  values(v_admin,'transfer_'||p_action,v_transfer.id,jsonb_build_object('amount',v_transfer.amount,'user_id',v_transfer.user_id));
end $$;

create or replace function public.horizon_adjust_balance(
  p_user_id uuid,p_account text,p_delta numeric,p_reason text
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_balance numeric;
begin
  if not public.horizon_is_admin() then raise exception 'Admin access required'; end if;
  if p_account not in ('checking','savings') then raise exception 'Invalid account'; end if;
  if p_delta is null or p_delta=0 or abs(p_delta)>1000000 or round(p_delta,2)<>p_delta then raise exception 'Invalid adjustment'; end if;
  if length(btrim(coalesce(p_reason,'')))<5 or length(p_reason)>300 then raise exception 'A meaningful reason is required'; end if;
  select balance into v_balance from public.accounts where user_id=p_user_id and kind=p_account for update;
  if not found then raise exception 'Account not found'; end if;
  if v_balance+p_delta<0 then raise exception 'Insufficient balance'; end if;
  update public.accounts set balance=balance+p_delta where user_id=p_user_id and kind=p_account;
  insert into public.transactions(user_id,account_kind,amount,description,category)
  values(p_user_id,p_account,p_delta,btrim(p_reason),'Adjustment');
  insert into public.notifications(user_id,title,message)
  values(p_user_id,'Account adjustment',btrim(p_reason));
  insert into public.admin_audit(admin_id,action,target_id,details)
  values(v_admin,'balance_adjustment',p_user_id,jsonb_build_object('account',p_account,'delta',p_delta,'reason',p_reason));
end $$;

create or replace function public.horizon_send_notice(p_title text,p_message text,p_user_id uuid default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_count integer;
begin
  if not public.horizon_is_admin() then raise exception 'Admin access required'; end if;
  if length(btrim(coalesce(p_title,''))) not between 3 and 120 or length(btrim(coalesce(p_message,''))) not between 3 and 1500 then
    raise exception 'Title or message length invalid'; end if;
  if p_user_id is not null and not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'User not found'; end if;
  insert into public.notifications(user_id,title,message)
  select id,btrim(p_title),btrim(p_message) from public.profiles where (p_user_id is null and role='user') or id=p_user_id;
  get diagnostics v_count=row_count;
  insert into public.admin_audit(admin_id,action,target_id,details)
  values(v_admin,'notification_sent',p_user_id,jsonb_build_object('title',p_title,'recipients',v_count));
  return v_count;
end $$;

revoke all on function public.horizon_request_transfer(text,numeric,text,text,text,jsonb) from public;
revoke all on function public.horizon_review_transfer(uuid,text) from public;
revoke all on function public.horizon_adjust_balance(uuid,text,numeric,text) from public;
revoke all on function public.horizon_send_notice(text,text,uuid) from public;
grant execute on function public.horizon_request_transfer(text,numeric,text,text,text,jsonb) to authenticated;
grant execute on function public.horizon_review_transfer(uuid,text) to authenticated;
grant execute on function public.horizon_adjust_balance(uuid,text,numeric,text) to authenticated;
grant execute on function public.horizon_send_notice(text,text,uuid) to authenticated;

-- After signing up with a REAL email and confirming it, manually grant admin access from SQL Editor:
-- update public.profiles set role='admin' where email='your-verified-admin@example.com';
-- Do not expose the service_role/secret API key in Next.js or the browser.
