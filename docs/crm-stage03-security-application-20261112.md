# Etapa 03 - Aplicacao controlada da superficie de seguranca

## Decisao: BLOCKED por divergencia de ACL, zero aplicacoes

A autorizacao de aplicacao unica foi recebida. O executor interrompeu antes da escrita porque a linha de base de grants mudou depois do backup aprovado. Nenhuma chamada apply_migration nem db push mutante foi executada. Nao houve timeout ou resposta ambigua de aplicacao. Nao foram reabertas permissoes como contorno.

Commit auditado: bf76cff1bea77c08a4d6577bda1a2b73f785e592. Branch work/crm-stage03f-controlled-fixes-20261109, PR #16 Draft. CI #89 SUCCESS nesse commit. Relatorios desta tentativa sao um complemento, nao alteracao do SQL aprovado.

Projeto conferido pelo conector oficial: privilege-imoveis-staging, ref sdpqphiooiuglywcmkxv, ACTIVE_HEALTHY, PostgreSQL 17.11. Migration autorizada: supabase/migrations/20261111151927_crm_stage03_security_surface.sql. SHA-256 recalculado e inalterado: 042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d.

## Cronologia e ferramenta

- Backup aprovado concluido em 2026-11-12T13:47:27.5848617Z; dump e roles tiveram seus hashes reconferidos. Copia local restaurada PostgreSQL 17.6 preservada, sem restauracao remota.
- Conferencia inicial por leitura encontrou os dez fingerprints iguais ao backup.
- Historico interno storage.migrations registra depois a entrada 80, revoke-extra-lifecycle-postgres-grants, hash 18cfbf5c5b356469e1e95f3aa1b59ba111d82a06, executed_at 2026-11-12 14:35:54.762352. Na copia do backup a ultima entrada e 79. O campo interno nao informa fuso; o timestamp e reproduzido sem atribuir timezone.
- O helper de senha/dry-run so foi criado depois desse registro. Um erro local inicial de modulo PowerShell foi corrigido antes de qualquer conexao, sem tentativa de migration.
- CLI oficial 3.1.0, conexao direta somente ao staging com TLS e senha apenas em memoria/ambiente de subprocesso; sem senha em argumentos, arquivos, Git ou chat. Nenhum token/cookie foi extraido. A CLI por URL dispensa o login de conta que estava indisponivel.
- Workdir isolado contem copias byte-identicas das 23 migrations; flags --remote=<URL de staging sem senha> --skip-vault --dry-run --yes. Sem --include-all, --include-roles ou --include-seed, sem configuracao de Vault/servicos do repositorio. Nao houve history repair.
- Dry-run terminou exit 0 em 2026-11-12T14:41:21.5574602Z e listou exclusivamente 20261111151927_crm_stage03_security_surface.sql. Preflight direto confirmou TLS, 22 versoes esperadas, proposta ausente, sem locks aguardando ou indices invalidos.
- A revisao imediatamente posterior detectou os grants divergentes. O sinal local de aplicacao nunca foi criado; o marcador de tentativa tambem nao existe. Helper encerrado pelo agente antes da escrita, eliminando o processo que mantinha a senha. Logs privados e estado original foram preservados fora do Git.

A ferramenta MCP apply_migration nao expoe parametro version; por isso nao foi usada para aplicar e depois renumerar o historico. A CLI foi preparada para preservar a versao exata autorizada. O unico db push executado foi --dry-run.

## Divergencia comprovada

As definicoes de objetos nao mudaram. Oito de dez categorias normalizadas coincidem; apenas table_grants e function_grants divergem.

| Item | Backup aprovado | Staging imediato |
| --- | --- | --- |
| Grants de relacoes | 2501 | 2487 |
| Grants de funcoes | 313 | 311 |

Diferencas exatas, sempre grantee postgres e grantor supabase_storage_admin:
- storage.delete_lifecycle_objects(object_ids uuid[]): EXECUTE removido.
- storage.reconcile_lifecycle_state(target_bucket_id text, policy_changed boolean): EXECUTE removido.
- storage.bucket_lifecycle_states: preservado SELECT; removidos INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN.
- storage.lifecycle_abandoned_artifacts: mesma reducao para SELECT.

