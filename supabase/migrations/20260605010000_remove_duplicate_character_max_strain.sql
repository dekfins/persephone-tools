update public.characters
set max_system_strain = coalesce(max_system_strain, max_strain, 10)
where max_system_strain is null;

alter table public.characters
  alter column max_system_strain set default 10,
  alter column max_system_strain set not null;

alter table public.characters
  drop column if exists max_strain;
