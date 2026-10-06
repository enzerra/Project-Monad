-- Table to store user profiles from Google / Privy login
create table if not exists public.hive_users (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text not null unique,
  email text,
  name text,
  avatar_url text,
  wallet_address text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create index if not exists hive_users_privy_idx on public.hive_users(privy_user_id);
create index if not exists hive_users_wallet_idx on public.hive_users(wallet_address);

alter table public.hive_users enable row level security;
