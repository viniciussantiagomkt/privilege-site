# Etapa 03 - Correcao isolada de dependencias (18/11/2026)

## Resultado e limites

PASS para a atualizacao compativel e os testes locais, COM RESSALVA de risco dev picomatch. Nao e aprovacao integral de seguranca nem homologacao Auth/RLS remota. Revisao independente PENDENTE.

Base exata: 67b9b114c72e42a551f4df84691acd8761034626.
Branch local: codex/crm-stage03-dependencies-20261118.
Worktree separado: crm-stage03-dependencies-20261118.
PR #16 conferido OPEN/DRAFT, mesmo HEAD de base, sem merge ou alteracao. Worktree original preservado e limpo.

Nenhum push ou PR novo: publicar uma branch nova pode acionar deployment automatico; esta entrega permanece local para revisao. Nenhum deployment solicitado. Nao foi alterado vercel.json para contornar essa restricao.

## Alteracoes minimas

- package.json: somente next 16.4.3 -> 16.4.6 e eslint-config-next 16.4.3 -> 16.4.6, ambos exatos.
- package-lock.json: atualizado pelo npm oficial, Next/env/SWC/plugin alinhados em 16.4.6.
- Cadeia typescript-eslint atualizada de 8.59.4 para 8.73.0 dentro de ^8.56.0, ja declarado por eslint-config-next. O consumidor typescript-estree 8.73.0 declara minimatch ^11.0.1; lock resolve 11.0.9. Sem override.
- Atualizacoes de ignore, semver, brace-expansion e adicao de @isaacs/nonrecursive-glob-match pertencem a essa cadeia dev; 28 entradas de versao do lock mudaram, itemizadas na evidencia.
- React/React DOM 19.2.4, ESLint 9.39.4 e TypeScript 5.9.3 preservados.
- Nenhum codigo funcional, layout, rota, SQL, schema, Auth, RLS, permissao, politica de midia ou configuracao de deployment alterado.

Foram lidos AGENTS.md, node_modules/next/AGENTS.md e os guias incluidos nas versoes instalada/anterior: upgrading, version-16, ESLint e Image. A [release oficial 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6) e os metadados do registry confirmam o par instalado e seus peers. Nao foram usados canary, codemods ou upgrade amplo.

## Auditorias reproduzidas

Node v24.15.0; npm 11.12.1; Windows; registry explicito https://registry.npmjs.org/.
Auditorias usam o lockfile e nao alteram dependencias. A base de advisories e temporal.

| Consulta | Resultado | Exit |
| --- | --- | ---: |
| Integral antes, lock da base | 16 entradas: 7 moderadas, 9 altas | 1 |
| Integral depois | 14 entradas altas, todas dev | 1 |
| Producao depois, --omit=dev | ZERO vulnerabilidades | 0 |

Os dois avisos moderados do Next encontrados na base deixaram de constar na auditoria de producao. O advisory minimatch deixou de constar na integral. A severidade alta propagou-se pela cadeia typescript-eslint/tinyglobby: a contagem de pacotes afetados/metavulnerabilidades NAO e contagem de falhas independentes novas. O resultado integral nao foi ocultado nem convertido artificialmente para exit 0.

### minimatch: corrigido pelo consumidor compativel

[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) afeta >=7 <11.0.1. A versao 10.2.5 estava presa ao contrato do typescript-estree antigo. Atualizar somente minimatch por override forcar-se-ia alem desse contrato; em vez disso, atualizou-se typescript-eslint dentro do range ja permitido e validaram-se peers, lint, tipos e testes.

O minimatch 3.1.5 de ESLint e plugins legados foi mantido: esta fora do range desse advisory. Nao foi trocado por major incompativel apenas para reduzir contagens. minimatch 11 exige Node 20 ou >=22; o Node24 local e o Node22.23 do CI anterior atendem, mas CI Linux nova NAO foi executada nesta branch local.

### picomatch: risco residual sem correcao publicada

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) lista <=4.0.7 afetado e NENHUMA versao corrigida. O registry consultado retorna 4.0.7 como latest. Trocar 4.0.4 por 4.0.7 nao eliminaria o problema; trocar 2.x por 4.x ainda quebraria contrato sem corrigir o advisory.

Consumidores verificados com npm ls e lockfile:
- plugin Next -> fast-glob -> micromatch -> picomatch 2.3.2.
- resolver TypeScript -> tinyglobby/fdir -> picomatch 4.0.4.
- typescript-eslint/typescript-estree -> tinyglobby -> picomatch 4.0.4.

Todos estao marcados dev no lockfile; npm audit --omit=dev nao retorna nenhum deles. Permanecem risco ReDoS para tooling que processe globs controlados por atacante, nao prova de exposicao remota do CRM. Nao executar tooling de PR nao confiavel com credenciais privilegiadas; acompanhar patch upstream e revalidar. Nenhum npm audit fix/force, downgrade amplo ou override foi executado. Sugestoes automaticas de baixar eslint-config-next para 16.3.8 foram rejeitadas.

## Validacao efetivamente executada

| Verificacao | Resultado |
| --- | --- |
| npm ci, lock atualizado | PASS |
| npm run lint | PASS, zero erros/avisos |
| npm run typecheck | PASS |
| npm test | 192 PASS / 0 FAIL |
| npm run test:crm-local | 396 PASS / 0 FAIL |
| Build de producao Next 16.4.6 | PASS |
| HTTP e navegador locais | 47 PASS / 0 FAIL |

