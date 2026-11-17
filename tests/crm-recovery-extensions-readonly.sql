-- Supplementary platform comparison; deliberately separate from the ten categories.
select coalesce(jsonb_agg(jsonb_build_object(
 'name',e.extname,'version',e.extversion,'schema',n.nspname,
 'owner',e.extowner::regrole::text
) order by e.extname),'[]'::jsonb) as extensions
from pg_extension e join pg_namespace n on n.oid=e.extnamespace;
