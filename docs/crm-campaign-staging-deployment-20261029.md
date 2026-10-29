# Campanhas: implantacao autorizada no staging

## Resultado

29/10/2026. PR #8 continua em rascunho. Aplicada uma unica vez somente ao staging `privilege-imoveis-staging / sdpqphiooiuglywcmkxv` a migration de campanhas autorizada, incluindo seus novos objetos e permissoes. **Nenhum preview publicado, merge, alteracao de main/producao, contas, permissoes anteriores, integracoes ou mensagens externas.**

Codigo autorizado: `b4bf2d42e86838d543127ae53b5c1907df41ce75`. HEAD remoto inicial: `e05f75e85eab556b1f021057e596e8b5e81231e3`. Os dois commits posteriores ao codigo autorizado alteravam somente handoff/evidencia. Execucao em worktree separado `C:\Users\GERENCIA\Documents\Codex\crm-campaign-staging-20261029`, branch local `codex/crm-campaign-staging-20261029`, com base na branch atualizada do PR #8. Worktrees e alteracoes locais anteriores preservados.

## Backup atualizado

Script executado: `scripts/backup-crm-staging.ps1` dessa versao do repositorio, com exigencia exata das **19 migrations** terminando em `20261029173752`. Nao foi usada copia de Downloads nem o backup antigo de 18 versoes. A unica participacao do usuario foi digitar a senha PostgreSQL em um campo local mascarado; a senha nao foi solicitada pelo chat ou incluida em argumentos/arquivos pelo helper.

- Pasta privada: `C:\Users\GERENCIA\AppData\Local\PrivilegeCRM-Backups\staging-20261029-153607-7a198aaf`.
- Criado em UTC: `2026-10-29T18:37:10.209216Z`.
- Arquivo: `staging-database.dump`, **785674 bytes**.
- SHA-256: `826428489C618FC194E1653F0374D408D5864EDD30E3CA26F9EEA41DD37181BE`.
- Manifesto: projeto correto, 19 versoes, listagem e decodificacao PASS.
- ACL dedicada, sem heranca, para usuario atual e SYSTEM. Dumps, roles, SQL decodificado e logs privados ficaram fora do Git.

O arquivo original e o manifesto foram preservados e o hash foi novamente conferido depois das verificacoes. Este e o snapshot pre-migration de 19 versoes, nao um backup posterior das 20 versoes. Nao inclui bytes Storage, configuracoes de servicos externos ou todos os segredos necessarios para recuperar um ambiente completo.

## Restauracao e cenarios na copia local

O agente executou o script de restore com os tres parametros explicitos correspondentes ao backup novo. **RESTORE PASS**: transacao exit 0, zero diferencas no manifesto e verificacoes de schema, arquivo original inalterado. Relatorio privado: `restore-validation-privilege_restore_7d11c2d2ae08.json` na mesma pasta.

Novo banco: `privilege_restore_7d11c2d2ae08`. Container `privilege-crm-restore-20261028`, contexto `desktop-linux`, endpoint local Windows named pipe, PostgreSQL 17/supabase_admin. Isolamento reconferido: rede none, nenhuma porta, nenhum bind, privileged=false, imagem `supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00`.

Depois do RESTORE PASS, o SQL aprovado foi aplicado somente nessa copia local para testar os novos RPCs. `tests/crm-campaign-restored-local.sql` passou em **11 grupos de cenarios**, dentro de uma transacao revertida:

1. Resolucao dos quatro perfis existentes na copia, sem criar/alterar contas.
2. Campanha pessoal permanece com proprietario e destino do ator, apesar de destino forjado no payload.
3. Negativas de escrita direta, overposting de owner e leitura dos recibos privados.
4. Isolamento da campanha pessoal de outro corretor e da gestao.
5. Edicao institucional por gestor sem modificar o proprietario original.
6. Captura institucional com atribuicao e repeticao retornando o mesmo lead.
7. Origem visivel ao corretor responsavel, nao a outro corretor.
8. Transferencia consentida move acesso a atribuicao sem liberar a campanha pessoal anterior.
9. Rejeicao de landing_path com query e de captura em campanha pausada.
10. Uma unica atribuicao, assignment e notificacao na repeticao.
11. Negativas anonimas de RPC e leitura de tabela.

