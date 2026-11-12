set timezone='UTC';
with targets as (
select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','crm_private')
union all select 'auth','users' union all select 'auth','identities' union all select 'storage','objects' union all select 'storage','buckets'
), digests as (
select nspname||'.'||relname as object,
query_to_xml(format('select count(*) as n,md5(coalesce(string_agg(v::text,chr(10) order by v::text collate "C"),'''')) as digest from (select to_jsonb(t) %s as v from %I.%I t) d',
case when nspname='auth' then '- ''updated_at'' - ''last_sign_in_at''' else '' end,nspname,relname),false,true,'') as x
from targets)
select json_agg(json_build_object('object',object,'count',((xpath('/row/n/text()',x))[1])::text,'digest',((xpath('/row/digest/text()',x))[1])::text) order by object) as data_fingerprint from digests;
