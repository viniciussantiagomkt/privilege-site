# Google Analytics: auditoria do site e painel no CRM

30/10/2026. Pedido: analisar a integração existente e criar resumos dentro do CRM. Base do trabalho: PR #10, commit dea3a9127996104daaf1d0b7a276cb5e6e35d96f. Entrega de código, ainda sem publicação ou credencial de leitura configurada.

## Auditoria comprovada

Consulta HTTP pública do site www.privilegeimoveispb.com.br confirmou GTM-5FJ54Q2C no HTML. Consulta apenas do JavaScript público desse contêiner, sem executar tags ou criar eventos, confirmou Google tag G-JQDDVHWSWG e estas regras publicadas:

| Evento do site | Tag GA4 configurada |
| --- | --- |
| property_view | view_item |
| whatsapp_lead | generate_lead |
| property_search | search |
| property_favorite | add_to_wishlist |

O código de app/layout.tsx carrega o GTM e lib/analytics.ts envia eventos à dataLayer. Não há gtag GA4 duplicado diretamente nessa versão do código. NEXT_PUBLIC_GA4_ID existe como variável, mas o envio está centralizado no contêiner GTM publicado. ID de medição G-JQDDVHWSWG não é o ID numérico da propriedade exigido pela Data API.

Não houve acesso ao GA4 DebugView, interface autenticada do Analytics, relatórios reais ou permissões da propriedade. Presença de tag e regra não comprova entrega/recebimento de cada evento nem contagens reais.

Pontos de atenção encontrados, sem mudança em tracking de produção:

- generate_lead vem do clique WhatsApp; não comprova pessoa identificada, conversa, atendimento ou venda.
- O CTA de campanha novo emite campaign_whatsapp_click; esse nome não aparece nas regras publicadas consultadas. A ativação dessa tag exige configuração/teste separado no GTM. Ausência de linha no GA4 não equivale a zero cliques.
- RootLayout carrega GTM globalmente, incluindo a árvore do CRM quando fora de preview. O relatório proposto exclui paths internos; isso não substitui auditoria/ajuste da coleta de páginas privadas no contêiner e do consentimento do site.
- Usuários diários não devem ser somados para representar usuários únicos do período. Tags originais e nomes transformados podem representar a mesma ação, portanto não somar linhas de eventos como pessoas/leads únicos.

## Painel preparado

Nova rota /admin/analytics, menu Resultados do site, para gestor/admin. Consulta de 7, 28 ou 90 dias completos até ontem no fuso da propriedade, comparada ao período anterior equivalente.

- Usuários ativos, sessões, páginas vistas e taxa de engajamento.
- Evolução diária de sessões, com tabela acessível dos valores.
- Até dez principais grupos de origem/canal, dispositivos e cidades.
- Até dez páginas mais vistas, sem query strings.
- Contagem separada dos eventos conhecidos, com significado explícito e sem chamar clique de venda.
- Horário da consulta, cache de até dez minutos e avisos de limiar de privacidade, amostragem ou agrupamento do Google.

Não há números demonstrativos na interface. Sem configuração, aparece conexão de relatórios pendente; erro/403/429 não vira zero. Relatório realmente bem-sucedido sem linhas pode conter zero. Filtros fixos aceitam somente os dois hostnames oficiais do site e excluem /admin, /login, /api e /apresentacoes privadas. Isso não remove visitas de funcionários às páginas públicas nem retroativamente muda a coleta.

## Segurança e arquitetura

API /api/admin/site-analytics: valida JWT via getUser e depois consulta can_manage_operations no banco com a sessão do usuário e chave pública. Não usa service_role nem user_metadata para autorizar. Staff/corretor e anônimo não recebem os dados institucionais. Toda chamada confere autorização antes de acessar o cache ou o Google.

Servidor Node gera JWT de conta de serviço RS256 com escopo analytics.readonly e troca por access token em endpoint Google fixo. Data API usa propriedade numérica fixa de ambiente. Usuário da requisição não escolhe propriedade, hostname, credencial ou filtro. Consultas agrupadas em lotes de até cinco, conforme limite da API. Segredos nunca chegam ao navegador; endpoints não seguem redirects, não registram corpos privados e retornam erros sanitizados.

Cache de resumos agregados em memória por configuração/período, limitado a três entradas e dez minutos; concorrência de consultas iguais compartilha o mesmo carregamento. Não há persistência de dados do GA4 no Supabase, migration ou agendamento novo. Permissões existentes e tracking não foram alterados. Dados só saem com Cache-Control private, no-store e Vary Authorization; a interface cancela respostas antigas e vincula exibição à identidade atual.

## Conexão de leitura pendente

Propriedade informada pelo titular em 30/10/2026: `543148979`. Valor destinado a `GA4_PROPERTY_ID` no servidor. O número foi registrado para a configuração, mas ainda não foi verificado por uma consulta autenticada nem associado de forma comprovada ao ID de medição `G-JQDDVHWSWG`. Não é uma credencial e, sozinho, não libera relatórios. Nenhuma variável remota foi alterada nesta atualização.

Nas variáveis Vercel conferidas não foram encontrados GA4_PROPERTY_ID ou GA4_SERVICE_ACCOUNT_JSON. Isso não prova inexistência de projeto Google fora deste ambiente. O ID público de medição não autoriza consulta dos relatórios.

Para ativar, o titular precisa informar o ID numérico da propriedade (não secreto), confirmar a propriedade correta e configurar uma conta de serviço do Google Cloud com Analytics Data API habilitada. Dar a essa conta acesso Leitor somente à propriedade necessária. Nenhuma permissão de edição de anúncios ou de configuração do Analytics é necessária para este painel.

Configurar exclusivamente no ambiente seguro do servidor:

- GA4_PROPERTY_ID: número da propriedade.
- GA4_SERVICE_ACCOUNT_JSON: credencial da conta de serviço como segredo do servidor; nunca NEXT_PUBLIC_, código, arquivo versionado, log ou mensagem no chat.

Na primeira publicação autorizada de teste, usar escopo da branch de preview. Não copiar credenciais de produção ou gravar em escopo global por conveniência. O Google Analytics pode conter dados reais de produção mesmo quando o painel roda no staging; o consentimento de leitura deve abranger esse acesso. Testar com conta autorizada antes de chamar integração ativa.

Esta configuração é independente do Google Ads/Meta, que permanecem adiados conforme pedido do usuário. Não reativar cron de anúncios nem confundir permissões de Analytics com acesso às contas de mídia.

## Validação e limites

79/79 testes de código passaram, incluindo 15 novos casos de JWT de serviço assinado, escopo/endpoints, lote máximo, filtros, cache, proteção da API real com Supabase simulado, rejeição de metadata forjada, isolamento de sessão e ausência de KPIs fictícios. Lint, TypeScript e build Next.js 16.4.3 com guard staging aprovados. Testes usam respostas Google/Supabase simuladas e chave RSA efêmera de fixture, não credencial real.

Leitura autenticada real do GA4, permissões IAM/Analytics, precisão contra o relatório Google, JWT HTTP real e visual desktop/mobile ainda pendentes. Não declarar esses testes aprovados a partir dos mocks. Preview novo exige autorização específica; deploy automático desativado desde o primeiro commit. Sem alteração no site de produção, GTM, banco ou dados comerciais.

Referências primárias consultadas:

- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries
- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/batchRunReports
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://www.googletagmanager.com/gtm.js?id=GTM-5FJ54Q2C (somente configuração pública consultada).