Claims SQL sinteticas, **nao JWT Auth real**. As identidades existentes foram apenas lidas; nenhum estado de conta, senha ou papel foi alterado. Fixtures, auditorias e notificacoes locais foram revertidas. As tres tabelas novas ficaram vazias depois do rollback. Incrementos de sequencias identity locais nao sao transacionais e podem permanecer apenas nesse banco descartavel; nao alteram o arquivo original ou staging. Fallback com destinatario desativado foi exercitado no PGlite com identidades ficticias, nao desativando uma conta da copia restaurada.

## Preflight renovado

Observado imediatamente antes da escrita: `2026-10-29T18:42:10.210588Z`.

| Criterio | Observado | Status |
| --- | --- | --- |
| Projeto/historico | Staging correto; 19 versoes exatas | PASS |
| Objetos propostos | Duas tabelas publicas, recibos privados, sequencias/indices e dois RPCs ausentes | PASS |
| Dependencias | Auth UID, roles comerciais/gestao, eligible_broker, lead_readable e crm_assign_lead presentes | PASS |
| Locks / transacoes longas / outras transacoes ativas | 0 / 0 / 0 | PASS |
| Tabelas publicas sem RLS | 0 | PASS |
| Preservacao | Snapshot agregado de 49 relacoes e fingerprints de permissoes/definicoes existentes | PASS |

Consulta reproduzivel: `tests/crm-campaign-snapshot-readonly.sql`. Transacao READ ONLY, sem leitura de arquivos no servidor e sem exportar registros privados. Os hashes de objetos anteriores excluem somente os objetos novos autorizados para permitir comparacao antes/depois.

## Migration e reconciliacao

Aplicacao pelo conector de migrations exclusivamente no staging, uma unica vez. Versao real **20261029184222_crm_campaign_attribution**; historico com **20 migrations**. O arquivo `20261029180616_crm_campaign_attribution.sql` foi apenas renomeado para `20261029184222_crm_campaign_attribution.sql`; nenhum SQL foi reaplicado.

SQL identico ao blob autorizado:

- SHA-256 canonico do Git: `a0acf515abe9c3fa0e225edfdfb47e747ac44cb2f03e6dea5d4f507fe4b118b3`.
- MD5 do blob e da unica entrada SQL registrada pelo Supabase: `fed8a4f7ed76df9162dbe5542a7c6400`.

O runner passou a exigir exatamente um arquivo pelo sufixo da migration de campanhas. O script de backup foi atualizado somente apos a aplicacao para exigir as 20 versoes em backups futuros. Defaults de restore agora apontam para o arquivo novo validado, mantendo hash/tamanho como guardas. Nenhuma alteracao no codigo funcional autorizado ou na arquitetura.

## Postflight

Comparado imediatamente apos a DDL e novamente depois dos testes HTTP:

- **49 relacoes anteriores** com contagens e fingerprints identicos, incluindo dados publicos/CRM, Auth e metadados Storage. Nenhum registro comercial, sessao Auth ou conta foi modificado.
- Fingerprints anteriores de ACL/policies/RLS, permissoes de funcoes, definicoes das funcoes existentes de public/crm_private, grants de schema e papeis PostgreSQL identicos.
- `crm_campaigns`, `crm_lead_attributions` e `crm_private.campaign_receipts` vazias: **0 / 0 / 0**, com RLS ativo.
- Tabelas publicas: somente SELECT autenticado sob policies; INSERT/UPDATE/DELETE autenticados diretos negados. Anon e PUBLIC sem privilegios.
- Recibos privados: sem SELECT ou escrita para anon/authenticated/PUBLIC, sem policy permissiva.
- Duas sequencias novas sem USAGE/SELECT/UPDATE para anon/authenticated/PUBLIC.
- Somente os dois novos RPCs concedem EXECUTE autenticado; anon/PUBLIC sem EXECUTE. Owner postgres, SECURITY DEFINER, search_path=public conforme SQL autorizado. Nenhuma funcao anterior substituida.
- Zero tabelas publicas sem RLS. Nenhuma chamada comercial externa acionada.

