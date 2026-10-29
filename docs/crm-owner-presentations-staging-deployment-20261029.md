# Apresentacoes da carteira: implantacao autorizada no staging

## Estado final

29/10/2026. Migration e Edge Function implantadas exclusivamente no projeto `privilege-imoveis-staging / sdpqphiooiuglywcmkxv`. PR #7 permanece em rascunho. Nenhum preview novo, alteracao de producao/main ou merge.

Implementacao autorizada: `6cc3c4dbc028a5ce8a089aa454c68ecef67d4f5b`. HEAD remoto inicial: `b7621bb22405c58f1a7cabdbfc7fb2c87da73cb9`, que acrescentava apenas evidencia de preflight. O codigo autorizado da migration e dos dois arquivos Edge foi carregado do Git desse commit, nao reconstruido manualmente.

O checkout anterior `crm-marketing-notifications-20261028` foi mantido em f0c5dab, com todas as alteracoes locais anteriores. Esta execucao utilizou um worktree separado, `crm-owner-draft-staging-20261029`, branch local `codex/crm-owner-draft-staging-20261029`, baseado no Work atualizado. Nenhum reset, clean, rebase ou descarte de trabalho.

## Backup novo e restauracao

O agente executou o script atual do repositorio, que exigia exatamente as 18 migrations presentes. Nao foi utilizada a copia antiga de Downloads nem reaproveitado o backup anterior de 17 migrations.

- Pasta privada: `C:\Users\GERENCIA\AppData\Local\PrivilegeCRM-Backups\staging-20261029-143447-eeea9907`.
- Criacao UTC: `2026-10-29T17:35:41.4736385Z`.
- Arquivo: `staging-database.dump`, **787769 bytes**.
- SHA-256: `0DCF13B6F547608D88A2C21FAE30EE5556EA867C4F25EE258E0A2E06F913B45A`.
- Listagem e decodificacao: PASS. Manifesto com 18 migrations.
- ACL dedicada, heranca desabilitada, usuario Windows atual e SYSTEM. Dump, roles, manifesto completo, SQL decodificado e logs privados nao foram publicados.
- Nao havia senha PostgreSQL legitimamente configurada no processo ou pgpass conhecido. A primeira tentativa pelo console nao gerou backup. O usuario digitou a senha em campo mascarado de um dialogo local; o agente executou o restante. O helper permaneceu fora do repositorio, sem persistir a senha ou inclui-la em argumentos CLI. Nao houve busca de senhas em locais alheios ao projeto.

O script `restore-crm-backup-local.ps1` foi executado com `BackupDirectory`, `ExpectedArchiveSha256` e `ExpectedArchiveBytes` explicitos para esse novo arquivo. Resultado **RESTORE PASS**, transacao exit 0, nenhuma diferenca nas contagens/verificacoes do manifesto e hash do arquivo original inalterado. Nenhum banco anterior foi reutilizado.

Destino: banco local novo `privilege_restore_4f46d8e8cc97`, usuario `supabase_admin`, PostgreSQL 17 (`170006`), contexto `desktop-linux`, endpoint Windows named pipe. Container `privilege-crm-restore-20261028`: rede `none`, nenhuma porta publicada, nenhum bind, privileged=false, imagem `supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00`. Papel local necessario ja existia; nenhuma conta ou permissao remota foi criada/alterada.

O relatorio privado `restore-validation-privilege_restore_4f46d8e8cc97.json` e o manifesto original foram preservados. Isso valida a restauracao de banco descrita, nao a recuperacao dos bytes Storage, segredos/configuracoes externas, SMTP/OAuth ou login Auth. O backup continua sendo o snapshot pre-migration de 18 versoes; nao foi anunciado como backup posterior de 19 versoes.

## Preflight renovado e aplicacao

Preflight imediatamente anterior: `2026-10-29T17:37:31.001271Z`.

| Verificacao | Observado | Resultado |
| --- | --- | --- |
| Projeto e historico | Staging correto, 18 versoes exatas, candidata ausente | PASS |
| `crm_private.guard_share()` | MD5 81301941b77674dc2388e33bc3beac1f | PASS |
| `crm_private.valid_share(uuid)` | MD5 b2f3998bdfc561a3edda8aa50720e7f0 | PASS |
| `crm_public_presentation(uuid)` | MD5 01559ff2def19819c5d5698ccaf585f7 | PASS |
| Locks aguardando / transacoes longas / outras transacoes ativas | 0 / 0 / 0 | PASS |
| Tabelas publicas sem RLS | 0 | PASS |
| Edge existente | Nenhuma | PASS |

