begin;
create or replace function public.crm_save_property_media(target_property_id bigint, image_urls text[], video_urls text[])
returns void language plpgsql security invoker set search_path=public as $$
begin
 if not public.can_manage_commercial() or not exists(
  select 1 from public.properties p where p.id=target_property_id and
  (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())) then
  raise exception 'Imovel nao encontrado ou sem permissao.' using errcode='42501';
 end if;
 if coalesce(cardinality(image_urls),0)>50 or coalesce(cardinality(video_urls),0)>20
 or exists(select 1 from unnest(coalesce(image_urls,'{}') || coalesce(video_urls,'{}')) u
   where u is null or u !~ '^https?://[^[:space:]]+$') then
  raise exception 'Midias invalidas.' using errcode='23514';
 end if;
 perform 1 from public.properties where id=target_property_id for update;
 delete from public.property_images where property_id=target_property_id and not (url=any(coalesce(image_urls,'{}')));
 update public.property_images i set sort_order=x.n-1,is_main=x.n=1
 from unnest(image_urls) with ordinality as x(u,n) where i.property_id=target_property_id and i.url=x.u;
 insert into public.property_images(property_id,url,sort_order,is_main)
 select target_property_id,u,n-1,n=1 from unnest(image_urls) with ordinality as x(u,n)
 where not exists(select 1 from public.property_images i where i.property_id=target_property_id and i.url=x.u);
 delete from public.property_videos where property_id=target_property_id;
 insert into public.property_videos(property_id,url,sort_order)
 select target_property_id,u,n-1 from unnest(video_urls) with ordinality as x(u,n);
 perform public.sync_property_media_arrays(target_property_id);
end $$;
revoke all on function public.crm_save_property_media(bigint,text[],text[]) from public,anon;
grant execute on function public.crm_save_property_media(bigint,text[],text[]) to authenticated;
commit;
