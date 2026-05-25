-- Privilege Imoveis - RLS policies only
-- Use este arquivo se o Supabase acusar erro em linhas isoladas como:
-- "to authenticated" ou "with check (...)".
-- IMPORTANTE: cole o arquivo inteiro no SQL Editor e execute tudo de uma vez.

alter table public.user_roles enable row level security;
alter table public.brokers enable row level security;
alter table public.properties enable row level security;
alter table public.leads enable row level security;
alter table public.property_views enable row level security;
alter table public.property_favorites enable row level security;
alter table public.property_comparisons enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Admins manage roles" on public.user_roles;
drop policy if exists "Users can read own role" on public.user_roles;
drop policy if exists "Admins read roles" on public.user_roles;
drop policy if exists "Admins insert roles" on public.user_roles;
drop policy if exists "Admins update roles" on public.user_roles;
drop policy if exists "Admins delete roles" on public.user_roles;
create policy "Users can read own role" on public.user_roles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Admins read roles" on public.user_roles for select to authenticated using (public.is_admin());
create policy "Admins insert roles" on public.user_roles for insert to authenticated with check (public.is_admin());
create policy "Admins update roles" on public.user_roles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete roles" on public.user_roles for delete to authenticated using (public.is_admin());

drop policy if exists "Admins manage brokers" on public.brokers;
drop policy if exists "Public can read active brokers" on public.brokers;
drop policy if exists "Admins and owners insert brokers" on public.brokers;
drop policy if exists "Admins and owners update brokers" on public.brokers;
drop policy if exists "Admins delete brokers" on public.brokers;
create policy "Public can read active brokers" on public.brokers for select to anon, authenticated using (active = true or public.is_staff());
create policy "Admins and owners insert brokers" on public.brokers for insert to authenticated with check (public.is_admin() or id = auth.uid());
create policy "Admins and owners update brokers" on public.brokers for update to authenticated using (public.is_admin() or id = auth.uid()) with check (public.is_admin() or id = auth.uid());
create policy "Admins delete brokers" on public.brokers for delete to authenticated using (public.is_admin());

drop policy if exists "Public can read published properties" on public.properties;
drop policy if exists "Staff can create properties" on public.properties;
drop policy if exists "Staff can update allowed properties" on public.properties;
drop policy if exists "Admins can delete properties" on public.properties;
create policy "Public can read published properties" on public.properties for select to anon, authenticated using (status = 'ativo' or public.is_staff());
create policy "Staff can create properties" on public.properties for insert to authenticated with check (public.is_staff());
create policy "Staff can update allowed properties" on public.properties for update to authenticated using (public.is_admin() or owner_id = auth.uid() or broker_id = auth.uid()) with check (public.is_admin() or owner_id = auth.uid() or broker_id = auth.uid());
create policy "Admins can delete properties" on public.properties for delete to authenticated using (public.is_admin());

drop policy if exists "Public can create leads" on public.leads;
drop policy if exists "Staff can read leads" on public.leads;
drop policy if exists "Staff can update leads" on public.leads;
create policy "Public can create leads" on public.leads for insert to anon, authenticated with check (true);
create policy "Staff can read leads" on public.leads for select to authenticated using (public.is_staff());
create policy "Staff can update leads" on public.leads for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Public can create property views" on public.property_views;
drop policy if exists "Staff can read property views" on public.property_views;
create policy "Public can create property views" on public.property_views for insert to anon, authenticated with check (true);
create policy "Staff can read property views" on public.property_views for select to authenticated using (public.is_staff());

drop policy if exists "Public can create favorites" on public.property_favorites;
drop policy if exists "Users can read own favorites and staff can read all" on public.property_favorites;
drop policy if exists "Users can delete own favorites" on public.property_favorites;
create policy "Public can create favorites" on public.property_favorites for insert to anon, authenticated with check (true);
create policy "Users can read own favorites and staff can read all" on public.property_favorites for select to anon, authenticated using (public.is_staff() or user_id = auth.uid() or session_id is not null);
create policy "Users can delete own favorites" on public.property_favorites for delete to anon, authenticated using (public.is_staff() or user_id = auth.uid() or session_id is not null);

drop policy if exists "Public can create comparisons" on public.property_comparisons;
drop policy if exists "Users can read own comparisons and staff can read all" on public.property_comparisons;
drop policy if exists "Users can delete own comparisons" on public.property_comparisons;
create policy "Public can create comparisons" on public.property_comparisons for insert to anon, authenticated with check (true);
create policy "Users can read own comparisons and staff can read all" on public.property_comparisons for select to anon, authenticated using (public.is_staff() or user_id = auth.uid() or session_id is not null);
create policy "Users can delete own comparisons" on public.property_comparisons for delete to anon, authenticated using (public.is_staff() or user_id = auth.uid() or session_id is not null);

drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Admins manage site settings" on public.site_settings;
drop policy if exists "Admins insert site settings" on public.site_settings;
drop policy if exists "Admins update site settings" on public.site_settings;
drop policy if exists "Admins delete site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins insert site settings" on public.site_settings for insert to authenticated with check (public.is_admin());
create policy "Admins update site settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete site settings" on public.site_settings for delete to authenticated using (public.is_admin());

drop policy if exists "Public can read property images" on storage.objects;
drop policy if exists "Staff can upload property images" on storage.objects;
drop policy if exists "Staff can update property images" on storage.objects;
drop policy if exists "Staff can delete property images" on storage.objects;
create policy "Public can read property images" on storage.objects for select to anon, authenticated using (bucket_id in ('property-images', 'property-videos'));
create policy "Staff can upload property images" on storage.objects for insert to authenticated with check (bucket_id in ('property-images', 'property-videos') and public.is_staff());
create policy "Staff can update property images" on storage.objects for update to authenticated using (bucket_id in ('property-images', 'property-videos') and public.is_staff()) with check (bucket_id in ('property-images', 'property-videos') and public.is_staff());
create policy "Staff can delete property images" on storage.objects for delete to authenticated using (bucket_id in ('property-images', 'property-videos') and public.is_staff());
