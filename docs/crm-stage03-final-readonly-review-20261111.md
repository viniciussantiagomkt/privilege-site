# Etapa 03 | Revisao adicional e preflight de decisao
Data: 11/11/2026. Commit auditado: bdb5f06dc489ca7247ebbd9b47fc31b50a993243.
PR #16 Draft, sem merge. Issue de coordenacao: #18.

## Natureza da evidencia
Este executor Codex participou da implementacao. Esta e uma revisao adicional com novas conferencias de catalogo/HTTP, NAO uma atestacao de independência por outro auditor Work. A decisao independente de Work permanece separada.
Codigo, SQL aprovado, dependencias, usuarios, configuracoes e dados comerciais nao foram alterados. Nenhuma migration/deployment foi executada. Somente estes relatorios/evidencias locais foram criados; HEAD bdb5f06 preservado, sem commit/push nesta rodada.

## Parecer
**NAO APTO para liberacao/aplicacao imediata ou para solicitar autorizacao incondicional de execucao.**
**Patch tecnicamente compativel no recorte revisado; sem correcao adicional indispensavel identificada no SQL.**
O impedimento operacional concreto e o ponto de recuperacao desatualizado: ultimo backup disponivel cobre 21 migrations, enquanto o staging atual tem 22. E necessario renovar backup, provar restauracao isolada dessa copia atual e renovar o preflight na janela de aplicacao. A revisao independente Work e os gates HTTP pendentes nao devem ser declarados concluidos.
Pode-se solicitar a proxima autorizacao especificamente para preparar/validar o ponto de recuperacao e, depois, decidir a aplicacao unica condicionada. Este parecer nao executa nem autoriza essas acoes.

## 1. Artefato e CI
- HEAD local e PR: bdb5f06dc489ca7247ebbd9b47fc31b50a993243, branch work/crm-stage03f-controlled-fixes-20261109, Draft.
- CI #88: SUCCESS, run 43055739060. Os 185 testes de codigo/396 locais sao resultados anteriores confirmados pela CI e evidencias versionadas; NAO foram reexecutados sem necessidade nesta auditoria.
- SQL: supabase/migrations/20261111151927_crm_stage03_security_surface.sql.
- SHA-256 recalculado: 042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d, identico ao aprovado/snapshot.
- Nenhum Preview antigo foi apresentado como runtime do novo commit. Os testes abaixo usaram diretamente a API do staging pre-migration.

## 2. Ensaio isolado e dependencias revisados
Evidencia local crm-stage03-surface-rehearsal-20261111.json: resumo 396 PASS, zero FAIL; 37 checks especificos surface, incluindo as cinco provas de trigger. O arquivo tem antes/depois reais gerados pelo runner, nao so mensagens de aprovacao.
Conferidos: tres views anon true->false com authenticated preservado; quatro RPCs de cliente ja negadas para anon; set_user_role/sync restringidos; trigger-only sem anon; property_metrics identica; capacidades publicas preservadas.
As quatro definicoes das views do snapshot anterior coincidem com o catalogo remoto atual. Os 13 corpos de funcao coincidem com o staging apos normalizar somente CRLF/LF; nao houve deriva semantica identificada nesse conjunto. MD5 e usado como comparador de catalogo, nao assinatura criptografica de autorizacao; o SQL aprovado usa SHA-256.

Auditorias npm10/npm11 possuem o MESMO hash do lockfile corrente:
f8695dc973a15260fa706d2441444e8bf269a63bb7894d95c1799cdccb662550.
- npm 10.9.9: oito moderadas.
- npm 11.12.1: sete moderadas.
- Diferenca: eslint-config-next, metavulnerabilidade propagada da cadeia typescript-eslint/minimatch.
- Producao: zero em ambas as evidencias.
- Pacotes: cinco @typescript-eslint (eslint-plugin, parser, type-utils, typescript-estree, utils) e typescript-eslint 8.59.4; minimatch 10.2.5; adicional npm10 eslint-config-next 16.4.3. Todos dev no lock.
- Confrontado com log CI #87 ja preservado e com os argumentos/JSON reais. Base publica de advisories e temporal; nao se repetiu consulta ao registry desnecessariamente.
- Risco residual dev de DoS no lint/CI, sem novo caminho de runtime do CRM demonstrado. Nao se alterou package/lock ou executou audit fix.

