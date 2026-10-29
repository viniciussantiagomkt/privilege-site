-- Catalogs and aggregate hashes only. No records or credentials leave the database.
begin transaction read only;
set local statement_timeout='30s';
do $$
declare t record; item jsonb; items jsonb := '[]'::jsonb;
begin
 for t in
  select n.nspname as schema_name,c.relname as table_name
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','p') and (
   n.nspname='public' or
   (n.nspname='auth' and c.relname in ('users','identities','sessions','refresh_tokens')) or
   (n.nspname='storage' and c.relname in ('objects','buckets'))
  ) order by n.nspname,c.relname
 loop
  execute format('select jsonb_build_object(''relation'',%L,''count'',count(*),''fingerprint'',md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' order by md5(to_jsonb(x)::text)),''''))) from %I.%I x',t.schema_name||'.'||t.table_name,t.schema_name,t.table_name) into item;
  items := items || jsonb_build_array(item);
 end loop;
 perform set_config('crm.owner_presentation_snapshot',items::text,true);
end $$;
select jsonb_build_object(
 'observed_utc',now(),
 'data',current_setting('crm.owner_presentation_snapshot')::jsonb,
 'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text,'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute')) order by p.oid::regprocedure::text) from pg_proc p where p.oid in ('crm_private.guard_share()'::regprocedure,'crm_private.valid_share(uuid)'::regprocedure,'public.crm_public_presentation(uuid)'::regprocedure)),
 'security_fingerprint',md5((select string_agg(v,'|' order by v) from (
  select n.nspname||'.'||c.relname||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'') as v from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','storage','auth') and c.relkind in('r','p','v')
  union all select schemaname||'.'||tablename||'.'||policyname||':'||roles::text||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') from pg_policies where schemaname in('public','storage','auth')
 ) s)),
 'function_security_fingerprint',(select md5(string_agg(p.oid::regprocedure::text||':'||p.proowner||':'||p.prosecdef||':'||coalesce(p.proconfig::text,'')||':'||coalesce(p.proacl::text,''),'|' order by p.oid::regprocedure::text)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','crm_private')),
 'schema_grants_fingerprint',(select md5(string_agg(nspname||':'||coalesce(nspacl::text,''),'|' order by nspname)) from pg_namespace where nspname in('public','crm_private','auth','storage')),
 'postgres_roles_fingerprint',(select md5(coalesce(string_agg((to_jsonb(r)-'rolpassword')::text,'|' order by rolname),'')) from pg_roles r),
 'waiting_locks',(select count(*) from pg_locks where not granted),
 'long_transactions',(select count(*) from pg_stat_activity where pid<>pg_backend_pid() and xact_start<now()-interval '5 minutes' and datname=current_database()),
 'other_active_transactions',(select count(*) from pg_stat_activity where pid<>pg_backend_pid() and xact_start is not null and state in ('active','idle in transaction') and datname=current_database()),
 'public_tables_without_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity)
) as snapshot;
commit;
