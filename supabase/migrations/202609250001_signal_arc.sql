create table if not exists public.signal_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table if not exists public.signal_profiles (
  session_id uuid primary key references public.signal_sessions(id) on delete cascade,
  resume_text text not null default '',
  full_name text not null default 'Your name',
  headline text not null default 'Product-minded builder',
  skills jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.signal_jobs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  company text not null,
  role text not null,
  location text not null,
  kind text not null,
  salary text not null,
  description text not null,
  tags jsonb not null default '[]'::jsonb,
  accent text not null default '#d5ff55',
  created_at timestamptz not null default now()
);
create table if not exists public.signal_analysis (
  session_id uuid references public.signal_sessions(id) on delete cascade,
  job_id uuid references public.signal_jobs(id) on delete cascade,
  score int not null check (score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(session_id, job_id)
);
create table if not exists public.signal_drafts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.signal_sessions(id) on delete cascade,
  job_id uuid references public.signal_jobs(id) on delete cascade,
  body text not null,
  status text not null default 'review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.signal_usage (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.signal_sessions(id) on delete cascade,
  event text not null,
  units int not null default 1,
  created_at timestamptz not null default now()
);
alter table public.signal_sessions enable row level security;
alter table public.signal_profiles enable row level security;
alter table public.signal_jobs enable row level security;
alter table public.signal_analysis enable row level security;
alter table public.signal_drafts enable row level security;
alter table public.signal_usage enable row level security;
revoke all on public.signal_sessions, public.signal_profiles, public.signal_jobs, public.signal_analysis, public.signal_drafts, public.signal_usage from public, anon, authenticated;
grant all on public.signal_sessions, public.signal_profiles, public.signal_jobs, public.signal_analysis, public.signal_drafts, public.signal_usage to service_role;
insert into public.signal_jobs(slug, company, role, location, kind, salary, description, tags, accent) values
('lattice-frontend','Lattice Systems','Senior Frontend Engineer','Remote · EU / India','Full-time','$145k — $180k','Own the interface layer for a developer platform used by teams shipping critical infrastructure. You will shape a component system, partner with product, and turn complex state into calm experiences.','["react","typescript","design systems","systems"]','#d5ff55'),
('northstar-product','Northstar Labs','Product Engineer','Bengaluru · Hybrid','Full-time','₹36L — ₹52L','Build fast experiments from customer insight to production. The team values product sense, clear writing, and engineers who can move between interface, data, and APIs.','["react","product","api","python"]','#ff8d66'),
('atlas-ai','Atlas AI','AI Platform Engineer','New York · Remote','Full-time','$155k — $210k','Design reliable evaluation and observability loops for AI products. You will make model behavior legible through structured data, instrumentation, and thoughtful tooling.','["python","llm","postgres","observability"]','#9b8cff'),
('morrow-studio','Morrow Studio','Creative Technologist','London · Hybrid','Contract','£500 — £700 / day','Create expressive digital tools and prototypes that feel as good as they function. Strong visual taste and a willingness to work across code, motion, and narrative are essential.','["three.js","motion","react","prototyping"]','#65d8ff')
on conflict(slug) do nothing;
