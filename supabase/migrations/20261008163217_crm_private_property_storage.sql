begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('crm-property-images','crm-property-images',false,10485760,array['image/webp'])
on conflict (id) do nothing;
create policy "CRM private media upload" on storage.objects for insert to authenticated
with check (bucket_id='crm-property-images' and public.can_manage_commercial()
 and (storage.foldername(name))[1]=auth.uid()::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy "CRM private media read" on storage.objects for select to anon,authenticated
using (bucket_id='crm-property-images' and (
 (public.can_manage_commercial() and (public.can_manage_operations() or (storage.foldername(name))[1]=auth.uid()::text))
 or exists(select 1 from public.property_images i join public.properties p on p.id=i.property_id
 where right(i.url,length('/api/property-media/'||storage.objects.name))='/api/property-media/'||storage.objects.name
 and p.publish_on_site and p.deleted_at is null and p.workflow_status in ('aprovado','publicado')
 and p.status in ('ativo','reservado','vendido','alugado'))));
create policy "CRM private media delete" on storage.objects for delete to authenticated
using (bucket_id='crm-property-images' and public.can_manage_commercial()
 and (public.can_manage_operations() or (storage.foldername(name))[1]=auth.uid()::text)
 and not exists(select 1 from public.property_images i
 where right(i.url,length('/api/property-media/'||storage.objects.name))='/api/property-media/'||storage.objects.name));
create or replace function public.crm_validate_private_media_owner()
returns trigger language plpgsql security invoker set search_path=public as $$
declare object_path text;
begin
 if position('/api/property-media/' in new.url)>0 then
  object_path:=split_part(new.url,'/api/property-media/',2);
  if object_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  or not public.can_manage_commercial()
  or (not public.can_manage_operations() and split_part(object_path,'/',1)<>auth.uid()::text)
  or not exists(select 1 from storage.objects where bucket_id='crm-property-images' and name=object_path) then
   raise exception 'Midia privada inexistente ou sem permissao.' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.crm_validate_private_media_owner() from public,anon;
create trigger crm_private_media_owner before insert or update on public.property_images
for each row execute function public.crm_validate_private_media_owner();
commit;
