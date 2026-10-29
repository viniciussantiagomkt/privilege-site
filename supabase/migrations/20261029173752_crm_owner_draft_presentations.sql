-- PROPOSED ONLY. Capability links do not publish listings or approve marketing assets.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$ begin
 if md5(pg_get_functiondef('crm_private.guard_share()'::regprocedure))<>'81301941b77674dc2388e33bc3beac1f'
 or md5(pg_get_functiondef('crm_private.valid_share(uuid)'::regprocedure))<>'b2f3998bdfc561a3edda8aa50720e7f0'
 or md5(pg_get_functiondef('public.crm_public_presentation(uuid)'::regprocedure))<>'01559ff2def19819c5d5698ccaf585f7' then
 raise exception 'Owner presentation preflight: function drift';end if;
end $$;
CREATE OR REPLACE FUNCTION crm_private.guard_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare pid bigint;aid bigint; begin
if tg_op='UPDATE' then if (to_jsonb(new)-'revoked_at')<>(to_jsonb(old)-'revoked_at') or old.revoked_at is not null or new.revoked_at is null then raise exception using errcode='42501',message='Links são imutáveis. Revogue e gere um novo link.';end if;return new;end if;
if not public.can_manage_commercial() or new.owner_id is distinct from auth.uid() then raise exception 'Apresentação não autorizada' using errcode='42501';end if;
if new.expires_at<=now() or new.expires_at>now()+interval '90 days' then raise exception using errcode='23514',message='Validade deve ficar entre agora e 90 dias.';end if;
if new.lead_id is not null and not exists(select 1 from public.leads l where l.id=new.lead_id) then raise exception using errcode='42501',message='Lead não autorizado.';end if;
if new.client_id is not null and not exists(select 1 from public.clients c where c.id=new.client_id and c.deleted_at is null) then raise exception using errcode='42501',message='Cliente não autorizado.';end if;
if new.collection_id is not null and not exists(select 1 from public.marketing_collections c where c.id=new.collection_id) then raise exception using errcode='42501',message='Coleção não autorizada.';end if;
foreach pid in array new.property_ids loop if not exists(select 1 from public.properties p where p.id=pid and p.deleted_at is null and p.presentation_enabled and p.workflow_status in ('rascunho','pendente','aprovado','publicado') and (p.owner_id=auth.uid() or p.broker_id=auth.uid())) then raise exception using errcode='42501',message='Habilite a apresentação de um imóvel da sua carteira.';end if;end loop;
foreach aid in array new.asset_ids loop if not exists(select 1 from public.marketing_assets a join public.asset_versions v on v.id=a.current_version_id where a.id=aid and a.scope='institutional' and a.audience='team' and a.status='aprovado' and a.visibility='public' and(a.expires_at is null or a.expires_at>now()) and exists(select 1 from public.asset_relations r where r.asset_id=a.id and(r.property_id=any(new.property_ids) or exists(select 1 from public.development_units u where u.development_id=r.development_id and u.property_id=any(new.property_ids))))) then raise exception using errcode='42501',message='Material sem aprovação ou vínculo autorizado.';end if;end loop;
return new;end $function$
;
CREATE OR REPLACE FUNCTION crm_private.valid_share(target_token uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select s.id from public.marketing_shares s where s.token=target_token and s.revoked_at is null and s.expires_at>now() and exists(select 1 from public.user_roles r join auth.users u on u.id=r.id where r.id=s.owner_id and r.disabled_at is null and r.role in ('admin','manager','broker','corretor') and (u.banned_until is null or u.banned_until<=now()) and (r.role not in ('broker','corretor') or exists(select 1 from public.brokers b where b.id=r.id and b.active))) and (s.lead_id is null or exists(select 1 from public.leads l where l.id=s.lead_id and l.broker_id=s.owner_id and l.deleted_at is null)) and not exists(select 1 from unnest(s.property_ids) pid where not exists(select 1 from public.properties p where p.id=pid and p.deleted_at is null and p.presentation_enabled and p.workflow_status in ('rascunho','pendente','aprovado','publicado') and (p.owner_id=s.owner_id or p.broker_id=s.owner_id))) $function$

;
create or replace function public.crm_public_presentation(target_token uuid) returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('title',s.title,'message',s.message,'expires_at',s.expires_at,'broker',(select jsonb_build_object('name',b.name,'phone',b.phone,'creci',b.creci) from public.brokers b where b.id=s.owner_id and b.active),'properties',(select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'property_code',p.property_code,'slug',p.slug,'description',p.description,'location',p.location,'price',p.price,'bedrooms',p.bedrooms,'bathrooms',p.bathrooms,'garage',p.garage,'area',p.area,'images',p.images,'videos',p.videos,'status',p.status)) from public.properties p where p.id=any(s.property_ids)),'assets',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'category',a.category,'mime_type',v.mime_type,'size_bytes',v.size_bytes,'path',v.storage_path)) from public.marketing_assets a join public.asset_versions v on v.id=a.current_version_id where a.id=any(s.asset_ids) and a.scope='institutional' and a.audience='team' and a.status='aprovado' and a.visibility='public' and (a.expires_at is null or a.expires_at>now()) and exists(select 1 from public.asset_relations r where r.asset_id=a.id and (r.property_id=any(s.property_ids) or exists(select 1 from public.development_units u where u.development_id=r.development_id and u.property_id=any(s.property_ids))))),'[]'::jsonb)) from public.marketing_shares s where s.id=crm_private.valid_share(target_token) $$;

commit;
