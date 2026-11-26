-- PROPOSED ONLY: non-retryable business revision conflict after H26. No remote authorization.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $guard$
begin
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.crm_save_quick_client(bigint,bigint,uuid,jsonb)') and md5(prosrc)='968b61315cec7e8eccc79db63f926650') then
  raise exception 'Quick client definition drift: review before applying' using errcode='55000';
 end if;
 if has_function_privilege('anon','public.crm_save_quick_client(bigint,bigint,uuid,jsonb)','EXECUTE') or not has_function_privilege('authenticated','public.crm_save_quick_client(bigint,bigint,uuid,jsonb)','EXECUTE') then
  raise exception 'Quick client ACL drift: review before applying' using errcode='55000';
 end if;
end $guard$;

create or replace function public.crm_save_quick_client(target_client bigint, expected_revision bigint, action_id uuid, payload jsonb) returns jsonb
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
  if expected_revision is null or c.interest_revision<>expected_revision then raise exception 'Cadastro atualizado em outra sessão. Reabra o cliente.' using errcode='PT409'; end if;
  -- Omission preserves the owner-locked row; explicit JSON values retain validation.
  if not (payload ? 'interest_profile') then profile:=c.interest_profile; end if;
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

commit;
