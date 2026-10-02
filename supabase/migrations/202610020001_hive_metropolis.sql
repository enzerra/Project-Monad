-- Apply in a new Supabase project. Only server service-role access is allowed.
create extension if not exists pgcrypto;

create table if not exists public.hive_contents (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,
  title text not null,
  creator text not null,
  category text not null default 'Gaming',
  summary text not null default '',
  source_url text not null,
  kind text not null check (kind in ('insight','predictable','resolved')),
  published_at timestamptz not null default now()
);

create table if not exists public.hive_calls (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.hive_contents(id),
  chain_call_id text not null unique,
  baseline_views bigint not null check (baseline_views >= 0),
  target_views bigint not null check (target_views > baseline_views),
  horizon_hours integer not null check (horizon_hours in (6,24)),
  opened_at timestamptz not null,
  scheduled_closes_at timestamptz not null,
  evaluation_at timestamptz not null,
  reveal_deadline timestamptz not null,
  rules_hash text not null,
  source_hash text not null,
  status text not null check (status in ('open','closed','revealing','pending_result','resolved','void','cancelled')),
  create_tx_hash text,
  close_tx_hash text,
  resolve_tx_hash text,
  result_views bigint,
  result_snapshot_hash text,
  void_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.hive_choice_intents (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.hive_calls(id),
  privy_user_id text not null,
  wallet_address text not null,
  client_ip text not null,
  sealed_choice text not null,
  commitment_hash text not null,
  authorization_digest text not null,
  nonce text not null,
  status text not null check (status in ('prepared','submitting','locked','revealed','unrevealed','failed')),
  commit_tx_hash text,
  reveal_tx_hash text,
  created_at timestamptz not null default now(),
  unique (call_id, privy_user_id),
  unique (call_id, wallet_address)
);

create table if not exists public.hive_snapshots (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.hive_calls(id),
  views bigint not null,
  snapshot_hash text not null,
  source text not null default 'YouTube Data API',
  observed_at timestamptz not null default now(),
  purpose text not null check (purpose in ('baseline','poll','result','correction'))
);

create table if not exists public.hive_comments (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.hive_calls(id),
  privy_user_id text not null,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 500),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hive_calls_status_eval_idx on public.hive_calls(status,evaluation_at);
create index if not exists hive_choices_status_created_idx on public.hive_choice_intents(status,created_at);
create index if not exists hive_comments_call_created_idx on public.hive_comments(call_id,created_at);

alter table public.hive_contents enable row level security;
alter table public.hive_calls enable row level security;
alter table public.hive_choice_intents enable row level security;
alter table public.hive_snapshots enable row level security;
alter table public.hive_comments enable row level security;

-- No anon/authenticated policies. Next.js server uses a service-role key after
-- verifying Privy JWTs. Never expose the service key in browser code.
