-- PROPOSED ONLY. Authenticated CRM workflows; no provider integration or public ingestion.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.crm_campaigns (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id),
 scope text not null check(scope in ('company','personal')),
 name text not null check(length(trim(name)) between 2 and 160),
 platform text not null check(platform in ('meta','google','instagram','organic','other')),
 objective text not null check(objective in ('leads','whatsapp','traffic')),
 entry_channel text not null check(entry_channel in ('native_form','whatsapp','site')),
 status text not null default 'draft' check(status in ('draft','active','paused','archived')),
 property_id bigint references public.properties(id),
 development_id bigint references public.developments(id),
 routing text not null check(routing in ('institutional','broker')),
 destination_broker_id uuid references public.brokers(id),
 external_account_id text check(length(external_account_id)<=160),
 external_campaign_id text check(length(external_campaign_id)<=160),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(property_id is null or development_id is null),
 check((scope='personal' and routing='broker' and destination_broker_id=owner_id)
   or (scope='company' and ((routing='institutional' and destination_broker_id is null) or (routing='broker' and destination_broker_id is not null))))
);
create index crm_campaigns_owner_scope on public.crm_campaigns(owner_id,scope,id);
alter table public.crm_campaigns enable row level security;
create policy crm_campaign_read on public.crm_campaigns for select to authenticated using(
 public.can_manage_commercial() and ((scope='company' and public.can_manage_operations()) or (scope='personal' and owner_id=auth.uid()))
);
revoke all on public.crm_campaigns from public,anon,authenticated;
grant select on public.crm_campaigns to authenticated;

create table public.crm_lead_attributions (
 id bigint generated always as identity primary key,
 lead_id bigint not null references public.leads(id),
 campaign_id bigint not null references public.crm_campaigns(id),
 campaign_name text not null,
 platform text not null,
 provenance text not null default 'manual' check(provenance='manual'),
 details jsonb not null default '{}' check(jsonb_typeof(details)='object'),
 routing_result text not null check(routing_result in ('institutional_queue','assigned','personal','fallback_queue')),
 created_at timestamptz not null default now(),
 unique(lead_id,campaign_id)
);
revoke all on sequence public.crm_campaigns_id_seq,public.crm_lead_attributions_id_seq from public,anon,authenticated;
create index crm_attribution_lead on public.crm_lead_attributions(lead_id,id);
alter table public.crm_lead_attributions enable row level security;
create policy crm_attribution_read on public.crm_lead_attributions for select to authenticated
 using(public.can_manage_commercial() and crm_private.lead_readable(lead_id));
revoke all on public.crm_lead_attributions from public,anon,authenticated;
grant select on public.crm_lead_attributions to authenticated;

-- No contact payload is stored in this receipt. Manual action IDs are scoped to the actor,
-- not advertised as verified provider IDs. Provider adapters are a later authenticated boundary.
create table crm_private.campaign_receipts (
 actor_id uuid not null references auth.users(id),
 event_id uuid not null,
 campaign_id bigint not null references public.crm_campaigns(id),
 payload_fingerprint text not null,
 lead_id bigint references public.leads(id),
 created_at timestamptz not null default now(),
 primary key(actor_id,event_id)
);
alter table crm_private.campaign_receipts enable row level security;
revoke all on crm_private.campaign_receipts from public,anon,authenticated;

create function public.crm_save_campaign(target_campaign bigint, payload jsonb) returns bigint
language plpgsql security definer set search_path=public as $$
declare c public.crm_campaigns; result bigint; campaign_scope text; actor uuid:=auth.uid();
 destination uuid; related_property bigint; related_development bigint; route text;
