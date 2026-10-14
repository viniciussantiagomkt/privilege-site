-- Staging only. All fixtures and events are rolled back.
begin;
-- Verify the recreated manager still exists in Auth before simulating claims.
do $$ begin
 if not exists(select 1 from auth.users u join public.user_roles r on r.id=u.id
   where u.id='0d92c58c-d6f0-4465-95e1-303e7d9f9a69' and r.role='manager' and r.disabled_at is null)
 then raise exception 'Staging manager identity changed; verify Auth before running'; end if;
end $$;
create temp table crm_test_results(name text,passed boolean,detail text);
grant all on crm_test_results to authenticated,anon;
create function pg_temp.crm_check(label text, statement text, expected_error text default null) returns void language plpgsql security invoker as $$
declare ok boolean; err text;
begin
 begin
  if expected_error is null then execute statement into ok; else execute statement;end if;
  if expected_error is not null then raise exception using errcode='Z0001',message='Expected denial did not occur';end if;
 exception when others then
  get stacked diagnostics err = returned_sqlstate;
  if err='Z0001' then ok:=false;
  elsif expected_error is null then insert into crm_test_results values(label,false,err||': '||sqlerrm);return;
  else ok:=err=expected_error;end if;
 end;
 insert into crm_test_results values(label,coalesce(ok,false),coalesce(err,'boolean assertion'));