## 3. Preflight remoto somente leitura
Projeto confirmado pelo conector oficial: privilege-imoveis-staging, ref sdpqphiooiuglywcmkxv, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- Historico: 22 migrations, ultima 20261105172215. Proposta 20261111151927 ausente.
- Tres views administrativas ainda concedem SELECT a anon/authenticated e usam security_invoker=true. E a superficie atual conhecida que a migration pretende restringir.
- property_metrics mantem contrato/grants e security_invoker.
- Seis RPCs privados/administrativos existem com assinaturas esperadas; quatro de clientes negam anon, set_user_role e sync ainda tem grant anon, com guardas internas.
- RLS habilitada em clients, leads, tasks, visits, crm_contact_links, crm_event_log, audit_logs e user_roles. FORCE RLS=false: nao equivale a falta de RLS, mas nao restringe proprietario/bypass/SECURITY DEFINER.
- Boundaries RESTRICTIVE de clientes, leads, tarefas, visitas, eventos e auditoria foram conferidas; titularidade propria preservada. Nao se avaliou carteira comercial nem se usaram claims SQL como sessao real.
- Nenhum lock aguardando no instante da consulta; isso nao garante ausencia de locks futuros.
- Achado de limite ambiental: auth.users nao possui trigger nao-interno e public.handle_new_auth_user nao tem vinculo em pg_trigger. A funcao existe, mas o ensaio TEMP local nao prova hook hospedado ativo. Nao e alteracao causada pela migration (nao aplicada); nao instalar hook sem escopo proprio. O patch de ACL nao depende de um hook existente para executar, mas nao se deve afirmar preservacao funcional de cadastro automatico Auth por esse teste.

