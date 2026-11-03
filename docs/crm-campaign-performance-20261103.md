# Comparação comercial das campanhas no CRM

03/11/2026. Base PR #12, commit afb1642bf90691e34561899a2cef73a6574abc46. Branch work/crm-campaign-performance-20261103.

## Entrega

Nova seção Desempenho das campanhas no CRM em /admin/campanhas. Segue a seleção atual por estado e busca. Conta somente leads identificados na tabela leads, associados à campanha por crm_lead_attributions; não usa contagens GA4/Ads ou cliques WhatsApp.

Um ID de lead conta uma vez por campanha. Pode aparecer em campanhas distintas, portanto não somar as linhas como pessoas únicas. A etapa atual é distribuída em novos, em atendimento, visita agendada, convertido, perdido e outras etapas, sem supor histórico de passagem entre estados. Sublinhados do status são normalizados como espaços. Primeiro atendimento conta somente datas preenchidas válidas; não comprova mensagem externa. Conversão no pipeline = leads na etapa convertido / leads acessíveis vinculados à campanha; sem leads exibe Sem base, sem percentual fictício.

## Escopo e segurança

Reutiliza exclusivamente os dados do Workspace já sujeitos ao RLS de cada tabela e aos filtros de exclusão existentes. Não consulta uma carteira adicional, não usa chave privilegiada, não altera políticas nem cria endpoints. Não tem fetch próprio, cache, estado persistente, efeitos ou listeners. Isolamento de sessão mantém a limpeza já executada pelo Workspace. Nenhuma nova dependência.

Qualquer erro em leads, atribuições ou campanhas, inclusive limite excedido, oculta a tabela de indicadores em vez de produzir zeros. Loading usa a barreira existente. Vínculos sem lead carregado têm aviso e são excluídos do denominador; totais não são apresentados como institucionais completos. Atribuições de campanhas fora da seleção não geram linhas adicionais.

## Limites explícitos

- Todos os cadastros carregados, sem filtro de período. Não comparar diretamente com janelas de mídia ou GA4.
- Não é funil cumulativo histórico. Não informa SLA nem tempo de resposta.
- Atribuição cadastrada no CRM ainda não foi verificada por plataforma.
- Convertido no pipeline não é registro confirmado de venda.
- Investimento/CPL/CPA/retorno não são calculados sem cobertura de custos e relação comprovada com vendas. Não há tentativa de ligar venda por coincidência de imóvel/corretor.
- Limite atual do workspace continua 500 registros por tabela. Overflow produz indisponibilidade explícita. Agregação no servidor, coortes por datas e vínculo lead-negociação-venda ficam pendentes.
- Conexões Meta/Google Ads continuam adiadas.

## Validação

95 testes de código passaram, incluindo seis novos casos de agregação por vínculo único, etapas desconhecidas/normalizadas, campanhas filtradas, falta de lead, denominador ausente, erros por tabela e limite, loading e rótulos contra interpretação como venda. Testes de UI renderizam componentes reais incluindo SectionState. Lint, TypeScript e build Next.js 16.4.3 com guard staging passaram.

Revisão React: sem efeito novo, cálculo síncrono limitado ao volume já carregado, tabela com cabeçalhos/caption e rolagem própria, erros ocultam valores antigos. Validação autenticada real e visual desktop/mobile deste novo painel ainda pendentes. Não houve nova publicação, migration, mudança em conta/permissão ou produção. Deploy automático da branch desativado desde o primeiro commit.

## Publicação autorizada em 03/11/2026

Deployment dpl_8SWp4x1acUF6NQdHBAZnpUPdZoEQ READY no commit 35c4c755c647e2b4473ac4b4f9dc6d0ec72ffa4f. URL: https://privilege-site-fgyuj96ok-viniciussantiagomkts-projects.vercel.app/login . GET /login e /admin/campanhas via conector oficial retornaram HTML HTTP 200. Não é homologação autenticada ou visual dos indicadores. Usuário deve conferir a seção Desempenho das campanhas no CRM após entrar.

Variáveis públicas do staging e overrides vazios de tracking/maps/webhook limitados à nova branch. Nenhum segredo GA4 copiado; relatórios GA4 continuam no preview do PR #11. Produção, banco e permissões não alterados nesta publicação.

## Incremento: seleção por cadastro do lead, 03/11/2026

O modo padrão continua todo o histórico. Campos De/Até permitem selecionar limites opcionais, incluindo ambos os dias no horário de Campina Grande (UTC−3). Intervalo é representado internamente por início inclusivo e meia-noite seguinte exclusiva. Datas civis são validadas, inclusive ano bissexto. Filtro é local aos dados autorizados já carregados; não adiciona consulta, cookie, localStorage ou efeito. Botão Todo o histórico limpa os limites.

A seleção considera leads.created_at, não a data da atribuição, do atendimento ou da mudança de status. Estágio, convertido e primeiro atendimento mostram o estado atual dos leads cadastrados no intervalo, inclusive atualizações posteriores. Não é relatório de vendas/conversões ocorridas no intervalo. As limitações anteriores de base sem período passam a se referir apenas ao modo Todo o histórico.

Datas inválidas ou invertidas ocultam a tabela. Datas de cadastro inválidas em leads vinculados impedem a apresentação de totais filtrados como completos. Falhas/limites das tabelas continuam bloqueando indicadores. O filtro local não contorna o limite de carregamento de 500 registros do Workspace; agregação no servidor segue pendente.

99 testes passaram, incluindo quatro regressões novas de fronteiras UTC−3, dia final inclusivo, limites abertos, datas invertidas/bissextas, dados sem data e UI sem tabela em erro. Lint, TypeScript e build passaram. Revisão React: hook de filtro antes de qualquer retorno condicional, sem novos efeitos nem rede, dados agregados derivados a cada render sem cache privado. Homologação visual/autenticada do filtro e nova publicação pendentes. Nenhum banco, conta ou produção alterado.
