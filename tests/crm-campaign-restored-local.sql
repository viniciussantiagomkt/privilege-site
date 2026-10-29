-- LOCAL RESTORE ONLY. Existing identities are read, never changed. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
do $$ begin
 if current_database() !~ '^privilege_restore_[a-f0-9]{12}$' or current_user<>'supabase_admin' then raise exception 'Isolated local restore required';end if;
 if (select count(*) from public.crm_campaigns)<>0 or (select count(*) from public.crm_lead_attributions)<>0 or (select count(*) from crm_private.campaign_receipts)<>0 then raise exception 'New campaign tables must be empty';end if;
 perform set_config('qa.campaign.admin',(select id::text from public.user_roles where role='admin' and disabled_at is null limit 1),true);
 perform set_config('qa.campaign.manager',(select id::text from public.user_roles where role='manager' and disabled_at is null limit 1),true);
 perform set_config('qa.campaign.a',(select r.id::text from public.user_roles r join public.brokers b on b.id=r.id where r.role in('broker','corretor') and r.disabled_at is null and b.active order by r.id limit 1),true);
 perform set_config('qa.campaign.b',(select r.id::text from public.user_roles r join public.brokers b on b.id=r.id where r.role in('broker','corretor') and r.disabled_at is null and b.active order by r.id offset 1 limit 1),true);
 if nullif(current_setting('qa.campaign.admin'),'') is null or nullif(current_setting('qa.campaign.manager'),'') is null or nullif(current_setting('qa.campaign.a'),'') is null or nullif(current_setting('qa.campaign.b'),'') is null then raise exception 'Existing four eligible profiles required; do not create accounts';end if;
end $$;
set local role authenticated;
do $$
declare a uuid:=current_setting('qa.campaign.a')::uuid; b uuid:=current_setting('qa.campaign.b')::uuid;
 admin_id uuid:=current_setting('qa.campaign.admin')::uuid; manager_id uuid:=current_setting('qa.campaign.manager')::uuid;
 actor_id uuid; campaign_a bigint; campaign_company bigint; personal_lead bigint; company_lead bigint; transfer_id bigint;
 out jsonb; again jsonb; rejected boolean; checks int:=0;
 payload jsonb:=jsonb_build_object('name','SYNTHETIC local campaign QA','scope','personal','platform','meta','objective','leads','entry_channel','native_form','status','active','routing','broker');
 company_payload jsonb;
