# Etapa 03 | Fechamento tecnico de seguranca para homologacao

## Fechamento das ressalvas Work (rodada posterior a CI #87)

Referencia de entrada: HEAD 0d573ba, CI #87 aprovada. Esta rodada altera somente instrumentacao/evidencias de auditoria, testes locais e documentacao; nao modifica app, dependencias, lockfile, configuracao remota ou SQL aprovado.

### R01 - Sete versus oito avisos: reconciliado
Log oficial do job 130619502239 / run 43048676256: Ubuntu 26.04, Node v22.23.4, npm 10.9.9, npm ci com 384 pacotes instalados / 385 auditados e **oito** avisos moderados. O log nao contem a lista JSON historica completa de pacotes; a contagem historica esta comprovada, e a lista abaixo vem da reproducao controlada atual.
Reproduzido no MESMO Windows/Node v24.15.0 e MESMO lockfile:
- npm 11.12.1: sete pacotes moderados.
- npm 10.9.9 (versao usada na CI): oito pacotes moderados.
- Ambos: auditoria --omit=dev com ZERO vulnerabilidades.
- O pacote adicional reportado pelo npm 10 e eslint-config-next, via typescript-eslint. E propagacao de metavulnerabilidade do mesmo aviso raiz, nao uma oitava falha independente.
- Aviso raiz: GHSA-g3hv-75wg-m249 / minimatch, DoS por amplificacao de globs. npm nao conta necessariamente um CVE por pacote.
- Lockfile SHA-256 nesta reproducao: f8695dc973a15260fa706d2441444e8bf269a63bb7894d95c1799cdccb662550, inalterado.

| Pacote instalado afetado | Versao | npm 10 | npm 11 | Escopo no lock |
| --- | --- | --- | --- | --- |
| @typescript-eslint/eslint-plugin | 8.59.4 | Sim | Sim | dev |
| @typescript-eslint/parser | 8.59.4 | Sim | Sim | dev |
| @typescript-eslint/type-utils | 8.59.4 | Sim | Sim | dev |
| @typescript-eslint/typescript-estree | 8.59.4 | Sim | Sim | dev |
| @typescript-eslint/utils | 8.59.4 | Sim | Sim | dev |
| typescript-eslint | 8.59.4 | Sim | Sim | dev |
| minimatch (filho de typescript-estree) | 10.2.5 | Sim | Sim | dev |
| eslint-config-next | 16.4.3 | Sim | Nao reportado | dev |

Evidencias: tests/security/crm-stage03-dependency-audit-npm-10.9.9.json, crm-stage03-dependency-audit-npm-11.12.1.json e crm-stage03-ci87-audit-summary.json.
Reproducao:
1. npm ci com o lockfile versionado.
2. node scripts/audit-stage03-dependencies.mjs (npm instalado, CLI descoberta localmente).
3. Para npm 10, disponibilizar a CLI oficial fixada, por exemplo npx --yes --package=npm@10.9.9 npm --version, localizar seu npm/bin/npm-cli.js e executar node scripts/audit-stage03-dependencies.mjs --npm-cli <CAMINHO_LOCAL_DA_CLI_10.9.9>.
4. O helper executa audit --package-lock-only --json --include=dev e --omit=dev, registry explicitamente https://registry.npmjs.org/, salva versoes/hash/argumentos/dados sanitizados. Codigo 1 do audit com vulnerabilidades e resultado esperado, nao falha de transporte; resultado sem JSON/metadata ou codigo inesperado falha o helper.
5. Para conferir sem helper: npx --yes --package=npm@10.9.9 npm audit --package-lock-only --json; repetir com --omit=dev. O script evidencia os argumentos exatos.
6. Base de advisories e temporal; a reproducao futura pode mudar. Os snapshots registram a consulta efetiva, nao congelam a base publica.
Nenhum npm audit fix, force, override ou upgrade foi executado.

Parecer de risco: existe risco de disponibilidade do processo de lint/CI se receber padroes glob maliciosos, conforme advisory oficial. Nao foi identificado caminho de entrada de globs de usuario do CRM para essa dependencia de desenvolvimento, nem dependencia afetada no grafo de producao auditado. Nao e justificativa demonstrada para alterar emergencialmente a migration ou bloquear seu pedido de autorizacao. Continua recomendada atualizacao compativel/revisada do toolchain; nao forcar minimatch 11 (correcao indicada no advisory) dentro de consumidores que esperam outra major.
Fonte: https://github.com/advisories/GHSA-g3hv-75wg-m249.

