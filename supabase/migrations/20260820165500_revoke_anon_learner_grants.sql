-- Learner tables are only for signed-in users (Supabase Auth).

revoke all on table public.children from anon;
revoke all on table public.sessions from anon;
revoke all on table public.turns from anon;
revoke all on table public.learning_events from anon;

grant select, insert, update, delete on table public.children to authenticated;
grant select, insert, update, delete on table public.sessions to authenticated;
grant select, insert, update, delete on table public.turns to authenticated;
grant select, insert, update, delete on table public.learning_events to authenticated;
