alter table public.characters
alter column foci type jsonb
using case
  when foci is null then '[]'::jsonb
  when pg_typeof(foci)::text = 'jsonb' then foci::jsonb
  else jsonb_build_array(
    jsonb_build_object(
      'focus',
      foci::text,
      'level',
      1,
      'source',
      'base'
    )
  )
end;

alter table public.characters
alter column foci set default '[]'::jsonb;
