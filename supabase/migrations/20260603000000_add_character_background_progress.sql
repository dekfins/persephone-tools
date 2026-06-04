alter table public.characters
add column if not exists background_progress jsonb not null default '{}';
