# Etapa 03D | Divergência Auth, backup renovado e ensaio isolado

**Atualização posterior, com nova autorização explícita:** migration aplicada uma única vez somente no staging como `20261105172215_crm_quick_service.sql`, mesmo conteúdo/hash. [Aplicação e postflight PASS](crm-quick-service-staging-application-20261105.md). O restante deste documento preserva a avaliação anterior à autorização; não instrui reaplicação. Preview e homologação autenticada seguem pendentes.

## Decisão e escopo

**APTO PARA AUTORIZAÇÃO específica de aplicação no staging, não autorizado a aplicar.** A divergência foi delimitada; não houve indício de mudança de acesso nas comparações realizadas. Novo ponto de recuperação foi produzido e restaurado. A causa exata do timestamp permanece inconclusiva e não foi convertida em comprovação de login legítimo.

PR #15 em rascunho, branch `work/crm-broker-quick-service-20261104`. Base auditada local/remota e no PR: `ed7d7bc896282a65adfb156382e3da880fe50cbe`; commit desta entrega contém somente documentação/evidências. Projeto autorizado: `privilege-imoveis-staging`, ref `sdpqphiooiuglywcmkxv`, PostgreSQL 17.11. Nenhuma produção consultada ou alterada.

SQL preservado: `20261104193943_crm_quick_service.sql`, SHA-256 `da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa`. Nenhuma mudança de código funcional, SQL, RLS, usuários ou titularidade.

## Investigação de leitura

Comparado o snapshot original restaurado em `privilege_restore_b09d84436ab2` com o staging. Nas 55 tabelas selecionadas (public, crm_private, histórico, auth.users/identities e metadados buckets/objects), somente auth.users divergiu. Os identificadores de linha e valores de cada coluna foram comparados por assinaturas efêmeras com sal aleatório; somente nome da coluna e quantidade de divergências foram retornados da consulta remota. Não foram publicados IDs, e-mails, telefones, tokens, hashes de senha ou metadados pessoais. Assinaturas auxiliares não foram versionadas.

| Objeto/campo | Registros com diferença |
| --- | --- |
| auth.users.updated_at | 1 |
| Demais colunas de auth.users | 0 |
| auth.identities | 0 |
| Dados das demais 54 tabelas comparadas, incluindo papéis e vínculos comerciais | 0 |

Sem usuários adicionados/removidos na comparação por identidade, sem diferença nos campos de credencial, identidade, banimento, papéis ou metadados de autorização. Estrutura, políticas e grants também coincidiram com o baseline. Isso não é uma auditoria forense de todos os serviços externos do Supabase.

**Classificação: CAUSA INCONCLUSIVA.** A diferença é exclusivamente um timestamp operacional; não é suficiente para afirmar qual operação ou ator o atualizou. A consulta agregada ao audit_log_entries no intervalo após o manifesto antigo não apresentou ações; isso não prova ausência de atividade nem identifica a origem. Não presumimos login/refresh só porque a contagem permaneceu igual. Não foi identificado indicador de alteração indevida de permissões ou identidade que impedisse produzir um novo backup.

## Novo backup

Procedimento homologado `scripts/backup-crm-staging.ps1`, sem alterações, com conexões de leitura, SSL e default_transaction_read_only. Credencial fornecida somente no diálogo local mascarado, temporariamente no ambiente do processo filho e descartada ao encerrar. Helper privado fora do Git. A primeira janela oculta não apareceu; foi encerrada ainda aguardando entrada, sem cliente PostgreSQL filho, e reaberta em modo visível. A pasta incompleta foi preservada e não conta como backup.

- Pasta privada: `%LOCALAPPDATA%/PrivilegeCRM-Backups/staging-20261105-135850-b4a75284`.
- Manifesto concluído UTC: **2026-11-05T16:59:43.7985517Z**; não confundir com início exato do snapshot.
- Arquivo: `staging-database.dump`, **863.257 bytes**.
- SHA-256: `ff117eda66b14da33659a62ce4a2e5e897395a1b9c6e3ba249584da0f50b98ac`.
- pg_dump, pg_dumpall, pg_restore e psql: **17.11**.
- ACL protegida: somente usuário local/SYSTEM, duas regras. Manifesto e hash de roles conferidos; listagem e decodificação completas PASS.
- Histórico: **21 migrations**, versões exatas até `20261030185925`; Etapa 03 ausente.

