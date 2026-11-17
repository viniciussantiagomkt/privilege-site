set search_path=pg_catalog;
select jsonb_agg(jsonb_build_object('key',n.nspname||'.'||c.relname||'.'||a.attname,'md5',md5(concat_ws('|',row_number,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid)))) order by n.nspname,c.relname,a.attname) as columns
from (select a.*,row_number() over(partition by c.oid order by a.attnum) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where a.attnum>0 and not a.attisdropped and c.relkind in ('r','p') and n.nspname in ('public','crm_private','auth','storage','supabase_migrations')) a
join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum;