Aplicada uma unica vez por `apply_migration`, exclusivamente no staging. Versao gerenciada real: **20261029173752_crm_owner_draft_presentations**. Historico posterior: **19 migrations**. Nao houve reaplicacao para ajustar nome.

Arquivo reconciliado com `git mv` de `20261029170649_crm_owner_draft_presentations.sql` para `20261029173752_crm_owner_draft_presentations.sql`, sem alteracao do SQL. SHA-256 canonico do Git: `71d7e86a9953fd4362ac8b2755774bf56a1ac7bda0c3d2d81717ba3a6e2519d2`. O MD5 da unica entrada SQL registrada pelo Supabase e do blob autorizado coincide: `a203bfff560d33c59bbdb78b8b74b7c2`.

Guardas de drift nao foram removidas. O runner local passou a localizar uma unica migration pelo sufixo para aceitar a versao gerenciada real. O script de backup foi atualizado, somente depois da aplicacao, para exigir as 19 versoes nas proximas execucoes. Defaults de restore agora apontam para o novo backup validado, mantendo verificacao de hash/tamanho.

## Edge Function

`crm-presentation-media`: **ACTIVE**, versao **1**, ID `f6e16870-98b6-421c-8ba4-69d8563e433d`. `verify_jwt=false` e intencional e foi expressamente autorizado. O token individual da apresentacao e revalidado no RPC usando chave publica antes da leitura de um objeto exato com a credencial interna do runtime Edge.

Os dois arquivos retornados pelo Supabase apos o deploy foram comparados e sao identicos aos blobs autorizados:

- `crm-presentation-media/index.ts`: SHA-256 `919621020806587ec445190479512869cc3783b4c68c8f404c658adf02342458`.
- `_shared/presentation-media.ts`: SHA-256 `566d7eaf620540d279e5831301891423dd9b77bdf995cf47fbfc1d8782263781`.

Bundle ezbr SHA-256: `e6784312f85a04794267eb628026d224c8c6150b24a6de90edea63769370102e`.

Nenhum valor de service-role foi obtido pelo agente, adicionado a Vercel, colocado no navegador ou versionado. Buckets continuam privados. Nenhuma policy foi ampliada. Nao foi implantado codigo alternativo, deno.json inventado ou dependencia remota nao presente no commit.

## Postflight e preservacao

Comparacoes foram realizadas imediatamente apos a migration e repetidas apos as chamadas HTTP da Edge. **49 relacoes** com contagens e fingerprints agregados identicos: tabelas publicas, Auth users/identities/sessions/refresh_tokens e Storage objects/buckets. Nenhum registro bruto foi exportado para as evidencias.

Fingerprints de ACL/policies/RLS, seguranca de funcoes, grants dos schemas e papeis PostgreSQL permaneceram identicos. Owner, SECURITY DEFINER/INVOKER, search_path e grants das tres funcoes tambem foram preservados. Zero tabelas publicas sem RLS. Contas e senhas nao foram alteradas.

Definicoes novas esperadas:

- guard_share: `c3251269e06ca76b75dafe3b582502c2`.
- valid_share: `f09bf3b93f64effc6085ee90467da861`.
- crm_public_presentation: `dc4141880a3a02f64c8cdb9a3bdae55e`.

## Cenarios e testes desta execucao