begin
 if actor is null or not coalesce(public.can_manage_commercial(),false) then raise exception 'Acesso negado' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload) k where k not in
 ('name','scope','platform','objective','entry_channel','status','property_id','development_id','routing','destination_broker_id','external_account_id','external_campaign_id'))
 or exists(select 1 from jsonb_each(payload) e where jsonb_typeof(e.value) not in ('string','number','null')) then raise exception 'Campanha inválida' using errcode='22023';end if;
 campaign_scope:=coalesce(nullif(payload->>'scope',''),'personal');
 if campaign_scope not in ('company','personal') or (campaign_scope='company' and not coalesce(public.can_manage_operations(),false))
 or (campaign_scope='personal' and not crm_private.eligible_broker(actor)) then raise exception 'Campanha não autorizada' using errcode='42501';end if;
 if target_campaign is not null then
  select * into c from public.crm_campaigns where id=target_campaign and scope=campaign_scope and
  ((scope='company' and public.can_manage_operations()) or (scope='personal' and owner_id=actor)) for update;
  if not found then raise exception 'Campanha não autorizada' using errcode='42501';end if;
 end if;
 related_property:=nullif(payload->>'property_id','')::bigint;
 related_development:=nullif(payload->>'development_id','')::bigint;
 if related_property is not null and not exists(select 1 from public.properties p where p.id=related_property and p.deleted_at is null and
  ((campaign_scope='company' and public.can_manage_operations()) or p.owner_id=actor or p.broker_id=actor)) then raise exception 'Imóvel não autorizado' using errcode='42501';end if;
 if related_development is not null and not exists(select 1 from public.developments d where d.id=related_development) then raise exception 'Empreendimento não encontrado' using errcode='22023';end if;
 route:=case when campaign_scope='personal' then 'broker' else payload->>'routing' end;
 destination:=case when campaign_scope='personal' then actor when route='institutional' then null else nullif(payload->>'destination_broker_id','')::uuid end;
 if route not in ('broker','institutional') or (route='broker' and (destination is null or not crm_private.eligible_broker(destination))) then raise exception 'Responsável precisa ser corretor ativo' using errcode='22023';end if;
 if target_campaign is null then
  insert into public.crm_campaigns(owner_id,scope,name,platform,objective,entry_channel,status,property_id,development_id,routing,destination_broker_id,external_account_id,external_campaign_id)
  values(actor,campaign_scope,trim(payload->>'name'),payload->>'platform',payload->>'objective',payload->>'entry_channel',coalesce(payload->>'status','draft'),related_property,related_development,route,destination,nullif(trim(payload->>'external_account_id'),''),nullif(trim(payload->>'external_campaign_id'),'')) returning id into result;
 else
  update public.crm_campaigns set name=trim(payload->>'name'),platform=payload->>'platform',objective=payload->>'objective',entry_channel=payload->>'entry_channel',status=payload->>'status',property_id=related_property,development_id=related_development,routing=route,destination_broker_id=destination,external_account_id=nullif(trim(payload->>'external_account_id'),''),external_campaign_id=nullif(trim(payload->>'external_campaign_id'),''),updated_at=now()
  where id=c.id returning id into result;
 end if;
 insert into public.audit_logs(actor_id,entity,entity_id,action,after_data) values(actor,'crm_campaigns',result::text,case when target_campaign is null then 'created' else 'updated' end,jsonb_build_object('scope',campaign_scope));
 return result;
end $$;
revoke all on function public.crm_save_campaign(bigint,jsonb) from public,anon;
grant execute on function public.crm_save_campaign(bigint,jsonb) to authenticated;

