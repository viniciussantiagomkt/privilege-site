# Etapa 03D | Aplicação única no staging e postflight

## Resultado

**PASS no escopo autorizado de aplicação e postflight de banco.** Uma única chamada oficial de migration, sem retry, seguida exclusivamente por leituras remotas. Isso não aprova preview, homologação autenticada ou produção.

Projeto confirmado: **privilege-imoveis-staging / sdpqphiooiuglywcmkxv**, PostgreSQL **17.11**. PR #15 continua em rascunho, branch `work/crm-broker-quick-service-20261104`. HEAD autorizado e conferido local/remoto/PR antes da escrita: `4021568bd2747af69747e77c95db39e6b986c162`. CI [Validate CRM integration #75](https://github.com/viniciussantiagomkt/privilege-site/actions/runs/42071277001) concluído com sucesso.

## Preflight imediato

- Árvore local limpa e HEAD esperado; arquivo SQL lido diretamente do disco, sem reconstrução manual.
- SHA-256 exato: `da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa`.
- Histórico remoto: 21 migrations, última `20261030185925`, sem crm_quick_service por nome/versão e sem qualquer dos seis novos objetos de função, quatro colunas, índice ou trigger propostos.
- Assinaturas iguais ao baseline: 88 tabelas, 375 constraints, 101 funções, 49 triggers, 130 políticas e 1.956 grants de tabelas. Dependências auth.uid, can_manage_commercial e crm_private.client_readable existentes; nenhuma constraint inválida nas tabelas-alvo.
- Nenhum lock nas tabelas clients/tasks/visits e nenhuma sessão bloqueada no instante da consulta. A migration manteve lock_timeout=5s e statement_timeout=30s; não foram alterados timeouts globais.
- Backup `staging-20261105-135850-b4a75284`, concluído **2026-11-05T16:59:43.7985517Z**, 863.257 bytes, SHA-256 `ff117eda66b14da33659a62ce4a2e5e897395a1b9c6e3ba249584da0f50b98ac`; arquivo e roles reconferidos com manifesto. Duas restaurações PASS/saída zero, sem diferenças, com relatórios independentes conservados.
- As 55 tabelas selecionadas coincidiram com a nova cópia no preflight; nenhuma mudança material posterior em identidades, papéis, carteiras ou dados comerciais detectada nesse recorte. Não se impôs igualdade permanente a timestamps Auth nem se interromperam sessões. A causa histórica do updated_at da etapa anterior continua inconclusiva.
- Advisors security/performance executados imediatamente antes, como baseline. Nenhum achado anterior foi apresentado como resolvido por esta migration.

## Aplicação autorizada

Mecanismo: **Supabase MCP apply_migration**, project_id `sdpqphiooiuglywcmkxv`, name `crm_quick_service`, query contendo somente o arquivo cujo hash foi validado. Uma chamada, nenhum lote histórico, SQL adicional ou segunda migration.

- Início observado: **2026-11-05 17:22:14 UTC**.
- Resposta observada até: **2026-11-05 17:22:17 UTC**.
- Resposta da ferramenta: `{"success":true}`.
- Versão efetivamente atribuída: **20261105172215**.
- Histórico confirmado: **21 -> 22**, exatamente uma entrada nova, nome crm_quick_service. Todas as entradas antigas e seu conteúdo foram preservados.

Não houve falha ou resposta ambígua. Não se repetiu a chamada e não foi necessário acionar rollback ou correção remota.

## Reconciliação no Git

O único arquivo foi **renomeado**, não duplicado:

`supabase/migrations/20261104193943_crm_quick_service.sql` -> `supabase/migrations/20261105172215_crm_quick_service.sql`.

Conteúdo preservado byte a byte, SHA-256 acima inalterado, rename 100%. O comentário histórico PROPOSED ONLY foi conservado para não alterar o SQL autorizado; este relatório registra sua aplicação efetiva. Documentos/evidências anteriores conservam o nome aprovado original como histórico, não como instrução de reaplicação.

A única mudança no runner PostgreSQL é sua referência ao nome atual do arquivo. Nenhuma lógica funcional/teste, guarda, SQL, dado, política ou regra comercial foi alterada. O scanner da suíte local já encontra a migration por sufixo e continua exigindo um arquivo único.

## Postflight de objetos e dados

| Item | Antes | Depois | Adicionado |
| --- | --- | --- | --- |
| Tabelas | 88 | 88 | 0 |
| Constraints | 375 | 379 | 4 |
| Funções | 101 | 107 | 6 |
| Triggers não internos | 49 | 50 | 1 |
| Políticas RLS | 130 | 130 | 0 |
| Grants de tabelas | 1.956 | 1.956 | 0 |

