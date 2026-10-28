-- PROPOSED ONLY. Do not apply without specific staging authorization.
-- No historical material publication, notification backfill or Auth changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Abort on drift of functions replaced by this package. M1–M5 must exist.
do $$begin
 if exists(select 1 from (values
 ('crm_private.asset_readable(bigint)','e06c7c8195e933d1777a73cef4f27760'),
 ('public.crm_assign_lead(bigint,uuid,text)','6a2cc9858048dbce37f693ed3f9c9188'),
 ('public.crm_set_asset_audience(bigint,text,uuid[])','cec69fc9081fd1d6de32d81193b7b57b')
 ) e(signature,expected) where to_regprocedure(signature) is null or md5(replace(pg_get_functiondef(to_regprocedure(signature)),chr(13),''))<>expected)
 then raise exception 'Marketing delivery preflight drift; stop and review';end if;
end $$;
create index crm_unread_notifications on public.notifications(user_id) where not read;

create function crm_private.eligible_member(target uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles r join auth.users u on u.id=r.id
 where r.id=target and r.disabled_at is null and r.role in ('admin','manager','broker','corretor')
 and (u.banned_until is null or u.banned_until<=now())
 and (r.role in ('admin','manager') or exists(select 1 from public.brokers b where b.id=r.id and b.active)))
$$;
revoke all on function crm_private.eligible_member(uuid) from public,anon,authenticated;
create function public.crm_marketing_recipients() returns table(id uuid,name text,role text)
language sql stable security definer set search_path=public as $$
 select r.id,coalesce(nullif(b.name,''),case r.role when 'admin' then 'Administrador' when 'manager' then 'Gestor' else 'Corretor' end||' · '||left(r.id::text,8)),r.role
 from public.user_roles r left join public.brokers b on b.id=r.id
 where public.can_manage_commercial() and crm_private.eligible_member(r.id) order by r.role,r.id
$$;
revoke all on function public.crm_marketing_recipients() from public,anon;
grant execute on function public.crm_marketing_recipients() to authenticated;
-- Reviewers can review pending institutional submissions. Approved selected
-- materials are visible only to their owner and selected eligible recipients.
create or replace function crm_private.asset_readable(target bigint) returns boolean
language sql stable security definer set search_path=public as $$
 select public.can_manage_commercial() and exists(select 1 from public.marketing_assets a where a.id=target and
 (a.owner_id=auth.uid() or (a.scope='institutional' and (a.status='pendente' or a.audience='team') and public.can_manage_operations()) or
 (a.scope='institutional' and a.status='aprovado' and (a.expires_at is null or a.expires_at>now()) and
 (a.audience='team' or (a.audience='selected' and exists(select 1 from public.marketing_asset_recipients r where r.asset_id=a.id and r.user_id=auth.uid()))))))
$$;
-- Approved recipients, including managers, receive only the current version.
alter policy crm_version_audience_boundary on public.asset_versions using
(exists(select 1 from public.marketing_assets a where a.id=asset_id and
(a.owner_id=auth.uid() or (a.scope='institutional' and a.status='pendente' and public.can_manage_operations()) or a.current_version_id=asset_versions.id)));
alter policy marketing_storage_read on storage.objects using (
 bucket_id='crm-marketing' and public.can_manage_commercial() and
 (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.asset_versions v join public.marketing_assets a on a.id=v.asset_id
 where v.storage_path=objects.name and crm_private.asset_readable(a.id) and
 (a.owner_id=auth.uid() or (a.scope='institutional' and a.status='pendente' and public.can_manage_operations()) or a.current_version_id=v.id)))
);

-- Reviewers see recipients only while reviewing a pending submission.
alter policy crm_asset_recipient_read on public.marketing_asset_recipients using
(public.can_manage_commercial() and (user_id=auth.uid() or exists(select 1 from public.marketing_assets a where a.id=asset_id and
(a.owner_id=auth.uid() or (a.scope='institutional' and a.status='pendente' and public.can_manage_operations())))));

