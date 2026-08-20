-- Primer Phase 1: persistent child model, sessions, and turns.
-- Apply with the Supabase CLI or SQL editor.

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  age_years integer,
  grade text,
  knowledge_map jsonb not null default '{}'::jsonb,
  active_misconceptions jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,
  reasoning_profile jsonb not null default '{}'::jsonb,
  metacognition_level text not null default 'emerging',
  independence_level text not null default 'guided',
  personality_notes text,
  total_sessions integer not null default 0,
  total_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,
  summary text,
  topics_touched jsonb not null default '[]'::jsonb,
  cognitive_goals jsonb not null default '[]'::jsonb,
  breakthroughs jsonb not null default '[]'::jsonb,
  experience_pattern text,
  child_model_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  turn_number integer,
  role text not null check (role in ('child', 'primer')),
  spoken_text text,
  canvas_action jsonb,
  board_image_url text,
  ai_reasoning jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  event_type text not null,
  topic text,
  description text,
  significance text not null default 'normal',
  created_at timestamptz not null default now()
);

create index if not exists children_user_id_idx on public.children (user_id);
create index if not exists sessions_child_id_idx on public.sessions (child_id, started_at desc);
create index if not exists turns_session_id_idx on public.turns (session_id, turn_number);
create index if not exists turns_child_id_idx on public.turns (child_id, created_at desc);
create index if not exists learning_events_child_id_idx on public.learning_events (child_id, created_at desc);

alter table public.children enable row level security;
alter table public.sessions enable row level security;
alter table public.turns enable row level security;
alter table public.learning_events enable row level security;

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

-- Server currently uses the publishable/anon key (no service role yet).
-- These policies let the Primer Node server persist turns until a service role is configured.
drop policy if exists children_anon_all on public.children;
create policy children_anon_all on public.children
  for all to anon
  using (true)
  with check (true);

drop policy if exists sessions_anon_all on public.sessions;
create policy sessions_anon_all on public.sessions
  for all to anon
  using (true)
  with check (true);

drop policy if exists turns_anon_all on public.turns;
create policy turns_anon_all on public.turns
  for all to anon
  using (true)
  with check (true);

drop policy if exists learning_events_anon_all on public.learning_events;
create policy learning_events_anon_all on public.learning_events
  for all to anon
  using (true)
  with check (true);
