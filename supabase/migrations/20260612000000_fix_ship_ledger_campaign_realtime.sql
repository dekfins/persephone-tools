alter table public.ship_ledger
  add column if not exists campaign_id uuid references public.campaigns(id) on delete cascade,
  add column if not exists current_day numeric not null default 34,
  add column if not exists current_location text not null default 'mars_orbit',
  add column if not exists active_flight jsonb;

update public.ship_ledger
set campaign_id = '11111111-1111-4111-8111-111111111111'
where campaign_id is null;

alter table public.ship_ledger
  alter column campaign_id set not null;

create unique index if not exists ship_ledger_one_row_per_campaign
  on public.ship_ledger (campaign_id);

alter table public.ship_ledger replica identity full;

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
      and tablename = 'ship_ledger'
  ) then
    alter publication supabase_realtime add table public.ship_ledger;
  end if;
end
$$;
