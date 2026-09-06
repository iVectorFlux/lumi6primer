-- Curated Class 5 maths/science HTML interactives for Talk Mode.

create table if not exists public.lesson_interactives (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  topics text[] not null default '{}',
  grade_min integer not null default 3,
  grade_max integer not null default 6,
  html text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_interactives_enabled_idx
  on public.lesson_interactives (enabled);

alter table public.lesson_interactives enable row level security;

drop policy if exists lesson_interactives_read on public.lesson_interactives;
create policy lesson_interactives_read on public.lesson_interactives
  for select to authenticated
  using (enabled = true);

revoke all on public.lesson_interactives from anon;
revoke all on public.lesson_interactives from authenticated;
grant select on public.lesson_interactives to authenticated;