Security Advisors atuais, baseline pre-aplicacao:
- INFO rls_enabled_no_policy: 3 (crm_private.ad_sync_leases, crm_private.campaign_receipts, public.property_code_registry). Ausencia de policy nao significa acesso liberado; sem permissiva o acesso sujeito a RLS e negado.
- WARN anon_security_definer_function_executable: 16. O patch pretende reduzir sete grants desnecessarios; nove funcoes publicas justificadas podem permanecer. Contagem pos-migration ainda NAO executada.
- WARN authenticated_security_definer_function_executable: 40; nao e automaticamente vulnerabilidade, exige avaliar guardas de cada contrato.
- WARN auth_leaked_password_protection: 1, protecao contra senhas vazadas desativada. Pendencia de configuracao/risco preexistente, nao alterada nem resolvida por ACLs.
Referencias:
[Advisor RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[Advisor anon SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[Advisor authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[Protecao de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 4. HTTP efetivamente executado (18 chamadas, nenhuma mutacao de negocio)
Somente chave publica anon oficial do staging, ref/role conferidos em memoria. Nao foi criado usuario/sessao de corretor. Nenhum header/token/dado pessoal foi registrado.
POSTs privados foram feitos apenas apos conferir ausencia de EXECUTE ou guarda anon antes de escrita; target_client/property=-1 e UUIDs sinteticos. Abertura publica usou consented=false, que retorna antes de gravar. Nao se chamou captura de leads, view tracking ou abertura consentida verdadeira.
HEAD de views usou limit=0, sem buscar linhas comerciais.

| Grupo | Resultado observado | Classificacao |
| --- | --- | --- |
| H11: save/contact/timeline anon | 3x HTTP 401, code 42501 | PASS negativo |
| H16: set_user_role/sync anon | 2x HTTP 401, code 42501 | PASS negativo por guarda atual; grants ainda publicos |
| H12: HEAD tres views admin | 3x HTTP 200 | Exposicao preexistente CONFIRMADA; criterio de negacao pos-patch NAO EXECUTADO, nao declarar PASS de hardening |
| H14: HEAD property_metrics | HTTP 200 | PARCIAL: endpoint publico preservado; nao prova isolamento de todas as linhas |
| H22: UUID bem formado inexistente | HTTP 200 null | PASS apenas token inexistente; expirado/revogado BLOCKED |
| H24: abertura sem consentimento | HTTP 200 false | PASS apenas ausencia de consentimento; token valido/replay nao executados |
| GET anon clients/leads/tasks/visits/audit_logs, select=id limit=1 | 5x HTTP 200 [] | PASS negativo limitado as leituras anonimas observadas |
| GET anon crm_event_log | HTTP 401/42501 | PASS negativo |
| GET Auth /user sem sessao de usuario | HTTP 403, nenhum usuario retornado | Negativa real; nao prova login de perfil algum |

As cinco respostas 200 [] foram avaliadas pelo conteudo vazio, nao aprovadas somente pelo status. Os erros de RPC observados nao continham campos sensiveis detectados; nao se declara ausencia universal de leaks em caminhos nao exercitados.
Nenhum POST com consented=true ou payload autorizado mutante foi feito, nem modificacao de cliente/usuario/midia. Os IDs ou tokens aleatorios usados nao foram registrados nos relatorios.

## 5. Revisao dos 28 cenarios
Roteiro validado: docs/crm-stage03-http-homologation-plan-20261111.md.
- H01-H10, H13, H15, H17-H21, H25-H27: BLOCKED quanto aos casos autenticados/positivos, por falta de sessoes proprias legitimamente fornecidas e, em operacoes mutantes, autorizacao especifica/fixtures.
- H11/H16: negativas anon executadas conforme tabela.
- H12: grant pre-migration confirmado; negacao esperada somente apos futura aplicacao autorizada.
- H14: somente acessibilidade HEAD; inspecao autenticada/RLS de registros continua pendente.
- H22: token inexistente executado; capacidade expirada/revogada nao disponivel legitimamente.
- H23: BLOCKED; nao executar abertura consentida com capacidades para as quais nao ha fixture autorizada.
- H24: somente consentimento false; DTO valido/evento/replay dependem de fixture e autorizacao.
- H28: PARCIAL, sem campos sensiveis nas negativas observadas; restante BLOCKED.
O roteiro distingue SQLSTATE 40001 de HTTP: classe40 pode retornar 500; exigir erro controlado/code40001 e nenhuma mutacao, nao presumir 409 ou aprovar 500 generico. Preserva o contrato do SQL.
Nao ha extracao de JWT/cookies do navegador ou sessao artificial. Nao se repetiram tentativas de Computer Use ja bloqueadas pela politica de URL.

## 6. Backup e restauracao: integridade antiga confirmada, frescor insuficiente
Ultimo diretorio de backup disponivel na raiz privada verificada: staging-20261105-135850-b4a75284.
- Manifesto concluido 2026-11-05T16:59:43.7985517Z.
- Dump presente, 863257 bytes; SHA-256 ff117eda66b14da33659a62ce4a2e5e897395a1b9c6e3ba249584da0f50b98ac recalculado e igual ao manifesto.
- Hash de roles.sql confere com manifesto; conteudo/credenciais nao lidos nem impressos.
- Dois relatorios de restore separados: PASS, exit 0, archive_unchanged=true, comparacoes sem diferencas, nenhuma conexao remota; hashes referenciam o dump conferido.
- Campo historico test_restore=NOT_EXECUTED no manifesto nao foi adulterado: os resultados de restauracao estao nos relatorios separados.
- Backup registra 21 migrations anteriores a quick_service. Staging atual tem 22; apos a homologacao houve oportunidade de novos dados. Nao foi provada igualdade dos dados atuais com a copia antiga.
- Os restores antigos foram realizados em PostgreSQL 17.6, enquanto staging e 17.11; diferenca conhecida, nao valida automaticamente futura copia. Renovar restore compativel e registrar patch/imagem.
- PGlite 396 PASS e ensaio de migration local, NAO restauracao de dump atual de staging.
- Dump nao inclui bytes Storage, SMTP/OAuth/Vercel/Functions, chaves originais de Vault; nao constitui recuperacao integral Supabase.

Para fechar este gate: novo backup consistente cobrindo as 22 versoes e dados atuais, manifesto/hashes/roles, restauracao isolada transacional desse novo dump, comparacao estrutural/ACL, prova do ensaio do SQL aprovado sobre essa copia e plano para preservar dados posteriores. Revalidar alteracoes materiais de identidade/papeis/titularidade sem exigir timestamps Auth eternamente iguais.
Nao foi iniciado backup/restauracao nesta auditoria; nao se pediu senha nem se reutilizou credencial anterior.

## 7. Decisao segura e proximas evidencias
Nenhuma divergencia de SQL/corpos/definicoes no conjunto revisado exige reescrever o patch. Dependencias reconciliadas, hash e CI validos. A melhoria de grants continua tecnicamente justificada.
Antes de liberar aplicacao, fechar recuperacao atualizada, registrar aceite/revisao independente Work das ressalvas e preflight imediato (projeto/SHA/historico/locks/ACL). Testes HTTP autenticados e capacidade publica valida permanecem explicitamente nao homologados.
A eventual autorizacao deve delimitar uma unica migration no staging e postflight de grants/RLS/Advisor, sem historicas em lote e sem repetir chamada ambigua.
A ausencia de sessoes nao autoriza enfraquecer RLS ou fabricar autenticacao. A ausencia de hook Auth nao autoriza criar gatilho/usuarios como parte desta revisao. Advisor de senhas requer decisao propria, nao mudanca automatica.
Nenhuma acao proibida executada.

## Evidencias locais novas
- tests/security/crm-stage03-readonly-decision-20261111.json: verificacoes de commit/hash/dependencias, catalogo/RLS/Advisor e backup.
- tests/security/crm-stage03-anon-readonly-http-20261111.json: 18 resultados HTTP sanitizados.
- Este relatorio, sem alteracao do commit obrigatorio.
