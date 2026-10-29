# Próxima fase: campanhas, rastreamento e atendimento

29/10/2026. Base conferida: PR #7, HEAD 331a144f940dcccfa6d99f8b3a7ebe25f9aace0b. O usuário considera resolvida a etapa de apresentações e solicitou avançar no projeto. Não reabrir essa rodada manual sem nova falha ou mudança que a afete. Confirmações do usuário não são execução autenticada pelo agente nem aprovação integral para produção.

## Evidência atual

- app/api/leads/route.ts persiste source, page_path e origin_detail, além do imóvel. A tabela leads não possui colunas próprias de campanha/anúncio/click IDs. Consulta somente de metadados no staging.
- app/api/conversions/route.ts prepara e devolve um evento; não possui transporte para Meta/Google. ready_for_capi não comprova integração.
- O WhatsApp disponível é link de abertura/manual. Isso não comprova mensagem enviada, entregue ou recebida.
- Não foram encontradas tabelas públicas cujo nome corresponda a campaign, attribution, integration, spend ou conversion. Isso delimita o schema conferido; não prova ausência de contas externas conectadas.

## Ordem de implementação

1. Central de campanhas e atribuição de leads.
2. Entrada automática por formulários nativos de Meta/Google, com idempotência e resolução de responsável no servidor.
3. Atendimento misto: campanha institucional para recepção/distribuição ou atendimento individual do corretor, com destino verificado e fallback. WhatsApp por conexão oficial; sem automação de sessão pessoal não autorizada.
4. Custos e resultados por campanha, ligados às etapas comerciais e vendas.
5. Landing pages de imóveis exclusivos usando a mesma atribuição.

## Entrega inicial: campanha e rastreamento

Modelos propostos, ainda não criados: campanhas, mapeamentos de IDs externos, registros de atribuição por lead, eventos de entrada e estado de processamento. Aprovar schema/migration separadamente antes de staging.

Cada campanha identifica plataforma, objetivo, formulário nativo ou WhatsApp/site, empreendimento ou imóvel exclusivo, atendimento institucional ou individual, responsável elegível e status. Corretores veem somente suas campanhas/atribuições autorizadas; gestão tem visão institucional, sem exposição automática de carteira pessoal.

Atribuição registra IDs estáveis de campanha/conjunto/anúncio, UTM source/medium/campaign/content/term e página de origem sem parâmetros sensíveis desnecessários. Separar origem recebida do navegador de origem autenticada do provedor; nunca usar parâmetros do navegador para autorizar corretor, campanha ou carteira. Nenhum novo formulário público é solicitado: manter os existentes e priorizar os formulários nativos de anúncios.

Eventos autenticados de provedor devem ter chave única por provedor+conta+evento; retries retornam resultado consistente. Telefones iguais não autorizam mesclar carteiras. Histórico deve permitir atribuição inicial e mais recente sem sobrescrever evidência. Origem ausente aparece como não identificada, sem atribuição fictícia.

A primeira interface deve apresentar origem/campanha no lead e filtros úteis à gestão. Custos desconhecidos devem aparecer como indisponíveis, não zero. Nenhuma métrica de envio, entrega, conversa ou venda pode ser inferida de um clique em WhatsApp.

Critérios de aceite: lead fictício atribuído à campanha correta; evento repetido sem lead duplicado; destinatário inativo com fallback explícito; corretor B sem acesso à carteira de A; preenchimento de origem ausente sem inventar campanha; erros registrados sem dados pessoais em logs; interfaces desktop/mobile. Evidenciar dados realmente persistidos.

## Fases seguintes

Os adaptadores Meta/Google exigem descobrir a conexão oficial disponível e verificar contas/formulários autorizados antes da configuração. Não pedir tokens no chat nem inventar que a integração está ativa. Formulários nativos e campanhas sem formulário devem convergir para o mesmo modelo, mas clique não é lead nem conversa confirmada.

O dashboard financeiro usa custo importado por período/moeda/conta, leads atribuídos e conversões reais por etapa. Definir CPL, custo por lead qualificado, visita, proposta e venda; distinguir venda, comissão e receita efetiva. Não chamar faturamento de lucro. Custo sem dados e divisão por zero devem ser explícitos. Determinar modelo e janela de atribuição antes de comparar campanhas.

Landing pages seguem o conteúdo autorizado para publicação no site. O link privado de apresentação de rascunho não autoriza usar esse imóvel em landing page pública indexável.

## Limites de execução

Este registro é planejamento técnico apoiado em leitura do código e catálogo, não implementação das integrações. Nenhuma migration, novo preview, envio externo, conexão de conta, alteração Auth ou produção foi executada. Novas migrations, credenciais/conexões e publicações exigem escopo específico conforme as regras do projeto. Preservar PR #7 em rascunho e o preview homologado; executar a próxima fase em branch própria, com deployment automático desativado antes de publicar alterações.
