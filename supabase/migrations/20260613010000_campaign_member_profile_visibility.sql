drop policy if exists "select campaign member profiles" on public.profiles;
create policy "select campaign member profiles"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.campaign_members viewer_membership
    join public.campaign_members target_membership
      on target_membership.campaign_id = viewer_membership.campaign_id
    where viewer_membership.user_id = auth.uid()
      and target_membership.user_id = profiles.id
  )
);
