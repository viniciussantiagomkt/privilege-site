-- PROPOSED ONLY: not applied to staging. Preserves accounts, IDs and ownership.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$begin
 if array(select version::text from supabase_migrations.schema_migrations order by version) is distinct from array['20261008144426','20261008144813','20261008145320','20261008150501','20261008163217','20261008163432','20261008163623','20261009142538','20261009144156','20261009174757','20261013180730']::text[] then raise exception 'Migration history changed; reconcile before applying CRM corrections' using errcode='55000';end if;
end $$;
revoke truncate,references,trigger on all tables in schema public from anon,authenticated;
alter default privileges in schema public revoke truncate,references,trigger on tables from anon,authenticated;
create or replace function public.current_user_role() returns text language sql stable security definer set search_path=public as $$
 select coalesce((select r.role from public.user_roles r join auth.users u on u.id=r.id
 where r.id=auth.uid() and r.disabled_at is null and (u.banned_until is null or u.banned_until<=now())
 and (r.role not in ('broker','corretor') or exists(select 1 from public.brokers b where b.id=r.id and b.active))), 'visitor')
$$;
alter table public.leads add column deleted_at timestamptz;
create index crm_private_leads_owner on public.leads(broker_id,id) where deleted_at is null;
create index crm_private_clients_owner on public.clients(broker_id,id) where deleted_at is null;
create index crm_institutional_queue on public.leads(id) where broker_id is null and origin_type='company' and deleted_at is null;

create function crm_private.lead_readable(target bigint) returns boolean language sql stable security definer set search_path=public as $$
 select public.can_manage_commercial() and exists(select 1 from public.leads l where l.id=target and l.deleted_at is null
 and (l.broker_id=auth.uid() or (l.broker_id is null and l.origin_type='company' and public.can_manage_operations())))
$$;
create function crm_private.client_readable(target bigint) returns boolean language sql stable security definer set search_path=public as $$
 select public.can_manage_commercial() and exists(select 1 from public.clients c where c.id=target and c.broker_id=auth.uid() and c.deleted_at is null)
$$;
create function crm_private.eligible_broker(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.brokers b join public.user_roles r on r.id=b.id join auth.users u on u.id=b.id
 where b.id=target and b.active and r.disabled_at is null and r.role in ('broker','corretor') and (u.banned_until is null or u.banned_until<=now()))
$$;
revoke all on function crm_private.lead_readable(bigint),crm_private.client_readable(bigint),crm_private.eligible_broker(uuid) from public,anon;
grant usage on schema crm_private to authenticated;
grant execute on function crm_private.lead_readable(bigint),crm_private.client_readable(bigint),crm_private.eligible_broker(uuid) to authenticated;

alter policy "CRM lead read boundary" on public.leads using (public.can_manage_commercial() and deleted_at is null and (broker_id=auth.uid() or (broker_id is null and origin_type='company' and public.can_manage_operations())));
alter policy "CRM lead update boundary" on public.leads using (crm_private.lead_readable(id))
 with check (public.can_manage_commercial() and (broker_id=auth.uid() or (broker_id is null and origin_type='company' and public.can_manage_operations())));
alter policy "CRM lead insert boundary" on public.leads with check (
 deleted_at is null and ((public.can_manage_commercial() and ((broker_id=auth.uid() and origin_type='personal' and assigned_at is null and first_contact_at is null)
 or (public.can_manage_operations() and broker_id is null and origin_type='company' and assigned_at is null)))
 or (auth.uid() is null and broker_id is null and origin_type='company' and status='novo' and notes is null and assigned_at is null and first_contact_at is null and lost_reason is null))
);
create policy crm_client_private_boundary on public.clients as restrictive for all to authenticated
 using (public.can_manage_commercial() and broker_id=auth.uid() and deleted_at is null) with check (public.can_manage_commercial() and broker_id=auth.uid());
create policy crm_client_no_hard_delete on public.clients as restrictive for delete to authenticated using(false);
create policy crm_task_private_boundary on public.tasks as restrictive for all to authenticated
 using (public.can_manage_commercial() and broker_id=auth.uid() and (lead_id is null or crm_private.lead_readable(lead_id)) and (client_id is null or crm_private.client_readable(client_id)))
 with check (public.can_manage_commercial() and broker_id=auth.uid() and (lead_id is null or crm_private.lead_readable(lead_id)) and (client_id is null or crm_private.client_readable(client_id)));
create policy crm_visit_private_boundary on public.visits as restrictive for all to authenticated
 using(public.can_manage_commercial() and broker_id=auth.uid() and (client_id is null or crm_private.client_readable(client_id)))
 with check(public.can_manage_commercial() and broker_id=auth.uid() and (client_id is null or crm_private.client_readable(client_id)));
create policy crm_proposal_private_boundary on public.proposals as restrictive for all to authenticated
 using(public.can_manage_commercial() and broker_id=auth.uid() and (client_id is null or crm_private.client_readable(client_id)))
 with check(public.can_manage_commercial() and broker_id=auth.uid() and (client_id is null or crm_private.client_readable(client_id)));
