-- PROPOSED ONLY. Existing personal uploads stay personal.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.marketing_assets add column audience text not null default 'owner' check(audience in ('owner','team','selected'));
-- Prior institutional audience was the team; personal records are untouched.
update public.marketing_assets set audience='team' where scope='institutional';
alter table public.marketing_assets add constraint crm_asset_scope_audience check(audience='owner' or scope='institutional');
create table public.marketing_asset_recipients(asset_id bigint not null references public.marketing_assets(id),user_id uuid not null references auth.users(id),primary key(asset_id,user_id));
alter table public.marketing_asset_recipients enable row level security;
create policy crm_asset_recipient_read on public.marketing_asset_recipients for select to authenticated
 using(public.can_manage_commercial() and (user_id=auth.uid() or exists(select 1 from public.marketing_assets a where a.id=asset_id and a.owner_id=auth.uid())));
revoke all on public.marketing_asset_recipients from public,anon,authenticated;
grant select on public.marketing_asset_recipients to authenticated;
create function crm_private.asset_readable(target bigint) returns boolean language sql stable security definer set search_path=public as $$
select public.can_manage_commercial() and exists(select 1 from public.marketing_assets a where a.id=target and (
 a.owner_id=auth.uid() or (a.scope='institutional' and public.can_manage_operations()) or
 (a.scope='institutional' and a.status='aprovado' and (a.expires_at is null or a.expires_at>now()) and
 (a.audience='team' or (a.audience='selected' and exists(select 1 from public.marketing_asset_recipients r where r.asset_id=a.id and r.user_id=auth.uid()))))))
$$;
revoke all on function crm_private.asset_readable(bigint) from public,anon;
grant execute on function crm_private.asset_readable(bigint) to authenticated;
create policy crm_asset_audience_boundary on public.marketing_assets as restrictive for select to authenticated using(public.can_manage_commercial() and (owner_id=auth.uid() or crm_private.asset_readable(id)));
create policy crm_asset_change_boundary on public.marketing_assets as restrictive for update to authenticated
 using(public.can_manage_commercial() and (owner_id=auth.uid() or (scope='institutional' and public.can_manage_operations())))
 with check(public.can_manage_commercial() and (owner_id=auth.uid() or (scope='institutional' and public.can_manage_operations())));
create policy crm_version_audience_boundary on public.asset_versions as restrictive for select to authenticated
 using(exists(select 1 from public.marketing_assets a where a.id=asset_id and (a.owner_id=auth.uid() or (a.scope='institutional' and public.can_manage_operations()) or a.current_version_id=asset_versions.id)));
create or replace function crm_private.guard_asset() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='UPDATE' then
 if new.owner_id<>old.owner_id then raise exception 'Proprietário permanente' using errcode='42501';end if;
 if new.scope is distinct from old.scope or new.audience is distinct from old.audience then
 if current_user<>pg_get_userbyid((select proowner from pg_proc where oid='public.crm_set_asset_audience(bigint,text,uuid[])'::regprocedure)) then raise exception 'Use o fluxo autorizado de audiência' using errcode='42501';end if;
 end if;
 if ((new.status is distinct from old.status and new.status='aprovado') or (new.visibility is distinct from old.visibility and new.visibility='public')) and not public.can_manage_operations() then raise exception 'A gestão deve aprovar a divulgação' using errcode='42501';end if;
 if new.current_version_id is distinct from old.current_version_id or new.scope is distinct from old.scope or new.audience is distinct from old.audience
 or new.title is distinct from old.title or new.category is distinct from old.category or new.tags is distinct from old.tags
 or new.source_url is distinct from old.source_url or new.description is distinct from old.description or new.expires_at is distinct from old.expires_at then new.status:='pendente';new.visibility:='internal';end if;
 else
 if new.status<>'pendente' or new.visibility<>'internal' then raise exception 'Novo material exige revisão' using errcode='42501';end if;
 end if;
 if new.visibility='public' and (new.scope<>'institutional' or new.audience<>'team' or new.status<>'aprovado') then raise exception 'Divulgação pública exige material institucional para equipe aprovado' using errcode='42501';end if;
 if new.current_version_id is not null and not exists(select 1 from public.asset_versions v where v.id=new.current_version_id and v.asset_id=new.id) then raise exception 'Versão inválida' using errcode='23514';end if;
 new.updated_at:=now();return new;
end $$;
create function public.crm_set_asset_audience(target_asset bigint,new_audience text,recipients uuid[] default '{}') returns boolean
language plpgsql security definer set search_path=public as $$
declare a public.marketing_assets;
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 if new_audience not in ('owner','team','selected') or recipients is null or cardinality(recipients)>200
 or (new_audience='selected' and cardinality(recipients)=0) or (new_audience<>'selected' and cardinality(recipients)>0)
 or exists(select 1 from unnest(recipients) x where not crm_private.eligible_broker(x)) then raise exception 'Audiência inválida' using errcode='22023';end if;
 select * into a from public.marketing_assets where id=target_asset and (owner_id=auth.uid() or (scope='institutional' and public.can_manage_operations())) for update;
 if not found then raise exception 'Material não autorizado' using errcode='42501';end if;
 update public.marketing_assets set audience=new_audience,scope=case when new_audience='owner' then 'personal' else 'institutional' end,status='pendente',visibility='internal' where id=a.id;
 delete from public.marketing_asset_recipients where asset_id=a.id;
 insert into public.marketing_asset_recipients(asset_id,user_id) select a.id,x from (select distinct unnest(recipients) x) q;
 insert into public.audit_logs(actor_id,entity,entity_id,action,after_data) values(auth.uid(),'marketing_assets',a.id::text,'audience_changed',jsonb_build_object('audience',new_audience,'requires_review',true));
 return true;
