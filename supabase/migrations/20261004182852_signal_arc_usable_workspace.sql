alter table public.signal_sessions add column if not exists user_id uuid unique references auth.users(id) on delete cascade;
alter table public.signal_jobs add column if not exists session_id uuid references public.signal_sessions(id) on delete cascade;
alter table public.signal_jobs add column if not exists source_url text not null default '';
create index if not exists signal_jobs_session_idx on public.signal_jobs(session_id);
create index if not exists signal_drafts_session_idx on public.signal_drafts(session_id);
create index if not exists signal_usage_session_time_idx on public.signal_usage(session_id,created_at);
create table if not exists public.signal_applications (
 session_id uuid not null references public.signal_sessions(id) on delete cascade,
 job_id uuid not null references public.signal_jobs(id) on delete cascade,
 stage text not null default 'saved' check(stage in ('saved','applied','interview','offer','closed')),
 notes text not null default '', deadline date,
 updated_at timestamptz not null default now(), primary key(session_id,job_id)
);
alter table public.signal_applications enable row level security;
revoke all on public.signal_applications from public,anon,authenticated;
grant all on public.signal_applications to service_role;
create or replace function public.signal_claim_workspace(guest_id uuid, account_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
 if not exists(select 1 from signal_sessions where id=guest_id and user_id is null) or
 not exists(select 1 from signal_sessions where id=account_id and user_id=account_id) then return; end if;
 insert into signal_profiles(session_id,resume_text,full_name,headline,skills)
 select account_id,resume_text,full_name,headline,skills from signal_profiles where session_id=guest_id on conflict(session_id) do nothing;
 update signal_jobs set session_id=account_id where session_id=guest_id;
 update signal_drafts set session_id=account_id where session_id=guest_id;
 insert into signal_applications(session_id,job_id,stage,notes,deadline)
 select account_id,job_id,stage,notes,deadline from signal_applications where session_id=guest_id on conflict do nothing;
 insert into signal_analysis(session_id,job_id,score,reasons)
 select account_id,job_id,score,reasons from signal_analysis where session_id=guest_id on conflict do nothing;
 update signal_usage set session_id=account_id where session_id=guest_id;
 delete from signal_sessions where id=guest_id;
end; $$;
revoke all on function public.signal_claim_workspace(uuid,uuid) from public,anon,authenticated;
grant execute on function public.signal_claim_workspace(uuid,uuid) to service_role;
