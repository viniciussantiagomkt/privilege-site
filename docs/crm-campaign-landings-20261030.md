# Páginas de campanha de imóveis

30/10/2026. Entrega independente da conexão Meta/Google, adiada pelo usuário. Base: PR #9, commit 7fcaa08f40a6a2cc73bf7acbe9a4db859426673a. Proposta de código somente; sem publicação, migration, conta externa, conexão ou alteração de produção.

## Comportamento

Nova rota `/campanhas/imovel/[slug]`, com marca Privilege, fotos reais, localização pública, preço ou sob consulta, características, descrição, galeria e CTA WhatsApp. Layout responsivo com botão fixo no mobile. Não inventa fotos quando faltam: exibe fotos em atualização. Não afirma exclusividade, subsídio, rentabilidade ou financiamento que não estejam no cadastro.

Busca usando cliente público e a mesma barreira do site, acrescida de status ativo e `available_for_campaigns=true`. `publish_on_site=true`, workflow aprovado/publicado e ausência de exclusão continuam obrigatórios. Rascunho, pendente, vendido/alugado/reservado, exclusão ou retirada da autorização de campanhas exibe a tela de indisponibilidade via notFound. No preview, a resposta transmitida pelo Next.js manteve HTTP 200 com marcador 404 e noindex; não foi comprovado HTTP 404 efetivo. Ver docs/crm-campaign-landings-preview-20261030.md. Rota dinâmica, sem geração estática da ficha. Metadata não indexável e canonical para ficha original; nenhuma entrada nova no sitemap. O cache React só deduplica leitura na mesma requisição, sem manter permissão entre requisições.

WhatsApp usa apenas o telefone público válido do corretor ativo responsável pelo imóvel; se ausente/inválido, recepção institucional. Parâmetros não escolhem corretor, carteira ou telefone. O texto pode incluir a referência UTM informada no navegador, que continua não verificada. Isso não implementa roteamento por campanha: o responsável é o do cadastro público, e a interface informa esse comportamento.

No CRM, botão “Montar link de campanha” permite revisar cinco campos UTM, gerar/copiar e conferir link no mesmo ambiente. Origem/meio são sugestões editáveis; referência de campanha fica visível no link. Sem dados pessoais. Apenas imóvel vinculado e autorizado é elegível. Sem imóvel elegível, explica a condição; empreendimentos sem imóvel específico não ganham landing nesta entrega.

Allowlist: utm_source, utm_medium, utm_campaign, utm_content e utm_term. Até 160 caracteres, sem controles/quebras, sem duplicatas. Campos desconhecidos descartados. Slug não aceita barras, query, fragmento ou path traversal. Link gerado não transfere IDs de proprietário/destinatário ou credenciais. Não cria registro no banco.

Novo CTA emite apenas `campaign_whatsapp_click`, com página sem query e UTMs permitidas. Não reutiliza o botão legado que publica contatos genéricos em `/api/leads`; não chama essa API, não usa beacon e não cria contato com telefone fictício. Não promete persistência da atribuição no CRM: um clique não comprova conversa, lead recebido, envio/entrega ou venda. Sem integração de anúncios, não há métricas reais de campanha novas.

## Validação

- 64/64 testes de código passaram: cinco novos casos de elegibilidade, geração segura de URL, filtros antes de buscar mídia, erro de DB sem detalhes privados e CTA sem ingestão de lead fictício.
- Lint e TypeScript passaram. Build Next.js 16.4.3 passou com guard ativo e chave pública/URL verificadas de staging.
- Testes do loader e clique usam mocks. Não são navegação autenticada, integração HTTP real do novo fluxo ou prova de RLS adicional no servidor. Policies não foram alteradas.
- Verificação visual desktop/mobile ainda pendente: Chromium do Playwright não pôde ser instalado porque o download recebido estava inválido/truncado. Não contornar proteções nem atribuir screenshots/testes de outra fase a esta entrega.
- Sem nova dependência, migration, seed ou fixture remota. Publicação automática da branch desativada desde o primeiro commit; preview novo exige autorização separada.

## Próxima homologação

Em preview autorizado, usar um imóvel já público e autorizado para campanhas. Não ativar publicação/flags em imóvel real só para conseguir teste sem autorização. Conferir página desktop/mobile, telefone do corretor ativo/fallback institucional, galeria e copiar link. Validar ausência de novo lead após clique, metadata/canonical e indisponibilidade ao retirar autorização (conferir também o status HTTP observado), usando fixtures autorizadas ou cópia local. Somente depois considerar publicação definitiva, fora do escopo atual.

Pendência Meta/Google registrada em docs/crm-project-backlog.md. A sincronização permanece bloqueada até acesso e ativação específicos.
