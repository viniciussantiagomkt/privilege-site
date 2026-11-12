-- Catalog only. Digests contain no row data, credentials or password hashes.
set search_path = pg_catalog;
with scope as (
 select oid,nspname from pg_namespace
 where nspname in ('public','crm_private','auth','storage','supabase_migrations')
), items as (
 select 'schemas'::text kind,nspname::text key,nspname::text value from scope
 union all
 select 'tables',s.nspname||'.'||c.relname,
   concat_ws('|',c.relkind,c.relrowsecurity,c.relforcerowsecurity)
 from pg_class c join scope s on s.oid=c.relnamespace where c.relkind in ('r','p')
 union all
 select 'columns',s.nspname||'.'||c.relname||'.'||a.attname,
   concat_ws('|',row_number() over (partition by c.oid order by a.attnum),format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid))
 from pg_attribute a join pg_class c on c.oid=a.attrelid join scope s on s.oid=c.relnamespace
 left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
 where a.attnum>0 and not a.attisdropped and c.relkind in ('r','p')
 union all
 select 'functions',s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
   concat_ws('|',p.prosecdef,p.provolatile,p.proconfig,replace(p.prosrc,E'\r\n',E'\n'))
 from pg_proc p join scope s on s.oid=p.pronamespace where p.prokind in ('f','p')
 union all
 select 'views',s.nspname||'.'||c.relname,
   concat_ws('|',c.reloptions,pg_get_viewdef(c.oid))
 from pg_class c join scope s on s.oid=c.relnamespace where c.relkind in ('v','m')
 union all
 select 'constraints',s.nspname||'.'||c.relname||'.'||k.conname,
   concat_ws('|',k.convalidated,pg_get_constraintdef(k.oid))
 from pg_constraint k join pg_class c on c.oid=k.conrelid join scope s on s.oid=c.relnamespace
 union all
 select 'triggers',s.nspname||'.'||c.relname||'.'||t.tgname,
   concat_ws('|',t.tgenabled,pg_get_triggerdef(t.oid))
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join scope s on s.oid=c.relnamespace where not t.tgisinternal
 union all
 select 'policies',schemaname||'.'||tablename||'.'||policyname,
   concat_ws('|',permissive,roles,cmd,qual,with_check)
 from pg_policies where schemaname in (select nspname from scope)
 union all
 select 'table_grants',s.nspname||'.'||c.relname||'.'||a.grantee::regrole::text||'.'||a.privilege_type,
   concat_ws('|',a.grantor::regrole,a.is_grantable)
 from pg_class c join scope s on s.oid=c.relnamespace,
 lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a
 where c.relkind in ('r','p','v','m','S')
 union all
 select 'function_grants',s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||').'||a.grantee::regrole::text||'.'||a.privilege_type,
   concat_ws('|',a.grantor::regrole,a.is_grantable)
 from pg_proc p join scope s on s.oid=p.pronamespace,
 lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.prokind in ('f','p')
)
select json_object_agg(kind,json_build_object('count',n,'md5',digest)) from (
 select kind,count(*) n,md5(string_agg(key||'='||value,E'\n' order by key,value)) digest
 from items group by kind
) fingerprints;
