set search_path=pg_catalog;
with scope as (select oid,nspname,nspowner from pg_namespace where nspname in ('public','crm_private','auth','storage','supabase_migrations')), owners as (
select 'schema:'||nspname as object,nspowner::regrole::text as owner from scope
union all select 'relation:'||n.nspname||'.'||c.relname,c.relowner::regrole::text from pg_class c join scope n on n.oid=c.relnamespace where c.relkind in ('r','p','v','m','S')
union all select 'routine:'||n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',p.proowner::regrole::text from pg_proc p join scope n on n.oid=p.pronamespace where p.prokind in ('f','p')
union all select 'type:'||n.nspname||'.'||t.typname,t.typowner::regrole::text from pg_type t join scope n on n.oid=t.typnamespace)
select jsonb_build_object('count',count(*),'md5',md5(string_agg(object||'='||owner,chr(10) order by object collate "C",owner collate "C"))) from owners;