Quatro colunas: clients.interest_profile/interest_revision e tasks.quick_action_id/visits.quick_action_id. Três índices: crm_client_phone_lookup e os índices únicos tasks_quick_action_id_key/visits_quick_action_id_key; todos valid/ready. Quatro constraints validadas: crm_client_interest_valid, clients_interest_revision_check e as duas UNIQUE quick_action_id. Trigger crm_client_interest_revision habilitado.

Todas as definições anteriores de colunas/índices/constraints/funções/triggers permaneceram iguais. Grants das funções anteriores e atributos de roles também foram preservados. As seis definições novas coincidiram com a cópia local previamente ensaiada, usando contexto search_path equivalente.

Dados: assinaturas agregadas das 55 tabelas comparadas, removendo somente as quatro colunas adicionadas e a única nova linha autorizada do histórico, coincidiram antes/depois. Inclui dados legados, auth.users/identities, carteiras, auditoria e eventos; nenhum identificador ou valor pessoal foi retornado ou publicado. As linhas antigas de clients receberam somente os defaults previstos (perfil vazio/revisão zero), tasks/visits mantêm quick_action_id NULL. Nenhum default inesperado encontrado.

Nenhum registro comercial, contato, tarefa, visita, evento de negócio ou usuário foi criado/alterado por testes remotos. Não se chamou RPC de escrita com usuário real ou fictício no staging.

## Autorização e carteiras

RPCs public.crm_save_quick_client, public.crm_record_client_contact e public.crm_client_timeline: owner postgres, SECURITY DEFINER, search_path vazio; anon sem EXECUTE efetivo, PUBLIC sem grant de EXECUTE, authenticated com EXECUTE intencional.

Verificados os guardas internos de sessão, papel comercial e client_readable, mais predicados de dono nos caminhos aplicáveis, e equivalência com as definições ensaiadas. As duas funções auxiliares são SECURITY INVOKER e também não executáveis por anon/PUBLIC. O trigger privado não tem EXECUTE para anon/PUBLIC/authenticated.

Políticas RLS, grants anteriores e dados de titularidade sem diferenças. Não houve ampliação constatada de carteiras nesse postflight. **Homologação com sessões JWT/HTTP reais de A/B/gestor/admin continua pendente**; os resultados locais e a inspeção de catálogo não substituem esses cenários.

## Advisors: baseline versus depois

| Categoria | Antes | Depois | Avaliação |
| --- | --- | --- | --- |
| RLS enabled no policy | 3 INFO | 3 INFO | Herdado, sem mudança |
| anon SECURITY DEFINER executable | 16 WARN | 16 WARN | Herdado, nenhuma nova RPC anônima |
| authenticated SECURITY DEFINER executable | 37 WARN | 40 WARN | Três RPCs novas previstas/revisadas |
| Leaked password protection disabled | 1 WARN | 1 WARN | Herdado, não alterado |
| Unindexed foreign keys | 46 INFO | 46 INFO | Herdado |
| Auth RLS initplan | 70 WARN | 70 WARN | Herdado |
| Unused index | 24 INFO | 25 INFO | Novo crm_client_phone_lookup, ainda sem uso |
| Multiple permissive policies | 23 WARN | 23 WARN | Herdado |
| Duplicate index | 1 WARN | 1 WARN | Herdado |

Os três avisos de SECURITY DEFINER autenticado descrevem o mecanismo intencional das RPCs revisadas, não ausência de guardas. Não se revogou acesso funcional nem se abriu acesso anônimo para ocultar alertas. O índice novo não utilizado é esperado antes da homologação, não justificativa para removê-lo. Demais achados permanecem pendências herdadas, sem correções fora da autorização.

Referências: [SECURITY DEFINER autenticado](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [índice não utilizado](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). Evidência sanitizada completa: `tests/security/crm-quick-service-staging-application-20261105.json`.

## Falhas, limites e continuidade

Sem falha de aplicação/postflight ou diferença inesperada. Nenhum rollback, DROP CASCADE, restauração destrutiva, ajuste manual de schema/ACL, chamada repetida ou segunda migration. Backups e bancos locais anteriores preservados. A autorização foi consumida pela única aplicação registrada; não implica permissão de reaplicar ou corrigir remotamente.

Antes do preview: aguardar autorização específica; reconfirmar HEAD/CI e a configuração efetiva exclusiva de staging na branch Vercel, ausência de credenciais privilegiadas/produção e integrações externas, mantendo deployment automático desativado. Somente depois, publicação única autorizada, verificação de login/rotas/proteção e homologação real dos perfis A/B/gestor/admin, agenda/idempotência/carteiras/mobile. Nenhum resultado autenticado foi declarado nesta entrega.

Não houve preview, merge, acesso/mudança de produção, mensagem, nova conta, integração externa ou Etapa 04. O backup continua sendo recuperação de banco, sem bytes Storage ou configurações externas. Permanecem limites de patch local, carga fria/concorrência de leitores e os riscos herdados já registrados no backlog.