end $$;
revoke all on function public.crm_set_asset_audience(bigint,text,uuid[]) from public,anon;
grant execute on function public.crm_set_asset_audience(bigint,text,uuid[]) to authenticated;
CREATE OR REPLACE FUNCTION crm_private.public_asset(path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select exists(select 1 from public.marketing_assets a join public.asset_versions v on v.id=a.current_version_id join public.asset_relations r on r.asset_id=a.id join public.properties p on p.id=r.property_id or exists(select 1 from public.development_units u where u.property_id=p.id and u.development_id=r.development_id) where v.storage_path=path and a.scope='institutional' and a.audience='team' and a.status='aprovado' and a.visibility='public' and(a.expires_at is null or a.expires_at>now()) and p.deleted_at is null and p.publish_on_site and p.presentation_enabled and p.workflow_status in ('aprovado','publicado') and p.status in ('ativo','reservado','vendido','alugado')) $function$
;
CREATE OR REPLACE FUNCTION crm_private.guard_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare pid bigint;aid bigint; begin
if tg_op='UPDATE' then if (to_jsonb(new)-'revoked_at')<>(to_jsonb(old)-'revoked_at') or old.revoked_at is not null or new.revoked_at is null then raise exception using errcode='42501',message='Links são imutáveis. Revogue e gere um novo link.';end if;return new;end if;
if new.expires_at<=now() or new.expires_at>now()+interval '90 days' then raise exception using errcode='23514',message='Validade deve ficar entre agora e 90 dias.';end if;
if new.lead_id is not null and not exists(select 1 from public.leads l where l.id=new.lead_id) then raise exception using errcode='42501',message='Lead não autorizado.';end if;
if new.client_id is not null and not exists(select 1 from public.clients c where c.id=new.client_id and c.deleted_at is null) then raise exception using errcode='42501',message='Cliente não autorizado.';end if;
if new.collection_id is not null and not exists(select 1 from public.marketing_collections c where c.id=new.collection_id) then raise exception using errcode='42501',message='Coleção não autorizada.';end if;
foreach pid in array new.property_ids loop if not exists(select 1 from public.properties p where p.id=pid and p.deleted_at is null and p.publish_on_site and p.presentation_enabled and p.workflow_status in ('aprovado','publicado') and p.status in ('ativo','reservado','vendido','alugado')) then raise exception using errcode='42501',message='Imóvel sem apresentação pública autorizada.';end if;end loop;
foreach aid in array new.asset_ids loop if not exists(select 1 from public.marketing_assets a join public.asset_versions v on v.id=a.current_version_id where a.id=aid and a.scope='institutional' and a.audience='team' and a.status='aprovado' and a.visibility='public' and(a.expires_at is null or a.expires_at>now()) and exists(select 1 from public.asset_relations r where r.asset_id=a.id and(r.property_id=any(new.property_ids) or exists(select 1 from public.development_units u where u.development_id=r.development_id and u.property_id=any(new.property_ids))))) then raise exception using errcode='42501',message='Material sem aprovação ou vínculo autorizado.';end if;end loop;
return new;end $function$
;
alter policy marketing_storage_read on storage.objects using (
 bucket_id='crm-marketing' and public.can_manage_commercial() and
 (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.asset_versions v join public.marketing_assets a on a.id=v.asset_id
 where v.storage_path=objects.name and crm_private.asset_readable(a.id) and
 (a.owner_id=auth.uid() or (a.scope='institutional' and public.can_manage_operations()) or a.current_version_id=v.id)))
);
CREATE OR REPLACE FUNCTION crm_private.valid_share(target_token uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select s.id from public.marketing_shares s where s.token=target_token and s.revoked_at is null and s.expires_at>now() and exists(select 1 from public.user_roles r join auth.users u on u.id=r.id where r.id=s.owner_id and r.disabled_at is null and r.role in ('admin','manager','broker','corretor') and (u.banned_until is null or u.banned_until<=now()) and (r.role not in ('broker','corretor') or exists(select 1 from public.brokers b where b.id=r.id and b.active))) and (s.lead_id is null or exists(select 1 from public.leads l where l.id=s.lead_id and l.broker_id=s.owner_id and l.deleted_at is null)) and not exists(select 1 from unnest(s.property_ids) pid where not exists(select 1 from public.properties p where p.id=pid and p.deleted_at is null and p.publish_on_site and p.presentation_enabled and p.workflow_status in ('aprovado','publicado') and p.status in ('ativo','reservado','vendido','alugado'))) $function$

;
commit;