### R02 - Ensaio isolado comprovado, SQL imutavel
Arquivo: supabase/migrations/20261111151927_crm_stage03_security_surface.sql.
SHA-256 aprovado mantido: 042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d.
A suite executa esse arquivo num PGlite novo, depois de carregar a cadeia local existente. Nenhuma chamada a banco remoto. Agora captura o catalogo inteiro antes/depois pelo SQL readonly versionado e grava tests/security/crm-stage03-surface-rehearsal-20261111.json.

| Objeto | Antes, anon | Depois, anon | authenticated |
| --- | --- | --- | --- |
| Tres views administrativas | SELECT permitido | SELECT negado | Preservado, consultado por A/B/Gestor/Admin com RLS |
| property_metrics | SELECT permitido | Identico | Identico |
| set_user_role / sync_property_media_arrays | EXECUTE permitido | EXECUTE negado | Preservado |
| Quatro RPCs privadas de clientes | EXECUTE ja negado | Continua negado | Preservado |
| Cinco funcoes trigger-only | EXECUTE permitido | EXECUTE negado | Sem exigir nova permissao para gatilhos |
| Apresentacao publica / abertura consentida | EXECUTE permitido | Preservado | Preservado |

Provas novas explicitas:
- crm_audit_change: INSERT sintetico proprio gera um registro de auditoria.
- crm_set_property_code: INSERT de propriedade local sintetica gera codigo comercial.
- crm_lead_timeline: lead local proprio gera uma atividade lead_created.
- crm_followup_timeline: tarefa local ligada ao lead gera uma atividade de retorno adicional.
- handle_new_auth_user: executado como funcao real de gatilho numa tabela TEMPORARIA, usando identidade sintetica preexistente do adaptador. Cria somente cadastro profissional local inativo e preserva papel admin existente; a contagem auth.users permanece igual. Limpeza apenas dessa linha local ao terminar.
**Limite explicito:** o ultimo caso prova o corpo real em contexto trigger, nao a vinculacao do hook GoTrue/Supabase Auth hospedado. Nao se criou usuario remoto nem conta adicional para esse caso. A suite base recria apenas suas fixtures de banco em memoria, nao contas de homologacao no staging.
Os snapshots provam que definicoes/opcoes de views e corpos/search_path/SECURITY DEFINER das funcoes nao mudam; apenas ACLs previstas. property_metrics e comparada tambem por ACL completa.
Controles positivos de admin, metricas autorizadas, midia propria e apresentacao publica consentida/idempotente continuam passando; tokens invalidos, revogados e expirados nao revelam DTO nem geram eventos.

### R03 - Plano HTTP pronto, execucao bloqueada
Roteiro: docs/crm-stage03-http-homologation-plan-20261111.md.
Inclui 28 cenarios, aliases/fixtures necessarias, requests/payloads, codigos/status esperados, privacidade, verificacao de mutacao, repeticao idempotente e criterios de aprovacao.
Todos os cenarios HTTP desta rodada: **NAO EXECUTADOS / BLOCKED**. Nao ha sessoes proprias autorizadas; nao foram criados usuarios ou registros remotos.
Casos com escrita de fixture precisam de autorizacao especifica futura; a preparacao documental nao a concede. Gestao positiva mutante de papeis permanece bloqueada pelas restricoes, mesmo para admin.
Ressalva de contrato identificada no roteiro: PostgREST mapeia classe SQLSTATE 40 para HTTP 500; a revisao obsoleta 40001 nao deve ser presumida HTTP 409. Exigir codigo 40001/mensagem controlada/ausencia de mutacao, e nao aceitar um 500 generico como resultado esperado. Nao altera o SQL aprovado.
Fonte: https://docs.postgrest.org/en/stable/references/errors.html.

### Resultado da rodada e decisao
- Suite local afetada: **396 PASS / zero FAIL** (390 anteriores + seis provas novas).
- Auditorias completas: sete/npm11 e oito/npm10; producao zero/ambos. Nenhum lockfile alterado.
- Lint: PASS; typecheck: PASS; npm test: 185 PASS / zero FAIL; git diff --check: PASS. Os testes afetados foram reexecutados.
- Nenhum ajuste adicional indispensavel no SQL aprovado foi identificado antes de SOLICITAR autorizacao de aplicacao.
- Permanecem gates para aplicar: revisao Work das evidencias, consumidores externos, backup/restauracao e preflight atualizados com autorizacao explicita. A auditoria HTTP independente nao esta encerrada.
- Aplicacao/homologacao/seguranca de producao NAO aprovadas por estes resultados locais.
- Risco dev e limite do ensaio Auth permanecem documentados, nao escondidos como PASS de integracao real.

