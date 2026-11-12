# Etapa 03 - Backup atualizado e restauracao isolada

## Decisao

**PASS para o gate de backup/restauracao do banco. APTO para solicitar autorizacao especifica de aplicacao, condicionada a revisao Work e preflight imediato.** Nao constitui autorizacao de aplicacao nem homologacao de seguranca HTTP. Nenhuma migration, deploy, merge, escrita remota ou alteracao de usuario foi realizada.

Branch: `work/crm-stage03f-controlled-fixes-20261109`, PR #16 Draft. Commit-base da recuperacao: `bdb5f06dc489ca7247ebbd9b47fc31b50a993243`. Este complemento e preparado para versionamento e revisao independente; o commit de publicacao e o resultado da CI serao registrados na conversa do PR. O relatorio readonly de 11/11 permanece como evidencia historica: seu bloqueio de backup e atualizado por este complemento, nao apagado.

## Backup real

- Fonte exclusiva: staging `sdpqphiooiuglywcmkxv`; PostgreSQL 17.11.
- Conexao direta com TLS exigido e `default_transaction_read_only=on`. Senha somente via campo local mascarado, temporaria no processo, sem argumento CLI, chat ou Git.
- Copia logica pg_dump custom, com snapshot consistente do arquivo; roles separados sem senhas de roles. O dump inclui dados privados e hashes Auth, portanto continua privado.
- Conclusao UTC: `2026-11-12T13:47:27.5848617Z`.
- Arquivo: `885434` bytes.
- SHA-256: `76e2026889d7325df891e8c4eb5616b0b7ff3f93f9a84b408699d5c8b7a94567`.
- SHA-256 do manifesto: `74300323d5cae8057795de7f12033baab6c137dfda9fe5fc99c04505a7330878`.
- Hashes do dump e de roles.sql conferidos; listagem e decodificacao do arquivo PASS.
- Local privado: `%LOCALAPPDATA%\PrivilegeCRM-Backups\staging-20261112-104636-8b9c2406`. ACL restrita ao usuario local e SYSTEM. Nao enviar arquivos desse diretorio ao GitHub.
- Manifesto confirma exatamente as 22 versoes esperadas, incluindo `20261105172215`; migration de seguranca ausente.
- Clientes pg_dump, pg_dumpall, pg_restore e psql: 17.11. Comparacao do catalogo antes/depois do dump estavel no comparador original; limitacao de normalizacao resolvida abaixo.
- Contagens auxiliares foram obtidas antes do dump, nao no mesmo snapshot transacional. Igualdade das contagens selecionadas nao prova igualdade de todas as linhas com um staging posterior.

## Restauracao real e revisao das diferencas

Docker Desktop inicialmente indisponivel; inicializado localmente. Reutilizado somente o container isolado aprovado `privilege-crm-restore-20261028`, com imagem fixada por digest no script. Rede `none`, nenhuma porta publicada, nenhum bind mount, nao privilegiado. Nao foram extraidas variaveis secretas do container.

Criado banco novo `privilege_restore_c740251b811a`. SHA do arquivo copiado conferido. pg_restore com `--single-transaction --exit-on-error` terminou com exit 0. Nenhum banco anterior foi sobrescrito ou removido. Servidor local PostgreSQL **17.6**, UTF8, diferente do patch 17.11 da fonte; clientes host 17.11. Esta prova cobre PostgreSQL major 17, nao identidade de patch.

O primeiro comparador retornou REVIEW_REQUIRED. Diagnostico encontrou tres problemas de representacao no comparador novo: UNION inferia tipo `name` e truncava textos a 63 bytes; `search_path` diferente mudava nomes qualificados; `attnum` fisico mantinha lacunas de colunas removidas, compactadas pelo dump. Corrigido o comparador para texto sem truncamento, search_path pg_catalog e ordinal logico. Nenhuma definicao remota ou dado foi alterado para obter igualdade.

Consulta normalizada real ao staging, somente leitura, comparada ao banco restaurado: **10/10 categorias iguais**, incluindo 5 schemas, 88 tabelas, 807 colunas, 107 funcoes, 4 views, 379 constraints, 50 triggers, 130 policies, 2501 grants de relacoes e 313 grants de funcoes. Zero indices invalidos em ambos os ambientes. Contagens selecionadas e historico de migrations coincidem com o manifesto; zero tabelas publicas sem RLS. Nao se realizou login Auth ou teste de bytes Storage.

O manifesto e o relatorio inicial REVIEW_REQUIRED foram preservados sem adulteracao. Resolucao complementar: `restore-normalized-validation.json` na pasta privada e evidencia sanitizada `tests/security/crm-stage03-backup-restore-20261112.json`. Para futuras copias, os scripts usam o comparador corrigido. Nao reutilizar o manifesto antigo para esperar hashes do algoritmo novo.

