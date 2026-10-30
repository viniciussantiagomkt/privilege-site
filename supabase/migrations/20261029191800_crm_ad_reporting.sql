-- PROPOSED ONLY. No provisioning, credentials, schedule or live API calls.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.crm_ad_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 scope text not null check(scope in ('company','personal')),
 provider text not null check(provider in ('meta','google')),
 external_id text not null check(external_id ~ '^[0-9]{1,30}$'),
 name text not null check(length(trim(name)) between 1 and 160),
 status text not null default 'pending' check(status in ('pending','connected','error','reauthorize','revoked')),
 currency text check(currency ~ '^[A-Z]{3}$'),timezone text,
 last_success_at timestamptz,last_period_start date,last_period_end date,
 last_error text check(last_error in ('auth','rate_limit','unavailable','invalid_response','invalid_config','page_limit')),
 next_attempt_at timestamptz not null default now(),created_at timestamptz not null default now(),
 unique(provider,external_id)
);
-- One external account belongs to one explicit portfolio; no implicit sharing by editable IDs.
alter table public.crm_ad_accounts enable row level security;
create policy crm_ad_account_read on public.crm_ad_accounts for select to authenticated using(
 public.can_manage_commercial() and ((scope='company' and public.can_manage_operations()) or
 (scope='personal' and owner_id=auth.uid() and crm_private.eligible_broker(auth.uid())))
);
revoke all on public.crm_ad_accounts from public,anon,authenticated;
grant select on public.crm_ad_accounts to authenticated;
grant select,insert,update on public.crm_ad_accounts to service_role;
create table public.crm_ad_campaigns (
 account_id uuid not null references public.crm_ad_accounts(id),
 external_id text not null check(external_id ~ '^[0-9]{1,30}$'),
 name text not null check(length(name) between 1 and 1000),
 remote_status text not null check(length(remote_status) between 1 and 80),
 active boolean not null,observed_at timestamptz not null default now(),primary key(account_id,external_id)
);
alter table public.crm_ad_campaigns enable row level security;
create policy crm_ad_campaign_read on public.crm_ad_campaigns for select to authenticated using(
 exists(select 1 from public.crm_ad_accounts a where a.id=account_id)
);
revoke all on public.crm_ad_campaigns from public,anon,authenticated;
grant select on public.crm_ad_campaigns to authenticated;
create table public.crm_ad_daily (
 account_id uuid not null,campaign_id text not null,day date not null,
 spend_micros numeric(36,0) not null check(spend_micros>=0),
 impressions numeric(30,0) not null check(impressions>=0),clicks numeric(30,0) not null check(clicks>=0),
 platform_conversions numeric(36,12) check(platform_conversions>=0),
 actions jsonb not null default '[]' check(jsonb_typeof(actions)='array'),
 primary key(account_id,campaign_id,day),foreign key(account_id,campaign_id) references public.crm_ad_campaigns(account_id,external_id)
);
create index crm_ad_daily_period on public.crm_ad_daily(account_id,day);
alter table public.crm_ad_daily enable row level security;
create policy crm_ad_daily_read on public.crm_ad_daily for select to authenticated using(
 exists(select 1 from public.crm_ad_accounts a where a.id=account_id)
);
revoke all on public.crm_ad_daily from public,anon,authenticated;
grant select on public.crm_ad_daily to authenticated;
create table crm_private.ad_sync_leases (
 account_id uuid primary key references public.crm_ad_accounts(id),lease_id uuid,lease_until timestamptz,
 failures int not null default 0 check(failures between 0 and 10)
);
alter table crm_private.ad_sync_leases enable row level security;
revoke all on crm_private.ad_sync_leases from public,anon,authenticated;

