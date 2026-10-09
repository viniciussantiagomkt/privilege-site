-- Requires the manually installed CRM foundation/property/followup structures.
-- Reviewed and applied only to staging sdpqphiooiuglywcmkxv on 2026-10-08.
-- No data rewrites. Do not blindly replay baseline migrations or db push.
begin;
do $$ begin
 if to_regclass('public.lead_assignments') is null or to_regclass('public.property_code_registry') is null
 or to_regprocedure('public.can_manage_operations()') is null then
  raise exception 'CRM baseline missing; reconcile manually installed migrations first';
 end if;
end $$;
alter view public.admin_dashboard_metrics set (security_invoker = true);
alter view public.property_metrics set (security_invoker = true);
alter function public.touch_updated_at() set search_path = public;

create policy "CRM lead insert boundary" on public.leads as restrictive
for insert to anon, authenticated with check (
 public.can_manage_operations()
 or (public.can_manage_commercial() and broker_id=auth.uid() and origin_type='personal'
     and assigned_at is null and first_contact_at is null)
 or (not public.can_manage_commercial() and broker_id is null and origin_type='company'
     and status='novo' and notes is null and assigned_at is null
     and first_contact_at is null and lost_reason is null)
);

create or replace function public.crm_protect_property_approval()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
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
end $$;
create trigger crm_property_approval before insert or update on public.properties
for each row execute function public.crm_protect_property_approval();
alter policy "CRM publication boundary" on public.properties using (
 (publish_on_site and deleted_at is null
  and workflow_status in ('aprovado','publicado')
  and status in ('ativo','reservado','vendido','alugado'))
 or (public.can_manage_commercial() and
 (public.can_manage_operations() or owner_id=auth.uid() or broker_id=auth.uid()))
);
commit;

