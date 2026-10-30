-- LOCAL ONLY. Synthetic reporting records, no provider calls, no account/role changes.
\set ON_ERROR_STOP on
begin;
do $$ begin
 if current_database() !~ '^privilege_restore_[a-f0-9]{12}$' or current_user<>'supabase_admin' then raise exception 'Isolated local restore required';end if;
 if exists(select 1 from public.crm_ad_accounts) or exists(select 1 from public.crm_ad_campaigns) or exists(select 1 from public.crm_ad_daily) or exists(select 1 from crm_private.ad_sync_leases) then raise exception 'New ads tables must be empty';end if;
 perform set_config('qa.ads.admin',(select id::text from public.user_roles where role='admin' and disabled_at is null limit 1),true);
 perform set_config('qa.ads.manager',(select id::text from public.user_roles where role='manager' and disabled_at is null limit 1),true);
 perform set_config('qa.ads.a',(select r.id::text from public.user_roles r join public.brokers b on b.id=r.id where r.role in('broker','corretor') and r.disabled_at is null and b.active order by r.id limit 1),true);
 perform set_config('qa.ads.b',(select r.id::text from public.user_roles r join public.brokers b on b.id=r.id where r.role in('broker','corretor') and r.disabled_at is null and b.active order by r.id offset 1 limit 1),true);
 if nullif(current_setting('qa.ads.admin'),'') is null or nullif(current_setting('qa.ads.manager'),'') is null or nullif(current_setting('qa.ads.a'),'') is null or nullif(current_setting('qa.ads.b'),'') is null then raise exception 'Four existing eligible profiles required; do not create accounts';end if;
 perform set_config('qa.ads.groups','0',true);
end $$;
-- These are fictitious local records, NOT connections to Meta/Google accounts.
insert into public.crm_ad_accounts(id,owner_id,scope,provider,external_id,name,status) values
 ('88888888-8888-4888-8888-888888888881',current_setting('qa.ads.a')::uuid,'personal','meta','9000000001','SYNTHETIC local Meta fixture','connected'),
 ('88888888-8888-4888-8888-888888888882',current_setting('qa.ads.admin')::uuid,'company','google','9000000002','SYNTHETIC local Google fixture','connected');
set local role authenticated;
do $$ declare actor uuid; denied boolean; personal constant uuid:='88888888-8888-4888-8888-888888888881';company constant uuid:='88888888-8888-4888-8888-888888888882'; begin
 foreach actor in array array[current_setting('qa.ads.a')::uuid,current_setting('qa.ads.b')::uuid,current_setting('qa.ads.admin')::uuid,current_setting('qa.ads.manager')::uuid] loop
  perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  if exists(select 1 from public.crm_ad_accounts where id=personal) is distinct from (actor=current_setting('qa.ads.a')::uuid) then raise exception 'Personal account RLS mismatch';end if;
  if exists(select 1 from public.crm_ad_accounts where id=company) is distinct from (actor in(current_setting('qa.ads.admin')::uuid,current_setting('qa.ads.manager')::uuid)) then raise exception 'Company account RLS mismatch';end if;
 end loop;
 perform set_config('qa.ads.groups','1',true);
 denied:=false;begin perform public.crm_claim_ad_sync(personal);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'User claimed worker lease';end if;
 denied:=false;begin update public.crm_ad_accounts set status='pending' where id=personal;exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'User wrote account directly';end if;
 denied:=false;begin perform * from crm_private.ad_sync_leases;exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'User read private lease';end if;
 perform set_config('qa.ads.groups','2',true);
end $$;
reset role;
set local role service_role;
do $$ declare personal constant uuid:='88888888-8888-4888-8888-888888888881';company constant uuid:='88888888-8888-4888-8888-888888888882';
 first jsonb; token uuid; report jsonb; bad jsonb; rejected boolean;
