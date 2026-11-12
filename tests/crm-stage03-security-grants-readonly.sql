-- Read-only catalog evidence, before/after the separately authorized migration.
-- Expected after: administrative views anon=false, authenticated=true;
-- privileged RPCs anon=false, authenticated=true; public capabilities unchanged.
select jsonb_build_object(
  'views', (select jsonb_agg(jsonb_build_object(
    'name', c.relname, 'options', c.reloptions,
    'definition_md5', md5(pg_get_viewdef(c.oid)),
    'acl', c.relacl::text,
    'anon_select', has_table_privilege('anon', c.oid, 'SELECT'),
    'authenticated_select', has_table_privilege('authenticated', c.oid, 'SELECT')
  ) order by c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in
    ('admin_dashboard_metrics','property_admin_metrics','lead_origin_metrics','property_metrics')),
  'functions', (select jsonb_agg(jsonb_build_object(
    'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid),
    'security_definer', p.prosecdef, 'settings', p.proconfig,
    'body_md5', md5(p.prosrc), 'acl', p.proacl::text,
    'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ) order by p.proname)
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'set_user_role','sync_property_media_arrays','crm_save_quick_client',
    'crm_archive_client','crm_client_timeline','crm_record_client_contact',
    'crm_public_presentation','crm_record_presentation_open',
    'crm_audit_change','crm_followup_timeline','crm_lead_timeline',
    'crm_set_property_code','handle_new_auth_user'))
);