A comparacao normalizada complementar foi executada pelo mesmo Codex implementador. Nao representa auditoria independente do Work, nova restauracao ou execucao completa do script final contra o manifesto antigo. A conclusao PASS combina a restauracao transacional efetiva, as verificacoes de integridade e a comparacao corrigida posterior. Os fingerprints MD5 sao resumos de equivalencia de catalogo, nao assinaturas criptograficas; a integridade dos arquivos e do SQL usa SHA-256.

Nao foram necessarias adaptacoes novas de roles/extensoes: a imagem Supabase local previamente preparada satisfez as dependencias e os grants comparados. Isso nao prova restauracao em PostgreSQL vanilla sem preparacao dessas dependencias.

## Preflight renovado somente leitura

Historico remoto permanece exatamente com 22 migrations; proposta `20261111151927_crm_stage03_security_surface.sql` ausente. Nenhum lock aguardando e nenhum indice invalido na amostra. Zero tabelas publicas sem RLS; catalogo/grants/policies correspondem ao restore no escopo conferido.

As tres views administrativas continuam com SELECT para anon, achado preexistente que o patch pretende corrigir. `property_metrics` permanece publico. As tres RPCs quick-service negam EXECUTE a anon e permitem authenticated; isso nao substitui testes reais de sessao/carteira. set_user_role e sync_property_media_arrays ainda apresentam os grants pre-patch conhecidos; nao foram abertos ou corrigidos nesta rodada. Apresentacoes publicas preservam os grants existentes.

SQL aprovado inalterado, SHA-256 `042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d`. Nenhum ensaio novo dessa migration nesta rodada: a autorizacao atual e backup/restauracao e preflight, e o ensaio isolado anterior continua evidencia separada.

## Validacao e arquivos

- Parser PowerShell dos dois scripts: PASS.
- Regressao do backup: 4 PASS.
- npm test: 189 PASS, zero falhas.
- npm run lint: PASS.
- npm run typecheck: PASS.
- git diff --check: PASS.
- Build/CRM-local nao repetidos: sem mudancas em runtime Next.js ou SQL de aplicacao. Nao se apresentam resultados antigos como novos testes.

Alterados: scripts/backup-crm-staging.ps1 e scripts/restore-crm-backup-local.ps1. Novos: scripts/crm-backup-schema-fingerprint.sql, tests/crm-backup-baseline.test.mjs, este relatorio e evidencia sanitizada. Relatorios readonly anteriores nao rastreados foram preservados.

## Preparacao para auditoria independente

Em 12/11/2026, revisados todos os nove arquivos modificados/nao rastreados desta entrega. Inspecao de conteudo e busca de padroes de credenciais/JWT/chaves privadas, URLs com senha, e-mails pessoais e assinaturas de dumps: nenhum achado nesses arquivos. Somente nomes de objetos, refs tecnicas de staging, hashes, contagens agregadas e resultados entram no Git; nao ha strings de conexao, senhas, dados de clientes ou JWTs. Referencias a papeis como service_role nao sao valores de chaves.

O dump, roles.sql, manifesto privado original, logs e demais arquivos de restauracao permanecem fora da arvore Git, com originais preservados. Os relatorios readonly de 11/11 sao publicados como contexto historico sanitizado, sem reclassificar seus testes autenticados BLOCKED. O vercel.json ja bloqueia deployments automaticos desta branch e nao foi alterado. Nenhuma mudanca em workflow, ambiente, dependencia ou SQL aprovado e necessaria para publicar estas evidencias.

Revisao Work sugerida: confrontar os dez fingerprints e contagens da evidencia JSON com o algoritmo SQL versionado; conferir limites do snapshot e diferenca de patch; verificar a cadeia REVIEW_REQUIRED -> diagnostico -> comparacao complementar PASS; confirmar SHA-256 do SQL inalterado. Nao tratar PASS de recuperacao como aprovacao de seguranca autenticada ou autorizacao de aplicacao.

## Limites e proxima decisao

Backup do banco nao recupera integralmente Supabase: bytes Storage, configuracoes SMTP/OAuth/Vercel/Functions, chaves e servicos externos exigem procedimentos separados. Nenhum dump, roles.sql, dado pessoal ou segredo e incluido na evidencia versionavel.

Gate de recuperacao atualizado encerrado. Ainda dependem de Work: revisao independente deste complemento, aceite da diferenca de patch e decisao de solicitar autorizacao especifica. Homologacao HTTP autenticada pendente nao recebe PASS por causa deste restore. Na janela futura, renovar projeto/hash/historico/locks/ACL e avaliar mudancas materiais posteriores ao backup antes de qualquer escrita. Nao aplicar agora.
