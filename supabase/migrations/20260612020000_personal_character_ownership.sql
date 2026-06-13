alter table public.characters
  alter column campaign_id drop not null;

alter table public.items
  alter column campaign_id drop not null;

create or replace function public.user_owns_item_owner(target_owner_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.characters c
    where c.id::text = target_owner_id
      and c.owner_user_id = auth.uid()
      and coalesce(c.character_kind::text, c.role::text) = 'PLAYER'
  );
$$;

drop policy if exists "select own player characters" on public.characters;
create policy "select own player characters"
on public.characters
for select
to authenticated
using (
  owner_user_id = auth.uid()
);

drop policy if exists "insert own player characters" on public.characters;
create policy "insert own player characters"
on public.characters
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and coalesce(character_kind::text, role::text) = 'PLAYER'
);

drop policy if exists "update own player characters" on public.characters;
create policy "update own player characters"
on public.characters
for update
to authenticated
using (
  owner_user_id = auth.uid()
  and coalesce(character_kind::text, role::text) = 'PLAYER'
)
with check (
  owner_user_id = auth.uid()
  and coalesce(character_kind::text, role::text) = 'PLAYER'
);

drop policy if exists "delete own player characters" on public.characters;
create policy "delete own player characters"
on public.characters
for delete
to authenticated
using (
  owner_user_id = auth.uid()
  and coalesce(character_kind::text, role::text) = 'PLAYER'
);

drop policy if exists "select own personal items" on public.items;
create policy "select own personal items"
on public.items
for select
to authenticated
using (
  public.user_owns_item_owner(owner_id)
);

drop policy if exists "insert own personal items" on public.items;
create policy "insert own personal items"
on public.items
for insert
to authenticated
with check (
  public.user_owns_item_owner(owner_id)
);

drop policy if exists "update own personal items" on public.items;
create policy "update own personal items"
on public.items
for update
to authenticated
using (
  public.user_owns_item_owner(owner_id)
)
with check (
  public.user_owns_item_owner(owner_id)
);

drop policy if exists "delete own personal items" on public.items;
create policy "delete own personal items"
on public.items
for delete
to authenticated
using (
  public.user_owns_item_owner(owner_id)
);