## Historico da implementacao e validacao anterior (CI #87)

Data: 11/11/2026, America/Sao_Paulo. PR principal #16, em Draft.
Branch: work/crm-stage03f-controlled-fixes-20261109.
Base revisada: 4d92d0c3061dec4ec5d0d601809720a36e5b197c.
Commit de implementacao: fd8351fb78c30fa5b17fa1eff7267bd71d8cdfd9.
Issue: https://github.com/viniciussantiagomkt/privilege-site/issues/17

## Resultado
**APTO para revisao e preparacao da homologacao de seguranca. NAO e aprovacao de seguranca em staging/producao nem autorizacao de aplicacao.**
Nenhuma migration aplicada remotamente. Nenhum dado real, conta, credencial, RLS remoto, ambiente Vercel ou producao foi alterado. Nenhum novo deployment solicitado. Nao houve merge dos PRs #15/#16/#19.
A homologacao funcional anterior do usuario foi preservada; nao foi repetida como se fosse teste independente.

## Implementado
1. Nova migration gerada com Supabase CLI, exclusivamente local:
   supabase/migrations/20261111151927_crm_stage03_security_surface.sql.
   SHA-256 dos bytes versionados: 042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d.
2. REVOKE SELECT de PUBLIC e anon nas views admin_dashboard_metrics, property_admin_metrics e lead_origin_metrics.
   Mantidos os grants existentes de authenticated, security_invoker=true, definicoes e RLS das tabelas.
3. REVOKE EXECUTE de PUBLIC e anon em set_user_role, sync_property_media_arrays e quatro RPCs privadas de clientes, com EXECUTE authenticated explicito e guardas internas intactas.
4. Removido EXECUTE publico/anon de cinco funcoes trigger-only: crm_audit_change, crm_followup_timeline, crm_lead_timeline, crm_set_property_code e handle_new_auth_user.
   Os gatilhos continuam funcionando no ensaio local depois da revogacao; nao foram removidos nem recriados.
5. Mantidos property_metrics, helpers usados nas policies publicas, increment_property_view e os dois RPCs de capacidade publica de apresentacoes.
6. Dez casos do PR #19 incorporados seletivamente via revisao do diff, sem merge/cherry-pick integral.
   PR #19/a6ae8f2 altera somente tests/crm-quick-service-scenarios.mjs; CI relatado 43041377017 SUCCESS. Sua falha de Preview por env nao foi contornada/copied.
7. Mais 31 verificacoes locais: tres views anon negadas; quatro perfis com metricas autorizadas/RLS; ACLs de seis RPCs/cinco triggers; admin gerindo papel; A/B/gestor/admin contra cliente alheio com payload valido; RLS direta; arquivo/timeline/contato; conflito 40001; replay; sync de midia; capacidade publica valida, invalida, revogada, expirada e consentimento/idempotencia.
8. Duas regressões de codigo: deploy automatico desta branch desativado e SQL historico quick_service imutavel.
9. vercel.json adiciona somente deploymentEnabled=false para a branch do PR #16 antes de qualquer push. Nao configura dominio/variavel, nao altera outras branches nem publica.
10. Query de catalogo versionada tests/crm-stage03-security-grants-readonly.sql para evidencias pre/post aplicacao futura autorizada.

## Dependencias/compatibilidade das views
Busca em app/components/lib nao encontrou consumidor dessas tres views; o CRM usa consultas/RPCs de escopo autorizado e crm_management_metrics. Isso nao exclui consumidores externos desconhecidos, que devem ser inventariados por Work antes da aplicacao.
Dependencias no staging consultado:
- admin_dashboard_metrics: properties, leads, property_views.
- property_admin_metrics: properties, property_views, property_favorites, leads.
- lead_origin_metrics: leads.
- property_metrics: properties, property_views, property_favorites, leads.
Todas usam security_invoker=true. A exposicao anon foi confirmada por catalogo, sem ler os dados comerciais das views.
property_metrics pode ser um contrato publico/externo mesmo sem consumidor encontrado no codigo: foi preservada integralmente. Teste compara definicao, opcoes e ACL antes/depois, alem de consulta anon limitada pela RLS.
authenticated mantem acesso aos indicadores sujeitos a RLS; nao e nova permissao para abrir carteiras de outros usuarios.

