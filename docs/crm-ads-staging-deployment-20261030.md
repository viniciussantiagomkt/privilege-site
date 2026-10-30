# Anuncios: migration aplicada somente no staging

## Estado final e escopo

30/10/2026. PR #9 em rascunho. A migration autorizada foi aplicada uma unica vez ao staging `privilege-imoveis-staging / sdpqphiooiuglywcmkxv`, depois do backup novo, restauracao local e preflight. **A sincronizacao continua desativada.** Nenhum preview, Edge Function, cron, segredo ou conexao externa foi publicado/configurado. Nenhum merge, alteracao de producao/main, conta ou permissao anterior.

Codigo aprovado: `e460d349f27fc8b961c02dbfe85df48d76d200cc`. HEAD remoto inicial: `aab544134f8b184289a969ea8479a08199632aff`, que acrescentava apenas evidencia de autorizacao/preflight. Worktree separado: `C:\Users\GERENCIA\Documents\Codex\crm-ads-staging-20261030`, branch local `codex/crm-ads-staging-20261030`, baseada na branch atualizada do PR #9. Outros worktrees e alteracoes locais preservados.

## Backup novo das 20 migrations

O agente executou `scripts/backup-crm-staging.ps1` da versao atual do repositorio, que exigia as 20 migrations exatas terminando em `20261029184222`. Nao foi usado o backup anterior de 19 versoes nem uma copia de Downloads. A unica participacao do usuario foi digitar a senha PostgreSQL em um campo local mascarado; nenhuma credencial de anuncio foi solicitada.

- Pasta privada: `C:\Users\GERENCIA\AppData\Local\PrivilegeCRM-Backups\staging-20261030-155223-e69332f6`.
- Criacao UTC: `2026-10-30T18:53:18.5986033Z`.
- Arquivo: `staging-database.dump`, **814812 bytes**.
- SHA-256: `834699014D7801E1BAACC5040F86221A6C1797125034008893395A43E0EACD99`.
- Manifesto: projeto correto, 20 versoes, listagem e decodificacao PASS.
- ACL dedicada sem heranca, usuario atual e SYSTEM; dumps, roles.sql, SQL decodificado e logs privados fora do Git/chat.

O backup e o manifesto originais foram preservados e o hash novamente conferido depois dos testes. Este e o snapshot pre-migration das 20 versoes, nao um backup posterior das 21. Nao inclui bytes Storage, configuracao completa de servicos externos ou todos os segredos necessarios para recuperar o ambiente inteiro.

## Restauracao local e fixtures

`restore-crm-backup-local.ps1` executado com BackupDirectory, ExpectedArchiveSha256 e ExpectedArchiveBytes explicitos para o arquivo novo. **RESTORE PASS**: transacao exit 0, zero diferencas nas contagens/verificacoes do manifesto, hash do arquivo original inalterado. Relatorio privado `restore-validation-privilege_restore_e9113d3be753.json` preservado.

Banco novo `privilege_restore_e9113d3be753`, PostgreSQL 17/supabase_admin. Container `privilege-crm-restore-20261028`, contexto `desktop-linux`, endpoint local Windows named pipe. Isolamento reconferido: rede none, nenhuma porta ou bind, privileged=false, imagem `supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00`. Docker Desktop foi iniciado pelo agente; nenhum banco anterior foi sobrescrito.

Depois da restauracao, o SQL aprovado foi aplicado somente a copia local. `tests/crm-ads-restored-local.sql` passou em **14 grupos** com fixtures ficticias e rollback:

1. Isolamento de contas pessoais/institucionais entre os quatro perfis.
2. Negativas de worker RPC, escrita direta e leitura de lease para usuario autenticado.
3. Claim exclusivo, bloqueio de segundo claim e intervalo apos commit.
4. Replay completo do periodo sem acumular gasto.
5. Mudanca de moeda rejeitada sem perder o relatorio anterior.
6. Conversoes de plataforma Google preservadas separadamente.
7. Backoff transitorio e bloqueio por necessidade de reautorizacao, preservando historico.
8. Lease expirado/superado nao sobrescreve execucao nova.
9. Dinheiro exato, acoes Meta distintas e cobertura incompleta explicita.
10. Leitura institucional pela gestao.
11. Negativas de relatorio/metricas e suspensao por outro responsavel.
12. Suspensao pelo proprietario preserva historico.
13. Lease invalidado por suspensao nao aceita commit.
14. Negativas anonimas de claim e tabela.

