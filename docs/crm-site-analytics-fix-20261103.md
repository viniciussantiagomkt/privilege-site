# Correção do painel GA4 e layout

03/11/2026. Continuidade do PR #11 a partir de 3f3914d2a06126a17ffbc49709a0631e66dfb3bc.

## Problema e correção

A captura do usuário em sessão de gestor mostrava invalid_response: “O Google retornou um relatório que não pôde ser validado”. No código, o access_token OAuth passava pelo mesmo validador de textos dos relatórios, limitado a 1.000 caracteres. A documentação oficial do Google estabelece até 2.048 bytes para tokens de acesso. Um token sintético de 1.001 caracteres reproduziu exatamente invalid_response antes de qualquer consulta Data API.

Separada validação do token: aceita bearer ASCII não vazio com sintaxe de credencial HTTP e até 2.048 bytes. Limites dos campos do relatório, endpoints fixos, escopo analytics.readonly, filtros e autorização gestor/admin permanecem. Tokens não são retornados no painel ou nos erros. Nada foi lido de GA4_SERVICE_ACCOUNT_JSON.

Isso corrige um defeito comprovado do código; não comprova que o token real do usuário era longo nem exclui outras causas da falha. A hipótese precisa ser verificada em uma sessão legítima após novo preview.

## Layout

Menu usa coluna minmax(0,1fr), permite quebra de rótulos extensos, preserva ícones e mantém rolagem vertical sem rolagem horizontal. Rodapé da sidebar não encolhe. Busca pode reduzir de largura, nome de usuário longo tem reticências e ações do título podem quebrar para outra linha. Não foi ocultado o overflow global da página para mascarar conteúdo.

## Verificação

- Antes da correção, regressões reproduziram rejeição de token longo e aceitação indevida de token com espaços.
- Depois: 81/81 testes de código aprovados, incluindo tokens sintéticos de 1.001 e 2.048 caracteres e rejeição de vazio, não texto, 2.049 caracteres, espaços, controles e Unicode antes da Data API.
- Lint, TypeScript e build Next.js 16.4.3 com guard de staging passaram.
- Fluxos de autenticação/Google dos testes usam fixtures e chave RSA efêmera; nenhuma credencial real foi extraída.
- Sem navegador local instalado, validação visual desktop/mobile pendente.
- Preview anterior permanece no commit b85d258; nova publicação exige autorização específica. Sem migration, alteração de banco, GTM ou produção; PR continua em rascunho.

## Próximo teste

Publicar novo preview autorizado, entrar como gestor/admin, abrir Resultados do site e testar 7/28/90 dias. Conferir números com GA4 para as mesmas datas/filtros e inspecionar desktop/mobile. Se persistir erro, investigar diagnóstico sanitizado sem compartilhar respostas brutas ou segredos.

Referência oficial consultada em 03/11/2026: https://developers.google.com/identity/protocols/oauth2#size .

## Publicação autorizada em 03/11/2026

Após autorização expressa, publicado commit 64b5363bbb9c1c9b69b59136ded38263328f3f56. Deployment dpl_EqcvLTxpThMxnYCNbJjhiuvFMZFB, estado READY. URL: https://privilege-site-njzw6oben-viniciussantiagomkts-projects.vercel.app/login . GET /login via conector oficial retornou HTTP 200 com formulário do workspace. Isso confirma a publicação, não uma sessão autenticada nem leitura real GA4. Homologação dos três períodos e visual desktop/mobile pendentes. Sem alteração de produção, banco, segredos ou permissões nesta publicação.
