begin;
alter table public.leads
  add column if not exists first_contact_at timestamptz,
  add column if not exists lost_reason text;
-- Ampliacao compativel do CHECK legado: nao converte nem apaga status existentes.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check
  (status in ('novo','em atendimento','em_atendimento','visita agendada','visita_agendada','convertido','perdido')) not valid;
alter table public.leads validate constraint leads_status_check;

create or replace function public.crm_validate_lead_progress() returns trigger
language plpgsql set search_path = public as $$ begin
  if new.status = 'perdido' and old.status is distinct from new.status and
    length(trim(coalesce(new.lost_reason,''))) not between 1 and 1000 then
    raise exception 'Informe o motivo da perda.' using errcode = '23514';
  end if;
  if old.first_contact_at is not null and new.first_contact_at is distinct from old.first_contact_at then
    raise exception 'O primeiro contato registrado e permanente.' using errcode = '23514';
  end if;
  if old.first_contact_at is null and new.first_contact_at is not null then new.first_contact_at := now(); end if;
  return new;
end $$;
create trigger crm_lead_progress before update on public.leads for each row execute function public.crm_validate_lead_progress();

create or replace function public.crm_lead_timeline() returns trigger
language plpgsql security definer set search_path = public as $$ begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities(lead_id,user_id,type,description)
    values(new.id,auth.uid(),'lead_created','Lead recebido');
  else
    if new.status is distinct from old.status then
      insert into public.lead_activities(lead_id,user_id,type,description)
      values(new.id,auth.uid(),'status_changed',coalesce(old.status,'novo') || ' -> ' || new.status);
    end if;
    if old.first_contact_at is null and new.first_contact_at is not null then
      insert into public.lead_activities(lead_id,user_id,type,description)
      values(new.id,auth.uid(),'note','Primeiro contato registrado');
    end if;
  end if;
  return new;
end $$;
create trigger crm_lead_timeline after insert or update on public.leads for each row execute function public.crm_lead_timeline();

create or replace function public.crm_record_contact(target_lead bigint) returns void
language plpgsql security definer set search_path = public as $$
declare l public.leads; begin
  if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select * into l from public.leads where id = target_lead for update;
  if not found or (not public.can_manage_operations() and l.broker_id is distinct from auth.uid()) then
    raise exception 'Lead nao encontrado ou sem permissao' using errcode = '42501';
  end if;
  if l.first_contact_at is not null then return; end if;
  update public.leads set first_contact_at = now(), status = case when status = 'novo' then 'em atendimento' else status end where id = target_lead;
end $$;
revoke all on function public.crm_record_contact(bigint) from public, anon;
grant execute on function public.crm_record_contact(bigint) to authenticated;

create or replace function public.crm_followup_timeline() returns trigger
language plpgsql security definer set search_path = public as $$ begin
  if new.lead_id is not null then
    insert into public.lead_activities(lead_id,user_id,type,description)
    values(new.lead_id,auth.uid(),'note','Retorno agendado para ' || new.due_at::text);
  end if;
  return new;
end $$;
create trigger crm_followup_timeline after insert on public.tasks for each row execute function public.crm_followup_timeline();

-- Nao dar UPDATE geral nas notificacoes: somente marcar as proprias como lidas.
create or replace function public.crm_read_notification(target_notification bigint) returns void
language plpgsql security definer set search_path = public as $$ begin
  if not public.can_manage_commercial() then raise exception 'Acesso negado' using errcode = '42501'; end if;
  update public.notifications set read = true where id = target_notification and user_id = auth.uid();
  if not found then raise exception 'Notificacao nao encontrada' using errcode = '42501'; end if;
end $$;
revoke all on function public.crm_read_notification(bigint) from public, anon;
grant execute on function public.crm_read_notification(bigint) to authenticated;
commit;
