-- Skerry core schema: workspaces, members, ICP, leads, Stripe fields.
-- Apply via Supabase CLI: supabase db push / dashboard SQL.
-- RLS: strict workspace isolation via workspace_members.

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Workspaces ─────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Workspace',
  slug text not null unique,
  plan_tier text not null default 'solo' check (plan_tier in ('solo', 'team', 'agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user on public.workspace_members (user_id);

-- ─── ICP (Ideal Customer Profile) ───────────────────────────────────────────
create table if not exists public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  business_description text not null default '',
  ideal_customer text not null default '',
  problem_solved text not null default '',
  account_tier text not null default 'solo' check (account_tier in ('solo', 'team', 'agency')),
  extra jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── Leads ──────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  stage text not null default 'source' check (stage in ('source', 'analyze', 'draft', 'send')),
  personal jsonb not null default '{}',
  organization jsonb not null default '{}',
  extraction jsonb not null default '{}',
  newsletter jsonb not null default '{}',
  source text not null default 'openai' check (source in ('openai', 'apify', 'import', 'manual')),
  external_ref text,
  pushed_to_instantly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_workspace on public.leads (workspace_id);
create index if not exists idx_leads_created on public.leads (workspace_id, created_at desc);

-- ─── Auth: auto workspace + ICP on signup ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  base_slug text;
begin
  base_slug := 'ws-' || substr(replace(new.id::text, '-', ''), 1, 12);
  insert into public.workspaces (name, slug, plan_tier)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s workspace',
    base_slug,
    'solo'
  )
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  insert into public.icp_profiles (workspace_id, business_description, ideal_customer, problem_solved, account_tier)
  values (ws_id, '', '', '', 'solo');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.icp_profiles enable row level security;
alter table public.leads enable row level security;

-- workspaces: visible to members
create policy "workspaces_select_member"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id and m.user_id = auth.uid()
    )
  );

create policy "workspaces_update_owner"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- workspace_members: users see memberships for workspaces they belong to
create policy "wm_select"
  on public.workspace_members for select
  using (user_id = auth.uid());

-- icp_profiles
create policy "icp_all_member"
  on public.icp_profiles for all
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = icp_profiles.workspace_id and m.user_id = auth.uid()
    )
  );

-- leads
create policy "leads_all_member"
  on public.leads for all
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = leads.workspace_id and m.user_id = auth.uid()
    )
  );

-- ─── updated_at touch ───────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workspaces_touch on public.workspaces;
create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

drop trigger if exists icp_touch on public.icp_profiles;
create trigger icp_touch before update on public.icp_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();