## Auditoria dos oito RPCs solicitados
| Funcao | Autenticacao/autorizacao e ownership | Validacao/idempotencia | Decisao |
| --- | --- | --- | --- |
| set_user_role(text,text) | is_privilege_admin antes de consultar usuario; apenas admin ativo | Allowlist de papeis; email alvo; mutacao de papel protegida/auditada | Remover grant anon/PUBLIC; preservar authenticated e guarda. Testes nao-admin 42501 e admin positivo |
| crm_save_quick_client | auth.uid + papel comercial; titular definido pela sessao; cliente alvo proprio e nao excluido | Payload allowlist, tipos, telefone normalizado, interesse, lock por usuario, recibo/action_id/fingerprint, revisao 40001, duplicidade 23505 | Corpo historico preservado; ACL reafirmada; payload VALIDO alheio exige 42501 |
| crm_archive_client | papel comercial e broker_id=auth.uid | ID bigint; nao altera registro alheio; repetir arquivo ja arquivado nega sem nova mutacao | Preservar ownership/sem exclusao fisica; ACL privada |
| crm_client_timeline | sessao + papel + client_readable proprio | Pagina limitada, DTO resumido; nao expor snapshots brutos/auditoria alheia | ACL privada; negativas cruzadas exatas |
| crm_record_client_contact | sessao + papel + client_readable | action_id obrigatorio; chave por usuario/cliente/acao com ON CONFLICT | ACL privada; sem envio automatico |
| crm_public_presentation | Capacidade UUID publica intencional, valid_share exige token vigente/nao revogado, dono habilitado e imoveis autorizados | Retorna DTO seletivo; nao fornece contatos privados do cliente; invalido retorna NULL | Manter anon/authenticated; nao substituir por login obrigatorio |
| crm_record_presentation_open | Capacidade valida e consentimento explicito | UUIDs tipados, nonce, unique share/nonce; false sem consentimento ou link invalido | Manter anon/authenticated; retries geram um evento; rate limit volumetrico nao equivale a limite concorrente rigoroso |
| sync_property_media_arrays | auth.uid, papel comercial, propriedade propria ou operacao autorizada | ID bigint, materializa arrays ordenados de midia; sem criacao de ativo | Revogar anon/PUBLIC; manter authenticated e guardas existentes |

As funcoes SECURITY DEFINER nao foram reescritas sem necessidade. As guardas sao indispensaveis porque o contexto do definidor pode ultrapassar RLS do chamador. O patch modifica ACLs, nao carteiras ou papeis.
Os seis helpers publicos de papel e os tres RPCs publicos de negocio permanecem justificadamente acessiveis; nao se promete eliminar todos os avisos anon SECURITY DEFINER do Advisor.
Parametros UUID invalidos sao rejeitados pelo tipo PostgreSQL; isso nao prova sanitizacao de todos os erros HTTP. Null nonce, abuso/volume e ausencia de papel devem continuar cobertos na auditoria HTTP independente.

## Validacao executada
| Comando | Resultado |
| --- | --- |
| npm ci | PASS, 378 pacotes instalados, sem alteracao de lockfile |
| npm run lint | PASS |
| npm run typecheck | PASS |
| npm test | 185 PASS, zero FAIL |
| npm run test:crm-local | 390 PASS, zero FAIL |
| npm run build | PASS, compilacao/TypeScript/32 paginas estaticas/rotas dinamicas |
| git diff --check | PASS |
| npm audit --omit=dev | Zero vulnerabilidades |

O build usou placeholders iguais ao CI: example.supabase.co e chave ficticia, sem acesso ao banco real ou copia de credenciais. Nao e deployment nem prova de runtime staging.
A suite PGlite carrega o schema isolado, migrations locais e usuarios ficticios; SET LOCAL ROLE/claims sinteticas nao sao sessoes Auth ou HTTP/JWT real.
Evidencia persistida: tests/security/crm-operational-local-results.json, com hashes de SQL e nomes/resultados dos 390 casos.
Delta sobre PR #16: 349 -> 390 testes locais; 183 -> 185 testes de codigo. Dez casos vieram do PR #19; o restante amplia especificamente o novo hardening.
Regressoes repetidas por justificativa: grants de funcoes trigger podem afetar os fluxos de cliente/agenda/midia; suite completa obrigatoria comprova compatibilidade local. Nao se refez homologacao visual ou comercial por simulacao.
O hash historico quick_service permanece da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa.

