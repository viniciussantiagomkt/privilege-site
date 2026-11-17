# Etapa 03 - Aplicacao unica da seguranca no Staging (17/11/2026)

## Resultado: PASS no escopo executado; homologacao autenticada BLOCKED

Migration aplicada UMA VEZ no Supabase Staging privilege-imoveis-staging, ref sdpqphiooiuglywcmkxv. Historico independente confirma 23 migrations CRM, versao 20261111151927 exatamente uma vez, nome crm_stage03_security_surface.

Codigo autorizado: c573b1e249bbb73f8d5c98113e188ea76dd527e9.
Branch: work/crm-stage03f-controlled-fixes-20261109. PR #16 continua Draft.
CI da referencia: [#93 SUCCESS](https://github.com/viniciussantiagomkt/privilege-site/actions/runs/44158448255).

Esta evidencia foi executada pelo Codex. Revisao independente do Work PENDENTE. Nao representa aprovacao de seguranca HTTP autenticada nem autorizacao de merge, novo deploy ou producao.

## Artefato aplicado e recuperacao preservada

- Arquivo: supabase/migrations/20261111151927_crm_stage03_security_surface.sql.
- SHA-256 inalterado: 042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d.
- Dump aprovado de 17/11: 889967 bytes; SHA-256 73357c35cf3ff17a1a357a27cd3f7ab94ce060534a8b7153b55bec1df6781b5b.
- Manifesto formato 3; SHA-256 69f747f96b7160d8e30f59d37f2c378ffb875976f467e4930c1ebd479ec405d9.
- roles.sql privado conferido: SHA-256 39b54c1af004ff07aa288274f6aba5ac9be2bda1f2008723f6797b3c700e5b2d.
- Restore isolado anterior PASS reconferido; nenhum backup, manifesto, baseline ou restore anterior sobrescrito.
- Limites aceitos pelo Work preservados: PostgreSQL local 17.6 vs origem 17.11 e owners locais das extensoes pg_stat_statements, pgcrypto e uuid-ossp. Nenhuma tentativa de corrigir owners ou permissoes gerenciadas.
- Backup logico do banco NAO constitui recuperacao completa da plataforma Supabase, arquivos do Storage, servicos externos ou configuracao de deployments.

## Preflight imediato: PASS

Conector oficial confirmou projeto ACTIVE_HEALTHY e PostgreSQL 17.11. Branch, HEAD remoto/local, PR Draft e CI93 conferidos antes da escrita. Dump, manifesto, SQL e baseline aprovados foram recalculados, sem selecionar recuperacao antiga.

Comparacao integral dos contratos versionados, sem atualizar baseline:
- CRM: 22 entradas, alvo ausente; Storage: todos os 81 IDs 0..80, nomes e hashes; Auth: todas as 84 versoes.
- Fingerprint crm-recovery-catalog-v2: exatamente dez categorias; 809 colunas.
- Snapshot crm-recovery-indexes-v1: todos os 273 indices, definicoes, owners e estados.
- Oito papeis relevantes, 13 memberships, grants, RLS, owners, extensoes e lifecycle do Storage sem divergencia.
- Zero locks aguardando, indices invalidos ou tabelas publicas sem RLS na captura.
- ACLs de 237 objetos e definicoes das quatro views e 13 funcoes do escopo capturadas antes da escrita.

Tambem foram comparados digests de linhas de 54 tabelas selecionadas (public/crm_private, auth.users/identities, storage.objects/buckets) com o restore aprovado: zero diferencas relevantes. updated_at/last_sign_in_at de Auth foram excluidos; tabelas operacionais de Auth e demais estados da plataforma nao fazem parte desse teste. Nao se afirma igualdade de todas as linhas a partir de hashes de catalogo. Mesma selecao antes/depois da aplicacao permaneceu identica.

## Aplicacao oficial e unica

Ferramenta: Supabase CLI 3.1.0; psql 17.11. Conexao fixa exclusivamente do staging com sslmode=require; senha somente em entrada local mascarada e memoria do processo, sem senha em URI/argumentos/relatorios. Sem service_role como autenticacao de usuario.

Uma primeira entrada de credencial falhou na primeira consulta de leitura, antes de dry-run ou aplicacao. A segunda entrada passou. Foram duas entradas de credencial, mas UMA invocacao real de migration.

Foi preparado workspace isolado com configuracao minima e as 23 migrations do repositorio byte a byte identicas, sem copiar env, Vault, roles, seeds ou configuracoes externas. As 22 historicas ja estavam registradas.

Mecanismo efetivamente executado (URI e caminho privados omitidos):
```text
supabase db push --remote=<URI fixa do staging sem senha, sslmode=require> --skip-vault --yes --workdir <workspace isolado> --dry-run
supabase db push --remote=<mesma URI> --skip-vault --yes --workdir <mesmo workspace>
```

Dry-run: exit 0, listou SOMENTE 20261111151927_crm_stage03_security_surface.sql. Todos os gates e arquivos foram reconferidos antes da chamada real. Marcador exclusivo de tentativa impediu repeticao.

- Inicio: 2026-11-17T19:49:30.7423495Z (16:49:30 em America/Sao_Paulo).
- Retorno: 2026-11-17T19:49:33.1087414Z; exit 0, mensagem de conclusao observada.
- Historico confirmado por consulta independente: 2026-11-17T19:49:43.069257Z.
- Transacao BEGIN/COMMIT e timeouts originais preservados: lock_timeout 5s, statement_timeout 30s.
- Nenhuma repeticao, repair, migration historica/interna ou rollback.
- O wrapper PowerShell registrou NativeCommandError para stderr de ferramenta nativa; nao houve linha PostgreSQL ERROR/FATAL. Exit 0, conclusao e historico/catalogo independentes confirmaram sucesso; nao se interpretou o nome do wrapper isoladamente.

## Postflight: PASS

| Verificacao | Resultado real |
| --- | --- |
| Historico CRM | 22 -> 23; alvo exato uma vez |
| Auth e Storage completos | 84 e 81 entradas, todas inalteradas |
| ACLs de 237 objetos | Estado final exatamente igual ao delta calculado antes |
| Delta direto | 3 SELECT e 14 EXECUTE removidos; zero concessoes novas |
| Tres views administrativas | anon SELECT=false; authenticated SELECT=true |
| Seis funcoes privadas/admin e cinco trigger-only | anon EXECUTE=false; authenticated preservado |
| property_metrics | ACL, definicao e security_invoker preservados |
| Apresentacoes publicas | ACLs e corpos das duas funcoes preservados |
| Corpos, argumentos, SECURITY DEFINER e search_path | 13 funcoes do escopo preservadas |
| Indices | 273 snapshots identicos; zero invalidos |
| RLS, constraints e triggers | Fingerprints identicos |
| Owners, extensoes, papeis e memberships | Inalterados; ressalvas locais nao modificadas |
| Storage lifecycle e heranca service_role | Inalterados |
| Dados selecionados | Mesmas 54 tabelas antes/depois |
| Saude posterior | Zero locks aguardando / indices invalidos / tabelas publicas sem RLS |

Oito categorias de fingerprints ficaram identicas. As duas de grants mudaram intencionalmente: table_grants 2487 -> 2484; function_grants 311 -> 297. Comparacao semantica item a item confirmou somente as 17 remocoes previstas, incluindo grantee, grantor e grantable; nao se exigiu igualdade de fingerprints de grants depois da revogacao.

Os grants privados de save/archive/timeline/contact ja estavam restritos: o SQL reafirmou a protecao sem criar novos deltas. authenticated manter EXECUTE nao comprova acesso funcional de usuario autorizado nem dispensa as verificacoes internas/RLS. Gatilhos nao foram disparados remotamente, pois esta fase nao autoriza mutacoes comerciais; definicoes e vinculos preservados, com ensaios locais anteriores como evidencia distinta.

## Advisors antes/depois

| Aviso | Antes | Depois |
| --- | ---: | ---: |
| health | 0 | 0 |
| rls_enabled_no_policy (INFO) | 3 | 3 |
| anon_security_definer_function_executable (WARN) | 16 | 9 |
| authenticated_security_definer_function_executable (WARN) | 40 | 40 |
| auth_leaked_password_protection (WARN) | 1 | 1 |
| unindexed_foreign_keys (INFO) | 46 | 46 |
| auth_rls_initplan (WARN) | 70 | 70 |
| unused_index (INFO) | 24 | 24 |
| multiple_permissive_policies (WARN) | 23 | 23 |
| duplicate_index (WARN) | 1 | 1 |

Comparacao de findings (desconsiderando somente observed_at): sete removidos, zero novos. Removidos: set_user_role, sync_property_media_arrays e cinco trigger-only. Os nove anonimos restantes sao helpers de papel/RLS, capacidades publicas de apresentacao/abertura consentida e increment_property_view; foram preservados deliberadamente pelo escopo, nao certificados irrestritamente como seguros pelo Advisor. A revisao independente de consumidores e HTTP continua necessaria.

Os 40 avisos authenticated incluem funcoes que dependem de checagens internas. Os tres RLS sem policy permanecem deny-by-default; nao adicionar policies amplas para silenciar avisos. Protecao contra senhas vazadas e avisos de performance preexistentes nao foram alterados nesta operacao.
[Guia oficial dos Advisors](https://supabase.com/docs/guides/database/database-linter).

## HTTP anonimo real: seis PASS, somente leitura

Chave publishable oficial do proprio staging, sem sessao de usuario. Chave nao publicada; arquivo efemero removido apos uso. Sem SQL claims sinteticas ou tokens extraidos do navegador.

| Teste | HTTP / corpo | Resultado |
| --- | --- | --- |
| GET admin_dashboard_metrics, limit=0 | 401 / 42501 | PASS |
| GET property_admin_metrics, limit=0 | 401 / 42501 | PASS |
| GET lead_origin_metrics, limit=0 | 401 / 42501 | PASS |
| GET property_metrics, limit=0 | 200 / [] | PASS |
| POST crm_client_timeline, ID sintetico inexistente | 401 / 42501 | PASS |
| POST crm_public_presentation, UUID aleatorio inexistente | 200 / null | PASS |

Captura: 2026-11-17T19:53:48.444Z. Timeline e consulta de apresentacao sao RPCs de leitura. Nao foram chamadas RPCs mutantes, registro de abertura, tracking, formularios ou envio de mensagens. limit=0 impede coleta de linhas, mas NAO comprova cobertura integral do conteudo/RLS. Token inexistente NAO substitui testes de apresentacao valida, expirada ou revogada.

## Homologacao autenticada: BLOCKED

Nao ha sessoes proprias legitimas e autorizadas de A/B/Gestor/Administrador disponiveis ao Codex. Nao criar contas, extrair tokens, inventar JWTs ou usar claims SQL como prova HTTP.

Retomar os [28 cenarios existentes](crm-stage03-http-homologation-plan-20261111.md) com sessoes legitimas: isolamento bilateral, controles positivos dos quatro perfis, payload valido alheio, concorrencia/idempotencia e apresentacoes validas/expiradas/revogadas. Reutilizar homologacoes aprovadas quando aplicaveis e registrar nova evidencia dos controles afetados pelo hardening.

## Ressalva adicional: auditoria de dependencias atual

A CI documental #94 terminou SUCCESS (npm ci, lint, typecheck, 192 testes de codigo, 396 verificacoes locais, build), mas o log de npm ci apontou 16 vulnerabilidades: sete moderadas e nove altas. Esse alerta foi examinado apos a aplicacao. A ausencia de falha na CI NAO certifica dependencias seguras.

Reproducao local com npm 11.12.1, mesmo package-lock e registry oficial: npm audit --json retornou as mesmas 16 entradas (exit 1). npm audit --omit=dev --json retornou UMA moderada de producao, zero altas/criticas (exit 1). Contagens anteriores de sete/oito eram fotografias historicas da base de advisories; nao se aplicam a esta consulta atual. Nenhum pacote ou lockfile foi modificado.

As nove altas estao na cadeia dev: @next/eslint-plugin-next, @typescript-eslint/typescript-estree, eslint-config-next, eslint-import-resolver-typescript, fast-glob, fdir, micromatch, picomatch e tinyglobby. Advisory raiz novo: [picomatch ReDoS](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). A cadeia minimatch/typescript-eslint continua com avisos moderados. Contagens de pacotes nao equivalem a contagens de vulnerabilidades independentes.

Producao: next 16.4.3 afetado por [GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h) e [GHSA-vc7v-qv4w-wrv8](https://github.com/advisories/GHSA-vc7v-qv4w-wrv8), ambos moderados de vazamento entre valores de parametros raiz em composicoes de cache. Busca por unstable_cache, use cache, cacheComponents e rootParams em app, components, lib e next.config.* nao encontrou ocorrencias. Isso NAO comprova ausencia de caminho exploravel.

O registry indica next 16.4.6 como correcao compativel; sugestoes automaticas de downgrade amplo de eslint-config-next nao foram aceitas. Nenhum npm audit fix/force, update, nova frente funcional ou mudanca de configuracao foi executado. Work deve avaliar prioridade da correcao compativel antes de qualquer decisao de publicacao/merge. O resultado PASS desta operacao se limita a migration autorizada, catalogo e seis chamadas HTTP anonimas; nao concede aprovacao integral de seguranca. JSONs reproduzidos e limites registrados na evidencia estruturada.

## Evidencias, limitacoes e encerramento

Evidencia estruturada sanitizada: tests/security/crm-stage03-security-application-20261117.json. Contem deltas previstos, fingerprints antes/depois, historicos completos, snapshots sanitizados de permissoes, Advisors e seis resultados HTTP. Query de permissoes ja versionada: tests/crm-stage03-security-grants-readonly.sql.

Logs completos, snapshots privados, backups, roles e manifestos permanecem fora do Git. Hashes dos logs privados e snapshot posterior constam no JSON. Nenhum dump, valor de linha, credencial, dado pessoal ou informacao de conexao sensivel foi incluido nesta publicacao. Relatorios antigos sao historicos e nao foram reescritos.

Somente documentos/evidencias novos nesta entrega; SQL aprovado, codigo funcional, dependencias e configuracao de deploy inalterados. A CI do commit documental sera informada no PR apos execucao; CI nao substitui homologacao HTTP.

Nenhuma producao, usuario, sessao, permissao gerenciada, owner de extensao, deployment, mensagem ou integracao externa foi alterada. PR #16 permanece Draft. Nenhum merge ou Etapa 04.

Parecer: aplicacao unica e postflight de catalogo/HTTP anonimo PASS; aguardam revisao Work e homologacao autenticada. Nao declarar homologacao integral. Se surgir falha posterior, preservar estado e diagnosticar antes de propor patch minimo autorizado; nunca repetir migration ou reabrir permissao publica como rollback automatico.
