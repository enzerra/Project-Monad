-- VIBE source Calls and simulated-credit ledger. Server access only.
-- The whole pure-engine transition is committed with optimistic concurrency.
create table if not exists public.hive_vibe_state (
  id smallint primary key check (id = 1),
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.hive_vibe_state enable row level security;
revoke all on public.hive_vibe_state from anon, authenticated;
grant select, insert, update on public.hive_vibe_state to service_role;

create or replace function public.hive_commit_vibe_state(p_expected_revision bigint, p_payload jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_revision bigint;
begin
  if p_expected_revision < 0 or p_payload->>'version' is distinct from '1'
    or (p_payload->>'revision')::bigint is distinct from p_expected_revision + 1
    or jsonb_typeof(p_payload->'wallets') is distinct from 'object'
    or jsonb_typeof(p_payload->'calls') is distinct from 'array' then
    raise exception 'Invalid VIBE state';
  end if;
  insert into public.hive_vibe_state(id, revision, payload)
  values (1, 0, '{"version":1,"revision":0,"calls":[],"contents":[],"calibration":{},"wallets":{}}'::jsonb)
  on conflict(id) do nothing;
  select revision into current_revision from public.hive_vibe_state where id=1 for update;
  if current_revision <> p_expected_revision then return false; end if;
  update public.hive_vibe_state set revision=p_expected_revision+1, payload=p_payload, updated_at=now() where id=1;
  return true;
end;
$$;
revoke all on function public.hive_commit_vibe_state(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.hive_commit_vibe_state(bigint, jsonb) to service_role;

-- Profile attributes are display metadata. Only the verified Privy DID is identity.
revoke all on public.hive_users from anon, authenticated;
grant select, insert, update on public.hive_users to service_role;