MD5 das definicoes novas: `crm_save_campaign` = `6d7dd12b20d156c26fab8cc6e9e5d46c`; `crm_capture_campaign_lead` = `30390ee5c3100e66593aa14e412b16b4`.

## Validacao desta execucao

| Cenario / ambiente | Resultado | Status |
| --- | --- | --- |
| Backup e restore Windows/PostgreSQL isolado | Novo backup de 19 versoes, RESTORE PASS, original preservado | PASS |
| Copia restaurada, claims sinteticas | 11 grupos; fixtures e notificacoes revertidas; nao e JWT real | PASS |
| PGlite isolado | 274/274 checks, incluindo 15 grupos de campanhas | PASS |
| Codigo/handlers com mocks | 38/38 testes | PASS |
| REST real anonimo de staging | 7/7 negativas: leitura/escrita direta das duas tabelas, dois RPCs e tentativa de schema privado; nenhum contato criado | PASS |
| Guard de staging local | 5/5: aceita chave/projeto verificados; recusa producao, projeto errado, chave desconhecida e credencial privilegiada | PASS |
| Lint / TypeScript / build | Exit 0; Next.js 16.4.3 com guard da branch de campanhas ativo | PASS |
| Auditoria runtime npm | Zero vulnerabilidades reportadas | PASS |
| Metadados e preservacao apos DDL/HTTP | Objetos novos vazios/restritos; registros e permissoes anteriores intactos | PASS |
| JWT real dos quatro perfis | Nao executado; claims locais nao substituem sessoes Auth | BLOCKED |
| Concorrencia multisessao | Nao executada; repeticao sequencial nao comprova concorrencia | BLOCKED |
| Interface autenticada desktop/mobile | Novo preview nao autorizado/publicado | BLOCKED |
| Entrada automatica Meta/Google/WhatsApp/custos | Fora desta entrega; nao apresentar campos manuais como integracao verificada | FORA DO ESCOPO |

Nenhum FAIL nos cenarios executados; os bloqueios impedem declarar homologacao integral ou prontidao para producao. Confirmacoes manuais anteriores nao foram atribuidas ao agente.

Advisors apos a DDL: INFO de RLS sem policy (recibos privados sao deny-all por desenho), WARN de funcoes SECURITY DEFINER executaveis e protecao contra senhas vazadas desabilitada. Nenhum ajuste Auth ou permissao fora do escopo. Referencias: [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protecao de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auditoria npm sem vulnerabilidades nao significa ausencia de avisos de configuracao.

## Evidencias e proxima etapa

- `tests/security/crm-campaign-staging-deployment-20261029.json`: backup/restore sanitizados, preflight, objetos, grants e comparacao antes/depois.
- `tests/security/crm-campaign-agent-local-20261029.json`: nova execucao PGlite; evidencia anterior preservada.
- `tests/security/crm-campaign-agent-anon-http-20261029.json`: sete negativas HTTP reais, sem corpos privados.
- `tests/security/crm-campaign-agent-guard-20261029.json`: cinco checks locais, sem deploy.
- Runners e SQL de teste/read-only versionados. Nenhum dump, roles.sql, SQL decodificado de backup, log privado, senha, cookie, JWT, HAR ou URL assinada utilizavel no commit.

Publicacao automatica da branch continua desativada no vercel.json, sem mudanca de configuracao Vercel. Commit de reconciliacao sera informado na entrega e no PR #8, pronto para autorizacao separada de preview. As variaveis Vercel da nova branch nao foram configuradas ou verificadas nesta rodada; antes do preview autorizado, conferir o escopo exclusivo de staging, chave publica e analytics/webhook externos desativados. Nao reaplicar esta migration para publicar a interface. Depois do preview autorizado, homologar os quatro perfis, UI desktop/mobile, fallback e concorrencia com fixtures ficticias e sessoes legitimas, sem modificar producao ou contas.