begin
 report:='{"provider":"meta","accountId":"9000000001","currency":"BRL","timezone":"America/Sao_Paulo","campaigns":[{"externalId":"77","name":"SYNTHETIC campaign","status":"ACTIVE","active":true}],"daily":[{"campaignId":"77","day":"2026-10-01","spendMicros":"12340000","impressions":"100","clicks":"5","conversions":null,"actions":[{"type":"lead","value":"2"},{"type":"other_lead","value":"2"}]}]}';
 perform set_config('qa.ads.report',report::text,true);
 first:=public.crm_claim_ad_sync(personal);token:=(first->>'lease')::uuid;
 if token is null or public.crm_claim_ad_sync(personal) is not null then raise exception 'Exclusive active lease failed';end if;
 perform public.crm_commit_ad_report(personal,token,report,'2026-10-01','2026-10-02');
 if public.crm_claim_ad_sync(personal) is not null then raise exception 'Due interval not enforced';end if;
 perform set_config('qa.ads.groups','3',true);
 update public.crm_ad_accounts set next_attempt_at=clock_timestamp()-interval '1 minute' where id=personal;
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;
 perform public.crm_commit_ad_report(personal,token,report,'2026-10-01','2026-10-02');
 perform set_config('qa.ads.groups','4',true);
 update public.crm_ad_accounts set next_attempt_at=clock_timestamp()-interval '1 minute' where id=personal;
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;bad:=report||'{"currency":"USD"}';
 rejected:=false;begin perform public.crm_commit_ad_report(personal,token,bad,'2026-10-01','2026-10-02');exception when invalid_parameter_value then rejected:=true;end;if not rejected then raise exception 'Currency drift accepted';end if;
 perform public.crm_commit_ad_report(personal,token,report,'2026-10-01','2026-10-02');
 perform set_config('qa.ads.groups','5',true);
 token:=(public.crm_claim_ad_sync(company)->>'lease')::uuid;
 bad:=jsonb_set(report||'{"provider":"google","accountId":"9000000002"}','{daily,0,conversions}','1.5');bad:=jsonb_set(bad,'{daily,0,actions}','[]');
 perform public.crm_commit_ad_report(company,token,bad,'2026-10-01','2026-10-02');
 perform set_config('qa.ads.groups','6',true);
 update public.crm_ad_accounts set next_attempt_at=clock_timestamp()-interval '1 minute' where id=personal;
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;perform public.crm_fail_ad_sync(personal,token,'rate_limit');
 if public.crm_claim_ad_sync(personal) is not null or not exists(select 1 from public.crm_ad_accounts where id=personal and status='error' and next_attempt_at>clock_timestamp() and last_success_at is not null) then raise exception 'Backoff/history preservation failed';end if;
 update public.crm_ad_accounts set next_attempt_at=clock_timestamp()-interval '1 minute' where id=personal;
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;perform public.crm_fail_ad_sync(personal,token,'auth');
 if public.crm_claim_ad_sync(personal) is not null or not exists(select 1 from public.crm_ad_accounts where id=personal and status='reauthorize') then raise exception 'Auth error not gated';end if;
 update public.crm_ad_accounts set status='connected',next_attempt_at=clock_timestamp()-interval '1 minute' where id=personal;
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;perform set_config('qa.ads.old_lease',token::text,true);
 perform set_config('qa.ads.groups','7',true);
end $$;
reset role;
update crm_private.ad_sync_leases set lease_until=clock_timestamp()-interval '1 minute' where account_id='88888888-8888-4888-8888-888888888881';
set local role service_role;
do $$ declare personal constant uuid:='88888888-8888-4888-8888-888888888881'; token uuid;rejected boolean:=false; begin
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;
 if token is null or token=current_setting('qa.ads.old_lease')::uuid then raise exception 'Expired lease not superseded';end if;
 begin perform public.crm_commit_ad_report(personal,current_setting('qa.ads.old_lease')::uuid,current_setting('qa.ads.report')::jsonb,'2026-10-01','2026-10-02');exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Stale lease wrote a report';end if;
 perform public.crm_commit_ad_report(personal,token,current_setting('qa.ads.report')::jsonb,'2026-10-01','2026-10-02');
 update public.crm_ad_accounts set next_attempt_at=clock_timestamp()-interval '1 minute' where id=personal;
 token:=(public.crm_claim_ad_sync(personal)->>'lease')::uuid;perform set_config('qa.ads.disconnect_lease',token::text,true);
 perform set_config('qa.ads.groups','8',true);
