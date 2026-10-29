-- LOCAL RESTORE ONLY. No new users/roles. Synthetic leads are rolled back.
-- Requires the optional-reasons SQL in a NEW isolated restored database.
\set ON_ERROR_STOP on
begin;
do $$ begin
 if current_database() !~ '^privilege_restore_[a-f0-9]{12}$' or current_user <> 'supabase_admin' then
  raise exception 'Only the isolated local restore database is allowed';
 end if;
 if pg_get_function_arguments('public.crm_assign_lead(bigint,uuid,text)'::regprocedure) not like '%DEFAULT%' then
  raise exception 'Optional reasons not installed in this local database';
 end if;
 perform set_config('qa.manager',(select id::text from public.user_roles where role='manager' and disabled_at is null limit 1),true);
 perform set_config('qa.a',(select r.id::text from public.user_roles r join public.brokers b on b.id=r.id where r.role in ('broker','corretor') and r.disabled_at is null and b.active order by r.id limit 1),true);
 perform set_config('qa.b',(select r.id::text from public.user_roles r join public.brokers b on b.id=r.id where r.role in ('broker','corretor') and r.disabled_at is null and b.active order by r.id limit 1 offset 1),true);
 if nullif(current_setting('qa.manager'),'') is null or nullif(current_setting('qa.a'),'') is null or nullif(current_setting('qa.b'),'') is null then
  raise exception 'Existing manager and two brokers required; do not create accounts';
 end if;
 if exists(select 1 from public.leads where id between -92800200 and -92800000) then raise exception 'Fixture ID collision'; end if;
end $$;
insert into public.leads(id,name,source,origin_type,broker_id)
select -92800000-i,'SYNTHETIC local optional assignment','local_optional_qa','company',null from generate_series(1,6) i
union all
select -92800100-i,'SYNTHETIC local optional transfer','local_optional_qa','personal',current_setting('qa.a')::uuid from generate_series(1,7) i;

set local role authenticated;
do $$ declare i int; reason text; request_id bigint; begin
 for i in 1..6 loop
  reason := case i when 1 then '' when 2 then '   ' when 3 then null when 4 then 'Reason supplied' when 5 then repeat('x',500) else null end;
  perform set_config('request.jwt.claim.sub',current_setting('qa.manager'),true);
  perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.manager'),'role','authenticated')::text,true);
  if i=6 then
   perform public.crm_assign_lead(-92800000-i,current_setting('qa.a')::uuid);
   perform public.crm_assign_lead(-92800000-i,current_setting('qa.a')::uuid);
  else
   perform public.crm_assign_lead(-92800000-i,current_setting('qa.a')::uuid,reason);
   perform public.crm_assign_lead(-92800000-i,current_setting('qa.a')::uuid,reason);
  end if;
  perform set_config('request.jwt.claim.sub',current_setting('qa.a'),true);
  perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.a'),'role','authenticated')::text,true);
  if not exists(select 1 from public.leads where id=-92800000-i and origin_type='company' and broker_id=current_setting('qa.a')::uuid) then raise exception 'Assignment persistence/origin failed'; end if;
  if i=6 then request_id:=public.crm_request_lead_transfer(-92800100-i,current_setting('qa.b')::uuid);
  else request_id:=public.crm_request_lead_transfer(-92800100-i,current_setting('qa.b')::uuid,reason); end if;
  if not exists(select 1 from public.leads where id=-92800100-i and broker_id=current_setting('qa.a')::uuid) then raise exception 'Request changed owner before consent'; end if;
  begin
   perform public.crm_accept_lead_transfer(request_id);
   raise exception 'Requester accepted own transfer' using errcode='ZX001';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',current_setting('qa.b'),true);
  perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.b'),'role','authenticated')::text,true);
  perform public.crm_accept_lead_transfer(request_id);
  perform public.crm_accept_lead_transfer(request_id);
  if not exists(select 1 from public.leads where id=-92800100-i and broker_id=current_setting('qa.b')::uuid and origin_type='personal') then raise exception 'Transfer persistence/origin failed'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('qa.a'),true);
  perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.a'),'role','authenticated')::text,true);
  if exists(select 1 from public.leads where id=-92800100-i) then raise exception 'Previous broker still reads transferred lead'; end if;
 end loop;
 begin
  perform public.crm_assign_lead(-92800001,current_setting('qa.a')::uuid);
  raise exception 'Broker assigned institutional lead' using errcode='ZX001';
 exception when insufficient_privilege then null; end;
 begin
  perform public.crm_request_lead_transfer(-92800107,current_setting('qa.b')::uuid,repeat('x',501));
  raise exception 'Oversized transfer reason accepted' using errcode='ZX001';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.crm_request_lead_transfer(-92800107,current_setting('qa.a')::uuid);
  raise exception 'Self transfer accepted' using errcode='ZX001';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',current_setting('qa.manager'),true);
 perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.manager'),'role','authenticated')::text,true);
 begin
  perform public.crm_assign_lead(-92800001,current_setting('qa.a')::uuid,repeat('x',501));
  raise exception 'Oversized assignment reason accepted' using errcode='ZX001';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.crm_assign_lead(-92800001,'00000000-0000-4000-8000-000000000099');
  raise exception 'Invalid recipient accepted' using errcode='ZX001';
 exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ declare i int; expected text; begin
 for i in 1..6 loop
  expected:=case i when 4 then 'Reason supplied' when 5 then repeat('x',500) else '' end;
  if (select count(*) from public.lead_assignments where lead_id=-92800000-i and reason=expected)<>1
   or (select count(*) from public.lead_assignments where lead_id=-92800100-i and reason=expected)<>1 then raise exception 'Reason or history duplicated'; end if;
  if (select count(*) from public.notifications where entity_type='lead' and entity_id=-92800000-i)<>1 then raise exception 'Assignment notification duplicated'; end if;
  if (select count(*) from public.notifications where entity_type='lead_transfer' and entity_id=(select id from public.lead_transfer_requests where lead_id=-92800100-i))<>3 then raise exception 'Transfer notifications missing or duplicated'; end if;
  if (select count(*) from public.audit_logs where entity='leads' and entity_id=(-92800000-i)::text and action='UPDATE')<>1
   or (select count(*) from public.audit_logs where entity='leads' and entity_id=(-92800100-i)::text and action='UPDATE')<>1 then raise exception 'Lead update audit missing or duplicated'; end if;
 end loop;
end $$;
set local role authenticated;
do $$ begin
 perform set_config('request.jwt.claim.sub',current_setting('qa.a'),true);
 perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.a'),'role','authenticated')::text,true);
 perform public.crm_request_lead_transfer(-92800107,current_setting('qa.b')::uuid);
end $$;
reset role;
update public.lead_transfer_requests set expires_at=now()-interval '1 minute' where lead_id=-92800107;
set local role authenticated;
do $$ declare request_id bigint; begin
 perform set_config('request.jwt.claim.sub',current_setting('qa.b'),true);
 perform set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.b'),'role','authenticated')::text,true);
 select id into request_id from public.lead_transfer_requests where lead_id=-92800107;
 begin
  perform public.crm_accept_lead_transfer(request_id);
  raise exception 'Expired transfer accepted' using errcode='ZX001';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: local restored PostgreSQL17 optional reasons, consent, isolation, limits, audit, expiry and notification idempotency; fixtures rolled back' as result;
