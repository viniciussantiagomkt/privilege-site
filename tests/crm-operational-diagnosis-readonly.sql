-- SOMENTE staging sdpqphiooiuglywcmkxv. Diagnóstico, não migration.
-- Sem escrita. Claims simuladas não substituem sessão/JWT real.
-- Esperado para a NOVA regra: zero leads/clientes privados alheios inclusive para a gestão.

-- admin: execute cada bloco separadamente no conector; psql exibe todos.
begin read only;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"84c5604b-d728-4759-8572-ea4a832af9ce","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','84c5604b-d728-4759-8572-ea4a832af9ce',true);
select 'admin' as profile, auth.uid() as auth_uid, current_user_role() as resolved_role,
can_manage_operations() as can_approve,
(select count(*) from brokers where active) as eligible_active_brokers,
(select count(*) from leads) as leads_visible,
(select count(*) from leads where broker_id is not null and broker_id<>auth.uid() and origin_type='personal') as personal_leads_of_other_users,
(select count(*) from leads where broker_id is null and origin_type='company') as company_queue_visible,
(select count(*) from clients where deleted_at is null) as clients_visible,
(select count(*) from clients where broker_id is not null and broker_id<>auth.uid() and deleted_at is null) as clients_of_other_users,
(select count(*) from marketing_assets) as marketing_visible;
rollback;

-- manager: execute cada bloco separadamente no conector; psql exibe todos.
begin read only;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"0d92c58c-d6f0-4465-95e1-303e7d9f9a69","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','0d92c58c-d6f0-4465-95e1-303e7d9f9a69',true);
select 'manager' as profile, auth.uid() as auth_uid, current_user_role() as resolved_role,
can_manage_operations() as can_approve,
(select count(*) from brokers where active) as eligible_active_brokers,
(select count(*) from leads) as leads_visible,
(select count(*) from leads where broker_id is not null and broker_id<>auth.uid() and origin_type='personal') as personal_leads_of_other_users,
(select count(*) from leads where broker_id is null and origin_type='company') as company_queue_visible,
(select count(*) from clients where deleted_at is null) as clients_visible,
(select count(*) from clients where broker_id is not null and broker_id<>auth.uid() and deleted_at is null) as clients_of_other_users,
(select count(*) from marketing_assets) as marketing_visible;
rollback;

-- broker_a: execute cada bloco separadamente no conector; psql exibe todos.
begin read only;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73a767b8-218d-4910-a370-2b93cf32bf74","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','73a767b8-218d-4910-a370-2b93cf32bf74',true);
select 'broker_a' as profile, auth.uid() as auth_uid, current_user_role() as resolved_role,
can_manage_operations() as can_approve,
(select count(*) from brokers where active) as eligible_active_brokers,
(select count(*) from leads) as leads_visible,
(select count(*) from leads where broker_id is not null and broker_id<>auth.uid() and origin_type='personal') as personal_leads_of_other_users,
(select count(*) from leads where broker_id is null and origin_type='company') as company_queue_visible,
(select count(*) from clients where deleted_at is null) as clients_visible,
(select count(*) from clients where broker_id is not null and broker_id<>auth.uid() and deleted_at is null) as clients_of_other_users,
(select count(*) from marketing_assets) as marketing_visible;
rollback;

-- broker_b: execute cada bloco separadamente no conector; psql exibe todos.
begin read only;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"779c7220-06dd-4180-8b52-05136bee21cb","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','779c7220-06dd-4180-8b52-05136bee21cb',true);
select 'broker_b' as profile, auth.uid() as auth_uid, current_user_role() as resolved_role,
can_manage_operations() as can_approve,
(select count(*) from brokers where active) as eligible_active_brokers,
(select count(*) from leads) as leads_visible,
(select count(*) from leads where broker_id is not null and broker_id<>auth.uid() and origin_type='personal') as personal_leads_of_other_users,
(select count(*) from leads where broker_id is null and origin_type='company') as company_queue_visible,
(select count(*) from clients where deleted_at is null) as clients_visible,
(select count(*) from clients where broker_id is not null and broker_id<>auth.uid() and deleted_at is null) as clients_of_other_users,
(select count(*) from marketing_assets) as marketing_visible;
rollback;

