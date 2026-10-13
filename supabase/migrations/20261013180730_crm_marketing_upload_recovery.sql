-- New corrective migration. The 20261009174757 migration is already installed.
begin;
alter table public.asset_versions drop constraint asset_versions_storage_path_check;
alter table public.asset_versions add constraint asset_versions_storage_path_check check(storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](webp|jpg|jpeg|png|pdf|mp4)$');
alter policy marketing_storage_upload on storage.objects with check(bucket_id='crm-marketing' and public.can_manage_commercial() and split_part(name,'/',1)=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](webp|jpg|jpeg|png|pdf|mp4)$');
-- Manual send confirmation is distinct from link creation, and idempotent.
create function public.crm_confirm_presentation_share(target_share bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare s public.marketing_shares; inserted_id bigint;
begin
 if not public.can_manage_commercial() then raise exception using errcode='42501',message='Sessão comercial necessária.';end if;
 select * into s from public.marketing_shares where id=target_share and(owner_id=auth.uid() or public.can_manage_operations());
 if s.id is null then raise exception using errcode='42501',message='Apresentação não autorizada.';end if;
 if s.lead_id is not null and not exists(select 1 from public.leads l where l.id=s.lead_id and(l.broker_id=auth.uid() or public.can_manage_operations())) then raise exception using errcode='42501',message='Lead não autorizado.';end if;
 insert into public.crm_event_log(owner_id,event_type,entity_id,idempotency_key) values(auth.uid(),'presentation_shared',s.id,'share-confirmed:'||s.id) on conflict(idempotency_key) do nothing returning id into inserted_id;
 if inserted_id is not null and s.lead_id is not null then insert into public.lead_activities(lead_id,user_id,type,description) values(s.lead_id,auth.uid(),'note','Envio confirmado pelo corretor: '||s.title||' · canal '||s.channel||' · link /apresentacoes/'||s.token::text);end if;
 return true;
end $$;
revoke all on function public.crm_confirm_presentation_share(bigint) from public,anon;
grant execute on function public.crm_confirm_presentation_share(bigint) to authenticated;
create or replace function public.crm_public_presentation(target_token uuid) returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('title',s.title,'message',s.message,'expires_at',s.expires_at,'broker',(select jsonb_build_object('name',b.name,'phone',b.phone,'creci',b.creci) from public.brokers b where b.id=s.owner_id and b.active),'properties',(select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'property_code',p.property_code,'slug',p.slug,'description',p.description,'location',p.location,'price',p.price,'bedrooms',p.bedrooms,'bathrooms',p.bathrooms,'garage',p.garage,'area',p.area,'images',p.images,'videos',p.videos,'status',p.status)) from public.properties p where p.id=any(s.property_ids)),'assets',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'category',a.category,'mime_type',v.mime_type,'size_bytes',v.size_bytes,'path',v.storage_path)) from public.marketing_assets a join public.asset_versions v on v.id=a.current_version_id where a.id=any(s.asset_ids) and crm_private.public_asset(v.storage_path) and exists(select 1 from public.asset_relations r where r.asset_id=a.id and(r.property_id=any(s.property_ids) or exists(select 1 from public.development_units u where u.development_id=r.development_id and u.property_id=any(s.property_ids))))),'[]'::jsonb)) from public.marketing_shares s where s.id=crm_private.valid_share(target_token) $$;
alter policy marketing_storage_public on storage.objects using(bucket_id='crm-marketing' and storage.allow_any_operation(array['object.get_authenticated_info','object.get_authenticated']) and crm_private.public_asset(name));
notify pgrst,'reload schema';
commit;
