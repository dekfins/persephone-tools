alter table public.characters
  add column if not exists system_strain integer not null default 0;

alter table public.characters
  add column if not exists max_system_strain integer;

update public.characters
set max_system_strain = coalesce((attributes->>'con')::integer, 10)
where max_system_strain is null;

alter table public.characters
  alter column max_system_strain set default 10,
  alter column max_system_strain set not null;
