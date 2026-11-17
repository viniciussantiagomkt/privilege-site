-- Complementary index contract; not a replacement for constraints or the ten categories.
set search_path = pg_catalog;
select jsonb_build_object('algorithm_version','crm-recovery-indexes-v1','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'name',c.relname,'table_schema',tn.nspname,'table',t.relname,
 'definition',pg_get_indexdef(i.indexrelid),'owner',c.relowner::regrole::text,
 'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,
 'unique',i.indisunique,'primary',i.indisprimary,'exclusion',i.indisexclusion
) order by n.nspname collate "C",c.relname collate "C"),'[]'::jsonb))
from pg_index i join pg_class c on c.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace
join pg_class t on t.oid=i.indrelid join pg_namespace tn on tn.oid=t.relnamespace
where n.nspname in ('public','crm_private','auth','storage','supabase_migrations');
