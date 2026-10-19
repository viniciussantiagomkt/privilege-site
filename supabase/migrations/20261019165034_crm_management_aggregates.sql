-- PROPOSED ONLY. Bounded aggregate DTO, no personal data or commercial record IDs.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create function public.crm_management_metrics(period_days integer default 180) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare since_at timestamptz;result jsonb;
begin
 if not public.can_manage_operations() then raise exception 'Acesso negado' using errcode='42501';end if;
 if period_days not in (30,90,180,365) then raise exception 'Período permitido: 30, 90, 180 ou 365 dias' using errcode='22023';end if;
 since_at:=now()-make_interval(days=>period_days);
 select jsonb_build_object(
 'period_days',period_days,
 'leads',(select count(*) from public.leads where deleted_at is null and created_at>=since_at),
 'active_leads',(select count(*) from public.leads where deleted_at is null and created_at>=since_at and status not in ('convertido','perdido')),
 'queue',(select count(*) from public.leads where deleted_at is null and origin_type='company' and broker_id is null),
 'converted',(select count(*) from public.leads where deleted_at is null and created_at>=since_at and status='convertido'),
 'sales',(select count(*) from public.sales where date>=since_at::date),
 'volume',(select coalesce(sum(value),0) from public.sales where date>=since_at::date),
 'brokers',(select coalesce(jsonb_agg(jsonb_build_object('broker_id',b.id,
 'leads',(select count(*) from public.leads l where l.broker_id=b.id and l.deleted_at is null and l.created_at>=since_at),
 'converted',(select count(*) from public.leads l where l.broker_id=b.id and l.deleted_at is null and l.created_at>=since_at and l.status='convertido'),
 'sales',(select count(*) from public.sales s where s.broker_id=b.id and s.date>=since_at::date),
 'volume',(select coalesce(sum(s.value),0) from public.sales s where s.broker_id=b.id and s.date>=since_at::date)
 )),'[]'::jsonb) from public.brokers b where crm_private.eligible_broker(b.id))
 ) into result;
 return result;
end $$;
revoke all on function public.crm_management_metrics(integer) from public,anon;
grant execute on function public.crm_management_metrics(integer) to authenticated;
commit;