end $$;
insert into public.leads(id,name,broker_id) overriding system value values(-920001,'SYNTHETIC Marketing A','73a767b8-218d-4910-a370-2b93cf32bf74'),(-920002,'SYNTHETIC Marketing B','779c7220-06dd-4180-8b52-05136bee21cb');
insert into public.properties(id,title,slug,description,location,category,price,owner_id,broker_id,publish_on_site) overriding system value values(-920001,'SYNTHETIC Marketing imóvel','synthetic-marketing-20261013','Descrição pública','Localização pública','Casa','R$ 500.000','73a767b8-218d-4910-a370-2b93cf32bf74','73a767b8-218d-4910-a370-2b93cf32bf74',false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73a767b8-218d-4910-a370-2b93cf32bf74","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','73a767b8-218d-4910-a370-2b93cf32bf74',true);
select pg_temp.crm_check('broker creates pending asset',$q$with x as(insert into marketing_assets(id,title) overriding system value values(-920001,'SYNTHETIC Foto A') returning status) select status='pendente' from x$q$);
select pg_temp.crm_check('broker cannot self approve',$q$update marketing_assets set status='aprovado',visibility='public' where id=-920001$q$,'42501');
select pg_temp.crm_check('valid PDF path inserts version',$q$with x as(insert into asset_versions(id,asset_id,storage_path,mime_type,size_bytes,checksum,original_name) overriding system value values(-920001,-920001,'73a767b8-218d-4910-a370-2b93cf32bf74/00000000-0000-4000-8000-000000000001.pdf','application/pdf',100,repeat('a',64),'synthetic.pdf') returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('foreign owner path denied',$q$insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values(-920001,'779c7220-06dd-4180-8b52-05136bee21cb/00000000-0000-4000-8000-000000000099.pdf','application/pdf',100,repeat('b',64),'attack.pdf')$q$,'42501');
select pg_temp.crm_check('asset version activated',$q$with x as(update marketing_assets set current_version_id=-920001 where id=-920001 returning status) select status='pendente' from x$q$);
select pg_temp.crm_check('broker links material to own property',$q$with x as(insert into asset_relations(asset_id,property_id) values(-920001,-920001) returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('own valid storage upload authorized',$q$with x as(insert into storage.objects(bucket_id,name) values('crm-marketing','73a767b8-218d-4910-a370-2b93cf32bf74/00000000-0000-4000-8000-000000000001.pdf') returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('foreign storage upload denied',$q$insert into storage.objects(bucket_id,name) values('crm-marketing','779c7220-06dd-4180-8b52-05136bee21cb/00000000-0000-4000-8000-000000000099.pdf')$q$,'42501');
select pg_temp.crm_check('broker cannot share hidden property',$q$insert into marketing_shares(property_ids,title) values(array[-920001]::bigint[],'SYNTHETIC denied')$q$,'42501');
select pg_temp.crm_check('automation saved',$q$with x as(insert into crm_automation_preferences(owner_id,share_followup,followup_days) values(auth.uid(),true,2) on conflict(owner_id) do update set share_followup=true,followup_days=2 returning owner_id) select count(*)=1 from x$q$);
select pg_temp.crm_check('personal collection saved',$q$with x as(insert into marketing_collections(id,name) overriding system value values(-920001,'SYNTHETIC coleção') returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('collection links own asset',$q$with x as(insert into marketing_collection_items(collection_id,asset_id) values(-920001,-920001) returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('favorite saved',$q$with x as(insert into marketing_favorites(asset_id) values(-920001) returning asset_id) select count(*)=1 from x$q$);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"779c7220-06dd-4180-8b52-05136bee21cb","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','779c7220-06dd-4180-8b52-05136bee21cb',true);
select pg_temp.crm_check('B cannot read A material',$q$select count(*)=0 from marketing_assets where id=-920001$q$);
select pg_temp.crm_check('B cannot read A version',$q$select count(*)=0 from asset_versions where id=-920001$q$);
select pg_temp.crm_check('B cannot read A collection',$q$select count(*)=0 from marketing_collections where id=-920001$q$);
select pg_temp.crm_check('B cannot read A favorites',$q$select count(*)=0 from marketing_favorites where asset_id=-920001$q$);
select pg_temp.crm_check('B cannot read A storage',$q$select count(*)=0 from storage.objects where bucket_id='crm-marketing' and name like '73a767b8-%'$q$);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"0d92c58c-d6f0-4465-95e1-303e7d9f9a69","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','0d92c58c-d6f0-4465-95e1-303e7d9f9a69',true);
select pg_temp.crm_check('manager approves material',$q$with x as(update marketing_assets set status='aprovado',visibility='public' where id=-920001 returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('manager approves public presentation',$q$with x as(update properties set workflow_status='aprovado',approved_by=auth.uid(),approved_at=now(),publish_on_site=true,presentation_enabled=true,status='ativo' where id=-920001 returning id) select count(*)=1 from x$q$);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73a767b8-218d-4910-a370-2b93cf32bf74","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','73a767b8-218d-4910-a370-2b93cf32bf74',true);
select pg_temp.crm_check('wrong lead denied',$q$insert into marketing_shares(property_ids,lead_id,title) values(array[-920001]::bigint[],-920002,'SYNTHETIC denied')$q$,'42501');
select pg_temp.crm_check('valid share persisted',$q$with x as(insert into marketing_shares(id,token,property_ids,asset_ids,lead_id,title,channel) overriding system value values(-920001,'00000000-0000-4000-8000-000000092001',array[-920001]::bigint[],array[-920001]::bigint[],-920001,'SYNTHETIC apresentação','whatsapp') returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('generation recorded in lead',$q$select count(*)=1 from lead_activities where lead_id=-920001 and description like 'Apresentação gerada:%'$q$);
select pg_temp.crm_check('automatic followup persisted',$q$select count(*)=1 from tasks where lead_id=-920001 and title like 'Retornar sobre apresentação:%'$q$);
select pg_temp.crm_check('share confirmation succeeds',$q$select crm_confirm_presentation_share(-920001)$q$);
select pg_temp.crm_check('repeat confirmation succeeds',$q$select crm_confirm_presentation_share(-920001)$q$);
select pg_temp.crm_check('confirmation exactly once',$q$select count(*)=1 from lead_activities where lead_id=-920001 and description like 'Envio confirmado pelo corretor:%'$q$);
select pg_temp.crm_check('event log exactly once',$q$select count(*)=1 from crm_event_log where idempotency_key='share-confirmed:-920001'$q$);
select pg_temp.crm_check('share payload immutable',$q$update marketing_shares set title='attack' where id=-920001$q$,'42501');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"779c7220-06dd-4180-8b52-05136bee21cb","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','779c7220-06dd-4180-8b52-05136bee21cb',true);
select pg_temp.crm_check('B cannot read A share',$q$select count(*)=0 from marketing_shares where id=-920001$q$);
select pg_temp.crm_check('B cannot confirm A share',$q$select crm_confirm_presentation_share(-920001)$q$,'42501');
set local role anon;select set_config('request.jwt.claims','{"role":"anon"}',true);select set_config('request.jwt.claim.sub','',true);
select pg_temp.crm_check('anonymous cannot read asset table',$q$select count(*)=0 from marketing_assets$q$,'42501');
select pg_temp.crm_check('anonymous cannot read share table',$q$select count(*)=0 from marketing_shares$q$,'42501');
select pg_temp.crm_check('anonymous token returns presentation',$q$select crm_public_presentation('00000000-0000-4000-8000-000000092001')->>'title'='SYNTHETIC apresentação'$q$);
select pg_temp.crm_check('anonymous approved selected asset returned',$q$select jsonb_array_length(crm_public_presentation('00000000-0000-4000-8000-000000092001')->'assets')=1$q$);
select pg_temp.crm_check('anonymous presentation hides client and lead',$q$select not(crm_public_presentation('00000000-0000-4000-8000-000000092001') ?| array['lead_id','client_id','owner_id'])$q$);
select pg_temp.crm_check('unknown token denied',$q$select crm_public_presentation('00000000-0000-4000-8000-000000092099') is null$q$);
select pg_temp.crm_check('no consent no event',$q$select not crm_record_presentation_open('00000000-0000-4000-8000-000000092001','00000000-0000-4000-8000-000000092002',false)$q$);
select pg_temp.crm_check('consented open accepted',$q$select crm_record_presentation_open('00000000-0000-4000-8000-000000092001','00000000-0000-4000-8000-000000092002',true)$q$);
select pg_temp.crm_check('consented open retry accepted',$q$select crm_record_presentation_open('00000000-0000-4000-8000-000000092001','00000000-0000-4000-8000-000000092002',true)$q$);
select pg_temp.crm_check('anonymous storage listing denied',$q$select count(*)=0 from storage.objects where bucket_id='crm-marketing'$q$);
set local role authenticated;select set_config('request.jwt.claims','{"sub":"73a767b8-218d-4910-a370-2b93cf32bf74","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','73a767b8-218d-4910-a370-2b93cf32bf74',true);
select pg_temp.crm_check('consent event exactly once',$q$select count(*)=1 from marketing_share_events where share_id=-920001$q$);

select pg_temp.crm_check('new version upload accepted',$q$with x as(insert into asset_versions(id,asset_id,storage_path,mime_type,size_bytes,checksum,original_name) overriding system value values(-920002,-920001,'73a767b8-218d-4910-a370-2b93cf32bf74/00000000-0000-4000-8000-000000000002.png','image/png',100,repeat('c',64),'synthetic.png') returning id) select count(*)=1 from x$q$);
select pg_temp.crm_check('new version requires reapproval',$q$with x as(update marketing_assets set current_version_id=-920002 where id=-920001 returning status) select status='pendente' from x$q$);
set local role anon;select set_config('request.jwt.claims','{"role":"anon"}',true);select set_config('request.jwt.claim.sub','',true);
select pg_temp.crm_check('unapproved current version removed from presentation',$q$select jsonb_array_length(crm_public_presentation('00000000-0000-4000-8000-000000092001')->'assets')=0$q$);
set local role authenticated;select set_config('request.jwt.claims','{"sub":"0d92c58c-d6f0-4465-95e1-303e7d9f9a69","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','0d92c58c-d6f0-4465-95e1-303e7d9f9a69',true);
update marketing_assets set status='aprovado',expires_at=now()-interval '1 day' where id=-920001;
set local role anon;select set_config('request.jwt.claims','{"role":"anon"}',true);select set_config('request.jwt.claim.sub','',true);
select pg_temp.crm_check('expired asset removed from presentation',$q$select jsonb_array_length(crm_public_presentation('00000000-0000-4000-8000-000000092001')->'assets')=0$q$);
set local role authenticated;select set_config('request.jwt.claims','{"sub":"0d92c58c-d6f0-4465-95e1-303e7d9f9a69","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','0d92c58c-d6f0-4465-95e1-303e7d9f9a69',true);
update marketing_assets set expires_at=null where id=-920001;
select pg_temp.crm_check('approved current version returns without expired predecessor',$q$select (crm_public_presentation('00000000-0000-4000-8000-000000092001')->'assets'->0->>'mime_type')='image/png'$q$);
update properties set publish_on_site=false where id=-920001;
set local role anon;select set_config('request.jwt.claims','{"role":"anon"}',true);select set_config('request.jwt.claim.sub','',true);
select pg_temp.crm_check('hiding property blocks existing presentation',$q$select crm_public_presentation('00000000-0000-4000-8000-000000092001') is null$q$);
select pg_temp.crm_check('hiding property blocks public asset',$q$select not crm_private.public_asset('73a767b8-218d-4910-a370-2b93cf32bf74/00000000-0000-4000-8000-000000000002.png')$q$);
set local role authenticated;select set_config('request.jwt.claims','{"sub":"0d92c58c-d6f0-4465-95e1-303e7d9f9a69","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','0d92c58c-d6f0-4465-95e1-303e7d9f9a69',true);
update properties set publish_on_site=true where id=-920001;
set local role authenticated;select set_config('request.jwt.claims','{"sub":"73a767b8-218d-4910-a370-2b93cf32bf74","role":"authenticated"}',true);select set_config('request.jwt.claim.sub','73a767b8-218d-4910-a370-2b93cf32bf74',true);
select pg_temp.crm_check('revocation succeeds',$q$with x as(update marketing_shares set revoked_at=now() where id=-920001 returning id) select count(*)=1 from x$q$);
set local role anon;select set_config('request.jwt.claims','{"role":"anon"}',true);select set_config('request.jwt.claim.sub','',true);
select pg_temp.crm_check('revoked token denied',$q$select crm_public_presentation('00000000-0000-4000-8000-000000092001') is null$q$);
select pg_temp.crm_check('revoked open denied',$q$select not crm_record_presentation_open('00000000-0000-4000-8000-000000092001','00000000-0000-4000-8000-000000092003',true)$q$);
reset role;
select json_agg(r) results from crm_test_results r;
rollback;