A suite CRM roda PostgreSQL PGlite isolado, com fixtures e claims SQL sinteticas; nenhum SQL foi executado em banco remoto. O relatorio local usa destino privado separado. O arquivo historico de ensaio gerado novamente teve conteudo Git identico ao original e nao integra o diff.

### Smoke de compatibilidade

Novo teste tests/crm-dependency-smoke.mjs: inicia um servidor de fixtures somente em loopback, constroi com next build, inicia next start em porta livre, executa HTTP e Edge headless e encerra os processos. Equivale ao comando build configurado no package.json, sem deploy ou credenciais.

Ambiente filho allowlisted, sem herdar segredos/integracoes; nenhum .env carregavel presente no novo worktree. Supabase URL e chave sao fixtures locais, nao credenciais nem contas reais. Browser usa perfil efemero proprio e bloqueia todos os hosts externos antes da rede. Uma tentativa de mapa Google foi bloqueada pelo teste; NAO se alterou a politica da aplicacao nem se declara isolamento real de Preview a partir dessa interceptacao.

Cobertura:
- Home, imoveis, contato, sobre, corretores, links, login, categorias, cidade e detalhe sintetico: HTTP 200.
- robots.txt e sitemap.xml: HTTP 200.
- Login: formulario e rejeicao controlada da fixture; sem login real ou criacao de sessao.
- Sete navegacoes anonimas em /admin, Meu Trabalho e demais modulos: redirecionam para login.
- Apresentacao local valida renderiza; token invalido e inexistente mostram not-found.
- Imagem real de fixture decodificada na pagina do imovel; otimizador next/image e streaming de midia local retornam imagem/200.
- Route Handlers: payloads invalidos 400, origem invalida 403, metodo invalido 405, analytics sem sessao 401, caminhos invalidos 404.
- /api/admin/brokers sem chave administrativa retorna 501 conforme codigo existente; isso NAO comprova autorizacao de administrador.
- Mobile 390x844 sem overflow nas quatro paginas examinadas; zero excecoes JavaScript de pagina.
- Nenhuma mensagem, lead real, consentimento de abertura ou integracao externa foi acionado.

A primeira tentativa do teste teve ambiguidade no seletor role=alert: o anunciador de rota do Next e a mensagem do formulario eram dois alvos. O teste foi corrigido para form [role=alert]; as duas execucoes completas subsequentes passaram. Nenhuma correcao de Auth ou UI foi necessaria.

Login real, quatro perfis, RLS e RPC HTTP autenticado continuam BLOCKED/NAO EXECUTADOS nesta rodada. Fixtures locais e suite PGlite nao substituem esses testes.

## Reproducao

Em clone/worktree limpo desta branch, sem arquivos .env e com Node24/npm11:
~~~powershell
npm ci --no-audit --registry=https://registry.npmjs.org/
npm audit --package-lock-only --include=dev --json --registry=https://registry.npmjs.org/
npm audit --package-lock-only --omit=dev --json --registry=https://registry.npmjs.org/
npm run lint
npm run typecheck
npm test
$env:CRM_LOCAL_REPORT_PATH = Join-Path $env:TEMP 'crm-dependencies-local-results.json'
npm run test:crm-local
node tests/crm-dependency-smoke.mjs
~~~
O smoke usa Edge headless instalado; CRM_BROWSER_CHANNEL permite selecionar outro canal Playwright oficialmente instalado. Nenhuma sessao do navegador do usuario e reutilizada. O smoke constroi/serve temporariamente e encerra os servidores; nao deixa preview publicado.

## Evidencias e hashes

- tests/security/crm-dependency-audit-20261118.json: auditorias integrais antes/depois, producao, versoes, peers, todos os deltas do lock e limites.
- tests/security/crm-dependency-smoke-20261118.json: matriz dos 47 cenarios com resultados reais.
- package.json SHA-256: cb05e01d18991477a93108cf7e5dc6de9b14e7a11c6d2a2a01297b7426dfebd9.
- Lock antes SHA-256: 1e2a1f4068ecf30ba9de2fe2e5144d91e3b07995a46ebbbd3d25e41c812f0e7a.
- Lock depois SHA-256: 56a1360a9a0147bdb416f6cf05d1c85432a6d0696949d652b07e1d33b10f0b84.
- Hashes dos guias instalados e versoes exatas no JSON. Nenhum dump, segredo ou registro pessoal incluido.
- Auditoria JSON SHA-256: 548ef7392105091b6de3a3debbfaea94dfdd29cce2b95bb330570f62146fffc7.
- Smoke JSON SHA-256: 9bf5e2065f5b04c804242b618fd3d4231890cee4524cfeabf4b4ed1dc779b51e.
- Teste smoke SHA-256: 64e35652afa2987c798fdc4a410de48ddc4f42cb9ccfd7a363774779b9313f1c.

## Parecer e proximo passo

APTO para revisao independente da correcao compativel, COM RESSALVA dev picomatch. Nao declarar vulnerabilidades totais zeradas nem homologacao autenticada. CI Linux/Node22 desta branch e teste real autorizado de staging ainda nao executados; a base PR #16 permanece Draft e intocada.

Rollback de codigo: descartar a proposta de dependencias ou reverter somente package.json/package-lock.json em futura revisao e executar npm ci novamente, sabendo que isso reintroduziria advisories do Next/minimatch. Nao ha rollback de banco, migration, usuario ou deployment nesta entrega.

Nenhuma alteracao em SQL, banco, Auth, RLS, permissoes ou producao. Nenhuma migration remota, merge, push ou deployment. Nenhuma autorizacao anterior de aplicacao foi reutilizada.