Claims SQL sinteticas e `SET LOCAL ROLE service_role` exclusivamente para exercitar os RPCs de worker na copia local: **nao sao JWTs reais, uso de chave service-role ou acesso a provedores**. As identidades existentes foram apenas lidas. Os registros de contas de anuncio eram ficticios locais, nao contas externas conectadas. Nenhuma conta Auth, senha ou definicao de papel foi alterada. Depois do rollback: contas/campanhas/dias/leases = 0/0/0/0.

## Preflight renovado

Observado imediatamente antes da escrita: `2026-10-30T18:59:12.35622Z`.

| Verificacao | Observado | Status |
| --- | --- | --- |
| Projeto/historico | Staging correto, 20 versoes exatas | PASS |
| Objetos candidatos | Tres tabelas publicas, lease privado, indice e cinco RPCs ausentes | PASS |
| Dependencias | Auth UID, funcoes comerciais/gestao, eligible_broker, geracao de UUID e papeis requeridos presentes | PASS |
| Locks / transacoes longas / outras transacoes ativas | 0 / 0 / 0 | PASS |
| Tabelas publicas sem RLS | 0 | PASS |
| Cron | Catalogo cron.job ausente; nenhum job de anuncios | PASS |
| Worker Edge | Ausente; somente crm-presentation-media v1 ja existente | PASS |
| Baseline | 52 relacoes existentes e fingerprints de dados/permissoes/funcoes/extensoes | PASS |

Consulta `tests/crm-ads-snapshot-readonly.sql`: READ ONLY, hashes agregados, sem exportar registros ou ler arquivos do servidor. Somente os objetos novos autorizados sao excluidos dos hashes de objetos anteriores. Nenhum segredo Vault foi consultado.

## Aplicacao e reconciliacao

Migration executada pelo conector uma unica vez somente no staging. Versao gerenciada **20261030185925_crm_ad_reporting**; historico posterior com **21 migrations**. Arquivo proposto `20261029191800_crm_ad_reporting.sql` apenas renomeado para `20261030185925_crm_ad_reporting.sql`, sem reaplicar ou alterar o SQL.

- SHA-256 canonico do blob aprovado: `849fb54d7379bf3c9c2f42a582e793fa11a56b9ccf4064e256ba54e84043dcaf`.
- MD5 do blob e da unica entrada SQL registrada pelo Supabase: `2fd5bac66b8ed8bb82bf92e45b657b48`.

O runner ja descobria exatamente uma migration pelo sufixo e foi repetido com o nome gerenciado real. Script de backup atualizado somente depois da aplicacao para exigir as 21 versoes em futuras execucoes; defaults de restore atualizados para o novo arquivo validado, mantendo guardas de hash/tamanho.

## Postflight

Verificado apos a DDL e novamente depois das negativas HTTP:

- **52 relacoes anteriores** com contagens/fingerprints identicos, incluindo campanhas, atribuicoes e recibos do PR #8, dados CRM, Auth e Storage.
- ACL/policies/RLS, seguranca e definicoes das funcoes anteriores de public/crm_private, grants de schema, papeis PostgreSQL e extensoes preservados. Zero tabelas publicas sem RLS.
- Quatro tabelas novas com RLS e vazias: crm_ad_accounts, crm_ad_campaigns, crm_ad_daily e crm_private.ad_sync_leases.
- Nas tres tabelas publicas, SELECT autenticado sob RLS; nenhuma escrita direta autenticada. Anon/PUBLIC sem privilegios. Lease privado sem leitura/escrita direta anon/authenticated/PUBLIC.
- Claim/commit/fail: EXECUTE apenas para service_role entre os papeis de API verificados, sem anon/authenticated/PUBLIC.
- Disconnect/report: EXECUTE autenticado e sem anon/PUBLIC. Os cinco RPCs usam search_path vazio; report e SECURITY INVOKER, os outros quatro SECURITY DEFINER, owner postgres conforme aprovado.
- Nenhum registro de conta externa provisionado, metrica importada ou lease remoto criado.
- Cron/extensoes sem alteracao e worker crm-ads-sync ausente. A Edge Function preexistente crm-presentation-media continua ACTIVE v1, sem republicacao.