| Cenario / perfil / ambiente | Resultado esperado e observado | Status |
| --- | --- | --- |
| Backup Windows / staging read-only | Arquivo novo, SHA/tamanho, listagem e decodificacao conferidos | PASS |
| Restore PostgreSQL local | Banco novo, transacao sem erros, manifesto igual, original preservado | PASS |
| Preflight e migration staging | Historico e fingerprints esperados; uma unica nova versao real | PASS |
| Catalogos/dados staging | 49 relacoes e seguranca preservadas antes/depois | PASS |
| Edge staging | ACTIVE v1, verify_jwt=false autorizado e fontes exatas | PASS |
| Anonimo, HTTP real Edge | 11/11: token ausente/invalido/desconhecido, seletor ambiguo, ID/indice invalidos, Range multiplo, POST/HEAD; negativas 404/400/405, zero bytes e no-store | PASS |
| SQL local com claims sinteticas | 259/259: carteira propria/responsavel, draft/pendente/aprovado/publicado, isolamento, revogacao, desabilitacao, expiracao e material aprovado sem Storage publico global | PASS |
| Codigo local com mocks | 31/31, incluindo capability antes do Storage, caminho manipulado, material nao selecionado, falhas e streaming/Range | PASS |
| Lint / TypeScript / build | Exit 0; Next.js 16.4.3, guard de staging, sem credencial privilegiada | PASS |
| Auditoria npm runtime | Zero vulnerabilidades reportadas | PASS |
| JWT real dos quatro perfis / interface nova | Nenhuma sessao legitima foi usada; listagem atual do Computer Use nao identificou janela com titulo do CRM. Nenhum cookie/token extraido ou bloqueio contornado; preview novo nao autorizado | BLOCKED |
| Fotos/PDF/video privados via HTTP real com token de fixture valido | Nenhuma fixture remota criada, nenhuma sessao legitima usada; negativas nao comprovam bytes positivos | BLOCKED |
| Token realmente expirado/revogado ou objeto nao selecionado em apresentacao real | Simulacoes locais passam; token aleatorio inexistente usado no HTTP nao substitui esses estados reais | BLOCKED |
| Streaming real/Range 206 do objeto Storage | Testes de codigo com stream/Range passam e Edge real recusa Range invalido; sem leitura positiva de arquivo ficticio real | BLOCKED |
| Novo preview / homologacao visual atualizada | Publicacao excluida desta autorizacao; preview anterior continua sendo o codigo antigo | BLOCKED |

Nenhum FAIL nos testes executados. Isso nao aprova os cenarios BLOCKED nem libera uso interno integral/producao. Nenhuma confirmacao manual anterior foi atribuida ao agente.

Advisors de seguranca apos a DDL reportaram avisos de funcoes SECURITY DEFINER executaveis, protecao contra senhas vazadas desabilitada e INFO de RLS sem policy. Foram registrados sem alterar Auth ou permissoes fora do escopo. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable , https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable , https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection e https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . Nao confundir auditoria npm sem vulnerabilidades com ausencia de avisos de configuracao.

## Evidencias e alteracoes versionadas

- `tests/security/crm-owner-presentations-deployment-20261029.json`: backup/restore sanitizados, preflight, fingerprints, versao real, Edge e limites.
- `tests/security/crm-owner-presentations-agent-local-20261029.json`: nova execucao dos 259 checks; evidencia anterior preservada.
- `tests/security/crm-owner-presentations-edge-http-20261029.json`: 11 negativas HTTP reais, sem tokens utilizaveis ou dados privados.
- `tests/crm-owner-presentations-snapshot-readonly.sql`: consulta read-only reproduzivel, com hashes agregados apenas.
- `tests/crm-owner-presentations-edge-http.mjs`: runner HTTP restrito ao endpoint staging, sem Auth/fixtures/mutacoes.
- Migration somente renomeada; scripts de backup/restore atualizados ao novo baseline/arquivo validado; runner local aceita nome gerenciado e caminho de evidencia separado.

Comandos: `npm ci --ignore-scripts`, `npm test`, `npm run test:crm-local` com caminho de evidencia separado, `npm run lint`, `npm run typecheck`, `npm run build` com `.env.staging.local` ignorado pelo Git e guard ativo, `npm audit --omit=dev --audit-level=low`, runner HTTP Edge e `git diff --check`.

Nenhum dump, roles.sql, SQL decodificado, log privado, senha, cookie, JWT ou URL assinada utilizavel faz parte do commit. Os helpers de entrada mascarada permaneceram privados fora do Git. Nenhuma mensagem comercial externa foi enviada.

## Proxima etapa

Solicitar autorizacao separada de um novo preview do commit de reconciliacao informado na entrega/PR. Nao publicar o commit antigo 6cc3c4d ignorando a reconciliacao do historico real. A nova UI ainda nao foi publicada por esta autorizacao.

Depois do preview autorizado, usar somente fixtures ficticias e sessoes legitimas de A/B/gestao: apresentar draft/pendente ocultos com presentation_enabled=true, negar B para A, conferir ausencia no catalogo, fotos/PDF/video e Range reais; revogar/expirar/desabilitar/perder vinculo e conferir negativas novas; materiais pendentes continuam bloqueados. Nao reaplicar a migration e nao republicar a Edge para apenas gerar o preview.
