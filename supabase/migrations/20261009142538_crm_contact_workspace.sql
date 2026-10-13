begin;
alter table public.clients add column if not exists contact_type text not null default 'cliente' check(contact_type in ('cliente','proprietario','ambos'));
create table if not exists public.crm_contact_links (
id bigint generated always as identity primary key,
contact_id bigint not null references public.clients(id),
lead_id bigint references public.leads(id),
property_id bigint references public.properties(id),
relation text not null check(relation in ('interesse','proprietario','atendimento')),
created_at timestamptz not null default now(),
check((lead_id is not null)::integer+(property_id is not null)::integer=1)
);
alter table public.crm_contact_links enable row level security;
grant select,insert,update,delete on public.crm_contact_links to authenticated;
grant usage,select on sequence public.crm_contact_links_id_seq to authenticated;
create policy "CRM contact relationships" on public.crm_contact_links for all to authenticated
using (public.can_manage_commercial()
and exists(select 1 from public.clients c where c.id=contact_id and c.deleted_at is null)
and ((lead_id is not null and exists(select 1 from public.leads l where l.id=lead_id))
or (property_id is not null and exists(select 1 from public.properties p where p.id=property_id
and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())))))
with check (public.can_manage_commercial()
and exists(select 1 from public.clients c where c.id=contact_id and c.deleted_at is null)
and ((lead_id is not null and exists(select 1 from public.leads l where l.id=lead_id))
or (property_id is not null and exists(select 1 from public.properties p where p.id=property_id
and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())))));
create index if not exists crm_contact_links_contact_idx on public.crm_contact_links(contact_id);
create index if not exists crm_contact_links_lead_idx on public.crm_contact_links(lead_id);
create index if not exists crm_contact_links_property_idx on public.crm_contact_links(property_id);
commit;
