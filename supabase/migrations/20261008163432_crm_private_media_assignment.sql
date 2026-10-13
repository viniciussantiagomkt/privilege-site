begin;
alter policy "CRM private media read" on storage.objects using (bucket_id='crm-property-images' and (
(public.can_manage_commercial() and (public.can_manage_operations() or (storage.foldername(name))[1]=auth.uid()::text))
or exists(select 1 from public.property_images i join public.properties p on p.id=i.property_id
where right(i.url,length('/api/property-media/'||storage.objects.name))='/api/property-media/'||storage.objects.name
and ((p.publish_on_site and p.deleted_at is null and p.workflow_status in ('aprovado','publicado') and p.status in ('ativo','reservado','vendido','alugado'))
or (public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid()))))));
drop policy "CRM private media delete" on storage.objects;
create or replace function public.crm_validate_private_media_owner()
returns trigger language plpgsql security invoker set search_path=public as $$
declare object_path text;
begin
if position('/api/property-media/' in new.url)>0 then
object_path:=split_part(new.url,'/api/property-media/',2);
if object_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' or not public.can_manage_commercial()
or (not public.can_manage_operations() and split_part(object_path,'/',1)<>auth.uid()::text
and not exists(select 1 from public.property_images i where i.property_id=new.property_id and i.url=new.url))
or not exists(select 1 from storage.objects where bucket_id='crm-property-images' and name=object_path) then
raise exception 'Midia privada inexistente ou sem permissao.' using errcode='42501';
end if;
end if;
return new;
end $$;
commit;
