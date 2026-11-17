-- Review only: do not apply to staging/production without separate authorization.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- These invoker views are administrative. Keep authenticated grants and RLS.
revoke select on table public.admin_dashboard_metrics,
  public.property_admin_metrics, public.lead_origin_metrics from public, anon;

-- Keep internal authorization checks as defense in depth.
revoke execute on function public.set_user_role(text,text),
  public.sync_property_media_arrays(bigint),
  public.crm_save_quick_client(bigint,bigint,uuid,jsonb),
  public.crm_archive_client(bigint),
  public.crm_client_timeline(bigint,integer),
  public.crm_record_client_contact(bigint,uuid) from public, anon;
grant execute on function public.set_user_role(text,text),
  public.sync_property_media_arrays(bigint),
  public.crm_save_quick_client(bigint,bigint,uuid,jsonb),
  public.crm_archive_client(bigint),
  public.crm_client_timeline(bigint,integer),
  public.crm_record_client_contact(bigint,uuid) to authenticated;

-- Trigger execution does not require a caller's direct RPC EXECUTE grant.
revoke execute on function public.crm_audit_change(),
  public.crm_followup_timeline(), public.crm_lead_timeline(),
  public.crm_set_property_code(), public.handle_new_auth_user() from public, anon;

-- Intentionally unchanged: property_metrics, public presentation capabilities,
-- consented presentation opens, view tracking and helpers used by public RLS.
commit;