-- Worker-only RPCs: authenticated/anonymous roles never receive EXECUTE.
create function public.crm_claim_ad_sync(target_account uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.crm_ad_accounts; l crm_private.ad_sync_leases; token uuid;
begin
 select * into a from public.crm_ad_accounts where id=target_account for update;
 if not found or a.status not in ('connected','error') or a.next_attempt_at>clock_timestamp() then return null;end if;
 if a.scope='personal' and not crm_private.eligible_broker(a.owner_id) then return null;end if;
 insert into crm_private.ad_sync_leases(account_id) values(a.id) on conflict do nothing;
 select * into l from crm_private.ad_sync_leases where account_id=a.id for update;
 if l.lease_until>clock_timestamp() then return null;end if;
 token:=gen_random_uuid();
 update crm_private.ad_sync_leases set lease_id=token,lease_until=clock_timestamp()+interval '4 minutes' where account_id=a.id;
 return jsonb_build_object('lease',token,'account_id',a.id,'provider',a.provider,'external_id',a.external_id,'timezone',a.timezone);
end $$;

create function public.crm_commit_ad_report(target_account uuid,lease uuid,report jsonb,period_start date,period_end date) returns void
language plpgsql security definer set search_path='' as $$
declare a public.crm_ad_accounts; l crm_private.ad_sync_leases; c jsonb; d jsonb; x jsonb;
begin
 select * into a from public.crm_ad_accounts where id=target_account for update;
 select * into l from crm_private.ad_sync_leases where account_id=target_account for update;
 if a.id is null or a.status not in ('connected','error') or lease is null or l.lease_id is distinct from lease or l.lease_until<=clock_timestamp()
 or (a.scope='personal' and not crm_private.eligible_broker(a.owner_id)) then raise exception 'Invalid sync lease' using errcode='42501';end if;
 if period_start is null or period_end is null or period_end<period_start or period_end-period_start>30
 or report->>'accountId' is distinct from a.external_id or report->>'provider' is distinct from a.provider
 or report->>'currency' !~ '^[A-Z]{3}$' or report->>'currency' is null
 or not exists(select 1 from pg_catalog.pg_timezone_names where name=report->>'timezone')
 or jsonb_typeof(report->'campaigns') is distinct from 'array' or jsonb_typeof(report->'daily') is distinct from 'array'
 or jsonb_array_length(report->'campaigns')>5000 or jsonb_array_length(report->'daily')>100000 then raise exception 'Invalid report' using errcode='22023';end if;
 if (a.currency is not null and a.currency is distinct from report->>'currency') or
 (a.timezone is not null and a.timezone is distinct from report->>'timezone') then raise exception 'Account metadata changed' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(report->'campaigns') e group by e->>'externalId' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(report->'daily') e group by e->>'campaignId',e->>'day' having count(*)>1) then raise exception 'Duplicate report rows';end if;
 for c in select value from jsonb_array_elements(report->'campaigns') loop
  if jsonb_typeof(c) is distinct from 'object' or c->>'externalId' !~ '^[0-9]{1,30}$' or c->>'externalId' is null
  or jsonb_typeof(c->'active') is distinct from 'boolean' then raise exception 'Invalid campaign';end if;
  insert into public.crm_ad_campaigns(account_id,external_id,name,remote_status,active)
  values(a.id,c->>'externalId',c->>'name',c->>'status',(c->>'active')::boolean)
  on conflict(account_id,external_id) do update set name=excluded.name,remote_status=excluded.remote_status,active=excluded.active,observed_at=clock_timestamp();
 end loop;
 update public.crm_ad_campaigns set active=false,remote_status='NOT_RETURNED',observed_at=clock_timestamp()
 where account_id=a.id and external_id not in(select e->>'externalId' from jsonb_array_elements(report->'campaigns') e);
 -- A complete period replaces previous observations atomically, including omitted zero rows.
 delete from public.crm_ad_daily where account_id=a.id and day between period_start and period_end;
 for d in select value from jsonb_array_elements(report->'daily') loop
  if jsonb_typeof(d) is distinct from 'object' or d->>'day' !~ '^\d{4}-\d{2}-\d{2}$' or d->>'day' is null
  or (d->>'day')::date not between period_start and period_end
  or not exists(select 1 from jsonb_array_elements(report->'campaigns') e where e->>'externalId'=d->>'campaignId')
  or d->>'spendMicros' !~ '^[0-9]{1,36}$' or d->>'spendMicros' is null
  or d->>'impressions' !~ '^[0-9]{1,30}$' or d->>'impressions' is null
  or d->>'clicks' !~ '^[0-9]{1,30}$' or d->>'clicks' is null
  or jsonb_typeof(d->'actions') is distinct from 'array'
  or (a.provider='meta' and d->>'conversions' is not null)
  or (a.provider='google' and (d->>'conversions' is null or d->>'conversions' !~ '^[0-9]{1,24}(\.[0-9]{1,12})?$' or jsonb_array_length(d->'actions')<>0)) then raise exception 'Invalid metric';end if;
  for x in select value from jsonb_array_elements(d->'actions') loop
   if jsonb_typeof(x) is distinct from 'object' or length(x->>'type') not between 1 and 1000 or x->>'type' is null
   or x->>'value' !~ '^[0-9]{1,24}(\.[0-9]{1,12})?$' or x->>'value' is null then raise exception 'Invalid action';end if;
  end loop;
  insert into public.crm_ad_daily values(a.id,d->>'campaignId',(d->>'day')::date,(d->>'spendMicros')::numeric,(d->>'impressions')::numeric,(d->>'clicks')::numeric,(d->>'conversions')::numeric,d->'actions');
 end loop;
 update public.crm_ad_accounts set status='connected',currency=report->>'currency',timezone=report->>'timezone',last_success_at=clock_timestamp(),last_period_start=period_start,last_period_end=period_end,last_error=null,next_attempt_at=clock_timestamp()+interval '30 minutes' where id=a.id;
 update crm_private.ad_sync_leases set lease_id=null,lease_until=null,failures=0 where account_id=a.id;
