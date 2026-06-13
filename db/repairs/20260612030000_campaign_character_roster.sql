create table if not exists public.campaign_characters (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, character_id)
);

alter table public.campaign_characters enable row level security;

create or replace function public.is_campaign_member(target_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members cm
    where cm.campaign_id = target_campaign
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_campaign_gm(target_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members cm
    where cm.campaign_id = target_campaign
      and cm.user_id = auth.uid()
      and cm.role = 'GM'
  );
$$;

drop policy if exists "select campaign roster" on public.campaign_characters;
create policy "select campaign roster"
on public.campaign_characters
for select
to authenticated
using (
  public.is_campaign_member(campaign_id)
);

drop policy if exists "insert own campaign roster characters" on public.campaign_characters;
create policy "insert own campaign roster characters"
on public.campaign_characters
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_campaign_member(campaign_id)
  and exists (
    select 1
    from public.characters c
    where c.id = character_id
      and c.owner_user_id = auth.uid()
      and coalesce(c.character_kind::text, c.role::text) = 'PLAYER'
  )
);

drop policy if exists "delete campaign roster characters" on public.campaign_characters;
create policy "delete campaign roster characters"
on public.campaign_characters
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_campaign_gm(campaign_id)
);

drop policy if exists "select rostered player characters" on public.characters;
create policy "select rostered player characters"
on public.characters
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_characters cc
    where cc.character_id = characters.id
      and public.is_campaign_member(cc.campaign_id)
  )
);

drop policy if exists "select rostered personal items" on public.items;
create policy "select rostered personal items"
on public.items
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_characters cc
    where cc.character_id = items.owner_id
      and public.is_campaign_member(cc.campaign_id)
  )
);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaign_characters'
  ) then
    alter publication supabase_realtime add table public.campaign_characters;
  end if;
end
$$;

notify pgrst, 'reload schema';
