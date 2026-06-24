create table if not exists public.npc_profiles (
  character_id text primary key references public.characters(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  profile jsonb not null,
  gm_notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.npc_profiles enable row level security;

drop policy if exists "select campaign npc characters" on public.characters;
create policy "select campaign npc characters"
on public.characters
for select
to authenticated
using (
  campaign_id is not null
  and public.is_campaign_member(campaign_id)
  and coalesce(character_kind::text, role::text) = 'NPC'
);

drop policy if exists "insert campaign npc characters" on public.characters;
create policy "insert campaign npc characters"
on public.characters
for insert
to authenticated
with check (
  campaign_id is not null
  and public.is_campaign_gm(campaign_id)
  and coalesce(character_kind::text, role::text) = 'NPC'
);

drop policy if exists "update campaign npc characters" on public.characters;
create policy "update campaign npc characters"
on public.characters
for update
to authenticated
using (
  campaign_id is not null
  and public.is_campaign_gm(campaign_id)
  and coalesce(character_kind::text, role::text) = 'NPC'
)
with check (
  campaign_id is not null
  and public.is_campaign_gm(campaign_id)
  and coalesce(character_kind::text, role::text) = 'NPC'
);

drop policy if exists "delete campaign npc characters" on public.characters;
create policy "delete campaign npc characters"
on public.characters
for delete
to authenticated
using (
  campaign_id is not null
  and public.is_campaign_gm(campaign_id)
  and coalesce(character_kind::text, role::text) = 'NPC'
);

drop policy if exists "select campaign npc profiles" on public.npc_profiles;
create policy "select campaign npc profiles"
on public.npc_profiles
for select
to authenticated
using (
  public.is_campaign_gm(campaign_id)
);

drop policy if exists "insert campaign npc profiles" on public.npc_profiles;
create policy "insert campaign npc profiles"
on public.npc_profiles
for insert
to authenticated
with check (
  public.is_campaign_gm(campaign_id)
  and exists (
    select 1
    from public.characters c
    where c.id = character_id
      and c.campaign_id = npc_profiles.campaign_id
      and coalesce(c.character_kind::text, c.role::text) = 'NPC'
  )
);

drop policy if exists "update campaign npc profiles" on public.npc_profiles;
create policy "update campaign npc profiles"
on public.npc_profiles
for update
to authenticated
using (
  public.is_campaign_gm(campaign_id)
)
with check (
  public.is_campaign_gm(campaign_id)
);

drop policy if exists "delete campaign npc profiles" on public.npc_profiles;
create policy "delete campaign npc profiles"
on public.npc_profiles
for delete
to authenticated
using (
  public.is_campaign_gm(campaign_id)
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
      and tablename = 'npc_profiles'
  ) then
    alter publication supabase_realtime add table public.npc_profiles;
  end if;
end
$$;

notify pgrst, 'reload schema';
