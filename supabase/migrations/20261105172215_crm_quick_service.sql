-- PROPOSED ONLY: local verification. Requires separate staging authorization.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.crm_normalize_client_phone(value text) returns text
language plpgsql immutable set search_path = '' as $$
declare digits text; significant text; international_plus boolean; international_00 boolean;
begin
 if value is null or length(value)>64 or value ~ '[a-zA-Z]' then return null; end if;
 significant:=regexp_replace(value,'[^0-9+]','','g');
 international_plus:=left(significant,1)='+';
 international_00:=left(significant,2)='00';
 if strpos(significant,'+')>0 and significant !~ '^\+55[0-9]+$' then return null; end if;
 -- Explicit country prefixes must never fall back to national-number inference.
 digits:=case when international_plus then substr(significant,2) when international_00 then substr(significant,3) else significant end;
 if not international_plus and not international_00 and length(digits) in (10,11) then digits:='55'||digits; end if;
 if digits !~ '^55[1-9][0-9][0-9]{8,9}$' then return null; end if;
 return digits;
end $$;

create function public.crm_valid_client_interest(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; n numeric;
begin
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>10000 then return false; end if;
 for k,v in select * from jsonb_each(p) loop
  if k not in ('purpose','property_type','city','neighborhoods','budget_min','budget_max','bedrooms','parking_spaces','preferences','payment_method','financing','down_payment') then return false; end if;
  if k='purpose' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('compra','aluguel','investimento')) then return false; end if;
  if k='property_type' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('apartamento','casa','condominio','terreno','comercial','outro')) then return false; end if;
  if k='payment_method' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('a_vista','financiamento','consorcio','indefinido')) then return false; end if;
  if k in ('city','preferences') and (jsonb_typeof(v)<>'string' or length(v#>>'{}')>case when k='city' then 100 else 1000 end or (v#>>'{}') ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]') then return false; end if;
  if k='neighborhoods' then
   if jsonb_typeof(v)<>'array' then return false; end if;
   if jsonb_array_length(v)>20 or exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e)<>'string' or length(trim(e#>>'{}')) not between 1 and 100 or e#>>'{}' ~ '[\x01-\x1f]') then return false; end if;
  end if;
  if k in ('bedrooms','parking_spaces') then
   if jsonb_typeof(v)<>'number' then return false; end if;
   n:=(v#>>'{}')::numeric; if n<>trunc(n) or n<0 or n>30 then return false; end if;
  end if;
  if k in ('budget_min','budget_max','down_payment') and (jsonb_typeof(v)<>'string' or v#>>'{}' !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$') then return false; end if;
  if k='financing' and jsonb_typeof(v)<>'boolean' then return false; end if;
 end loop;
 if p ? 'budget_min' and p ? 'budget_max' and (p->>'budget_min')::numeric>(p->>'budget_max')::numeric then return false; end if;
 return true;
exception when others then return false;
end $$;
revoke all on function public.crm_normalize_client_phone(text), public.crm_valid_client_interest(jsonb) from public,anon;
grant execute on function public.crm_normalize_client_phone(text), public.crm_valid_client_interest(jsonb) to authenticated;

alter table public.clients add column interest_profile jsonb not null default '{}'::jsonb
 constraint crm_client_interest_valid check(public.crm_valid_client_interest(interest_profile));
alter table public.clients add column interest_revision bigint not null default 0 check(interest_revision>=0);
alter table public.tasks add column quick_action_id uuid unique;
alter table public.visits add column quick_action_id uuid unique;
create index crm_client_phone_lookup on public.clients(broker_id,public.crm_normalize_client_phone(phone)) where deleted_at is null;

create function crm_private.client_interest_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' then new.interest_revision:=0;
 else new.interest_revision:=old.interest_revision+case when (to_jsonb(new)-'interest_revision') is distinct from (to_jsonb(old)-'interest_revision') then 1 else 0 end;
 end if;
 return new;
end $$;
revoke all on function crm_private.client_interest_revision() from public,anon,authenticated;
create trigger crm_client_interest_revision before insert or update on public.clients for each row execute function crm_private.client_interest_revision();

create function public.crm_save_quick_client(target_client bigint, expected_revision bigint, action_id uuid, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.clients; receipt public.crm_event_log; v_phone text; fingerprint text; receipt_key text; profile jsonb; v_email text;
begin
 if auth.uid() is null or not public.can_manage_commercial() then raise exception 'Sessão comercial necessária.' using errcode='42501'; end if;
 if action_id is null or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>18000 then raise exception 'Cadastro inválido.' using errcode='22023'; end if;
 if exists(select 1 from jsonb_object_keys(payload) k where k not in ('name','phone','email','notes','contact_type','interest_profile')) then raise exception 'Campos não permitidos.' using errcode='22023'; end if;
 if jsonb_typeof(payload->'name') is distinct from 'string' or length(trim(payload->>'name')) not between 2 and 160 or payload->>'name' ~ '[\x01-\x1f]' then raise exception 'Revise o nome.' using errcode='22023'; end if;
 if jsonb_typeof(payload->'phone') is distinct from 'string' then raise exception 'Revise o WhatsApp.' using errcode='22023'; end if;
 v_phone:=public.crm_normalize_client_phone(payload->>'phone');
 if v_phone is null then raise exception 'Revise o WhatsApp com DDD.' using errcode='22023'; end if;
 if payload ? 'email' and jsonb_typeof(payload->'email') not in ('null','string') then raise exception 'E-mail inválido.' using errcode='22023'; end if;
 v_email:=nullif(lower(trim(payload->>'email')),'');
 if v_email is not null and (length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'E-mail inválido.' using errcode='22023'; end if;
 if payload ? 'notes' and (jsonb_typeof(payload->'notes') not in ('null','string') or length(payload->>'notes')>2000) then raise exception 'Observação inválida.' using errcode='22023'; end if;
 if coalesce(payload->>'contact_type','cliente') not in ('cliente','proprietario','ambos') then raise exception 'Tipo de contato inválido.' using errcode='22023'; end if;
 profile:=coalesce(payload->'interest_profile','{}'::jsonb);
 if not public.crm_valid_client_interest(profile) or (target_client is null and not (profile ? 'purpose')) then raise exception 'Perfil de interesse inválido.' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('quick-client:'||auth.uid()::text,0));
 fingerprint:=md5(jsonb_build_array(target_client,expected_revision,payload)::text);
 receipt_key:='client-save:'||auth.uid()::text||':'||action_id::text;
 select * into receipt from public.crm_event_log where idempotency_key=receipt_key and owner_id=auth.uid();
 if found then
  if receipt.status<>fingerprint or not crm_private.client_readable(receipt.entity_id) then raise exception 'Ação já utilizada ou indisponível.' using errcode='22023'; end if;
  select * into c from public.clients where id=receipt.entity_id and broker_id=auth.uid() and deleted_at is null;
  return jsonb_build_object('id',c.id,'revision',c.interest_revision);
 end if;
 if target_client is not null then
  select * into c from public.clients where id=target_client and broker_id=auth.uid() and deleted_at is null for update;
  if not found or not crm_private.client_readable(target_client) then raise exception 'Cliente indisponível.' using errcode='42501'; end if;
  if expected_revision is null or c.interest_revision<>expected_revision then raise exception 'Cadastro atualizado em outra sessão. Reabra o cliente.' using errcode='40001'; end if;
 end if;
 if exists(select 1 from public.clients other where other.broker_id=auth.uid() and other.deleted_at is null and (target_client is null or other.id<>target_client)
   and (public.crm_normalize_client_phone(other.phone)=v_phone or (v_email is not null and lower(trim(other.email))=v_email))) then
  raise exception 'Contato já cadastrado na sua carteira. Use a busca para continuar.' using errcode='23505';
 end if;
 if target_client is null then
  insert into public.clients(name,phone,email,notes,broker_id,contact_type,interest_profile)
  values(trim(payload->>'name'),v_phone,v_email,nullif(trim(payload->>'notes'),''),auth.uid(),coalesce(payload->>'contact_type','cliente'),profile) returning * into c;
 elsif row(c.name,c.phone,c.email,c.notes,c.contact_type,c.interest_profile) is distinct from row(trim(payload->>'name'),v_phone,v_email,nullif(trim(payload->>'notes'),''),coalesce(payload->>'contact_type','cliente'),profile) then
  update public.clients set name=trim(payload->>'name'),phone=v_phone,email=v_email,notes=nullif(trim(payload->>'notes'),''),contact_type=coalesce(payload->>'contact_type','cliente'),interest_profile=profile where id=target_client returning * into c;
 end if;
 insert into public.crm_event_log(owner_id,event_type,entity_id,idempotency_key,status) values(auth.uid(),'client_quick_saved',c.id,receipt_key,fingerprint);
 return jsonb_build_object('id',c.id,'revision',c.interest_revision);
end $$;

create function public.crm_record_client_contact(target_client bigint, action_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.can_manage_commercial() or not crm_private.client_readable(target_client) then raise exception 'Cliente indisponível.' using errcode='42501'; end if;
 if action_id is null then raise exception 'Ação inválida.' using errcode='22023'; end if;
 insert into public.crm_event_log(owner_id,event_type,entity_id,idempotency_key) values(auth.uid(),'client_contact_recorded',target_client,'client-contact:'||auth.uid()::text||':'||target_client||':'||action_id) on conflict(idempotency_key) do nothing;
 return true;
end $$;

create function public.crm_client_timeline(target_client bigint, page_number integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.can_manage_commercial() or not crm_private.client_readable(target_client) then raise exception 'Cliente indisponível.' using errcode='42501'; end if;
 if page_number is null or page_number<0 or page_number>200 then raise exception 'Página inválida.' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(events)),'[]'::jsonb) into result from (
  select 'audit:'||a.id::text as id,a.created_at,
   case a.entity when 'clients' then case when a.action='INSERT' then 'Cliente cadastrado' when 'interest_profile'=any(a.changed_fields) then 'Perfil de interesse atualizado' else 'Cadastro atualizado' end
   when 'tasks' then 'Tarefa / retorno registrado ou atualizado' when 'visits' then 'Visita registrada ou atualizada' when 'proposals' then 'Proposta registrada ou atualizada' when 'negotiations' then 'Negociação registrada ou atualizada' else 'Apresentação gerada ou atualizada' end as description
  from public.audit_logs a where
   (a.entity='clients' and a.entity_id=target_client::text)
   or (a.entity='tasks' and exists(select 1 from public.tasks t where t.id::text=a.entity_id and t.client_id=target_client and t.broker_id=auth.uid() and t.deleted_at is null))
   or (a.entity='visits' and exists(select 1 from public.visits v where v.id::text=a.entity_id and v.client_id=target_client and v.broker_id=auth.uid()))
   or (a.entity='proposals' and exists(select 1 from public.proposals p where p.id::text=a.entity_id and p.client_id=target_client and p.broker_id=auth.uid()))
   or (a.entity='negotiations' and exists(select 1 from public.negotiations n join public.proposals p on p.id=n.proposal_id where n.id::text=a.entity_id and p.client_id=target_client and p.broker_id=auth.uid()))
   or (a.entity='marketing_shares' and exists(select 1 from public.marketing_shares s where s.id::text=a.entity_id and s.client_id=target_client and s.owner_id=auth.uid()))
  union all select 'contact:'||e.id::text,e.created_at,'Contato registrado pelo corretor' from public.crm_event_log e where e.owner_id=auth.uid() and e.entity_id=target_client and e.event_type='client_contact_recorded'
  order by created_at desc,id desc limit 51 offset page_number*50
 ) events;
 return result;
end $$;
revoke all on function public.crm_save_quick_client(bigint,bigint,uuid,jsonb),public.crm_record_client_contact(bigint,uuid),public.crm_client_timeline(bigint,integer) from public,anon;
grant execute on function public.crm_save_quick_client(bigint,bigint,uuid,jsonb),public.crm_record_client_contact(bigint,uuid),public.crm_client_timeline(bigint,integer) to authenticated;
commit;