create policy crm_sale_private_boundary on public.sales as restrictive for all to authenticated
 using(public.can_manage_commercial() and broker_id=auth.uid() and (client_id is null or crm_private.client_readable(client_id)))
 with check(public.can_manage_commercial() and broker_id=auth.uid() and (client_id is null or crm_private.client_readable(client_id)));
create policy crm_notification_private_boundary on public.notifications as restrictive for all to authenticated
 using(public.can_manage_commercial() and user_id=auth.uid()) with check(public.can_manage_commercial() and user_id=auth.uid());
-- Persistent notifications are written by narrow server functions, never forged by browsers.
revoke insert,update,delete on public.notifications from authenticated;
create policy crm_share_private_boundary on public.marketing_shares as restrictive for all to authenticated
 using(public.can_manage_commercial() and owner_id=auth.uid() and (lead_id is null or crm_private.lead_readable(lead_id)) and (client_id is null or crm_private.client_readable(client_id)))
 with check(public.can_manage_commercial() and owner_id=auth.uid() and (lead_id is null or crm_private.lead_readable(lead_id)) and (client_id is null or crm_private.client_readable(client_id)));
create policy crm_event_private_boundary on public.crm_event_log as restrictive for select to authenticated
 using(public.can_manage_commercial() and owner_id=auth.uid());
-- Audit snapshots contain PII. No general management read; existing append-only audit is preserved.
create policy crm_audit_private_boundary on public.audit_logs as restrictive for select to authenticated using(public.current_user_role()='admin' and entity='user_roles');

create or replace function public.protect_lead_assignment() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.origin_type is distinct from old.origin_type then raise exception 'Origem permanente' using errcode='42501';end if;
 if (new.broker_id is distinct from old.broker_id or new.assigned_at is distinct from old.assigned_at)
 and current_user <> pg_get_userbyid((select proowner from pg_proc where oid='public.crm_assign_lead(bigint,uuid,text)'::regprocedure))
 then raise exception 'Use a transferência autorizada' using errcode='42501';end if;
 return new;
end $$;

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
 insert into public.notifications(user_id,title,description,type) values(target_broker,'Novo lead atribuído','Consulte sua carteira.','lead_atribuido');
end $$;

create table public.lead_transfer_requests(
 id bigint generated always as identity primary key,lead_id bigint not null references public.leads(id),
 from_user uuid not null references auth.users(id),to_user uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 1 and 500),
 status text not null default 'pending' check(status in ('pending','accepted','expired')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,
 check(from_user<>to_user)
);
alter table public.lead_transfer_requests enable row level security;
create unique index crm_pending_lead_transfer on public.lead_transfer_requests(lead_id) where status='pending';
create policy crm_transfer_participants on public.lead_transfer_requests for select to authenticated
 using(public.can_manage_commercial() and (from_user=auth.uid() or to_user=auth.uid()));
revoke all on public.lead_transfer_requests from anon,authenticated;
grant select on public.lead_transfer_requests to authenticated;
create function public.crm_request_lead_transfer(target_lead bigint,target_broker uuid,transfer_reason text)
returns bigint language plpgsql security definer set search_path=public as $$
declare result bigint;l public.leads;
begin
 if not public.can_manage_commercial() or not crm_private.eligible_broker(target_broker) or target_broker=auth.uid() then raise exception 'Transferência não autorizada' using errcode='42501';end if;
 select * into l from public.leads where id=target_lead and broker_id=auth.uid() and deleted_at is null for update;
 if not found or l.origin_type<>'personal' then raise exception 'Carteira pessoal não autorizada' using errcode='42501';end if;
 -- Expired requests remain as audit records; resolve before a new request.
 update public.lead_transfer_requests set status='expired' where lead_id=target_lead and status='pending' and expires_at<=now();
 insert into public.lead_transfer_requests(lead_id,from_user,to_user,reason) values(target_lead,auth.uid(),target_broker,transfer_reason)
 returning id into result;return result;
end $$;
create function public.crm_accept_lead_transfer(target_request bigint)
returns boolean language plpgsql security definer set search_path=public as $$
declare r public.lead_transfer_requests;l public.leads;
begin
 if not public.can_manage_commercial() or not crm_private.eligible_broker(auth.uid()) then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into r from public.lead_transfer_requests where id=target_request and to_user=auth.uid() for update;
 if not found then raise exception 'Transferência não autorizada' using errcode='42501';end if;
 if r.status='accepted' then return true;end if;
 if r.expires_at<=now() then raise exception 'Solicitação expirada' using errcode='42501';end if;
 select * into l from public.leads where id=r.lead_id and broker_id=r.from_user and origin_type='personal' and deleted_at is null for update;
 if not found then raise exception 'Responsabilidade mudou; solicite novamente' using errcode='40001';end if;
 update public.leads set broker_id=r.to_user,assigned_at=now() where id=l.id;
 insert into public.lead_assignments(lead_id,previous_broker_id,broker_id,assigned_by,reason) values(l.id,r.from_user,r.to_user,auth.uid(),r.reason);
 insert into public.lead_activities(lead_id,user_id,type,description) values(l.id,auth.uid(),'lead_assigned','Transferência consentida: '||r.reason);
 -- Existing private clients and their notes remain with the original owner.
 update public.tasks set deleted_at=now(),updated_at=now() where lead_id=l.id and broker_id=r.from_user and status<>'concluida';
 update public.lead_transfer_requests set status='accepted',accepted_at=now() where id=r.id;
 return true;
