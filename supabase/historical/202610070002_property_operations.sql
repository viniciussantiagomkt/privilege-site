-- Requer migration 001. Aditiva; nao remove tabelas, buckets ou policies existentes.
begin;
create sequence if not exists public.property_commercial_code_seq;
alter table public.properties
  add column if not exists property_code text,
  add column if not exists publish_on_site boolean not null default true,
  add column if not exists show_on_broker_page boolean not null default true,
  add column if not exists presentation_enabled boolean not null default true,
  add column if not exists shareable_by_other_brokers boolean not null default false,
  add column if not exists available_for_campaigns boolean not null default false,
  add column if not exists featured_on_broker_page boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists organization_id uuid references public.organizations(id)
    default '00000000-0000-4000-8000-000000000001';
-- featured existente continua sendo featured_on_site; nao duplicar fonte de verdade.
create unique index if not exists properties_commercial_code_unique on public.properties(property_code);
create index if not exists properties_publication_idx on public.properties(created_at desc) where publish_on_site and deleted_at is null;

create table if not exists public.property_code_registry (
  code text primary key,
  property_id bigint not null unique,
  created_at timestamptz not null default now()
);
alter table public.property_code_registry enable row level security;

create or replace function public.crm_set_property_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare prefix text; label text; candidate text; serial_number text; begin
  if tg_op = 'UPDATE' and old.property_code is not null then
    if new.property_code is distinct from old.property_code then raise exception 'Codigo comercial e permanente'; end if;
    return new;
  end if;
  if new.property_code is not null then raise exception 'Codigo deve ser gerado pelo sistema'; end if;
  label := lower(coalesce(new.type,'') || ' ' || coalesce(new.category,''));
  prefix := case
    when label like '%cobertura%' then 'COB'
    when label like '%studio%' then 'ST'
    when label like '%apart%' then 'AP'
    when label like '%terreno%' or label like '%lote%' then 'TR'
    when label like '%sala%' then 'SA'
    when label like '%loja%' then 'LO'
    when label like '%galp%' then 'GA'
    when label like '%chácara%' or label like '%chacara%' then 'CH'
    when label like '%fazenda%' then 'FA'
    when label like '%comercial%' then 'CO'
    else 'CS' end;
  loop
    serial_number := nextval('public.property_commercial_code_seq')::text;
    candidate := 'PRI-' || prefix || '-' || lpad(serial_number, greatest(6,length(serial_number)), '0');
    exit when not exists(select 1 from public.property_code_registry where code = candidate);
  end loop;
  new.property_code := candidate;
  insert into public.property_code_registry(code,property_id) values(candidate,new.id);
  return new;
end $$;
create trigger crm_property_code before insert or update on public.properties
for each row execute function public.crm_set_property_code();
update public.properties set property_code = null where property_code is null;

create policy "CRM publication boundary" on public.properties as restrictive
for select to anon, authenticated using (
  (publish_on_site and deleted_at is null and status in ('ativo','reservado','vendido','alugado'))
  or (public.can_manage_commercial() and (public.can_manage_operations() or owner_id = auth.uid() or broker_id = auth.uid()))
);
create or replace function public.crm_prevent_property_delete() returns trigger
language plpgsql set search_path = public as $$ begin
  raise exception 'Arquive o imovel para preservar seu historico.' using errcode = '42501';
end $$;
create trigger crm_no_property_hard_delete before delete on public.properties
for each row execute function public.crm_prevent_property_delete();
create or replace function public.crm_protect_property_archive() returns trigger
language plpgsql set search_path = public as $$ begin
  if auth.uid() is not null and not public.is_privilege_admin() and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Somente administradores podem arquivar imoveis.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger crm_property_archive before update on public.properties
for each row execute function public.crm_protect_property_archive();

alter table public.audit_logs add column if not exists before_data jsonb;
alter table public.audit_logs add column if not exists after_data jsonb;
create or replace function public.crm_audit_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare fields text[]; before_value jsonb; after_value jsonb; begin
  if tg_op = 'UPDATE' then
    select array_agg(k) into fields from jsonb_object_keys(to_jsonb(new)) k
    where to_jsonb(new)->k is distinct from to_jsonb(old)->k;
    select jsonb_object_agg(k,to_jsonb(old)->k) into before_value from unnest(fields) k
    where k in ('price','status','broker_id','owner_id','publish_on_site','deleted_at','role','disabled_at','due_at');
  end if;
  select jsonb_object_agg(k,to_jsonb(new)->k) into after_value from jsonb_object_keys(to_jsonb(new)) k
  where k in ('price','status','broker_id','owner_id','publish_on_site','deleted_at','role','disabled_at','due_at');
  insert into public.audit_logs(actor_id,entity,entity_id,action,changed_fields,before_data,after_data)
  values(auth.uid(),tg_table_name,new.id::text,tg_op,coalesce(fields,'{}'),before_value,after_value);
  return new;
end $$;
create trigger crm_properties_audit after insert or update on public.properties
for each row execute function public.crm_audit_change();
create trigger crm_roles_audit after insert or update on public.user_roles
for each row execute function public.crm_audit_change();
commit;