-- Only the owner may change audience. Reviewers approve; they cannot redirect
-- someone else's content or make it public through audience changes.
create or replace function public.crm_set_asset_audience(target_asset bigint,new_audience text,recipients uuid[] default '{}') returns boolean
language plpgsql security definer set search_path=public as $$
declare a public.marketing_assets; existing uuid[]; requested uuid[];
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 if new_audience is null or new_audience not in ('owner','team','selected') or recipients is null or cardinality(recipients)>200
 or (new_audience='selected' and cardinality(recipients)=0) or (new_audience<>'selected' and cardinality(recipients)>0)
 or exists(select 1 from unnest(recipients) x where x is null or not crm_private.eligible_member(x))
 then raise exception 'Selecione destinatários ativos e elegíveis' using errcode='22023';end if;
 select * into a from public.marketing_assets where id=target_asset and owner_id=auth.uid() for update;
 if not found then raise exception 'Somente o proprietário pode alterar a audiência' using errcode='42501';end if;
 select coalesce(array_agg(user_id order by user_id),'{}') into existing from public.marketing_asset_recipients where asset_id=a.id;
 select coalesce(array_agg(x order by x),'{}') into requested from (select distinct unnest(recipients) x) q;
 if a.audience=new_audience and existing=requested then return true;end if;
 -- Recipients are installed before the asset event, atomically in this transaction.
 delete from public.marketing_asset_recipients where asset_id=a.id;
 insert into public.marketing_asset_recipients(asset_id,user_id) select a.id,unnest(requested);
 update public.marketing_assets set audience=new_audience,scope=case when new_audience='owner' then 'personal' else 'institutional' end,status='pendente',visibility='internal',delivery_cycle=delivery_cycle+1 where id=a.id;
 insert into public.audit_logs(actor_id,entity,entity_id,action,after_data) values(auth.uid(),'marketing_assets',a.id::text,'audience_changed',jsonb_build_object('audience',new_audience,'requires_review',true));
 return true;
end $$;
alter table public.marketing_assets add column delivery_cycle integer not null default 0;
-- The generation is server controlled, including version/content resubmission.
create function crm_private.asset_delivery_cycle() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and new.delivery_cycle is distinct from old.delivery_cycle and current_user<>pg_get_userbyid((select proowner from pg_proc where oid='public.crm_set_asset_audience(bigint,text,uuid[])'::regprocedure)) then raise exception 'Ciclo de revisão controlado pelo servidor' using errcode='42501';end if;
 if new.status='aprovado' and new.current_version_id is null then raise exception 'Envie um arquivo antes de aprovar' using errcode='23514';end if;
 if tg_op='INSERT' then new.delivery_cycle:=1;
 else new.delivery_cycle:=old.delivery_cycle+case when new.status='pendente' and
 (old.status<>'pendente' or new.current_version_id is distinct from old.current_version_id or new.audience is distinct from old.audience or new.delivery_cycle<>old.delivery_cycle) then 1 else 0 end;end if;
 return new;