end $$;

create function public.crm_fail_ad_sync(target_account uuid,lease uuid,error_code text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.crm_ad_accounts; l crm_private.ad_sync_leases; n int;
begin
 select * into a from public.crm_ad_accounts where id=target_account for update;
 select * into l from crm_private.ad_sync_leases where account_id=target_account for update;
 if lease is null or l.lease_id is distinct from lease or a.status not in ('connected','error') then return;end if;
 if error_code not in ('auth','rate_limit','unavailable','invalid_response','invalid_config','page_limit') or error_code is null then error_code:='unavailable';end if;
 n:=least(l.failures+1,10);
 update crm_private.ad_sync_leases set lease_id=null,lease_until=null,failures=n where account_id=a.id;
 update public.crm_ad_accounts set status=case when error_code='auth' then 'reauthorize' else 'error' end,last_error=error_code,
 next_attempt_at=clock_timestamp()+make_interval(secs=>least(3600,60*power(2,n-1))::int+(random()*30)::int) where id=a.id;
end $$;

create function public.crm_disconnect_ad_account(target_account uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.crm_ad_accounts;
begin
 if auth.uid() is null or not coalesce(public.can_manage_commercial(),false) then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into a from public.crm_ad_accounts where id=target_account for update;
 if not found or not ((a.scope='company' and public.can_manage_operations()) or (a.scope='personal' and a.owner_id=auth.uid())) then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.crm_ad_accounts set status='revoked',last_error=null where id=a.id;
 update crm_private.ad_sync_leases set lease_id=null,lease_until=null where account_id=a.id;
 -- Suspends local polling; provider consent revocation is a separate operation.
end $$;

create function public.crm_ad_report(target_account uuid,period_start date,period_end date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.crm_ad_accounts; rows jsonb;
begin
 if auth.uid() is null or period_start is null or period_end is null or period_end<period_start or period_end-period_start>365 then raise exception 'Período inválido' using errcode='22023';end if;
 select * into a from public.crm_ad_accounts where id=target_account;
 if not found then raise exception 'Conta não autorizada' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.name,r.external_id),'[]') into rows from (
 select c.external_id,c.name,c.remote_status,c.active,c.observed_at,count(d.day)::int as days_with_data,
 coalesce(sum(d.spend_micros),0)::text as spend_micros,coalesce(sum(d.impressions),0)::text as impressions,coalesce(sum(d.clicks),0)::text as clicks,
 case when a.provider='google' then sum(d.platform_conversions)::text else null end as platform_conversions,
 (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (
  select e->>'type' as type,sum((e->>'value')::numeric)::text as value
  from public.crm_ad_daily dd cross join lateral jsonb_array_elements(dd.actions) e
  where dd.account_id=c.account_id and dd.campaign_id=c.external_id and dd.day between period_start and period_end
  group by e->>'type'
 ) t) as platform_actions
 from public.crm_ad_campaigns c left join public.crm_ad_daily d on d.account_id=c.account_id and d.campaign_id=c.external_id and d.day between period_start and period_end
 where c.account_id=a.id group by c.account_id,c.external_id,c.name,c.remote_status,c.active,c.observed_at
 ) r;
 return jsonb_build_object('account',to_jsonb(a),'campaigns',rows,'period_start',period_start,'period_end',period_end,
 'complete_period',coalesce(period_start>=a.last_period_start and period_end<=a.last_period_end,false));
end $$;
revoke all on function public.crm_claim_ad_sync(uuid),public.crm_commit_ad_report(uuid,uuid,jsonb,date,date),public.crm_fail_ad_sync(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.crm_claim_ad_sync(uuid),public.crm_commit_ad_report(uuid,uuid,jsonb,date,date),public.crm_fail_ad_sync(uuid,uuid,text) to service_role;
revoke all on function public.crm_disconnect_ad_account(uuid),public.crm_ad_report(uuid,date,date) from public,anon;
grant execute on function public.crm_disconnect_ad_account(uuid),public.crm_ad_report(uuid,date,date) to authenticated;
commit;
