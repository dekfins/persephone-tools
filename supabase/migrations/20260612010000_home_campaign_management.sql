create or replace function public.create_home_campaign(
  campaign_name text,
  campaign_description text default null
)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  created_campaign public.campaigns;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if nullif(trim(campaign_name), '') is null then
    raise exception 'Campaign name is required.';
  end if;

  insert into public.campaigns (name, description, status, created_by)
  values (trim(campaign_name), nullif(trim(campaign_description), ''), 'active', auth.uid())
  returning * into created_campaign;

  insert into public.campaign_members (campaign_id, user_id, role, active_character_id)
  values (created_campaign.id, auth.uid(), 'GM', null);

  return created_campaign;
end;
$$;

create or replace function public.delete_home_campaign(target_campaign uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.campaign_members
    where campaign_id = target_campaign
      and user_id = auth.uid()
      and role = 'GM'
  ) then
    raise exception 'GM access required.';
  end if;

  delete from public.campaigns
  where id = target_campaign;
end;
$$;

create or replace function public.leave_home_campaign(target_campaign uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
  gm_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select role into current_role
  from public.campaign_members
  where campaign_id = target_campaign
    and user_id = auth.uid();

  if current_role is null then
    raise exception 'Campaign membership not found.';
  end if;

  select count(*) into gm_count
  from public.campaign_members
  where campaign_id = target_campaign
    and role = 'GM';

  if current_role = 'GM' and gm_count <= 1 then
    raise exception 'The last GM cannot leave a campaign.';
  end if;

  delete from public.campaign_members
  where campaign_id = target_campaign
    and user_id = auth.uid();
end;
$$;

create or replace function public.remove_home_campaign_member(
  target_campaign uuid,
  target_user uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if target_user = auth.uid() then
    raise exception 'Use leave campaign instead.';
  end if;

  if not exists (
    select 1
    from public.campaign_members
    where campaign_id = target_campaign
      and user_id = auth.uid()
      and role = 'GM'
  ) then
    raise exception 'GM access required.';
  end if;

  delete from public.campaign_members
  where campaign_id = target_campaign
    and user_id = target_user;
end;
$$;