Backup antigo `staging-20261105-094609-144abeff` e seu manifesto preservados; arquivo reconferido em `7de5eb4fc27c0b7badeb72b0dbb246d4ca4e29f3b6ab32558a0afb2d4129590f`. O campo histórico test_restore=NOT_EXECUTED dos manifestos não foi adulterado: a comprovação efetiva está nos relatórios separados de restauração.

O dump de banco é consistente pelo snapshot transacional interno do pg_dump. As contagens auxiliares do script são anteriores e não foram apresentadas como parte da mesma transação. Não inclui bytes de Storage, configurações SMTP/OAuth/Vercel/Functions ou recuperação das chaves originais de Vault. Não é recuperação completa da plataforma.

## Restauração comprovada e comparação

Procedimento homologado `scripts/restore-crm-backup-local.ps1`, sem alterações. Dois bancos novos, nunca substituindo bancos anteriores:

- `privilege_restore_1094a54173ff`: restauração PASS e depois ensaio da migration.
- `privilege_restore_4d74a81dca6c`: restauração independente PASS, conservada sem a migration.

PostgreSQL 17.6 local, diferença de patch explicitada frente ao staging 17.11. Imagem `supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00`, Docker desktop-linux via named pipe, rede none, sem portas/binds/privileged. Restaurações transacionais com exit-on-error e saída zero; sem erros ignorados. Contagens do manifesto, histórico e verificações de segurança PASS; arquivos originais intactos.

Com search_path equivalente, assinaturas coincidentes de **88 tabelas, 375 constraints, 101 funções, 49 triggers, 130 políticas, 1.956 grants de tabelas e 297 grants de funções**. Antes do ensaio, também houve igualdade de conteúdo nas 55 tabelas selecionadas entre a nova restauração e o staging naquele instante, incluindo usuários e identidades. Só resultado agregado foi divulgado; não persistimos comparações pessoais no Git. Igualdade nesse instante é evidência adicional, não requisito permanente de operação.

## Migration somente local e testes

Runner versionado inalterado: `tests/crm-quick-service-postgres-local.mjs`, SHA-256 `15607675cfe50ce38290ad8b251f11b8669a3fb175aab7449ee14790a4248815`. Executado sobre o novo backup/restauração, com guarda de hash, branch, imagem e conexão por socket local. Nenhum host/credencial remota no ensaio.

**19 grupos PASS / 0 FAIL**, **74 backends independentes** na fase de contratos/segurança. Verificados novamente: expansão exata de 4 colunas/3 índices/4 constraints/1 trigger/6 funções, sem tabelas novas; funções anteriores, RLS, grants, dados legados e histórico preservados; criações simultâneas, recibos idempotentes, payload divergente, revisão obsoleta, duplicidade/DDD55/prefixos incompletos, isolamento A/B, bloqueio a gestor/admin/anon/inválido/inativo, titularidade forjada, contato único, retry de tasks/visits com auditoria única, contratos legados e preservação de perfil novo, timeline sanitizada.

O runner também repetiu automaticamente sua campanha de desempenho: **60 execuções** (12 combinações com 5 amostras), páginas 0/20/200 e até 300 mil eventos sintéticos adicionais, máximo **94,184 ms**, critério local PASS. Não foi necessário alterar SQL ou índices. Cache aquecido, sem SLA, disco frio ou concorrência de leitores em escala de produção. Mantém-se o risco de varredura/crescimento linear já documentado na 03C.

Usadas identidades e registros fictícios exclusivamente locais. Claims SQL/SET ROLE não equivalem a login JWT/HTTP real. O histórico espelhado da cópia ensaiada continua com 21 versões porque o runner aplica o SQL local, não fabrica registro de migration remota. A segunda restauração mantém os objetos da Etapa 03 ausentes.

