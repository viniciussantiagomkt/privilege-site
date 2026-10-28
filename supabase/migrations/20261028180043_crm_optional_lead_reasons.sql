-- PROPOSED ONLY: optional reasons; no historical data changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$ begin
 if md5(pg_get_functiondef('public.crm_assign_lead(bigint,uuid,text)'::regprocedure)) <> '0f587cadfdba9ddeb12f9e07cc216b91'
 or md5(pg_get_functiondef('public.crm_request_lead_transfer(bigint,uuid,text)'::regprocedure)) <> '0edfb30fb7f2d0e54542dc028031f0c8' then
 raise exception 'Optional lead reasons preflight: function drift';end if;
end $$;
alter table public.lead_transfer_requests drop constraint lead_transfer_requests_reason_check;
alter table public.lead_transfer_requests add constraint lead_transfer_requests_reason_check check(length(trim(reason)) between 0 and 500);

create or replace function public.crm_assign_lead(target_lead bigint,target_broker uuid,assignment_reason text default '')
returns void language plpgsql security definer set search_path=public as $$
declare l public.leads;
begin
 if not public.can_manage_operations() then raise exception 'Acesso negado' using errcode='42501';end if;
 if length(trim(coalesce(assignment_reason,''))) > 500 or not crm_private.eligible_broker(target_broker) then raise exception 'Destino ou motivo inválido' using errcode='22023';end if;
 select * into l from public.leads where id=target_lead and origin_type='company' and deleted_at is null for update;
 if not found then raise exception 'Distribuição institucional não autorizada' using errcode='42501';end if;
 if l.broker_id is not distinct from target_broker then return;end if;
 update public.leads set broker_id=target_broker,assigned_at=now() where id=l.id;
 insert into public.lead_assignments(lead_id,previous_broker_id,broker_id,assigned_by,reason) values(l.id,l.broker_id,target_broker,auth.uid(),trim(coalesce(assignment_reason,'')));
 insert into public.lead_activities(lead_id,user_id,type,description) values(l.id,auth.uid(),'lead_assigned',coalesce(nullif(trim(assignment_reason),''),'Lead atribuído.'));
 update public.tasks set deleted_at=now(),updated_at=now() where lead_id=l.id and broker_id=l.broker_id and status<>'concluida';
 insert into public.tasks(title,broker_id,lead_id,due_at) values('Primeiro contato',target_broker,l.id,now());
 perform crm_private.emit_notification(target_broker,'lead-assigned:'||(select max(id) from public.lead_assignments where lead_id=l.id),'Novo lead atribuído','lead_atribuido','lead',l.id,'/admin/leads?lead='||l.id);
end $$;

create or replace function public.crm_request_lead_transfer(target_lead bigint,target_broker uuid,transfer_reason text default '')
returns bigint language plpgsql security definer set search_path=public as $$
declare result bigint;l public.leads;
begin
 if not public.can_manage_commercial() or not crm_private.eligible_broker(target_broker) or target_broker=auth.uid() then raise exception 'Transferência não autorizada' using errcode='42501';end if;
 select * into l from public.leads where id=target_lead and broker_id=auth.uid() and deleted_at is null for update;
 if not found or l.origin_type<>'personal' then raise exception 'Carteira pessoal não autorizada' using errcode='42501';end if;
 if length(trim(coalesce(transfer_reason,''))) > 500 then raise exception 'Motivo deve ter até 500 caracteres' using errcode='22023';end if;
 -- Expired requests remain as audit records; resolve before a new request.
 update public.lead_transfer_requests set status='expired' where lead_id=target_lead and status='pending' and expires_at<=now();
 insert into public.lead_transfer_requests(lead_id,from_user,to_user,reason) values(target_lead,auth.uid(),target_broker,trim(coalesce(transfer_reason,'')))
 returning id into result;return result;
end $$;
commit;
