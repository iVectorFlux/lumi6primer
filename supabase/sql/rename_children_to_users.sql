-- Rename learner table children → users.
-- Supabase login accounts stay in auth.users; this table is the Lumi6 profile.

do $$
begin
  if to_regclass('public.children') is not null and to_regclass('public.users') is null then
    alter table public.children rename to users;
  end if;
end $$;

alter index if exists children_pkey rename to users_pkey;
alter index if exists children_user_id_idx rename to users_user_id_idx;
alter index if exists children_user_id_unique rename to users_user_id_unique;

drop policy if exists children_owner_all on public.users;
drop policy if exists users_owner_all on public.users;
create policy users_owner_all on public.users
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists sessions_owner_all on public.sessions;
create policy sessions_owner_all on public.sessions
  for all to authenticated
  using (child_id in (select id from public.users where user_id = auth.uid()))
  with check (child_id in (select id from public.users where user_id = auth.uid()));

drop policy if exists turns_owner_all on public.turns;
create policy turns_owner_all on public.turns
  for all to authenticated
  using (child_id in (select id from public.users where user_id = auth.uid()))
  with check (child_id in (select id from public.users where user_id = auth.uid()));

drop policy if exists learning_events_owner_all on public.learning_events;
create policy learning_events_owner_all on public.learning_events
  for all to authenticated
  using (child_id in (select id from public.users where user_id = auth.uid()))
  with check (child_id in (select id from public.users where user_id = auth.uid()));

revoke all on table public.users from anon;
grant select, insert, update, delete on table public.users to authenticated;

comment on table public.users is 'Lumi6 profile for a signed-in auth.users account';