## Falha encontrada e corrigida nos testes

O primeiro `npm test` nesta execucao passou 38 testes e falhou ao carregar tres arquivos novos com ENOENT. Causa comprovada: `new URL(...).pathname` usado como caminho de arquivo no Windows gerava `C:\C:\...`. Corrigidos somente os loaders de `crm-ad-reports-ui.test.mjs`, `crm-ads-reporting.test.mjs` e `crm-ads-worker.test.mjs` para usar `node:url`/`fileURLToPath`.

Depois da correcao, **59/59 testes passaram no Windows**, incluindo os casos inicialmente nao carregados. Nenhuma assercao foi removida. Aplicacao, worker, adaptadores e SQL aprovado nao foram alterados.

## Validacao desta execucao

| Cenario / ambiente | Resultado | Status |
| --- | --- | --- |
| Backup/restore Windows | Novo backup de 20 versoes e RESTORE PASS | PASS |
| PostgreSQL restaurado, claims/role locais | 14 grupos, fixtures revertidas, nenhum provedor acessado | PASS |
| PGlite em memoria | 285/285 checks | PASS |
| Testes de codigo/worker/UI com mocks | 59/59 depois da correcao de caminhos | PASS |
| REST real anonimo no staging | 12/12 negativas: leitura/escrita de tres tabelas, cinco RPCs e schema privado; sem criar registros | PASS |
| Guard local da branch de anuncios | 5/5 checks; producao/projeto/chave errados e credencial privilegiada recusados localmente | PASS |
| Lint / TypeScript / build | Exit 0, Next.js 16.4.3 com guard staging; nenhum deploy | PASS |
| Auditoria npm runtime | Zero vulnerabilidades reportadas | PASS |
| Postflight | Objetos novos vazios/restritos e estado anterior preservado | PASS |
| JWT real e UI desktop/mobile | Nao executados; preview fora do escopo | BLOCKED |
| Concorrencia PostgreSQL multiconexao | Nao executada; claims sequenciais nao comprovam concorrencia | BLOCKED |
| Leitura real Meta/Google e renovacao real | Nao autorizadas; mocks nao comprovam versoes/permissoes/consentimento reais | FORA DO ESCOPO |
| Publicacao do worker, cron e onboarding | Nao autorizados nem executados; integracao desativada | FORA DO ESCOPO |

Advisors registraram INFO de RLS sem policy e WARN de funcoes SECURITY DEFINER e protecao contra senhas vazadas desabilitada. Leases privados sem policy permissiva sao deny-all por desenho. Nenhum ajuste Auth/permissoes anteriores foi feito para eliminar avisos. Referencias: [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protecao de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auditoria npm sem vulnerabilidades nao significa ausencia desses avisos.

## Evidencias e continuidade

- `tests/security/crm-ads-staging-deployment-20261030.json`: backup, restore, preflight, ACLs e comparacoes sanitizados.
- `tests/security/crm-ads-agent-local-20261030.json`: nova execucao PGlite com versao real; evidencia anterior preservada.
- `tests/security/crm-ads-agent-anon-http-20261030.json`: doze negativas HTTP, sem corpos privados.
- `tests/security/crm-ads-agent-guard-20261030.json`: cinco verificacoes locais de ambiente.
- SQL local/restaurado e consulta read-only reproduziveis versionados. Helper de guard aceita branch/caminho de evidencia opcionais, preservando os defaults do PR #8.

Nenhum dump, roles.sql, SQL decodificado do backup, log privado, senha, cookie, JWT, HAR ou URL assinada utilizavel no Git. O helper de entrada mascarada permaneceu privado fora do repositorio. Deployment automatico da branch continua desativado, sem mudanca em Vercel.

Esta entrega conclui **somente a persistencia autorizada**. Nao declarar sincronizacao ativa, contas conectadas, concorrencia homologada ou prontidao de producao. Funcao Edge, cron, segredos/conexoes e preview exigem escopos separados; nao repetir a migration para essas etapas. Manter PR #9 em rascunho, sem merge. Nenhuma participacao adicional do usuario e necessaria para esta etapa ja concluida.