## Problemas encontrados e tratamento
- Exposicao anon das views administrativas: confirmada por catalogo; correcao preparada, ainda NAO efetiva no staging.
- EXECUTE anon herdado de PUBLIC em set_user_role/sync e triggers: reduzido somente no SQL proposto.
- Teste de negacao generico aceitava erros de validacao como negacao: novos casos usam payload previamente valido e exigem codigo 42501 exato, evitando falso positivo.
- Suite local nao carregava migrations novas automaticamente: encadeamento explicito para o novo SQL, com assert de exatamente um arquivo.
- Deploy automatico nao estava explicitamente desativado para PR #16 em vercel.json: guard local adicionado e testado antes do push.
- npm ci/audit integral reporta sete vulnerabilidades moderadas na cadeia dev do ESLint/minimatch/typescript-eslint. Dependencias de producao: zero na auditoria omit=dev. Nao executei npm audit fix ou upgrade amplo fora do patch; Work deve revisar atualizacao isolada do toolchain.
- Nao foram encontrados testes falhando nesta entrega. Nenhuma alteracao de dados reais foi usada para validar os novos grants.

## Pendencias do ChatGPT Work
1. Revisao independente do diff/migration/hash e da preservacao dos consumidores publicos/externos.
2. Issue #18: HTTP/REST/RPC com sessoes legitimas de anon, A, B, gestor e admin. Positivos, alteracao alheia com payload valido, conflitos, tentativa de escalada e links invalidos/expirados/revogados. Nao extrair tokens do navegador.
3. Os testes autenticados HTTP nesta entrega sao NAO EXECUTADOS; nao ha runner com credenciais legitimas disponiveis. Os dados ficticios existem apenas no PGlite descartado.
4. Aprovacao especifica para backup/restauracao ensaiada/preflight/aplicacao UNICA da nova migration no staging. Nada disso executado agora. Usar query readonly versionada e comparar grants antes/depois.
5. Confirmar que a migration proposta ainda nao esta no historico; nao aplicar migrations historicas em lote. Advisor pre/post deve distinguir alertas necessarios/herdados daqueles resolvidos.
6. Revalidar fluxos ja aprovados somente no que for impactado pelo patch, apos ambiente autorizado: cliente/proprietario/ambos, contato antigo, duplicidade, revisao, supervisao, admin, historico e midia.
7. Avaliar avisos moderados das dependencias de desenvolvimento em mudanca separada.
8. PR #16 continua Draft. Sem merge ou aprovacao de seguranca por CI verde.

## Aplicacao futura e rollback
A migration e transacional, com lock_timeout=5s e statement_timeout=30s. Exige as relacoes/assinaturas existentes; objeto ausente deve falhar e interromper, nao criar estrutura improvisada.
Antes de aplicacao: backup/restauracao e snapshot de ACL/definicoes/historico/Advisor; reconferir branch, SHA do SQL e projeto staging aprovado. Autorizacao atual NAO inclui aplicar.
Se falhar antes do commit: confirmar rollback e historico; nao repetir automaticamente.
Se o resultado for ambiguo: consultar catalogo/historico antes de decidir, sem segunda aplicacao.
Depois do commit: preferir corrigir grant pontual por migration corretiva revisada, preservando RLS e dados. Nunca liberar PUBLIC/anon indiscriminadamente nem usar DROP CASCADE.
Rollback de codigo: preparar revert dos commits do patch em PR separado/revisado. Grants novos sao compativeis com consumidores autenticados anteriores; nao e necessario reabrir views administrativas anon para reverter codigo.
Se restaurar ACL se mostrar indispensavel, usar exclusivamente snapshot anterior confirmado e autorizacao especifica; restaurar anon reintroduziria a superficie identificada e nao e o rollback padrao recomendado.
Nenhuma acao de rollback, restauracao ou deployment executada.

## Arquivos principais
- supabase/migrations/20261111151927_crm_stage03_security_surface.sql.
- tests/crm-operational-local.mjs.
- tests/crm-quick-service-scenarios.mjs.
- tests/crm-security-surface-scenarios.mjs.
- tests/crm-security-surface.test.mjs.
- tests/crm-stage03-security-grants-readonly.sql.
- tests/security/crm-operational-local-results.json.
- vercel.json (somente guard de branch).
- Este relatorio.

Fontes oficiais consultadas: https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/changelog.md (CLI v3: migration new e local). Criacao do arquivo pelo comando oficial migration new, sem db push, apply_migration ou escrita SQL remota.

Conferencia remota final, somente SELECT: 22 migrations, ultima versao 20261105172215, proposta crm_stage03_security_surface ausente. O hardening ainda nao esta ativo no staging.
