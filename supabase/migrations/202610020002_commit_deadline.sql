alter table public.hive_choice_intents
  add column if not exists authorization_deadline bigint;