end $$;
reset role;
set local role authenticated;
do $$ declare personal constant uuid:='88888888-8888-4888-8888-888888888881'; company constant uuid:='88888888-8888-4888-8888-888888888882';report jsonb;denied boolean:=false;begin
 perform set_config('request.jwt.claim.sub',current_setting('qa.ads.a'),true);perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.ads.a'),'role','authenticated')::text,true);
 report:=public.crm_ad_report(personal,'2026-10-01','2026-10-02');
 if report->'campaigns'->0->>'spend_micros'<>'12340000' or jsonb_array_length(report->'campaigns'->0->'platform_actions')<>2 or report->>'complete_period'<>'true' then raise exception 'Money/action/replay reporting mismatch';end if;
 if public.crm_ad_report(personal,'2026-09-01','2026-10-02')->>'complete_period'<>'false' then raise exception 'Incomplete coverage falsely complete';end if;
 perform set_config('qa.ads.groups','9',true);
 perform set_config('request.jwt.claim.sub',current_setting('qa.ads.manager'),true);perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.ads.manager'),'role','authenticated')::text,true);
 report:=public.crm_ad_report(company,'2026-10-01','2026-10-02');if (report->'campaigns'->0->>'platform_conversions')::numeric<>1.5 then raise exception 'Google platform conversions mismatch';end if;
 perform set_config('qa.ads.groups','10',true);
 if exists(select 1 from public.crm_ad_daily where account_id=personal) or exists(select 1 from public.crm_ad_campaigns where account_id=personal) then raise exception 'Foreign metrics leaked';end if;
 begin perform public.crm_ad_report(personal,'2026-10-01','2026-10-02');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Foreign report readable';end if;
 denied:=false;begin perform public.crm_disconnect_ad_account(personal);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Foreign account disconnected';end if;
 perform set_config('qa.ads.groups','11',true);
 perform set_config('request.jwt.claim.sub',current_setting('qa.ads.a'),true);perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.ads.a'),'role','authenticated')::text,true);
 perform public.crm_disconnect_ad_account(personal);
 if (select count(*) from public.crm_ad_daily where account_id=personal)<>1 then raise exception 'History removed by suspension';end if;
 perform set_config('qa.ads.groups','12',true);
end $$;
reset role;
set local role service_role;
do $$ declare denied boolean:=false; personal constant uuid:='88888888-8888-4888-8888-888888888881';begin
 begin perform public.crm_commit_ad_report(personal,current_setting('qa.ads.disconnect_lease')::uuid,current_setting('qa.ads.report')::jsonb,'2026-10-01','2026-10-02');exception when insufficient_privilege then denied:=true;end;if not denied or public.crm_claim_ad_sync(personal) is not null then raise exception 'Suspended account accepted worker';end if;
 perform set_config('qa.ads.groups','13',true);
end $$;
reset role;
set local role anon;
do $$ declare denied boolean:=false;begin
 begin perform public.crm_claim_ad_sync('88888888-8888-4888-8888-888888888881');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous worker claim';end if;
 denied:=false;begin perform * from public.crm_ad_accounts;exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous account read';end if;
 perform set_config('qa.ads.groups','14',true);
end $$;
reset role;
select jsonb_build_object('result','PASS','scenario_groups',current_setting('qa.ads.groups')::int,'identity','synthetic SQL claims and local worker role; NOT JWT or provider access','accounts_or_roles_modified',false,'fixture_cleanup','rollback follows')::text;
rollback;
do $$ begin if exists(select 1 from public.crm_ad_accounts) or exists(select 1 from public.crm_ad_campaigns) or exists(select 1 from public.crm_ad_daily) or exists(select 1 from crm_private.ad_sync_leases) then raise exception 'Local ads fixtures remain';end if;end $$;