begin
 foreach actor_id in array array[admin_id,manager_id,a,b] loop
  perform set_config('request.jwt.claim.sub',actor_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);
  if public.current_user_role() not in('admin','manager','broker','corretor') then raise exception 'Existing role resolution failed';end if;
 end loop;
 checks:=checks+1;

 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 campaign_a:=public.crm_save_campaign(null,payload||jsonb_build_object('destination_broker_id',b));
 if not exists(select 1 from public.crm_campaigns where id=campaign_a and owner_id=a and destination_broker_id=a and scope='personal') then raise exception 'Personal routing must stay with actor';end if;
 checks:=checks+1;
 rejected:=false;
 begin update public.crm_campaigns set name='SYNTHETIC forbidden' where id=campaign_a;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Direct campaign write unexpectedly allowed';end if;
 rejected:=false;
 begin perform public.crm_save_campaign(null,payload||jsonb_build_object('owner_id',b));exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Overposted owner unexpectedly accepted';end if;
 rejected:=false;
 begin perform * from crm_private.campaign_receipts;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Private receipt read unexpectedly allowed';end if;
 checks:=checks+1;

 foreach actor_id in array array[b,admin_id,manager_id] loop
  perform set_config('request.jwt.claim.sub',actor_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);
  if exists(select 1 from public.crm_campaigns where id=campaign_a) then raise exception 'Foreign personal campaign leaked';end if;
 end loop;
 checks:=checks+1;

 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 company_payload:=payload||jsonb_build_object('scope','company','name','SYNTHETIC local company QA','destination_broker_id',b);
 campaign_company:=public.crm_save_campaign(null,company_payload);
 perform set_config('request.jwt.claim.sub',manager_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',manager_id,'role','authenticated')::text,true);
 perform public.crm_save_campaign(campaign_company,company_payload||jsonb_build_object('name','SYNTHETIC local company edited'));
 if not exists(select 1 from public.crm_campaigns where id=campaign_company and owner_id=admin_id) then raise exception 'Management update changed ownership';end if;
 checks:=checks+1;
 out:=public.crm_capture_campaign_lead(campaign_company,'88888888-8888-4888-8888-000000000001','SYNTHETIC company contact','5583999990000','{"utm_source":"  meta  ","landing_path":"/imoveis/fixture"}');
 again:=public.crm_capture_campaign_lead(campaign_company,'88888888-8888-4888-8888-000000000001','SYNTHETIC company contact','5583999990000','{"utm_source":"  meta  ","landing_path":"/imoveis/fixture"}');
 if out->>'routing_result'<>'assigned' or out->>'lead_id'<>again->>'lead_id' or again->>'replayed'<>'true' then raise exception 'Company assignment/replay failed';end if;
 company_lead:=(out->>'lead_id')::bigint;
 perform set_config('qa.campaign.company_lead',company_lead::text,true);
 checks:=checks+1;

 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if not exists(select 1 from public.leads where id=company_lead and broker_id=b and origin_type='company') or not exists(select 1 from public.crm_lead_attributions where lead_id=company_lead and provenance='manual' and details->>'utm_source'='meta') then raise exception 'Current assignee provenance missing';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if exists(select 1 from public.crm_lead_attributions where lead_id=company_lead) then raise exception 'Foreign attribution leaked';end if;
 checks:=checks+1;

 out:=public.crm_capture_campaign_lead(campaign_a,'88888888-8888-4888-8888-000000000002','SYNTHETIC personal contact','5583999990000');
 personal_lead:=(out->>'lead_id')::bigint;
 if out->>'routing_result'<>'personal' or not exists(select 1 from public.leads where id=personal_lead and broker_id=a and origin_type='personal') then raise exception 'Personal routing failed';end if;
 transfer_id:=public.crm_request_lead_transfer(personal_lead,b,'');
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 perform public.crm_accept_lead_transfer(transfer_id);
 if not exists(select 1 from public.crm_lead_attributions where lead_id=personal_lead) or exists(select 1 from public.crm_campaigns where id=campaign_a) then raise exception 'Transfer failed to separate attribution from campaign access';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if exists(select 1 from public.crm_lead_attributions where lead_id=personal_lead) then raise exception 'Previous owner retained attribution';end if;
 checks:=checks+1;
 rejected:=false;
 begin perform public.crm_capture_campaign_lead(campaign_a,'88888888-8888-4888-8888-000000000003','SYNTHETIC invalid landing','5583999990000','{"landing_path":"/page?token=fixture"}');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Query-bearing landing path unexpectedly accepted';end if;
 perform public.crm_save_campaign(campaign_a,payload||'{"status":"paused"}');
 rejected:=false;
 begin perform public.crm_capture_campaign_lead(campaign_a,'88888888-8888-4888-8888-000000000004','SYNTHETIC paused contact','5583999990000');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Paused campaign capture unexpectedly allowed';end if;
 checks:=checks+1;
 perform set_config('qa.campaign.checks',checks::text,true);
end $$;
reset role;
do $$ declare lid bigint:=current_setting('qa.campaign.company_lead')::bigint; begin
 if (select count(*) from public.crm_lead_attributions where lead_id=lid)<>1 or (select count(*) from public.lead_assignments where lead_id=lid)<>1 or (select count(*) from public.notifications where entity_type='lead' and entity_id=lid)<>1 then raise exception 'Replay duplicated attribution/assignment/notification';end if;
 perform set_config('qa.campaign.checks',(current_setting('qa.campaign.checks')::int+1)::text,true);
end $$;
set local role anon;
do $$ declare rejected boolean:=false; begin
 begin perform public.crm_save_campaign(null,'{}');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Anonymous RPC unexpectedly allowed';end if;
 rejected:=false;
 begin perform * from public.crm_campaigns;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Anonymous table read unexpectedly allowed';end if;
 perform set_config('qa.campaign.checks',(current_setting('qa.campaign.checks')::int+1)::text,true);
end $$;
reset role;
select jsonb_build_object('result','PASS','scenario_groups',current_setting('qa.campaign.checks')::int,'identity','synthetic SQL claims, not real JWT','accounts_changed',false,'fixture_cleanup','transaction rollback follows')::text;
rollback;
do $$ begin
 if (select count(*) from public.crm_campaigns)<>0 or (select count(*) from public.crm_lead_attributions)<>0 or (select count(*) from crm_private.campaign_receipts)<>0 then raise exception 'Local fixtures were not rolled back';end if;
end $$;
