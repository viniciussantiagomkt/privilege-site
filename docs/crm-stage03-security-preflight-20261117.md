# Etapa 03 - Preflight da aplicacao autorizada em 17/11/2026

## Decisao: BLOCKED, zero tentativas de aplicacao

Autorizacao retomada no commit 80235f7e27012c83593d77e11ee393af8790d4b2, branch work/crm-stage03f-controlled-fixes-20261109, PR #16 Draft. O gate falhou por divergencia nova do schema Auth, nao pelas ressalvas locais ja aceitas pelo Work. Nenhuma senha foi solicitada; dry-run e aplicacao NAO EXECUTADOS. Nenhuma chamada apply_migration, db push, repair ou rollback.

Projeto confirmado pelo conector oficial: privilege-imoveis-staging, ref sdpqphiooiuglywcmkxv, ACTIVE_HEALTHY, PostgreSQL 17.11. HEAD local/remoto correto, arvore inicialmente limpa, CI #91 SUCCESS da referencia aprovada conferida. Migration 20261111151927_crm_stage03_security_surface.sql e SHA-256 042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d inalterados.

## Recuperacao aprovada preservada

Dump de 16/11 reconferido: 900229 bytes, SHA-256 93e1b967c3a51188fc3cb5196495f44a62f39b8e3ffd02901770f6b3b976f3db. Manifesto SHA-256 f43460775803aa09e2deb39ec1d5d57eb24b2987847d3e7902d8edfce358603b. roles.sql confere com manifesto. Relatorio original do restore preservado, PASS, mesmo dump e zero diferencas no contrato original. Nenhum arquivo privado, manifesto, baseline ou relatorio anterior foi sobrescrito.

O container local aprovado foi apenas iniciado para consultas de catalogo no banco restaurado existente privilege_restore_55d939ac264d. Nenhuma restauracao nova, migration ou alteracao de ownership local. Nao foram extraidas credenciais de sessao. Nao foi iniciada autenticacao direta: o gate de baseline falhou antes dessa etapa. As ressalvas aprovadas de PostgreSQL local 17.6 e owners de extensoes continuam aceitas e nao foram usadas como novo bloqueio.

## Divergencia reproduzida

Fingerprint v2, exatamente dez categorias. Nove coincidem com a baseline. Categoria columns: 807 -> 809; MD5 anterior c20e68c8e96f00898c54068c2181283a, atual c622b430758bc8fc730e424da2091cad.

Comparacao individual das colunas atuais com o banco isolado do backup: duas adicoes, nenhuma remocao ou alteracao das 807 colunas anteriores:

| Objeto novo | Tipo | NOT NULL | Default |
| --- | --- | --- | --- |
| auth.one_time_tokens.link_token_hash | text | false | nenhum |
| auth.saml_providers.dedicated_scope | boolean | false | nenhum |

A consulta coletou apenas nomes, tipos, nullability/default e digests de catalogo. Nao consultou valores de tokens, hashes de tokens, usuarios, identidades, senhas ou registros comerciais.

auth.schema_migrations passou de 82 entradas no backup para 84 na fonte; adicoes 20260911120000 e 20261030120000, sem remocoes. Os identificadores nao demonstram que a execucao ocorreu em setembro/outubro; a tabela observada contem somente version, sem timestamp de aplicacao. As novas versoes coexistem com o delta Auth; autoria, hora exata e mapeamento de cada SQL para cada coluna nao foram comprovados. Nao atribuir automaticamente ao Codex nem aceitar como mudanca interna aprovada.

## Demais gates de leitura

- Historico CRM: exatamente 22 entradas, ultima 20261105172215; migration alvo ausente.
- Historico Storage: ids 0..80, todos os nomes/hashes iguais; hash da 80 18cfbf5c5b356469e1e95f3aa1b59ba111d82a06. Storage nao foi excluido da comparacao.
- Roles, memberships, ACLs lifecycle Storage, owners e extensoes da fonte coincidem com a baseline aprovada. Fingerprints de views, tables, schemas, policies, triggers, functions, constraints, table_grants e function_grants coincidem.
- Snapshot das tres views administrativas, property_metrics e 13 funcoes/RPCs capturado com ACL, assinatura, definicao/body MD5, opcoes e search_path. E estado anterior ao patch, nao prova de hardening aplicado.
- Zero locks aguardando, indices invalidos ou tabelas publicas sem RLS no instante observado.
- Health Advisors sem alertas. Security: 3 INFO rls_enabled_no_policy; 16 WARN anon_security_definer_function_executable; 40 WARN authenticated_security_definer_function_executable; 1 WARN auth_leaked_password_protection. Performance: unindexed_foreign_keys 46, auth_rls_initplan 70, unused_index 24, multiple_permissive_policies 23, duplicate_index 1; linha de base conhecida, nao corrigida fora do escopo. Links de remediacao na evidencia JSON.

## Execucao, limites e proximo passo

**Aplicacao: NAO EXECUTADA.** Nao houve timeout ou resultado ambiguo que exija tentativa adicional. Postflight de aplicacao e HTTP pos-aplicacao NAO EXECUTADOS. Testes HTTP autenticados permanecem BLOCKED, sem claims SQL ou sessoes inventadas. O historico CRM continua 22, nao 23.

Nenhum codigo funcional, SQL aprovado, baseline ou permissao gerenciada foi alterado. Somente documentos, evidencia sanitizada e query de leitura acrescentados para revisao independente. Nenhum merge, deployment, usuario, producao, dado comercial, historico ou rollback modificado.

Work deve revisar o novo delta de Auth e definir a reconciliacao do ponto de recuperacao/baseline antes da retomada. O backup aprovado de 16/11 permanece valido para o estado que capturou; nao prova recuperacao identica do schema Auth atual. Nao gerar ou aceitar baseline nova automaticamente, nao ocultar Auth/Storage e nao executar migrations internas. A autorizacao da migration CRM permanece condicionada a preflight valido; esta execucao foi encerrada nessa condicao, sem pedir nova confirmacao da mesma operacao.

Evidencia: tests/security/crm-stage03-security-preflight-20261117.json. Query reproduzivel somente leitura: tests/crm-stage03-columns-readonly.sql. CI da publicacao sera registrada no PR; CI nao remove o bloqueio de schema e nao equivale a homologacao autenticada.
