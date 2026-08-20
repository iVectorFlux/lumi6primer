-- Kid/teen learner profiles for Lumi6 onboarding and personalization.

alter table public.children
  add column if not exists onboarded_at timestamptz;

create unique index if not exists children_user_id_unique
  on public.children (user_id)
  where user_id is not null;

drop policy if exists children_anon_all on public.children;
drop policy if exists sessions_anon_all on public.sessions;
drop policy if exists turns_anon_all on public.turns;
drop policy if exists learning_events_anon_all on public.learning_events;

drop policy if exists children_owner_all on public.children;
create policy children_owner_all on public.children
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists sessions_owner_all on public.sessions;
create policy sessions_owner_all on public.sessions
  for all to authenticated
  using (child_id in (select id from public.children where user_id = auth.uid()))
  with check (child_id in (select id from public.children where user_id = auth.uid()));

drop policy if exists turns_owner_all on public.turns;
create policy turns_owner_all on public.turns
  for all to authenticated
  using (child_id in (select id from public.children where user_id = auth.uid()))
  with check (child_id in (select id from public.children where user_id = auth.uid()));

drop policy if exists learning_events_owner_all on public.learning_events;
create policy learning_events_owner_all on public.learning_events
  for all to authenticated
  using (child_id in (select id from public.children where user_id = auth.uid()))
  with check (child_id in (select id from public.children where user_id = auth.uid()));
