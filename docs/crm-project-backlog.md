# Continuidade do Privilege CRM

Atualizado em 30/10/2026.

## Pendência adiada por decisão do usuário

**Acesso e conexão Meta/Google Ads: ADIADO.** O usuário informou que ainda não conseguiu acesso e pediu para continuar o projeto, guardando essa pendência para resolver depois. Não voltar a exigir esse acesso para avançar em entregas independentes.

Retomar quando o usuário informar que conseguiu acesso ou pedir expressamente: cadastrar/configurar app Meta e projeto Google Cloud, conferir consentimento/permissões e contas autorizadas, configurar credenciais somente no ambiente seguro, validar primeira leitura real e renovação, e autorizar agendamento antes de ativar. Nunca solicitar senhas, tokens ou códigos pelo chat. Onboarding OAuth self-service por corretor permanece pendente.

Estado já concluído dessa frente: schema no staging com 21 migrations, painel de resultados publicado em preview, worker crm-ads-sync instalado v1 e bloqueado, testes negativos reais aprovados. Não há conta conectada, métrica real importada ou cron habilitado. Evidência: docs/crm-ads-preview-worker-20261030.md no PR #9.

## Entrega independente em desenvolvimento

Páginas públicas de campanha para imóveis, com fotos/características reais, CTA WhatsApp e link com UTMs montado no CRM. Não depende dos aplicativos de anúncios. Somente imóvel ativo, publicado/aprovado para o site e explicitamente liberado para campanhas; apresentação privada de rascunho não autoriza landing pública. Sem novo formulário no site e sem lead fictício gerado por clique.

Outras frentes do escopo original continuam no planejamento: entrada verificada de formulários nativos, WhatsApp oficial, vínculo de custos a resultados comerciais e onboarding autônomo por corretor. Não marcar essas integrações como concluídas pelo cadastro manual ou por evento de clique.

## Regras de continuidade

Preservar PRs em rascunho, previews existentes e produção/main. Implementar e validar código autonomamente. Novas migrations e publicações seguem os escopos específicos autorizados na conversa. Nenhuma migration deve ser reaplicada para publicar páginas ou conectar provedores.

## Encerramento da sessão de 30/10/2026

Usuário encerrou o trabalho e solicitou preservar as pendências para retomada e relatórios futuros. Não há lembrete agendado nem autorização para continuar executando correções após o encerramento.

### Prioridade na próxima sessão: Google Analytics

- Painel implementado no PR #11 e publicado com autorização no preview https://privilege-site-d5iq9869r-viniciussantiagomkts-projects.vercel.app/login, deployment dpl_3qHaBDRmTY3nUjujf4zBGdYoPiLk, commit b85d258037b034ed879a52a9ae2b70edc083bbec.
- Propriedade informada: 543148979. GTM público: GTM-5FJ54Q2C; medição encontrada no contêiner: G-JQDDVHWSWG. Correspondência entre propriedade e medição ainda não comprovada por consulta autenticada.
- Usuário informou concluir conta de serviço, API habilitada, acesso Leitor e variáveis. Metadados Vercel comprovaram GA4_PROPERTY_ID e GA4_SERVICE_ACCOUNT_JSON somente em Preview da branch work/crm-campaign-site-analytics-20261030; JSON sensitive. Valores privados não foram extraídos.
- Captura enviada pelo usuário mostra sessão Gestor na página Resultados do site, período de 28 dias, com erro: “Não foi possível carregar o painel” / “O Google retornou um relatório que não pôde ser validado.” Esta é uma falha real reportada pelo usuário; integração NÃO homologada.
- Investigar resposta/validação da Data API, headers, métricas, metadados e relatórios vazios usando diagnóstico sanitizado. A mensagem sozinha não determina a causa nem comprova sucesso da autenticação Google. Não pedir reconfiguração de credenciais sem evidência.
- Corrigir e validar 7/28/90 dias e comparação ao Google, autorização gestor/admin e bloqueio corretor, troca de contas e visual desktop/mobile. Não afrouxar autorização ou expor resposta bruta/segredos para diagnosticar.
- Captura também mostra rolagem horizontal na navegação lateral e conteúdo à direita cortado. Conferir overflow/responsividade; causa e dimensões reais ainda não verificadas.
- Testes locais anteriores: 79 testes, lint, TypeScript e build aprovados com mocks. Não substituem consulta real. Fetch oficial da API encontrou deployment_authentication_required; HTML HTTP 200 não é homologação autenticada.

### Landing pages: entrega em preview, validações restantes

PR #10 entregue em preview. Casa Terras (id 1, slug casa-terras) teve somente available_for_campaigns habilitado no staging com autorização específica. URL de teste: https://privilege-site-6qgyjvxqo-viniciussantiagomkts-projects.vercel.app/campanhas/imovel/casa-terras . HTML, dados e destinos WhatsApp conferidos; validação visual desktop/mobile e geração do link na sessão do CRM ainda precisam de evidência. Imóvel inexistente usa notFound transmitido com HTTP 200 e noindex; não registrar HTTP 404 estrito. Nenhuma mensagem WhatsApp foi enviada pelo agente.

### Tracking e conversões: pendências distintas

- Auditar coleta de páginas privadas, pois GTM está no layout global fora de preview; filtros do relatório não corrigem coleta.
- Evento campaign_whatsapp_click não apareceu nas regras GTM publicadas auditadas. Configuração/publicação GTM e teste de recebimento pendentes.
- generate_lead publicado deriva de clique WhatsApp; não tratar como conversa, lead identificado ou venda. Não somar nomes originais e transformados como contatos únicos.
- Integrações de formulários nativos Meta/Google, WhatsApp oficial e custos versus conversões comerciais continuam pendentes. Meta/Google Ads segue ADIADO conforme seção acima.

### Homologação e liberação

Preservar confirmações manuais anteriores sem reabrir falhas já resolvidas sem regressão. Cenários autenticados não comprovados pelo agente, arquivos reais/revogação/expiração, troca de contas, polling sem Realtime e visual mobile continuam separados das aprovações locais; reconciliar evidência manual existente antes de declarar conclusão. PRs #7 a #11 continuam em rascunho, sem merge. Produção não foi publicada. Novas publicações/migrations e ativação de workers/cron mantêm os escopos específicos de autorização.

Em futuros relatórios, apresentar concluído, falha conhecida, bloqueado/adiado e próximo passo separadamente. Priorizar a correção do Analytics, sem exigir acesso de anúncios para avançar.