O nome/horario da migration interna 80 e consistente com as revogacoes observadas. Nao se afirma auditoria de autoria nem que o Codex executou essa migration interna: nenhum comando deste executor enviou esse SQL. Nao confundir storage.migrations (historico interno do produto) com supabase_migrations.schema_migrations (historico das 22 migrations do CRM).

Grants de anon, authenticated, service_role, PUBLIC e demais papeis comparados nao mudaram. Nao foi demonstrada exposicao nova; o delta e restritivo. Mesmo assim altera a linha de base de recuperacao/ACL aprovada e foi tratado como bloqueio, conforme a condicao de interromper diante de divergencia.

## Demais verificacoes reais

Comparacao por contagem/digests agregados de 54 tabelas da copia restaurada contra staging: zero diferencas. Escopo: public, crm_private, auth.users/auth.identities e metadados storage.objects/storage.buckets. Nos dois objetos Auth excluidos apenas updated_at e last_sign_in_at. Demais tabelas operacionais Auth, bytes Storage e configuracoes externas nao cobertos. Nenhuma linha ou hash de senha exportado como evidencia.

Zero locks aguardando, indices invalidos, tabelas publicas sem RLS ou transacoes ativas acima de 30s no preflight observado. Funcoes, views, triggers, constraints, colunas, schemas e estado RLS coincidem com a copia. Snapshots ACL e hashes na evidencia JSON, sem dados de clientes.

Depois da interrupcao, historico oficial reconferido: 22 migrations, ultima 20261105172215_crm_quick_service, proposta 20261111151927 ausente. Tres views administrativas ainda permitem SELECT a anon; property_metrics publico e RPCs mantem o estado pre-patch. Isso nao e PASS do hardening nem regressao causada por aplicacao, pois nao ocorreu aplicacao.

## Advisors antes e depois da interrupcao

Nenhuma alteracao nas contagens; nao houve postflight de aplicacao.
- Health: zero alertas.
- Security: rls_enabled_no_policy 3 INFO; anon_security_definer_function_executable 16 WARN; authenticated_security_definer_function_executable 40 WARN; auth_leaked_password_protection 1 WARN.
- Performance: unindexed_foreign_keys 46 INFO; auth_rls_initplan 70 WARN; unused_index 24 INFO; multiple_permissive_policies 23 WARN; duplicate_index 1 WARN.

Links de remediacao individuais constam no JSON. Nenhuma correcao desses itens fora do SQL autorizado foi executada.

## Testes e pendencias Work

PASS: integridade do SQL/backup, dry-run unico correto, conexao TLS, comparacao das 54 tabelas e historico inalterado. BLOCKED: gate de ACL e aplicacao. Postflight e testes HTTP pos-aplicacao NAO EXECUTADOS. HTTP autenticado NAO EXECUTADO; nenhuma simulacao de claims SQL ou sessao artificial.

Work deve revisar o delta interno de Storage e reconciliar formalmente a nova linha de base de recuperacao antes de liberar a continuidade condicionada. O backup anterior nao foi apagado nem adulterado; ele representa o estado anterior a entrada interna 80. Definir se nova copia/restauracao e necessaria para essa linha de base. Nao reaplicar a migration interna, nao reabrir grants Storage e nao alterar o SQL de seguranca aprovado.

A autorizacao da migration nao foi revogada nem reapresentada como pedido de confirmacao: sua condicao de preflight e que nao foi atendida. Antes de retomar, renovar o preflight e o acesso seguro; nenhuma senha persistida esta disponivel para reutilizacao.

Evidencia sanitizada: tests/security/crm-stage03-security-application-20261112.json. Query de dados somente leitura: tests/crm-stage03-material-drift-readonly.sql. Backup, SQL de roles, helpers e logs privados continuam fora do Git. Nenhuma producao, usuario, permissao de CRM, dado comercial, merge ou deployment alterado.