end $$;
create trigger marketing_delivery_cycle before insert or update on public.marketing_assets for each row execute function crm_private.asset_delivery_cycle();
create function crm_private.emit_notification(recipient uuid,event text,heading text,kind text,entity text,record_id bigint,path text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if crm_private.eligible_member(recipient) then
 insert into public.notifications(user_id,title,description,type,entity_type,entity_id,target_path,event_key)
 values(recipient,heading,'Abra o registro para consultar os detalhes permitidos.',kind,entity,record_id,path,event)
 on conflict(user_id,event_key) where event_key is not null do nothing;end if;
end $$;
create function crm_private.notify_asset_delivery() returns trigger
language plpgsql security definer set search_path=public as $$
declare member record; changed boolean;
begin
 changed:=tg_op='INSERT';
 if tg_op='UPDATE' then changed:=new.delivery_cycle<>old.delivery_cycle or new.status<>old.status;end if;
 if not changed or new.current_version_id is null then return new;end if;
 if new.status='pendente' and new.audience<>'owner' then
 for member in select id from public.user_roles where role in ('admin','manager') loop
 perform crm_private.emit_notification(member.id,'asset-review:'||new.id||':'||new.delivery_cycle,'Material aguardando aprovação','asset_review','marketing_asset',new.id,'/admin/marketing?material='||new.id);
 end loop;
 elsif new.status='aprovado' then
 perform crm_private.emit_notification(new.owner_id,'asset-approved:'||new.id||':'||new.delivery_cycle,'Material aprovado','asset_approved','marketing_asset',new.id,'/admin/marketing?material='||new.id);
 for member in select r.id from public.user_roles r where r.id<>new.owner_id and (new.expires_at is null or new.expires_at>now()) and
 (new.audience='team' or (new.audience='selected' and exists(select 1 from public.marketing_asset_recipients x where x.asset_id=new.id and x.user_id=r.id))) loop
 perform crm_private.emit_notification(member.id,'asset-shared:'||new.id||':'||new.delivery_cycle,'Material compartilhado com você','asset_shared','marketing_asset',new.id,'/admin/marketing?material='||new.id);
 end loop;
 elsif new.status in ('rejeitado','arquivado') then
 perform crm_private.emit_notification(new.owner_id,'asset-result:'||new.id||':'||new.delivery_cycle||':'||new.status,'Revisão de material atualizada','asset_review_result','marketing_asset',new.id,'/admin/marketing?material='||new.id);
 end if;
 return new;
end $$;
create trigger marketing_delivery_notification after insert or update on public.marketing_assets for each row execute function crm_private.notify_asset_delivery();
create function crm_private.notify_property_result() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.workflow_status is distinct from old.workflow_status and old.workflow_status='pendente' then
 perform crm_private.emit_notification(coalesce(new.submitted_by,new.broker_id),'property-result:'||new.id||':'||new.review_cycle||':'||new.workflow_status,
 'Revisão do imóvel atualizada','property_result','property',new.id,'/admin/imoveis?imovel='||new.id);
 if new.broker_id is distinct from new.submitted_by then
 perform crm_private.emit_notification(new.broker_id,'property-result:'||new.id||':'||new.review_cycle||':'||new.workflow_status,'Revisão do imóvel atualizada','property_result','property',new.id,'/admin/imoveis?imovel='||new.id);end if;
 end if;return new;
end $$;
create trigger crm_property_result after update on public.properties for each row execute function crm_private.notify_property_result();
create function crm_private.notify_lead_transfer() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
 perform crm_private.emit_notification(new.to_user,'transfer-request:'||new.id,'Solicitação de transferência','lead_transfer_request','lead_transfer',new.id,'/admin/leads?transferencia='||new.id);
 elsif new.status='accepted' and old.status<>'accepted' then
 -- Former owner must not receive the now-private lead ID, title or deep link.
 perform crm_private.emit_notification(new.from_user,'transfer-accepted:'||new.id,'Transferência aceita','lead_transfer_accepted','lead_transfer',new.id,'/admin/leads?transferencia='||new.id);
 perform crm_private.emit_notification(new.to_user,'transfer-received:'||new.id,'Transferência concluída','lead_transfer_received','lead_transfer',new.id,'/admin/leads?transferencia='||new.id);
 end if;return new;
end $$;
create trigger crm_transfer_notification after insert or update on public.lead_transfer_requests for each row execute function crm_private.notify_lead_transfer();
-- Explicit idempotent submission also handles preexisting pending materials.
create function public.crm_submit_asset_review(target_asset bigint) returns boolean
language plpgsql security definer set search_path=public as $$
declare a public.marketing_assets;
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into a from public.marketing_assets where id=target_asset and owner_id=auth.uid() for update;
 if not found or a.current_version_id is null or a.audience='owner' then raise exception 'Escolha a audiência e envie um arquivo antes de solicitar aprovação' using errcode='22023';end if;
 if a.status='aprovado' then return true;end if;
 if a.status='pendente' and exists(select 1 from public.notifications where event_key='asset-review:'||a.id||':'||a.delivery_cycle) then return true;end if;
 update public.marketing_assets set status='pendente',visibility='internal',delivery_cycle=delivery_cycle+1 where id=a.id;
 return true;
end $$;
revoke all on function public.crm_submit_asset_review(bigint) from public,anon;
grant execute on function public.crm_submit_asset_review(bigint) to authenticated;

-- Count is independent of the paginated notification list and never accepts a UID.
create function public.crm_unread_notification_count() returns bigint language sql stable security invoker set search_path=public as $$
 select count(*) from public.notifications where user_id=auth.uid() and not read and public.can_manage_commercial()
$$;
revoke all on function public.crm_unread_notification_count() from public,anon;
grant execute on function public.crm_unread_notification_count() to authenticated;
revoke all on function crm_private.asset_delivery_cycle(),crm_private.emit_notification(uuid,text,text,text,text,bigint,text),crm_private.notify_asset_delivery(),crm_private.notify_property_result(),crm_private.notify_lead_transfer() from public,anon,authenticated;
create or replace function public.crm_assign_lead(target_lead bigint,target_broker uuid,assignment_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare l public.leads;
begin
 if not public.can_manage_operations() then raise exception 'Acesso negado' using errcode='42501';end if;
 if length(trim(coalesce(assignment_reason,''))) not between 1 and 500 or not crm_private.eligible_broker(target_broker) then raise exception 'Destino ou motivo inválido' using errcode='22023';end if;
 select * into l from public.leads where id=target_lead and origin_type='company' and deleted_at is null for update;
 if not found then raise exception 'Distribuição institucional não autorizada' using errcode='42501';end if;
 if l.broker_id is not distinct from target_broker then return;end if;
 update public.leads set broker_id=target_broker,assigned_at=now() where id=l.id;
 insert into public.lead_assignments(lead_id,previous_broker_id,broker_id,assigned_by,reason) values(l.id,l.broker_id,target_broker,auth.uid(),trim(assignment_reason));
 insert into public.lead_activities(lead_id,user_id,type,description) values(l.id,auth.uid(),'lead_assigned',trim(assignment_reason));
 update public.tasks set deleted_at=now(),updated_at=now() where lead_id=l.id and broker_id=l.broker_id and status<>'concluida';
 insert into public.tasks(title,broker_id,lead_id,due_at) values('Primeiro contato',target_broker,l.id,now());
 perform crm_private.emit_notification(target_broker,'lead-assigned:'||(select max(id) from public.lead_assignments where lead_id=l.id),'Novo lead atribuído','lead_atribuido','lead',l.id,'/admin/leads?lead='||l.id);
end $$;


commit;
