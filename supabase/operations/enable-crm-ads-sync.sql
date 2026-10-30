-- ACTIVATION REQUIRES SEPARATE APPROVAL. Not a migration; never run automatically.
-- Prerequisites: reviewed migration, deployed crm-ads-sync, authorized accounts,
-- matching Edge CRM_ADS_CRON_SECRET and Vault crm_ads_cron_secret. No values in Git.
begin;
do $$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') or not exists(select 1 from pg_extension where extname='pg_net')
 or not exists(select 1 from pg_extension where extname='supabase_vault') then raise exception 'Required extensions missing; obtain approval before enabling extensions';end if;
 if exists(select 1 from cron.job where jobname='crm-ads-sync-staging') then raise exception 'Schedule exists; inspect instead of duplicating';end if;
 if (select count(*) from vault.decrypted_secrets where name='crm_ads_cron_secret' and length(decrypted_secret)>=32)<>1 then raise exception 'Configure one matching scheduler secret in Vault';end if;
end $$;
select cron.schedule('crm-ads-sync-staging','* * * * *',$job$
 select net.http_post(
  url:='https://sdpqphiooiuglywcmkxv.supabase.co/functions/v1/crm-ads-sync',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='crm_ads_cron_secret')),
  body:=jsonb_build_object('account_id',a.id),timeout_milliseconds:=240000
 ) from (
  select a.id from public.crm_ad_accounts a where a.status in ('connected','error') and a.next_attempt_at<=clock_timestamp()
  and (a.scope='company' or crm_private.eligible_broker(a.owner_id))
  and not exists(select 1 from crm_private.ad_sync_leases l where l.account_id=a.id and l.lease_until>clock_timestamp())
  order by a.next_attempt_at,a.id limit 5
 ) a;
$job$);
commit;
-- Global stop: select cron.unschedule('crm-ads-sync-staging');
-- Does not revoke provider consent or delete history.
