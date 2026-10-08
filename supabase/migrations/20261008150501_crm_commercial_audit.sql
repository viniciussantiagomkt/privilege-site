begin;
create trigger crm_clients_audit after insert or update on public.clients for each row execute function public.crm_audit_change();
create trigger crm_visits_audit after insert or update on public.visits for each row execute function public.crm_audit_change();
create trigger crm_proposals_audit after insert or update on public.proposals for each row execute function public.crm_audit_change();
create trigger crm_negotiations_audit after insert or update on public.negotiations for each row execute function public.crm_audit_change();
commit;
