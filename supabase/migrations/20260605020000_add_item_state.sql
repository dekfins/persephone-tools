alter table public.items
add column if not exists item_state text not null default 'stored';

update public.items
set item_state = 'stowed'
where owner_id <> 'SHIP_INVENTORY'
  and item_state = 'stored';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'items_item_state_check'
  ) then
    alter table public.items
    add constraint items_item_state_check
    check (item_state in ('readied', 'stowed', 'stored'));
  end if;
end $$;
