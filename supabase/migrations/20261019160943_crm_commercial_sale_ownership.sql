-- PROPOSED ONLY. Commercial entry and financial confirmation are separate.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.sales add column recorded_by uuid references auth.users(id);
alter table public.sales add column revision integer not null default 1;
create policy crm_broker_register_sale on public.sales for all to authenticated
 using(public.can_manage_commercial() and broker_id=auth.uid())
 with check(public.can_manage_commercial() and broker_id=auth.uid());
create policy crm_sale_no_hard_delete on public.sales as restrictive for delete to authenticated using(false);
create table public.sale_confirmations(
 sale_id bigint primary key references public.sales(id),revision integer not null,
 status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,reason text
);
alter table public.sale_confirmations enable row level security;
create policy crm_sale_confirmation_owner on public.sale_confirmations for select to authenticated
 using(public.can_manage_commercial() and exists(select 1 from public.sales s where s.id=sale_id and s.broker_id=auth.uid()));
revoke all on public.sale_confirmations from public,anon,authenticated;
grant select on public.sale_confirmations to authenticated;
create function public.crm_guard_own_sale() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if not public.can_manage_commercial() or new.broker_id is distinct from auth.uid()
 or not crm_private.eligible_broker(auth.uid()) then raise exception 'Registre somente negócios sob sua responsabilidade' using errcode='42501';end if;
 if new.value is null or new.value<=0 or new.client_id is null or not crm_private.client_readable(new.client_id)
 or new.property_id is null or not exists(select 1 from public.properties p where p.id=new.property_id and p.deleted_at is null and
 (p.owner_id=auth.uid() or p.broker_id=auth.uid() or (p.shareable_by_other_brokers and exists(
 select 1 from public.proposals pr where pr.property_id=p.id and pr.client_id=new.client_id and pr.broker_id=auth.uid() and pr.status='aceita'))))
 then raise exception 'Cliente, imóvel ou valor não autorizados' using errcode='42501';end if;
 if tg_op='INSERT' then new.recorded_by:=auth.uid();new.revision:=1;
 else
 if new.broker_id is distinct from old.broker_id or new.recorded_by is distinct from old.recorded_by then raise exception 'Autoria permanente' using errcode='42501';end if;
 new.revision:=old.revision+1;
 end if;
 return new;
end $$;
create trigger crm_validate_sale before insert or update on public.sales for each row execute function public.crm_guard_own_sale();
create function crm_private.reset_sale_confirmation() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.sale_confirmations(sale_id,revision,status) values(new.id,new.revision,'pending')
 on conflict(sale_id) do update set revision=excluded.revision,status='pending',reviewed_by=null,reviewed_at=null,reason=null;
 return new;
end $$;
revoke all on function crm_private.reset_sale_confirmation() from public,anon,authenticated;
create trigger crm_sale_review_pending after insert or update on public.sales for each row execute function crm_private.reset_sale_confirmation();
create function public.crm_sale_review_queue() returns table(sale_id bigint,broker_id uuid,value numeric,sale_date date,revision integer,status text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_manage_operations() then raise exception 'Acesso negado' using errcode='42501';end if;
 return query select s.id,s.broker_id,s.value,s.date,s.revision,coalesce(c.status,'pending')
 from public.sales s left join public.sale_confirmations c on c.sale_id=s.id order by s.id desc limit 200;
end $$;
create function public.crm_review_sale(target_sale bigint,expected_revision integer,decision text,review_reason text) returns boolean
language plpgsql security definer set search_path=public as $$
declare s public.sales;
begin
 if not public.can_manage_operations() then raise exception 'Acesso negado' using errcode='42501';end if;
 if decision not in ('confirmed','rejected') or length(trim(coalesce(review_reason,''))) not between 1 and 500 then raise exception 'Decisão ou motivo inválido' using errcode='22023';end if;
 select * into s from public.sales where id=target_sale for update;
 if not found or s.broker_id=auth.uid() then raise exception 'Revisão não autorizada' using errcode='42501';end if;
 if s.revision<>expected_revision then raise exception 'Venda alterada, atualize a revisão' using errcode='40001';end if;
 insert into public.sale_confirmations(sale_id,revision,status,reviewed_by,reviewed_at,reason)
 values(s.id,s.revision,decision,auth.uid(),now(),trim(review_reason))
 on conflict(sale_id) do update set revision=excluded.revision,status=excluded.status,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,reason=excluded.reason;
 insert into public.audit_logs(actor_id,entity,entity_id,action,after_data) values(auth.uid(),'sale_confirmations',s.id::text,decision,jsonb_build_object('revision',s.revision));
 return true;
end $$;
revoke all on function public.crm_sale_review_queue(),public.crm_review_sale(bigint,integer,text,text) from public,anon;
grant execute on function public.crm_sale_review_queue(),public.crm_review_sale(bigint,integer,text,text) to authenticated;
commit;

