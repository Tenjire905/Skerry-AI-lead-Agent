-- Skerry waitlist schema.
-- Apply via: supabase db push  (or copy into the Supabase SQL editor).

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  position bigint generated always as identity,

  email text not null,
  email_lower text generated always as (lower(email)) stored,

  -- attribution
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  user_agent text,
  ip_country text,

  -- founding deposit (Stripe)
  stripe_customer_id text,
  stripe_session_id text,
  deposited boolean not null default false,
  deposit_amount_cents integer,
  deposit_paid_at timestamptz,

  -- ops
  confirmed_at timestamptz,
  confirm_token text,
  unsubscribed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_lower_uniq
  on public.waitlist (email_lower);

create index if not exists waitlist_position_idx
  on public.waitlist (position);

create index if not exists waitlist_deposited_idx
  on public.waitlist (deposited)
  where deposited = true;

-- updated_at trigger
create or replace function public.waitlist_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists waitlist_updated_at on public.waitlist;
create trigger waitlist_updated_at
  before update on public.waitlist
  for each row execute function public.waitlist_set_updated_at();

-- RLS: lock the table down. The landing site uses the service role key,
-- which bypasses RLS. No other client should read this table directly.
alter table public.waitlist enable row level security;

-- Explicit deny for anon + authenticated. (RLS without policies = deny.)
revoke all on public.waitlist from anon, authenticated;
grant all on public.waitlist to service_role;
