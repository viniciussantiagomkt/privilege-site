# Rastreamento WhatsApp: clique separado de lead comercial

03/11/2026. Base: PR #11, commit 44fb55b14f9cb2cef04d8e33a0a5b65a09c249a3. Branch work/crm-campaign-click-tracking-20261103.

## Problema e comportamento

CampaignWhatsAppButton emitia campaign_whatsapp_click, sem regra correspondente no GTM público consultado. WhatsAppLeadButton emitia whatsapp_lead e também tentava cadastrar “Contato via WhatsApp”, telefone literal “whatsapp”, em /api/leads via beacon/fetch. Tentativa no código não prova persistência desses contatos; não houve consulta ou limpeza do banco.

Agora o CTA de campanha usa trackWhatsAppLead, com uma única emissão whatsapp_lead, source campaign_landing, interaction_type click e UTMs permitidas. A regra já publicada encaminha whatsapp_lead como generate_lead. Não enviar também generate_lead nem o evento antigo no mesmo clique. Propriedade/título explícitos, preço e corretor nulos na campanha evitam reutilização de contexto anterior na dataLayer. GTM pode manter estado de variáveis entre eventos.

Botão legado mantém seu evento e destino, mas deixa de chamar /api/leads. URL analítica enviada por esses dois componentes contém somente origem e caminho. Telefone de contato, texto WhatsApp, query e fragmento não são enviados como page_url. UTMs só são encaminhadas pela allowlist já existente na campanha. Erro de analytics não impede abertura de WhatsApp.

A regra publicada transforma clique em evento chamado generate_lead; esse nome não comprova conversa, identificação ou venda. Relatórios e dashboard mantêm essa distinção. Parâmetros interaction_type/UTMs na dataLayer não têm recebimento assegurado no GA4: só parâmetros encaminhados pelo GTM chegam ao evento. source, property_id, property_title, property_price, broker_name, lead_type, button_location e event_id constavam na tag auditada. Landing/session attribution também depende da coleta Google, consentimento e navegador.

## Evidência e limites

Consultado apenas script público https://www.googletagmanager.com/gtm.js?id=GTM-5FJ54Q2C, sem executar tags, criar eventos ou enviar mensagens. Google tag G-JQDDVHWSWG; predicado whatsapp_lead associado à tag generate_lead; campaign_whatsapp_click ausente. Configuração de produção não alterada.

85/85 testes de código passaram. Quatro novos testes exercitam componentes com o helper real de analytics: um evento por clique, ausência de requests de ingestão, exclusão de query privada, contexto explícito, UTMs ambíguas não encaminhadas e navegação preservada quando analytics falha. Teste de landing existente atualizado. Lint, TypeScript e build Next.js 16.4.3 com guard staging passaram. Revisão React: sem novos efeitos/requisições/assinaturas globais; evento permanece no handler, destino inicial funcional e feedback acessível preservados.

Sem migration, limpeza de contatos, conexão de anúncios, segredo, publicação, merge ou mudança no GTM. Deploy automático da nova branch desativado desde o primeiro commit. API real de leads não foi removida nem alterada. Outros componentes e carga global GTM não foram corrigidos nesta entrega.

## Próximo passo

Publicar preview mediante autorização específica para conferir navegação dos CTAs. Tracking é desativado em preview por proteção do projeto; esse preview não prova recebimento no Google. Após implantação/ambiente de tracking autorizado, conferir GTM Preview/GA4 DebugView com consentimento adequado, um clique por ação e ausência de cadastro no CRM. Não ativar tags no preview ou alterar produção por conveniência de teste. Meta/Google Ads permanece adiado.
