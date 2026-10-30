# Atualização em 30/10/2026

Persistência, worker e painel foram preparados e testados localmente. A integração ainda não foi ativada. Consulte `docs/crm-ads-sync-staging-handoff-20261030.md` para o estado atual, limites, evidências e etapas de ativação. O registro abaixo descreve a primeira entrega histórica dos adaptadores.

# Sincronização automática Meta e Google Ads

## Pedido e estado real

29/10/2026. O usuário quer que campanhas ativas tragam seus dados automaticamente. Este commit prepara SOMENTE adaptadores de leitura backend, com testes simulados. Não é integração concluída, não está conectado ao preview e não importa leads. Não há scheduler, persistência, OAuth ou nova interface neste commit. Nenhuma chamada real aos provedores com credenciais foi realizada.

Código em supabase/functions/_shared/ads/reporting.ts. Dez cenários novos; 48 testes de código totais, TypeScript e lint dos arquivos novos passaram. Sem dependência adicional ou alteração funcional da tela atual. Branch com publicação automática desativada desde o primeiro commit. PR empilhado sobre #8, sem merge.

## Comportamento já preparado nos adaptadores

- Consulta de conta, moeda, fuso, campanhas e relatórios diários de Meta/Google. Estado na plataforma separado do estado manual no CRM.
- Detecção de campanhas ativas; leitura do período inclui pausadas para preservar histórico e correções posteriores. Ativa/enabled não comprova entrega de anúncios nem investimento naquele dia.
- Investimento em micros representado por string decimal exata; int64 não convertido para Number. Impressões e cliques preservados. Nunca somar moedas diferentes.
- Conversões Google identificadas como conversões da plataforma; ações Meta preservadas por tipo. Não somar tipos sobrepostos, não chamar todo resultado de lead ou venda.
- Paginação com teto e detecção de cursor repetido; intervalo de até 31 dias; conta e campanha conferidas; linhas duplicadas rejeitadas.
- Tokens somente no cabeçalho; redirects recusados; URLs next da Meta não seguidas com credenciais; erros sem resposta privada do provedor. Falha não vira zero ou relatório parcial bem-sucedido.
- Versão API é parâmetro de backend, não do navegador. A versão Meta fictícia usada nos testes não pode ser usada para ativação. Fixar versão suportada e validar campos/permissões em teste real antes de publicar.

## Implementação restante necessária, dentro do objetivo autorizado

1. Conexão oficial das contas, com consentimento e seleção explícita. Conta institucional para gestão; conta pessoal somente com autorização do corretor. A credencial nunca pode ser inferida dos IDs editáveis de campanhas. Usar OAuth com state de uso único, vínculo à sessão/ator, callback fixo e PKCE onde suportado. Validar conta autorizada no provedor antes de persistir.
2. Guardar tokens/refresh tokens somente em armazenamento cifrado de backend (Vault/secret store), renovar quando permitido e oferecer revogação. Não colocar tokens em NEXT_PUBLIC, tabelas legíveis pelo cliente, URLs ou logs. No Google, validar acesso do projeto Cloud à API; documentação atual informa sunset de developer tokens em setembro/2026, então não criar requisito obrigatório obsoleto.
3. Preparar migration de conexões, identidade externa e métricas diárias. RLS deve preservar gestão/contas institucionais e carteiras pessoais. Constraint de identidade por conexão/provedor/conta/campanha; upsert de métricas por identidade e dia, sem somar novamente na repetição. Nunca casar pelo nome. Não transformar IDs manuais em conexão verificada.
4. Importar novas campanhas ativas da conta autorizada. Cadastro importado fica sem roteamento comercial automático até configuração explícita. Não inferir imóvel ou empreendimento pelo nome; permitir vínculo explícito depois. Não ligar automaticamente status do anúncio ao status do CRM.
5. Worker backend autorizado, com lease contra concorrência, fila por conta, paginação e transação de persistência. Só atualizar last_success após commit completo. Falha deve manter dados anteriores com aviso de desatualização. Retentar rate limit/indisponibilidade com backoff e jitter; credencial revogada requer reconexão, sem loop. Respeitar cabeçalhos/quotas do provedor.
6. Agendamento inicial proposto: a cada 30 minutos. Buscar últimos sete dias para correções, incluindo campanhas antes importadas que foram pausadas; reconciliação diária de 30 dias, respeitando janela/configuração de atribuição. As janelas são proposta de produto, não garantia de latência do provedor. Guardar configuração de atribuição/fuso usada e timestamp da sincronização.
7. Painel autenticado com conta selecionada, período no fuso da conta, status remoto, última atualização, gasto, impressões, cliques, CTR/CPC e resultados por definição. Exibir sem dados/desatualizado/erro com clareza. Métricas de CPL e vendas dependem de vínculos e denominadores reais; sem divisão por zero ou mistura de moedas/contas.
8. Testes de RLS, contas pessoais vs institucionais, expiração/revogação, erro parcial, duas execuções simultâneas, repetição sem duplicação, dados sem campanha ativa, paginação, reconciliação de período, moeda/fuso, interface desktop/mobile e chamada real de leitura a cada provedor. Fixtures não são homologação autenticada real.

## Dependências externas e limite de autorização

Ainda não foi demonstrado acesso autorizado a um app Meta com permissões de leitura e a um projeto Google Cloud/OAuth com Google Ads API habilitada para as contas pretendidas. O conector GitHub/Vercel/Supabase desta sessão não concede acesso às contas de anúncios. Não pedir senha ou token no chat. Quando houver tela oficial de conexão pronta, a participação humana será selecionar a conta e consentir no provedor, ou configurar segredos diretamente no ambiente seguro caso a primeira ativação institucional use credenciais administrativas de backend.

Preparar e testar código pode continuar. Migration remota, ativação de worker/agendamento, conexão externa e publicação da nova fase devem respeitar o escopo específico aprovado. O preview autorizado anteriormente corresponde ao PR #8 manual e não foi substituído aqui.

## Referências verificadas

- https://developers.google.com/google-ads/api/docs/reporting/overview (GAQL, Search e SearchStream).
- https://developers.google.com/google-ads/api/docs/query/overview (segmentação e métricas).
- https://developers.google.com/google-ads/api/rest/auth (OAuth; resumo de página contém referência antiga a developer token).
- https://developers.google.com/google-ads/api/docs/api-policy/developer-token (guia atual específico: sunset em 09/09/2026 e acesso pelo projeto Cloud; prevalece sobre resumo antigo).
- https://developers.facebook.com/docs/marketing-api/insights/ (retornou 429 nesta sessão; rever documentação oficial antes da ativação).
- https://www.postman.com/meta/facebook-marketing-api/documentation/0zr4mes/facebook-marketing-api-mapi (coleção oficial Meta disponível; conteúdo detalhado não exposto no fetch).

A validação real de versão, permissões e campos Meta permanece pendente. Não declarar compatibilidade live a partir dos mocks.