Evidência nova: `tests/security/crm-quick-service-stage03d-postgres-20261105.json`. A evidência original da 03C foi preservada byte a byte, com SHA-256 `01baddb5411404780c4e9e5ad8ce20d138f3ecbaaa35cc343efad8fe113fb852`. Os logs integrais privados e os relatórios de restore permanecem junto ao backup; não foram publicados.

**Reutilizados, não reexecutados nesta entrega:** lint, TypeScript, 150 testes de código, 349 verificações PGlite e build aprovados no CI #74 do HEAD base; 34 testes de navegador com fixtures da 03C. Não há mudança funcional que justifique apresentá-los como resultados novos. CI posterior do commit documental deve ser acompanhado separadamente, sem atribuir a ele os ensaios Docker/navegador locais.

## Critério de frescor com Auth em funcionamento

Não se exige igualdade permanente entre snapshot antigo e banco ativo. Não encerramos sessões nem suspendemos Auth para forçar hashes iguais. O ponto de recuperação é aceito por dump consistente, integridade/hash/tamanho/manifesto, restore transacional independente, histórico e assinaturas estruturais correspondentes, e preservação dos dados verificados na cópia.

Antes de aplicação autorizada, registrar o intervalo desde o snapshot e mudanças posteriores. Mudanças apenas em timestamps operacionais de Auth podem ser registradas como posteriores ao ponto de recuperação, sem invalidar automaticamente o dump nem afirmar sua causa. Mudança em identidade, credencial, papéis, permissões, titularidade, estrutura ou histórico exige nova avaliação; dados comerciais novos demandam plano de preservação/reconciliação e renovação do backup conforme a janela. Falha de dump/restore/integridade bloqueia. Nunca substituir produção/staging automaticamente por um snapshot anterior.

## Próxima autorização e recuperação

Recomendação **APTO PARA AUTORIZAÇÃO**, limitada à migration aprovada no staging, após renovação imediata de projeto/HEAD/hash/histórico/dependências/locks e avaliação do intervalo do backup. A causa do updated_at segue inconclusiva, mas não há diferença material de autorização/identidade nos objetos comparados e o novo ponto de recuperação está comprovado.

Somente após nova autorização: uma chamada oficial apply_migration com project_id `sdpqphiooiuglywcmkxv`, name `crm_quick_service` e SQL verificado, sem lote de migrations históricas. Conferir exatamente uma nova entrada (21 para 22), registrar versão efetivamente atribuída pelo serviço e reconciliar seu nome versionado sem reaplicar. Não prometer o timestamp local como parâmetro inexistente do MCP.

Postflight: quatro colunas, três índices, quatro constraints, um trigger e seis funções; índices/constraints válidos; três RPCs SECURITY DEFINER com search_path vazio e autenticação/escopo internos; anon/PUBLIC sem EXECUTE novo, authenticated limitado pelos guardas; políticas/grants antigos, dados e carteiras preservados. Executar Advisors e comparar baseline, distinguindo avisos preexistentes. Sem retry automático em erro/resposta ambígua; conferir catálogo/histórico antes de decidir.

Falha antes do commit: confirmar rollback e ausência de estado parcial. Depois do commit: preservar estado, registrar erro e revisar correção mínima/rollback de aplicação autorizado, mantendo schema aditivo, perfis, recibos e eventos. Erro de RPC/ACL não justifica abrir permissões. Restauração só em destino separado com reconciliação dos dados posteriores antes de qualquer cutover autorizado. Sem DROP CASCADE ou restauração destrutiva automática.

Pendências: autorização explícita e aplicação remota; postflight após essa aplicação; preview somente com autorização própria; homologação autenticada real; desempenho em carga real e recuperação dos serviços fora do banco. Avisos Advisors herdados e risco de coleta global P07 permanecem separados, sem correção fora do escopo. Nenhum preview, merge, produção ou Etapa 04 nesta entrega.