end $$;
create function public.crm_archive_lead(target_lead bigint) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.leads set deleted_at=now() where id=target_lead and broker_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Registro próprio não encontrado' using errcode='42501';end if; return true;
end $$;
create function public.crm_archive_client(target_client bigint) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.clients set deleted_at=now() where id=target_client and broker_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Registro próprio não encontrado' using errcode='42501';end if; return true;
end $$;
-- No private Postgres Changes DELETE payloads. Polling continues to work.
do $$declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 foreach t in array array['leads','clients','tasks','visits','proposals','negotiations','sales','lead_activities','lead_assignments','crm_contact_links','notifications','marketing_shares','marketing_share_events','crm_event_log','audit_logs','marketing_assets','asset_versions','asset_relations','marketing_collections','marketing_collection_items','marketing_favorites','asset_imports','crm_automation_preferences'] loop
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime drop table public.%I',t);end if;
 end loop;end if;
end $$;
revoke all on function public.crm_request_lead_transfer(bigint,uuid,text),public.crm_accept_lead_transfer(bigint),public.crm_archive_lead(bigint),public.crm_archive_client(bigint),public.crm_assign_lead(bigint,uuid,text) from public,anon;
grant execute on function public.crm_request_lead_transfer(bigint,uuid,text),public.crm_accept_lead_transfer(bigint),public.crm_archive_lead(bigint),public.crm_archive_client(bigint),public.crm_assign_lead(bigint,uuid,text) to authenticated;
CREATE OR REPLACE FUNCTION public.crm_record_contact(target_lead bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare l public.leads; begin
  if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select * into l from public.leads where id = target_lead for update;
  if not found or not crm_private.lead_readable(target_lead) then
    raise exception 'Lead nao encontrado ou sem permissao' using errcode = '42501';
  end if;
  if l.first_contact_at is not null then return; end if;
  update public.leads set first_contact_at = now(), status = case when status = 'novo' then 'em atendimento' else status end where id = target_lead;
end $function$
;
CREATE OR REPLACE FUNCTION public.crm_confirm_presentation_share(target_share bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.marketing_shares; inserted_id bigint;
begin
 if not public.can_manage_commercial() then raise exception using errcode='42501',message='Sessão comercial necessária.';end if;
 select * into s from public.marketing_shares where id=target_share and owner_id=auth.uid();
 if s.id is null then raise exception using errcode='42501',message='Apresentação não autorizada.';end if;
 if s.lead_id is not null and not crm_private.lead_readable(s.lead_id) then raise exception using errcode='42501',message='Lead não autorizado.';end if;
 insert into public.crm_event_log(owner_id,event_type,entity_id,idempotency_key) values(auth.uid(),'presentation_shared',s.id,'share-confirmed:'||s.id) on conflict(idempotency_key) do nothing returning id into inserted_id;
 if inserted_id is not null and s.lead_id is not null then insert into public.lead_activities(lead_id,user_id,type,description) values(s.lead_id,auth.uid(),'note','Envio confirmado pelo corretor: '||s.title||' · canal '||s.channel||' · link /apresentacoes/'||s.token::text);end if;
 return true;
end $function$
;
create function public.crm_transfer_candidates() returns table(id uuid,name text)
language sql stable security definer set search_path=public as $$
 select b.id,b.name from public.brokers b where public.can_manage_commercial() and crm_private.eligible_broker(b.id) and b.id<>auth.uid() order by b.name,b.id
$$;
revoke all on function public.crm_transfer_candidates() from public,anon;
grant execute on function public.crm_transfer_candidates() to authenticated;
create function public.crm_restore_lead(target_lead bigint) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.leads set deleted_at=null where id=target_lead and broker_id=auth.uid() and deleted_at is not null;
 if not found then raise exception 'Registro próprio arquivado não encontrado' using errcode='42501';end if;return true;
end $$;
create function public.crm_restore_client(target_client bigint) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.clients set deleted_at=null where id=target_client and broker_id=auth.uid() and deleted_at is not null;
 if not found then raise exception 'Registro próprio arquivado não encontrado' using errcode='42501';end if;return true;
end $$;
revoke all on function public.crm_restore_lead(bigint),public.crm_restore_client(bigint) from public,anon;
grant execute on function public.crm_restore_lead(bigint),public.crm_restore_client(bigint) to authenticated;

commit;

