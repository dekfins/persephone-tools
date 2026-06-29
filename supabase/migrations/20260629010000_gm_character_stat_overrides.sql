create or replace function public.valid_character_attributes(candidate jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when jsonb_typeof(candidate) <> 'object' then false
    else
      (select count(*) = 6 from jsonb_object_keys(candidate))
      and candidate ?& array['str', 'dex', 'con', 'int', 'wis', 'cha']
      and not exists (
        select 1
        from jsonb_each(candidate) as attribute(key, value)
        where attribute.key not in ('str', 'dex', 'con', 'int', 'wis', 'cha')
          or case
            when jsonb_typeof(attribute.value) = 'number'
              and (attribute.value #>> '{}') ~ '^[0-9]+$'
            then (attribute.value #>> '{}')::integer not between 3 and 18
            else true
          end
      )
  end;
$$;

revoke all on function public.valid_character_attributes(jsonb) from public;

create or replace function public.gm_finalize_player_attributes(
  target_campaign_id uuid,
  target_character_id text,
  final_attributes jsonb,
  next_background_progress jsonb,
  next_max_system_strain integer,
  next_system_strain integer
)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_character public.characters;
begin
  if not public.is_campaign_gm(target_campaign_id) then
    raise exception 'Only an active campaign GM can finalize player attributes.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.campaign_characters cc
    join public.characters c on c.id = cc.character_id
    where cc.campaign_id = target_campaign_id
      and cc.character_id = target_character_id
      and coalesce(c.character_kind::text, c.role::text) = 'PLAYER'
  ) then
    raise exception 'Target must be a rostered player character.'
      using errcode = '42501';
  end if;

  if not public.valid_character_attributes(final_attributes) then
    raise exception 'All six attributes must be integers from 3 through 18.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(next_background_progress) <> 'object' then
    raise exception 'Background progress must be an object.'
      using errcode = '22023';
  end if;

  if next_max_system_strain <> (final_attributes ->> 'con')::integer
    or next_system_strain < 0
    or next_system_strain > next_max_system_strain
  then
    raise exception 'System Strain values do not match finalized Constitution.'
      using errcode = '22023';
  end if;

  update public.characters
  set
    attributes = final_attributes,
    background_progress = next_background_progress,
    max_system_strain = next_max_system_strain,
    system_strain = next_system_strain
  where id = target_character_id
  returning * into updated_character;

  if updated_character.id is null then
    raise exception 'Player character was not found.'
      using errcode = 'P0002';
  end if;

  return updated_character;
end;
$$;

revoke all on function public.gm_finalize_player_attributes(
  uuid,
  text,
  jsonb,
  jsonb,
  integer,
  integer
) from public;
grant execute on function public.gm_finalize_player_attributes(
  uuid,
  text,
  jsonb,
  jsonb,
  integer,
  integer
) to authenticated;

create or replace function public.gm_update_player_numeric_stats(
  target_campaign_id uuid,
  target_character_id text,
  next_attributes jsonb,
  next_hp integer,
  next_max_hp integer,
  next_system_strain integer,
  next_max_system_strain integer,
  next_rads integer,
  next_max_rads integer,
  next_base_ac integer,
  next_xp integer,
  next_personal_credits integer
)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_character public.characters;
begin
  if not public.is_campaign_gm(target_campaign_id) then
    raise exception 'Only an active campaign GM can override player stats.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.campaign_characters cc
    join public.characters c on c.id = cc.character_id
    where cc.campaign_id = target_campaign_id
      and cc.character_id = target_character_id
      and coalesce(c.character_kind::text, c.role::text) = 'PLAYER'
  ) then
    raise exception 'Target must be a rostered player character.'
      using errcode = '42501';
  end if;

  if not public.valid_character_attributes(next_attributes) then
    raise exception 'All six attributes must be integers from 3 through 18.'
      using errcode = '22023';
  end if;

  if next_max_hp < 1 or next_hp < 0 or next_hp > next_max_hp then
    raise exception 'HP must be between zero and maximum HP.'
      using errcode = '22023';
  end if;

  if next_max_system_strain < 0
    or next_system_strain < 0
    or next_system_strain > next_max_system_strain
  then
    raise exception 'System Strain must be between zero and its maximum.'
      using errcode = '22023';
  end if;

  if next_max_rads < 0 or next_rads < 0 or next_rads > next_max_rads then
    raise exception 'Rads must be between zero and maximum Rads.'
      using errcode = '22023';
  end if;

  if next_base_ac < 0 or next_xp < 0 or next_personal_credits < 0 then
    raise exception 'AC, XP, and personal credits cannot be negative.'
      using errcode = '22023';
  end if;

  update public.characters
  set
    attributes = next_attributes,
    hp = next_hp,
    max_hp = next_max_hp,
    system_strain = next_system_strain,
    max_system_strain = next_max_system_strain,
    rads = next_rads,
    max_rads = next_max_rads,
    base_ac = next_base_ac,
    xp = next_xp,
    personal_credits = next_personal_credits
  where id = target_character_id
  returning * into updated_character;

  if updated_character.id is null then
    raise exception 'Player character was not found.'
      using errcode = 'P0002';
  end if;

  return updated_character;
end;
$$;

revoke all on function public.gm_update_player_numeric_stats(
  uuid,
  text,
  jsonb,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) from public;
grant execute on function public.gm_update_player_numeric_stats(
  uuid,
  text,
  jsonb,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) to authenticated;
