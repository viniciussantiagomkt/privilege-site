begin;
create policy "CRM visits related client boundary" on public.visits as restrictive for all to authenticated
using (public.can_manage_operations() or client_id is null or exists(select 1 from public.clients c where c.id=visits.client_id))
with check (public.can_manage_operations() or client_id is null or exists(select 1 from public.clients c where c.id=visits.client_id));
create policy "CRM proposals related client boundary" on public.proposals as restrictive for all to authenticated
using (public.can_manage_operations() or client_id is null or exists(select 1 from public.clients c where c.id=proposals.client_id))
with check (public.can_manage_operations() or client_id is null or exists(select 1 from public.clients c where c.id=proposals.client_id));
create policy "CRM property_images visibility boundary" on public.property_images as restrictive for select to anon,authenticated
using (exists(select 1 from public.properties p where p.id=property_images.property_id));
create policy "CRM property_images insert boundary" on public.property_images as restrictive for insert to authenticated  with check (exists(select 1 from public.properties p where p.id=property_images.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())));
create policy "CRM property_images update boundary" on public.property_images as restrictive for update to authenticated using (exists(select 1 from public.properties p where p.id=property_images.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid()))) with check (exists(select 1 from public.properties p where p.id=property_images.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())));
create policy "CRM property_images delete boundary" on public.property_images as restrictive for delete to authenticated using (exists(select 1 from public.properties p where p.id=property_images.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid()))) ;
create policy "CRM property_videos visibility boundary" on public.property_videos as restrictive for select to anon,authenticated
using (exists(select 1 from public.properties p where p.id=property_videos.property_id));
create policy "CRM property_videos insert boundary" on public.property_videos as restrictive for insert to authenticated  with check (exists(select 1 from public.properties p where p.id=property_videos.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())));
create policy "CRM property_videos update boundary" on public.property_videos as restrictive for update to authenticated using (exists(select 1 from public.properties p where p.id=property_videos.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid()))) with check (exists(select 1 from public.properties p where p.id=property_videos.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())));
create policy "CRM property_videos delete boundary" on public.property_videos as restrictive for delete to authenticated using (exists(select 1 from public.properties p where p.id=property_videos.property_id and public.can_manage_commercial() and (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid()))) ;
CREATE OR REPLACE FUNCTION public.increment_property_view(target_property_id bigint, source_value text DEFAULT NULL::text, page_path_value text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin

  if not exists(select 1 from public.properties p where p.id=target_property_id
    and p.publish_on_site and p.deleted_at is null and p.workflow_status in ('aprovado','publicado')
    and p.status in ('ativo','reservado','vendido','alugado')) then
    raise exception 'Imovel nao encontrado ou sem permissao.' using errcode='42501';
  end if;

  insert into public.property_views (property_id, user_id, source, page_path)
  values (target_property_id, auth.uid(), source_value, page_path_value);

  update public.properties
  set view_count = coalesce(view_count, 0) + 1
  where id = target_property_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.sync_property_media_arrays(target_property_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin

  if auth.uid() is null or not public.can_manage_commercial() or not exists(
    select 1 from public.properties p where p.id=target_property_id and
    (public.can_manage_operations() or p.owner_id=auth.uid() or p.broker_id=auth.uid())) then
    raise exception 'Imovel nao encontrado ou sem permissao.' using errcode='42501';
  end if;

  update public.properties p
  set
    images = coalesce((select array_agg(pi.url order by pi.sort_order, pi.id) from public.property_images pi where pi.property_id = target_property_id), '{}'::text[]),
    videos = coalesce((select array_agg(pv.url order by pv.sort_order, pv.id) from public.property_videos pv where pv.property_id = target_property_id), '{}'::text[]),
    main_image_url = coalesce((select pi.url from public.property_images pi where pi.property_id = target_property_id order by pi.is_main desc, pi.sort_order, pi.id limit 1), p.main_image_url),
    video_url = coalesce((select pv.url from public.property_videos pv where pv.property_id = target_property_id order by pv.sort_order, pv.id limit 1), p.video_url)
  where p.id = target_property_id;
end;
$function$
;
commit;
