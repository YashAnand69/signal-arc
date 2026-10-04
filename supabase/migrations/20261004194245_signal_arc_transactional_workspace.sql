create or replace function public.signal_claim_workspace(guest_id uuid, account_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
 -- Serialize competing claims before checking guest ownership.
 perform id from signal_sessions where id in (guest_id, account_id) order by id for update;
 if guest_id = account_id or
 not exists(select 1 from signal_sessions where id=guest_id and user_id is null) or
 not exists(select 1 from signal_sessions where id=account_id and user_id=account_id) then return; end if;
 insert into signal_profiles(session_id,resume_text,full_name,headline,skills)
 select account_id,resume_text,full_name,headline,skills from signal_profiles where session_id=guest_id
 on conflict(session_id) do nothing;
 update signal_jobs set session_id=account_id where session_id=guest_id;
 update signal_drafts set session_id=account_id where session_id=guest_id;
 insert into signal_applications(session_id,job_id,stage,notes,deadline)
 select account_id,job_id,stage,notes,deadline from signal_applications where session_id=guest_id on conflict do nothing;
 -- The account may retain a different resume; scores must be recomputed.
 delete from signal_analysis where session_id=account_id;
 update signal_usage set session_id=account_id where session_id=guest_id;
 delete from signal_sessions where id=guest_id;
end; $$;
revoke all on function public.signal_claim_workspace(uuid,uuid) from public,anon,authenticated;
grant execute on function public.signal_claim_workspace(uuid,uuid) to service_role;

create or replace function public.signal_clear_workspace(workspace_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
 perform id from signal_sessions where id=workspace_id for update;
 delete from signal_applications where session_id=workspace_id;
 delete from signal_analysis where session_id=workspace_id;
 delete from signal_drafts where session_id=workspace_id;
 delete from signal_profiles where session_id=workspace_id;
 delete from signal_jobs where session_id=workspace_id;
 delete from signal_usage where session_id=workspace_id;
end; $$;
revoke all on function public.signal_clear_workspace(uuid) from public,anon,authenticated;
grant execute on function public.signal_clear_workspace(uuid) to service_role;