create function public.crm_capture_campaign_lead(target_campaign bigint, capture_id uuid, contact_name text, contact_phone text, attribution jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.crm_campaigns; receipt crm_private.campaign_receipts; actor uuid:=auth.uid();
 normalized_name text:=trim(contact_name); normalized_phone text:=regexp_replace(contact_phone,'[^0-9]','','g');
 details jsonb; fingerprint text; result bigint; route_result text; assigned uuid;
begin
 if actor is null or not coalesce(public.can_manage_commercial(),false) then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into c from public.crm_campaigns where id=target_campaign and status='active' and
 ((scope='company' and public.can_manage_operations()) or (scope='personal' and owner_id=actor and crm_private.eligible_broker(actor))) for share;
 if not found then raise exception 'Campanha indisponível ou não autorizada' using errcode='42501';end if;
 if c.property_id is not null and not exists(select 1 from public.properties p where p.id=c.property_id and p.deleted_at is null and
 ((c.scope='company' and public.can_manage_operations()) or p.owner_id=actor or p.broker_id=actor)) then raise exception 'Imóvel da campanha não está disponível' using errcode='42501';end if;
 if capture_id is null or normalized_name is null or length(normalized_name) not between 2 and 160 or normalized_phone is null or length(normalized_phone) not between 10 and 15
 or jsonb_typeof(attribution) is distinct from 'object' then raise exception 'Dados do contato inválidos' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(attribution) e where e.key not in ('utm_source','utm_medium','utm_campaign','utm_content','utm_term','adset_id','ad_id','keyword','landing_path')
  or jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>case when e.key='landing_path' then 1000 else 256 end
  or (e.value#>>'{}') ~ '[[:cntrl:]]') then raise exception 'Atribuição inválida' using errcode='22023';end if;
 select coalesce(jsonb_object_agg(e.key,trim(e.value#>>'{}')),'{}'::jsonb) into details from jsonb_each(attribution) e where trim(e.value#>>'{}')<>'';
 if details ? 'landing_path' and ((details->>'landing_path') !~ '^/[^?#]*$' or (details->>'landing_path') like '//%') then raise exception 'Informe somente o caminho da página, sem parâmetros' using errcode='22023';end if;
 -- Fingerprint detects accidental payload changes on retries; it is not an authorization mechanism.
 fingerprint:=md5(jsonb_build_object('campaign',c.id,'name',normalized_name,'phone',normalized_phone,'details',details)::text);
 insert into crm_private.campaign_receipts(actor_id,event_id,campaign_id,payload_fingerprint) values(actor,capture_id,c.id,fingerprint) on conflict do nothing;
 select * into receipt from crm_private.campaign_receipts where actor_id=actor and event_id=capture_id for update;
 if receipt.campaign_id<>c.id or receipt.payload_fingerprint<>fingerprint then raise exception 'Esta entrada já foi usada com outros dados' using errcode='22023';end if;
 if receipt.lead_id is not null then return jsonb_build_object('lead_id',receipt.lead_id,'routing_result',(select routing_result from public.crm_lead_attributions where lead_id=receipt.lead_id and campaign_id=c.id),'replayed',true);end if;
 assigned:=case when c.scope='personal' then actor else null end;
 insert into public.leads(name,phone,source,origin_detail,origin_type,broker_id,status,property_id,property_title,page_path)
 values(normalized_name,normalized_phone,c.platform,c.name,case when c.scope='personal' then 'personal' else 'company' end,assigned,'novo',c.property_id,(select title from public.properties where id=c.property_id),details->>'landing_path') returning id into result;
 route_result:=case when c.scope='personal' then 'personal' else 'institutional_queue' end;
 if c.scope='company' and c.routing='broker' then
  if crm_private.eligible_broker(c.destination_broker_id) then
   perform public.crm_assign_lead(result,c.destination_broker_id,'Campanha: '||c.name);route_result:='assigned';
  else route_result:='fallback_queue';end if;
 end if;
 insert into public.crm_lead_attributions(lead_id,campaign_id,campaign_name,platform,details,routing_result)
 values(result,c.id,c.name,c.platform,details,route_result);
 update crm_private.campaign_receipts set lead_id=result where actor_id=actor and event_id=capture_id;
 return jsonb_build_object('lead_id',result,'routing_result',route_result,'replayed',false);
end $$;
revoke all on function public.crm_capture_campaign_lead(bigint,uuid,text,text,jsonb) from public,anon;
grant execute on function public.crm_capture_campaign_lead(bigint,uuid,text,text,jsonb) to authenticated;
commit;
