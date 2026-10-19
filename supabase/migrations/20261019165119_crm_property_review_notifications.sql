-- PROPOSED ONLY. No historical notification backfill.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create function public.crm_eligible_brokers() returns table(id uuid,name text,active boolean)
language sql stable security definer set search_path=public as $$
 select b.id,b.name,b.active from public.brokers b where public.can_manage_commercial()
 and crm_private.eligible_broker(b.id) and (public.can_manage_operations() or b.id=auth.uid()) order by b.name,b.id
$$;
revoke all on function public.crm_eligible_brokers() from public,anon;
grant execute on function public.crm_eligible_brokers() to authenticated;
alter table public.properties add column review_cycle integer not null default 0;
alter table public.notifications add column entity_type text;
alter table public.notifications add column entity_id bigint;
alter table public.notifications add column target_path text;
alter table public.notifications add column event_key text;
create unique index crm_notification_idempotency on public.notifications(user_id,event_key) where event_key is not null;
create function crm_private.property_review_cycle() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='INSERT' then new.review_cycle:=case when new.workflow_status='pendente' then 1 else 0 end;
 else new.review_cycle:=old.review_cycle+case when new.workflow_status='pendente' and old.workflow_status<>'pendente' then 1 else 0 end;
 end if;
 return new;
end $$;
create function crm_private.notify_property_review() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.workflow_status<>'pendente' or new.deleted_at is not null then return new;end if;
 if tg_op='UPDATE' and old.workflow_status='pendente' then return new;end if;
 insert into public.notifications(user_id,title,description,type,entity_type,entity_id,target_path,event_key)
 select r.id,'Imóvel aguardando aprovação','Há uma submissão para revisão.','property_review','property',new.id,
 '/admin/imoveis?imovel='||new.id,'property-review:'||new.id||':'||new.review_cycle
 from public.user_roles r join auth.users u on u.id=r.id where r.role in ('admin','manager') and r.disabled_at is null
 and (u.banned_until is null or u.banned_until<=now())
 on conflict(user_id,event_key) where event_key is not null do nothing;
 return new;
end $$;
revoke all on function crm_private.property_review_cycle(),crm_private.notify_property_review() from public,anon,authenticated;
create trigger crm_review_cycle before insert or update on public.properties for each row execute function crm_private.property_review_cycle();
create trigger crm_review_notification after insert or update on public.properties for each row execute function crm_private.notify_property_review();
create function crm_private.validate_property_broker() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is not null and new.broker_id is not null and (tg_op='INSERT' or new.broker_id is distinct from old.broker_id)
 and not crm_private.eligible_broker(new.broker_id) then raise exception 'Responsável precisa ser corretor ativo e elegível' using errcode='42501';end if;
 return new;
end $$;
revoke all on function crm_private.validate_property_broker() from public,anon,authenticated;
create trigger crm_eligible_property_broker before insert or update on public.properties for each row execute function crm_private.validate_property_broker();
CREATE OR REPLACE FUNCTION public.crm_protect_property_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if auth.uid() is not null and public.can_manage_operations() and new.workflow_status in ('aprovado','publicado') then
  new.approved_by:=auth.uid();new.approved_at:=now();
 end if;
 if auth.uid() is not null and not public.can_manage_operations() then
  if tg_op='INSERT' then
   if new.approved_by is not null or new.approved_at is not null then
    raise exception 'Somente a gestao pode aprovar imoveis.' using errcode='42501';
   end if;
   new.workflow_status := 'rascunho';
   new.publish_on_site := false;
   new.submitted_by := auth.uid();
  else
   if new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or (new.workflow_status is distinct from old.workflow_status
          and new.workflow_status not in ('rascunho','pendente')) then
    raise exception 'Somente a gestao pode aprovar imoveis.' using errcode='42501';
   end if;
   if new.publish_on_site and new.workflow_status not in ('aprovado','publicado') then
    raise exception 'Imovel precisa de aprovacao para publicacao.' using errcode='42501';
   end if;
  end if;
 end if;
 return new;
end $function$
;

commit;

