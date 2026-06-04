alter table public.characters
  add column if not exists xp integer not null default 0;
