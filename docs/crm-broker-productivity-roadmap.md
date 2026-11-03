# Privilege CRM | Roadmap de produtividade do corretor

**Etapa 01: auditoria técnica e planejamento. Atualização: 03/11/2026, horário de Brasília.**
**Destinatário desta etapa: ChatGPT Work.**
**Estado: auditoria e planejamento entregues; Etapa 02 aguarda confirmação do usuário.**

## 1. Escopo, evidências e limites desta auditoria

Princípio aprovado: **centralizar operações frequentes, reduzir páginas e botões desnecessários e automatizar tarefas, preservando todas as funcionalidades e as carteiras privadas.**

Esta rodada fez leitura do GitHub e de catálogos de metadados do Supabase staging. A única escrita autorizada e realizada é este documento. Não houve implementação, alteração do backlog original, migration, alteração de dados ou RLS, conexão de serviço, acesso a credenciais, publicação, merge ou mudança de main/produção. Não foram consultadas linhas de clientes, leads, negócios ou valores financeiros. Definições de funções foram lidas como metadados, sem executá-las.

### Fontes verificadas

- Repositório: `viniciussantiagomkt/privilege-site`.
- Snapshot auditado: branch `work/crm-campaign-performance-20261103`, HEAD anterior a este documento `a9f6cbb893b3362478d429d9e6acaa34e7c23d67`.
- Código funcional mais recente dessa cadeia: `ef193ad49fa5f2dde476d3c78889ceb8f2c25499`; comparação GitHub desse commit até o snapshot mostrou somente alterações em `docs/crm-campaign-performance-20261103.md` e `docs/crm-project-backlog.md`.
- Main observada: `51aae401901b9af73f596b8d72288cc1117178c5`.
- Inventário recursivo do GitHub retornou sem truncamento; lista de branches retornou 14 branches. A consulta de PRs retornou 12 PRs abertos, todos em rascunho, sem merge.
- Supabase staging: projeto `sdpqphiooiuglywcmkxv`. Conferidos histórico de migrations, tabelas/colunas/views, políticas, FKs, funções e triggers por consultas SELECT em catálogos.
- 21 migrations registradas no staging, de `20261008144426_crm_security_hardening` a `20261030185925_crm_ad_reporting`. Os arquivos correspondentes existem na árvore auditada. Não foi feita comparação criptográfica de cada corpo remoto com cada arquivo.
- As tabelas de public inventariadas estão com RLS habilitada; as quatro views inventariadas usam `security_invoker=true`. Isso não constitui aprovação integral de todas as permissões.
- CI do commit funcional `ef193ad...`: workflow **Validate CRM integration**, execução [41706012920](https://github.com/viniciussantiagomkt/privilege-site/actions/runs/41706012920), concluída com sucesso. O workflow versionado inclui lint, TypeScript, testes de código, testes CRM locais e build.
- Última evidência local registrada no projeto: 99 testes de código, lint, TypeScript e build aprovados. Esses testes não foram reexecutados nesta auditoria; builds gerariam arquivos fora do documento autorizado.
- Aceites manuais e pendências foram reconciliados com o [backlog existente](crm-project-backlog.md), sem apagar ou modificar seu histórico.

### Como interpretar os estados

| Estado | Significado |
| --- | --- |
| Implementado | Código/estrutura identificados; não implica homologação completa. |
| Aceite manual | Usuário confirmou o cenário indicado. Não equivale a teste automatizado independente. |
| Preparado | Código/infraestrutura existem, mas falta conexão, implantação ou validação real. |
| Parcial | Há parte reutilizável, porém faltam regras, integração ou experiência completa. |
| Planejado | Escopo aprovado para evolução; implementação ainda não comprovada. |
| Adiado/bloqueado | Dependência externa ou decisão do usuário impede concluir agora. |

Produção não foi auditada como ambiente autenticado nesta rodada. Não foram feitos testes de navegação, gravação, arquivos, mensagens ou transações financeiras reais. Não declarar o sistema pronto para comercialização ou a auditoria de segurança integralmente aprovada a partir deste documento.

## 2. Branches, PRs e base recomendada

### Cadeia principal observada

A seta indica que o próximo PR usa a branch do anterior como base:

`main → #1 → #2 → #3 → #6 → #7 → #8 → #9 → #10 → #11 → #12 → #13`

| PR | Branch | Base | Conteúdo principal / estado |
| --- | --- | --- | --- |
| #1 | `work/crm-staging-audit-20261008` | main | Workspace, módulos comerciais/marketing/apresentações; rascunho. |
| #2 | `codex/crm-integration-20261013` | #1 | Integração e baselines; rascunho. |
| #3 | `work/crm-integration-security-20261013` | #2 | Segurança, dependências e homologação; rascunho. |
| #5 | `work/crm-auth-qa-20261015` | #3 | Reconciliação de contas/testes de Storage; ramo paralelo, rascunho. |
| #6 | `work/crm-integration-security-diagnosis-20261019` | #3 | Carteiras privadas e correções operacionais; rascunho. |
| #7 | `work/crm-marketing-notifications-20261019` | #6 | Audiência de materiais, notificações e correções; rascunho. |
| #8 | `work/crm-campaign-attribution-20261029` | #7 | Campanhas e origem manual de contatos; rascunho. |
| #9 | `work/crm-campaign-ads-sync-20261029` | #8 | Leitura Meta/Google Ads preparada; conexão adiada. |
| #10 | `work/crm-campaign-landing-20261030` | #9 | Landing pages públicas e links UTM; rascunho. |
| #11 | `work/crm-campaign-site-analytics-20261030` | #10 | Painel GA4 e correções; períodos com aceite manual. |
| #12 | `work/crm-campaign-click-tracking-20261103` | #11 | Eventos WhatsApp e normalização de imagens; imagens com aceite manual. |
| #13 | `work/crm-campaign-performance-20261103` | #12 | Indicadores comerciais por campanha e filtro de cadastro; aceite manual. |

Outras branches observadas: `work/crm-marketing-intelligence-20261015` aponta para o mesmo commit do PR #3; não prova uma entrega adicional. Branch existente não significa trabalho recente ou funcionalidade concluída.

O compare de #13 com #5 retornou **divergência**, com um commit exclusivo no ramo de #5. Entre os arquivos envolvidos estão `next.config.ts`, `vercel.json`, testes de guard, SQL de testes e evidências de reconciliação. Não incorporar o ramo antigo inteiro sem revisar seus efeitos sobre as proteções mais recentes. O objetivo é reconciliar as verificações necessárias, não recriar contas ou reaplicar migrations.

### Recomendação para iniciar a Etapa 02

- **Branch-base:** `work/crm-campaign-performance-20261103` (PR #13), no HEAD que contiver este planejamento.
- **Snapshot funcional auditado:** `a9f6cbb...`, cujo último incremento de código é `ef193ad...`.
- **Branch futura sugerida:** `work/crm-campaign-broker-workspace-20261103`, ou mesma convenção com a data real de início.
- **PR futuro:** rascunho, baseado na branch de #13, sem merge.
- Revalidar HEAD e diff na retomada. Não iniciar da main antiga nem confiar na cópia local sem conferir o snapshot remoto.
- O prefixo sugerido preserva o guard atual de `next.config.ts`, que cobre `work/crm-campaign-*`. Desativar deploy automático da nova branch no primeiro commit antes do primeiro push.
- Não criar a branch nem iniciar código nesta Etapa 01.

### Riscos de integração

1. A numeração até #13 não representa entregas independentes: há uma cadeia longa com alterações compartilhadas.
2. `Workspace.tsx`, `Shell.tsx`, `UI.tsx`, `crm.css`, `model.ts`, `next.config.ts` e `vercel.json` são pontos de conflito provável.
3. Os previews são snapshots distintos. O segredo de leitura GA4 foi configurado na branch de Analytics; não presumir que exista em todo preview posterior e não copiá-lo por conveniência.
4. A cadeia de migrations deve ser mantida. Colocar uma migration antiga novamente em outro nome ou reaplicá-la não é forma de consolidar branches.
5. Só este documento será acrescentado nesta rodada; o backlog continua como fonte de pendências herdadas.

## 3. Inventário técnico e funcional atual

### 3.1 Páginas e componentes

| Frente | Evidência principal | O que existe / lacuna |
| --- | --- | --- |
| Entrada e sessão | `components/admin/AdminGuard.tsx`, `app/admin/layout.tsx` | getUser + papel consultado no banco; remonta árvore por identidade/papel. É barreira de interface; autorização de dados depende de RLS/RPC/API. |
| Workspace | `components/crm/Workspace.tsx` | Contexto compartilhado, identidade, tabelas por rota, reload/run, mensagens, Realtime e atualização periódica. Limite de 500 registros por tabela; notificações carregam até 100, contagem separada por RPC. |
| Navegação/busca | `components/crm/Shell.tsx` | 13 entradas NAV, sidebar recolhível, menu mobile, busca de leads/imóveis/contatos e códigos, central de notificações. Busca só os arrays carregados pela rota; não é pesquisa completa de toda a carteira. |
| Visão geral | `app/admin/page.tsx`, `Dashboard.tsx`, `ManagementOverview.tsx` | Indicadores pessoais, próximas tarefas/visitas e visão gerencial agregada. `/admin/crm` apenas redireciona a `/admin`. |
| Leads | `Leads.tsx`, `LeadTransfer.tsx` | Pipeline, filtros/campanhas, detalhe, atividade, retorno, contato registrado, atribuição e transferência consentida. Não equivale a integração de conversas externas. |
| Contatos/proprietários | `Contacts.tsx`, `crm_contact_links` | Cadastro, tipo cliente/proprietário/ambos, observações e relações. Preferências de compra ainda são predominantemente texto; falta perfil estruturado de busca. |
| Imóveis | `Properties.tsx`, `PropertyForm.tsx` | Cadastro extenso, código, mídia privada, contatos, aprovação/publicação e opções de apresentação. Falta fluxo curto de captação orientado ao celular. |
| Agenda | `Agenda.tsx` | Calendário/lista, tarefas e visitas, edição e estados. Falta assistente com prioridades, reagendamento contextual e prevenção completa de conflitos. |
| Propostas/negociações/vendas | `Deals.tsx`, `SaleReview.tsx` | CRUD comercial e revisão financeira/documental de venda por revisão. Falta vínculo explícito lead→proposta→negociação→venda e geração documental completa de proposta. |
| Marketing/apresentações | `Marketing.tsx`, `Collections.tsx`, `ShareComposer.tsx`, `Presentations.tsx` | Materiais/audiência, versões, kits, links com expiração/revogação, confirmação manual de envio. Links privados e landing pública têm regras diferentes. |
| Campanhas | `Campaigns.tsx`, `CampaignLandingLink.tsx` | Cadastro institucional/pessoal, contato manual, roteamento e link UTM por imóvel elegível. Cadastro de campanha não conecta conta de anúncios. |
| Desempenho | `CampaignPerformance.tsx`, `campaign-performance.ts` | Leads únicos por campanha, etapas atuais, atendimento registrado e filtro De/Até por cadastro. Conversão de pipeline não é venda. |
| GA4 | `SiteAnalytics.tsx`, `app/api/admin/site-analytics/route.ts` | Relatórios para gestão, leitura no servidor e períodos 7/28/90 com aceite manual. Comparação independente e matriz completa de testes reais continuam pendentes. |
| Ads | `AdReports.tsx`, Edge `crm-ads-sync` | Adaptadores, lease, relatórios e painel preparados. Conexão real adiada; importação de formulários é outra entrega. |
| Automações | `Automations.tsx`, preferências/eventos | Retorno interno após apresentação e registro idempotente. A tela identifica conectores externos como não conectados; não há comprovação de uma automação geral de mensagens/agenda. |
| Notificações | Shell + RPCs/trigger | Persistência, leitura, contagem e atualização. Reutilizar em vez de criar outra caixa paralela. |
| Busca compatível/comparador | Filtros de imóveis; tabela `property_comparisons` | Filtros e telemetria não comprovam comparador funcional ou motor de compatibilidade com preferências do cliente. Interface completa não identificada no inventário auditado. |
| Voz, financiamento, comissões, parcerias contratuais e checklist | Código e esquema inventariados | Não foi identificado módulo completo para esses requisitos. Planejar explicitamente, sem confundir flags ou tabelas de telemetria com produto pronto. |
| Modo aplicativo | Árvore auditada | Não foram identificados manifest/service worker e fluxo de instalação homologado do CRM. Responsividade existente não equivale a PWA concluída. |

### 3.2 Componentes reutilizáveis e cuidados

- `UI.tsx`: Panel, Metric, Badge, Button, EntityForm, Modal, Empty, PageHeading e SectionState.
- `Modal` é base para formulários; um Drawer acessível pode ser extraído na Etapa 02, sem copiar a lógica de cada entidade.
- `SectionState` mostra alerta de erro e **mantém os children**. Indicadores precisam de bloqueio explícito de dados incompletos; o painel novo de campanhas já faz isso. Não presumir que envolver qualquer widget nele impede zero falso.
- `Leads`, `Agenda`, `Contacts` e `Deals` concentram formulários e ações dentro da própria página. Extrair editores/ações progressivamente; não renderizar quatro páginas completas em abas, duplicando cabeçalhos, busca, carregamentos e modais.
- `ShareComposer`, `Collections`, `PrivateThumbnail`, filtros/códigos de imóveis e helpers de campanha/mídia podem servir a vários fluxos, respeitando dependências e direitos.
- URLs antigas de mídia foram normalizadas para o ambiente atual, com restrição de hosts/caminhos. Preservar a correção.
- O detalhe de lead já aceita deep link por ID; resultados de imóvel/contato na busca do Shell ainda abrem telas genéricas. Planejar seleção contextual com autorização e comportamento de voltar/fechar.

### 3.3 Banco e segurança relevantes

**Núcleo reutilizável:**

- `leads`, `lead_activities`, `lead_assignments`, `lead_transfer_requests`.
- `clients` com `contact_type`; `crm_contact_links` liga contato a lead ou imóvel.
- `properties`, `property_code_registry`, imagens/vídeos e catálogos.
- `tasks`, `visits`, `proposals`, `negotiations`, `sales`, `sale_confirmations`.
- `notifications`, `audit_logs`, `crm_event_log`, `crm_automation_preferences`.
- Materiais, versões, audiências, coleções e compartilhamentos `marketing_*` / `asset_*`.
- `crm_campaigns`, `crm_lead_attributions`, `crm_ad_accounts`, `crm_ad_campaigns`, `crm_ad_daily`.

**Views verificadas com security_invoker:** `admin_dashboard_metrics`, `lead_origin_metrics`, `property_admin_metrics`, `property_metrics`.

**RPCs/funções a preservar:** `current_user_role`, `can_manage_commercial`, `can_manage_operations`; helpers privados `lead_readable`, `client_readable`, `eligible_broker`; atribuição/transferência, `crm_record_contact`, `crm_management_metrics`, `crm_sale_review_queue`, `crm_review_sale`, `crm_confirm_presentation_share`, `crm_public_presentation`, `crm_read_notification`, `crm_unread_notification_count`, `crm_save_campaign`, `crm_capture_campaign_lead` e RPCs de anúncios.

Há funções SECURITY DEFINER com verificação explícita de usuário/papel e escopo. Não remover controles, acrescentar bypass para resolver UI ou afirmar que todas as funções foram integralmente auditadas. A revisão de grants, search_path, identidade e relações continua obrigatória para cada nova RPC.

**Políticas observadas:**

- Clientes, tarefas, visitas, propostas e vendas têm barreiras RESTRICTIVE de carteira própria, combinadas com políticas PERMISSIVE existentes.
- Leads próprios são acessíveis ao responsável; fila institucional sem responsável tem regra específica para operações. Gestão não ganha acesso irrestrito às carteiras por causa do menu.
- Publicação de imóvel exige flags/estado adequados; a carteira autorizada do responsável tem outro caminho de leitura.
- Notificações têm barreira por `user_id=auth.uid()`.
- `crm_contact_links` verifica o contato e o lead/imóvel relacionado.
- Regras efetivas resultam da combinação de permissões, políticas restritivas, helpers e triggers; examinar uma política ampla isolada pode produzir conclusão errada.
- Visão gerencial agregada e fila de revisão de vendas usam RPCs autorizadas com payload limitado; não ampliar SELECT de clientes para mostrar financeiro.

**Relações confirmadas:** negociação aponta para proposta; proposta e venda apontam para cliente/imóvel/corretor. Venda não possui FK explícita de negociação/proposta/lead no inventário atual. O vínculo cliente–lead existente ajuda, mas não identifica sozinho a origem de uma venda com múltiplos atendimentos.

**Histórico confirmado por metadados de triggers:** mudanças em leads, tarefas, visitas, propostas, negociações, vendas/imóveis possuem mecanismos de auditoria em pontos relevantes; leads/tarefas têm timeline. Compartilhamentos acionam automação/eventos e vendas alteradas reiniciam revisão. Esses mecanismos não representam captura automática de todas as conversas externas.

Existem `organizations` e colunas `organization_id` em algumas entidades. Isso não comprova isolamento multiempresa completo. Não implementar multitenancy, novos tenants ou migração organizacional nesta evolução operacional.

## 4. Diagnóstico da experiência do corretor

A base já resolve muitos registros, porém a jornada está dividida por entidade: o corretor sai do lead para cliente, imóvel, agenda, proposta e apresentação. Formulários completos aparecem cedo, ações repetidas competem por espaço e a busca muda de alcance conforme a rota.

O Dashboard já tem tarefas/visitas e pode servir de ponto de partida. Falta uma fila única que explique a próxima ação e permita agir no contexto do cliente. Sem integração de mensagens, “cliente sem resposta” deve ser apresentado como **atendimento sem contato/atividade registrado no CRM**, e não como leitura comprovada do WhatsApp.

Riscos de centralização mal executada: carregar todas as tabelas de uma vez, somar listeners, revelar dados pelo cache de outra conta, esconder funções antigas sem alternativa equivalente e trocar o limite de 500 por um loop ilimitado.

Objetivo mensurável da evolução: ações frequentes acessíveis em Meu Trabalho, com contexto preservado; telas especializadas acessíveis para edição extensa, administração e supervisão.

## 5. Proposta de interface Meu Trabalho

### Estrutura

Rota proposta: `/admin/meu-trabalho`, dentro do AdminGuard/Workspace/CrmShell existentes. Manter `/admin` e sua visão gerencial durante a transição.

**Cabeçalho:** busca compartilhada, notificações e uma ação principal **Adicionar**, com escolhas cliente, lead, imóvel, tarefa/visita e proposta conforme permissão/disponibilidade. Um menu contextual substitui conjuntos permanentes de botões; operações destrutivas mantêm confirmação.

**Abas operacionais propostas:**

1. **Hoje:** prioridades, agenda/visitas do dia, retornos e pendências.
2. **Atendimentos:** leads/clientes, histórico, próxima ação e WhatsApp contextual.
3. **Imóveis:** carteira, busca compatível, captação e apresentações/comparações.
4. **Negócios:** negociações/propostas; parcerias, comissões e fechamento serão incorporados nas etapas correspondentes.

Um painel lateral abre a entidade selecionada e ações compatíveis: registrar atendimento, agendar, vincular imóvel, gerar apresentação ou proposta. Evitar modais empilhados; voltar deve restaurar seleção/filtro/aba. Formulários extensos podem abrir a tela especializada.

**No celular:** navegação compacta de até quatro áreas operacionais; abas com comportamento previsível, drawer em tela cheia, ações alcançáveis, teclado sem cobrir salvar, áreas de toque de referência 44×44 CSS px. Não depender de hover ou arrastar para tarefas essenciais.

**Acessibilidade:** semântica de abas, teclado, foco inicial/retorno, Escape, rótulos e feedback de salvamento/erro. Não usar apenas cor para prioridade. Zoom de 200% e largura de 360 px devem preservar operações essenciais.

### Navegação e preservação

Agrupar o catálogo atual em Meu Trabalho, Carteira, Marketing e Gestão. Todos os destinos existentes continuam acessíveis, inclusive páginas especializadas. Ocultar uma entrada por perfil é uma decisão de navegação, não uma autorização de backend.

Gestão mantém visão institucional separada e agregada. O corretor vê sua carteira e os recursos explicitamente autorizados. Novos módulos ainda não implementados aparecem como escopo do roteiro, sem contadores simulados, pagamentos fictícios ou botões que aparentem funcionar.

A Etapa 02 entrega primeiro a estrutura e as operações que já funcionam. Não deve prometer que comissões, voz, busca inteligente e parcerias já estão ativas.

## 6. Arquitetura proposta para integrar os módulos

### Interface e carregamento

- Composição por widgets e editores reutilizáveis; um único Shell e Workspace.
- Separar apresentação, seleção contextual e ações de domínio. Reutilizar RPCs/validações; evitar uma segunda implementação de cadastro por “ser rápido”.
- Registrar o carregamento da nova rota/aba explicitamente em Workspace. Uma rota nova hoje não encontra automaticamente todos os seus dados em `modules[pathname]`.
- Carregamento por necessidade da aba, projeção mínima e paginação/agrupamento quando necessário. Não ativar todas as abas e consultas no primeiro render.
- Busca com alcance declarado. No primeiro incremento pode reaproveitar a busca dos dados carregados, sem chamá-la de completa. A busca efetivamente global/paginada é uma entrega própria.
- ID selecionado em URL deve ser tratado como referência não confiável. Conferir autorização; negar sem revelar se um registro privado de outra pessoa existe.
- Identidade/papel compõem o escopo de dados. Limpar seleção, resultados e formulários privados ao trocar conta ou perder permissão. Filtros não podem manter payload privado em localStorage.

### Dados e operações

Reutilizar clients, crm_contact_links, leads, tasks, visits, properties e módulos comerciais. Antes de propor novas tabelas, apontar a lacuna de dados/regras que não cabe no modelo atual.

Modelos futuros candidatos, ainda **não autorizados para criação**:

- Perfil estruturado de interesse/preferências relacionado ao cliente/atendimento, com orçamento e requisitos explícitos.
- Vínculo explícito de atendimento/lead a proposta/negociação/venda, preservando registros históricos não vinculados como tal.
- Acordo de parceria e suas versões/participantes/autorizações, separado de transferência de lead.
- Comissões, parcelas e movimentos de recebimento/pagamento/estorno ligados ao negócio e ao acordo aprovado.
- Checklist/documentos de fechamento e simulações orientativas versionadas, quando não houver estrutura reaproveitável.

Toda mudança de banco futura exige migração versionada revisada, limites e política por dono/participante/papel, verificação das FKs e preservação das carteiras. Criação não está autorizada neste planejamento.

### Histórico, automação e notificações

Reutilizar audit_logs, lead_activities, crm_event_log e notificações persistentes. Definir uma chave de idempotência por ação/ocorrência; uma nova interface não deve duplicar a automação já disparada por trigger. A automação de prioridade não deve criar repetidamente a mesma tarefa a cada recarga.

Diferenciar: ação sugerida, ação concluída no CRM, mensagem aberta no WhatsApp, envio confirmado manualmente e mensagem recebida por integração oficial. Nenhuma dessas evidências deve ser silenciosamente convertida em outra.

### Evolução para comercialização

Preparar fronteiras de domínio, configuração de marca, documentação e inventário de dependências. Manter a imobiliária atual como ambiente de trabalho. Multiempresa, faturamento SaaS e provisionamento por imobiliária exigirão projeto posterior; a presença de organization_id não autoriza oferecê-los como prontos.

## 7. Regras comerciais vinculantes

### Parcerias

- Cada parceria precisa de autorização do corretor captador; aceite de um convite pelo parceiro não substitui autorização da captação.
- Confirmar o significado de captador nos dados: owner_id e broker_id têm funções existentes; não presumir equivalência em cadastros delegados. Se faltar um vínculo explícito, defini-lo na etapa de modelagem.
- Autorizar parceria não transfere captação, titularidade ou carteira. Transferência consentida de lead existente permanece operação independente.
- Cada acordo contém imóvel/negócio, participantes, campos que podem ser compartilhados, condições e divisão negociada. Nenhum percentual obrigatório, taxa padrão silenciosa ou divisão automática fixa.
- Alterações criam versão com autor, data, aceite e motivo, preservando condições anteriores e seus efeitos financeiros.
- Definir quais condições financeiras precisam de revisão da gestão antes de vigorar. Mudança de condição pendente não reescreve acordo já aprovado nem pagamentos realizados.
- Revogação encerra acesso futuro conforme a regra aprovada; histórico legítimo financeiro/auditoria permanece. Não implica apagar transações ou ampliar acesso a clientes particulares.
- A flag shareable_by_other_brokers não é contrato individual, aceite de parceria ou permissão financeira.

### Comissões

- Diferenciar previsão, aprovação, recebimento e pagamento. Venda registrada/volume comercial não equivale a caixa.
- Permitir parcelas, recebimentos/pagamentos parciais, alterações e cancelamentos com histórico/estornos, sem exclusão silenciosa.
- Usar valores monetários decimais exatos, moeda, base de cálculo e regra de arredondamento explícitas. Não calcular dinheiro com ponto flutuante sem controle.
- Vincular cada obrigação ao negócio e, quando houver, à versão do acordo autorizado. Percentual é uma condição negociada opcional, não regra universal.
- O corretor acompanha somente seus direitos/movimentos permitidos; gestão acessa o recorte financeiro autorizado. Não dar acesso irrestrito à carteira para permitir revisão financeira.
- Evitar dupla contabilização e pagamento duplicado em tentativas repetidas. Divergência ou alteração de revisão exige nova confirmação. O controle registra e concilia movimentos; não pressupõe transferência bancária automática.

### Atendimento

WhatsApp profissional individual continua como canal principal, com recepção institucional quando a campanha determinar. Abrir o aplicativo não cria cliente, conversa, atendimento ou venda. Não criar contatos fictícios. Mensagens automáticas exigem integração adequada, consentimentos e autorização específica. Registro por voz também exige confirmação humana antes de salvar.

## 8. Cobertura das 19 funcionalidades aprovadas

| ID | Funcionalidade | Etapas principais |
| --- | --- | --- |
| F01 | Assistente diário do corretor | 04, integrado em 02/11 |
| F02 | Busca inteligente de imóveis para clientes | 03, 06 |
| F03 | Atendimento rápido pelo WhatsApp | 03, 11 |
| F04 | Captação rápida de imóveis | 05 |
| F05 | Gestão inteligente de visitas | 07 |
| F06 | Simulador orientativo e organização de financiamento | 10 |
| F07 | Cadastro de cliente por voz com confirmação | 03, robustez em 11 |
| F08 | Histórico automático de atividades | 03–11, base já parcial |
| F09 | Alertas de imóveis compatíveis | 06, entrega por 11 quando autorizada |
| F10 | Controle de proprietários | 05 |
| F11 | Comparador de imóveis | 06 |
| F12 | Gerador de propostas | 09 |
| F13 | Controle de comissões | 08, 09 |
| F14 | Compartilhamento autorizado entre corretores | 08 |
| F15 | Checklist de fechamento | 09, documentação em 10 |
| F16 | Modo aplicativo no celular | 11 |
| F17 | Cadastro rápido de clientes | 03 |
| F18 | Agenda e retornos automáticos | 04, 07, 11 |
| F19 | Painel Meu Trabalho centralizado | 02, refinado nas demais |

## 9. Plano detalhado das 12 etapas

Complexidade relativa: **M** = alteração delimitada; **G** = vários fluxos e módulos; **MG** = regras financeiras/compartilhamento e consistência de alta exigência. Não são estimativas de prazo ou orçamento.

### Etapa 01 — Auditoria e planejamento técnico

- **Estado:** entregue neste documento; aguarda apreciação do usuário. Etapa 02 não iniciada.
- **Objetivo:** identificar o estado real e organizar uma evolução preservando funcionalidades e segurança.
- **Funcionalidades:** inventário, proposta Meu Trabalho, cobertura F01–F19, dependências e roteiro de homologação.
- **Reuso:** código/PRs, migrations, catálogos do staging, CI e backlog existente.
- **Desenvolver:** somente o documento; nenhum componente, tabela ou conexão.
- **Dependências:** acesso de leitura ao GitHub/staging e decisões já aprovadas.
- **Riscos:** confundir preview com produto homologado, histórico antigo com status atual ou schema existente com funcionalidade completa.
- **Complexidade:** M.
- **Verificações:** rastrear evidências de código/metadados, distinguir aceites e comparar cadeia de PRs.
- **Conclusão objetiva:** 12 etapas e 19 funcionalidades mapeadas, riscos e base indicados, backlog preservado e prompt de Etapa 02 pronto.
- **Ferramenta:** Work.

### Etapa 02 — Centralização da interface

- **Estado:** planejada; requer confirmação.
- **Objetivo:** disponibilizar Meu Trabalho e reduzir navegação repetida.
- **Funcionalidades:** estrutura F19; abas, painel lateral, ação Adicionar e navegação agrupada; só ações existentes e realmente disponíveis.
- **Reuso:** AdminGuard, Workspace, Shell, Dashboard, UI, formulários/editores de Leads/Contacts/Agenda/Properties/Deals extraídos com cuidado.
- **Desenvolver:** rota Meu Trabalho, composição por contexto, editores reutilizáveis necessários e seleção por entidade. Preservar telas antigas e visão de gestão.
- **Dependências:** Etapa 01, baseline de rotas/ações, plano de dados por aba e revisão dos pontos compartilhados.
- **Riscos:** múltiplos shells/listeners, consultas em excesso, campos privados mantidos após troca de conta, quebra de deep links e supressão de funções antigas.
- **Complexidade:** G.
- **Testes:** paridade de destinos/ações, guard e escopo pessoal/gerencial, erro/loading/limite, troca de conta, teclado/foco e 360/768/1440 px.
- **Conclusão objetiva:** corretor acessa contexto de atendimento, agenda, imóvel e negócio pelo hub; operações básicas existentes abrem editor/detalhe sem percorrer várias páginas; todas as rotas antigas seguem acessíveis; nenhum módulo futuro aparenta estar concluído; sem novo schema ou integração.
- **Ferramenta:** Codex para código/testes; Work para revisar a jornada.

### Etapa 03 — Clientes e atendimento rápido

- **Estado:** parcial na base; fluxo rápido, voz e preferências ainda planejados.
- **Objetivo:** registrar e atender com poucos passos, no contexto certo.
- **Funcionalidades:** F03, F07, F08, F17 e base de F02.
- **Reuso:** clients, leads, crm_contact_links, crm_record_contact, histórico, EntityForm e botões WhatsApp.
- **Desenvolver:** cadastro mínimo com complementação posterior, normalização de telefone, detecção de duplicidade dentro do escopo autorizado, abrir/registrar atendimento e perfil estruturado de interesse. Voz inicia apenas por ação explícita, gera rascunho editável e exige confirmação de todos os campos antes de persistir.
- **Dependências:** Etapa 02, distinção cliente/lead, regras de titularidade e análise de lacunas de campos.
- **Riscos:** unir contatos de carteiras distintas, revelar que um telefone existe em carteira privada, transcrição incorreta ou envio de áudio a serviço externo sem decisão/consentimento.
- **Complexidade:** G.
- **Testes:** telefone/duplicidade, salvar com mínimo válido, completar/editar, cancelamento, autorização, voz negada/indisponível, correção de nome/telefone e nenhum cadastro antes da confirmação.
- **Conclusão objetiva:** cliente/lead criado e relacionado corretamente; WhatsApp abre destinatário/mensagem esperados por ação humana; atividade salva uma vez; teclado sempre é alternativa à voz; áudio não é retido sem necessidade/regra aprovada.
- **Ferramenta:** Codex; Work revisa campos e linguagem.

### Etapa 04 — Assistente diário e agenda inteligente

- **Estado:** base parcial de tarefas/visitas; assistente ainda planejado.
- **Objetivo:** sugerir a próxima ação com explicação.
- **Funcionalidades:** F01, F08 e F18.
- **Reuso:** tasks, visits, lead_activities, Dashboard, Agenda, preferências e automação de retorno já existente.
- **Desenvolver:** fila determinística por prazo/estado, prioridades justificadas, concluir/adiar/abrir contexto, retornos e propostas com acompanhamento registrado.
- **Dependências:** 02/03; regras de fuso, horário útil, adiamento, cancelamento e idempotência. A ligação de proposta a atendimento deve ser explícita quando exigida.
- **Riscos:** chamar ausência de registro de “cliente não respondeu”, criar tarefas duplicadas, tarefas para corretor inativo ou prioridade baseada em dado incompleto.
- **Complexidade:** G.
- **Testes:** datas-limite, vencidos/hoje/futuros, fuso, repetir recarga/ação, corrida de duas sessões, troca de responsável, autorização e falha de tabela.
- **Conclusão objetiva:** cada prioridade mostra motivo/origem; concluir e adiar persistem; recarga não duplica tarefas; nenhum envio externo automático; dados sem evidência de resposta são identificados como tal.
- **Ferramenta:** Codex; Work valida regras e legibilidade.

### Etapa 05 — Captação de imóveis e proprietários

- **Estado:** cadastro e relações já implementados; captação rápida planejada.
- **Objetivo:** captar com segurança no celular e complementar depois.
- **Funcionalidades:** F04, F10 e F08.
- **Reuso:** properties, código único/registro, PropertyForm, mídia privada, clients/contact_type, crm_contact_links, aprovação/publicação.
- **Desenvolver:** rascunho curto, fluxo de fotos/proprietário, vínculo explícito de captação quando necessário, pendências para completar ficha e painel contextual do proprietário.
- **Dependências:** 02/03; definir semântica de captador, cadastro delegado e campos indispensáveis.
- **Riscos:** publicar rascunho incompleto, transferir captação ao adicionar contato, copiar proprietário privado para outro corretor, uploads órfãos/URLs de preview antigo.
- **Complexidade:** G.
- **Testes:** criar/retomar rascunho, código único/concorrrência, falha no upload, associação por permissão, mídia/capa/galeria e aprovação/publicação.
- **Conclusão objetiva:** captação mínima salva como rascunho, código estável, fotos e proprietário corretos, complementação preservada; site só recebe imóvel aprovado e habilitado; responsável pela captação não muda silenciosamente.
- **Ferramenta:** Codex.

### Etapa 06 — Busca inteligente e apresentações

- **Estado:** filtros, coleções e apresentações existem; matching/alertas/comparador completos planejados.
- **Objetivo:** selecionar imóveis adequados e apresentar diferenças úteis.
- **Funcionalidades:** F02, F09, F11, apresentações e F08.
- **Reuso:** filtros de imóveis/preço, códigos, properties, coleções, ShareComposer, apresentação privada e mecanismos de revogação/expiração.
- **Desenvolver:** requisitos obrigatórios/preferências do cliente, ranking explicável, comparador e alertas internos idempotentes de novas correspondências. Começar com regras rastreáveis, sem exigir IA externa.
- **Dependências:** 03/05; dados estruturados, normalização de preço/área, paginação/busca quando a base exceder limites; 08 para imóveis de parceria não públicos.
- **Riscos:** incluir imóvel privado não autorizado, tratar preço desconhecido como zero, expor proprietário/documentos no comparativo ou continuar oferecendo imóvel indisponível.
- **Complexidade:** G.
- **Testes:** orçamento/área/ambiente ausente, critérios obrigatórios versus desejáveis, imóvel alterado/arquivado, ranking, autorização, revogação e material permitido.
- **Conclusão objetiva:** sugestão explica compatibilidade/limitações; critérios obrigatórios são cumpridos; comparação usa somente dados autorizados; apresentação respeita flags/capacidade e expiração; alerta não duplica nem envia mensagem sem autorização.
- **Ferramenta:** Codex; Work revisa critérios e apresentação.

### Etapa 07 — Visitas e acompanhamento

- **Estado:** CRUD e calendário existentes; inteligência e jornada integrada planejadas.
- **Objetivo:** planejar visita e registrar resultado/próximo passo.
- **Funcionalidades:** F05, F18 e F08.
- **Reuso:** visits, tasks, Agenda, contatos/imóveis e histórico.
- **Desenvolver:** agendamento contextual, confirmação manual, reagendamento com histórico, verificação de conflitos, resultado da visita e retorno associado.
- **Dependências:** 03–06; vínculos corretos, responsável e disponibilidade.
- **Riscos:** dupla reserva, data errada por fuso, automação de mensagem sem integração ou falta de acesso ao imóvel/cliente após mudança.
- **Complexidade:** M/G.
- **Testes:** sobreposição, reagendamento, cancelamento, ausência, visita realizada, concorrência, troca de conta e tarefa criada uma vez.
- **Conclusão objetiva:** agenda/histórico concordam; conflitos exigem resolução explícita; resultado da visita gera próximo passo quando configurado; nenhuma mensagem é considerada enviada só por abrir link.
- **Ferramenta:** Codex.

### Etapa 08 — Parcerias autorizadas

- **Estado:** planejada; flags e transferência de lead não implementam este requisito.
- **Objetivo:** colaborar por autorização específica sem entregar a carteira.
- **Funcionalidades:** F14, base de F13 e F08.
- **Reuso:** identidade/papéis, propriedade/captação, referências comerciais, notificações e auditoria. A transferência consentida existente serve como referência de aceite, não como substituto do contrato.
- **Desenvolver:** convite, autorização do captador, escopo de dados, condições negociadas/versionadas, aceite, revisão financeira quando aplicável, revogação e ligação ao negócio.
- **Dependências:** 05/06; definição de captador e de quem aprova cada alteração; contrato de dados e RLS antes da interface.
- **Riscos:** flag global abrindo carteira, perda da autoria de captação, aplicação retroativa de nova divisão, acesso após revogação e respostas duplicadas/concorrentes.
- **Complexidade:** MG.
- **Testes:** captador/parceiro/terceiro/gestão, IDOR, pendente/negada/revogada, duas versões simultâneas, alteração financeira, tentativa de autoaprovação e preservação da titularidade.
- **Conclusão objetiva:** acesso só ocorre após as autorizações requeridas; divisão é individual sem percentual obrigatório; alteração deixa versão/autor/aceites; revogação bloqueia acesso futuro indevido; histórico do acordo e captação permanece.
- **Ferramenta:** Codex para modelo, migrations preparadas e código; Work para revisar a regra comercial. Aplicar migrations somente no escopo autorizado.

### Etapa 09 — Propostas, comissões e fechamento

- **Estado:** registros/revisão de venda existentes; cadeia completa, documentos, comissões e checklist planejados.
- **Objetivo:** acompanhar o negócio e o dinheiro com evidência consistente.
- **Funcionalidades:** F12, F13, F15 e F08.
- **Reuso:** proposals, negotiations, sales, sale_confirmations, revisão por expected_revision, auditoria e participantes autorizados.
- **Desenvolver:** ligação explícita lead/atendimento–proposta–negociação–venda; gerador de proposta versionado; checklist; comissões previstas/aprovadas/recebidas/pagas; parcelas, alterações, cancelamentos/estornos.
- **Dependências:** 03/05/07/08; regras de base, moeda, arredondamento e validação financeira aprovadas antes do modelo final. Custos de mídia seguem o backlog específico.
- **Riscos:** inferir origem por mesmo imóvel/cliente, somar convertido como venda, contar volume registrado como recebido, pagar duas vezes ou alterar condições já liquidadas.
- **Complexidade:** MG.
- **Testes:** revisões concorrentes, parcelas parciais, recebimento e repasse distintos, cancelamento, estorno, múltiplos parceiros, dinheiro decimal e permissão individual/gerencial.
- **Conclusão objetiva:** venda e origem rastreáveis por IDs explícitos; documento representa a versão aceita; saldos conciliam com movimentos; ausência de vínculo/custo aparece como pendência, nunca como ROI conhecido; autorização preserva carteira e histórico.
- **Ferramenta:** Codex; Work valida relatórios e processo.

### Etapa 10 — Financiamento e documentação

- **Estado:** planejada.
- **Objetivo:** orientar o atendimento e organizar documentos sem prometer crédito.
- **Funcionalidades:** F06 e complemento de F15.
- **Reuso:** cliente/imóvel/negócio, mídia privada e mecanismos de acesso/documentação disponíveis.
- **Desenvolver:** simulador orientativo com hipóteses identificadas, versão da fórmula/tabela, renda/entrada/prazo, pendências e checklist documental por negócio.
- **Dependências:** 03/05/09; fontes oficiais atuais do produto financeiro escolhido, critérios aprovados e política de documentos sensíveis.
- **Riscos:** taxa desatualizada, omissão de encargos/subsídios, promessa de aprovação, documentos acessíveis por link indevido ou consulta bancária sem autorização.
- **Complexidade:** G.
- **Testes:** exemplos de referência de fonte oficial, arredondamento/limites/valores ausentes, tabela vencida, revisão da simulação, expiração e acesso a cada documento.
- **Conclusão objetiva:** resultado mostra premissas/data/limites e caráter orientativo; não declara aprovação bancária; documentos ficam no escopo do negócio, com checklist real e acesso restrito.
- **Ferramenta:** Work para pesquisa e especificação das premissas; Codex para implementação e testes. Nenhum valor de taxa foi definido nesta auditoria.

### Etapa 11 — Automações, WhatsApp e experiência mobile

- **Estado:** automação interna pontual existente; integrações e PWA planejadas/dependentes de autorização.
- **Objetivo:** conectar os fluxos aprovados e torná-los confiáveis no celular.
- **Funcionalidades:** consolidação de F01/F03/F07/F08/F09/F16/F18.
- **Reuso:** tarefas/eventos idempotentes, notificações, polling/Reatime existentes, identidade e adaptadores onde aplicável.
- **Desenvolver:** integrações oficiais escolhidas, filas/retries/renovação e consentimento; PWA/instalação/atualização; tratamento de rede ruim; fallback da voz e uso mobile.
- **Dependências:** etapas anteriores e acesso autorizado aos provedores. Meta/Google Ads permanece adiado; não impede desenvolver melhorias independentes.
- **Riscos:** mensagens sem autorização, tokens em cliente, repetição de webhooks, notificações duplicadas, cache offline de carteira privada, incompatibilidade de navegador/instalação e fila offline repetindo mutação.
- **Complexidade:** MG.
- **Testes:** indisponibilidade do provedor, renovação/revogação, repetição e ordem de eventos, consentimento, iOS/Android, atualização do app, offline/retorno à rede, logout e mudança de usuário.
- **Conclusão objetiva:** ação externa tem autorização e resultado verificável; integração não confirmada não aparece como pronta; PWA instala nos alvos suportados; conteúdo privado não é colocado em cache compartilhado/offline por padrão; voz sempre permite revisão e digitação.
- **Ferramenta:** Codex; Work acompanha configuração autorizada e experiência.
- **Limite técnico confirmado por documentação:** SpeechRecognition tem disponibilidade limitada e pode usar processamento remoto. Não prometer voz universal/offline; avaliar compatibilidade e consentimento antes de escolher a solução.

### Etapa 12 — Homologação final e preparação comercial

- **Estado:** pendente da evolução completa e liberação das dependências.
- **Objetivo:** validar a jornada inteira e preparar operação/documentação.
- **Funcionalidades:** F01–F19 integradas e backlog herdado reconciliado.
- **Reuso:** CI, fixtures locais, evidências e aceites manuais; plano de backup/restore/rollback.
- **Desenvolver:** correções finais, guias por papel, matriz de permissões, treinamento, configuração e critérios de suporte. Avaliar futura venda/replicação sem implementar multiempresa agora.
- **Dependências:** etapas anteriores e integrações que compuserem a entrega comercial. Funcionalidade adiada precisa ser explicitamente excluída de promessas de entrega ativa, sem desaparecer do backlog.
- **Riscos:** validar previews diferentes como se fossem a mesma versão, merge da cadeia fora de ordem, regressões de carteira/mídia, dados pessoais em evidências e implantação sem rollback.
- **Complexidade:** MG.
- **Testes:** jornada captado→cliente/lead→compatibilidade→apresentação→visita→parceria→proposta→venda→comissão; matriz admin/gestor/corretores A/B; API/RLS/arquivos; números; mobile/teclado; limites/cancelamentos/concorrrência; provedores reais autorizados.
- **Conclusão objetiva:** matriz rastreável em PASS/FAIL/BLOCKED, falhas impeditivas resolvidas, bloqueios apresentados sem aprovação fictícia, backup/restore adequado às mudanças comprovado, rollback e documentação revisados; merge/produção só no escopo explicitamente autorizado.
- **Ferramenta:** Work para roteiro/evidências e Codex para verificações técnicas/correções.

## 10. Dependências, decisões e riscos prioritários

### Ordem de dependência

02 cria a superfície. 03 fornece contexto de cliente/atendimento; 04 prioriza ações; 05 qualifica imóvel/proprietário. 06 usa preferências e catálogo; 07 usa clientes/imóveis. 08 define parceria e permissão. 09 liga negócio/dinheiro/acordo. 10 acrescenta financiamento/documentos. 11 integra provedores e consolida mobile. 12 valida o conjunto.

A agenda básica e matching da carteira própria não dependem de acesso Ads. Comissões de parceria dependem do acordo válido. A preparação do vínculo lead-negócio deve ser especificada antes do gerador de propostas; o desenvolvimento de cada etapa pode ser dividido em entregas menores sem alterar essa ordem.

### Decisões que precisam ser detalhadas na etapa correspondente

1. Quem é captador em cadastros delegados e como registrar sem substituir owner_id/broker_id indevidamente.
2. Quais dados o parceiro pode ver, por imóvel/negócio e por versão do acordo.
3. Quando a gestão precisa validar condição financeira, quem pode revisar e regras contra autoaprovação.
4. Base de cálculo, moeda/arredondamento e significado de recebido/pago em cada fluxo de comissão.
5. Regras de prioridade, dias úteis, fuso, adiamento e evidência de contato.
6. Campos mínimos, preferências de cliente, deduplicação restrita à carteira e consentimento de voz.
7. Produto financeiro/fontes oficiais e política de retenção/acesso documental.
8. Provedor WhatsApp oficial, autorização por número, consentimento, capacidade do serviço e política de envio.

Não são pedidos para o usuário repetir decisões já tomadas. São detalhes para a especificação de cada etapa; não bloqueiam o planejamento.

### Riscos que podem bloquear novos incrementos

| Risco | Efeito | Ação planejada |
| --- | --- | --- |
| Cadeia de PRs + ramo #5 divergente | Regressão/guard removido ao consolidar | Revisar dependências e diff, integrar evidências úteis sem sobrescrever correções recentes. |
| Workspace por rota + limite 500 | Busca parcial e indicadores incompletos | Carga por aba/escopo, sinais de completude e futura paginação/agregação autorizada. |
| SectionState não oculta children em erro | Zeros/indicadores enganadores | Barreira explícita em widgets críticos; revisão herdada P12. |
| Carteiras privadas versus painel único | Vazamento por consulta/cache/URL | RLS/RPC como autoridade, identidade/papel, seleção limpa e testes A/B. |
| Ausência de vínculo lead-negócio-venda | ROI/comissões atribuídos incorretamente | IDs explícitos e estados de vínculo pendente; sem heurística financeira. |
| Compartilhamento por flag | Parceria sem consentimento/condições | Acordo por captação/negócio, versão e permissão de campos. |
| Tracking global | Coleta indevida de rotas privadas | Auditoria específica P07; filtro do relatório não resolve coleta. |
| Previews separados e mídia/GA4 por ambiente | Regressão aparente ou conexão ausente | Identificar commit/ambiente, preservar normalizador de mídia; configuração secreta por fluxo autorizado. |
| PWA/voz sem matriz de suporte | Fluxo inacessível ou dados retidos | Fallback, consentimento, testes em dispositivos e ausência de cache privado por padrão. |
| Provedores sem acesso | Integração preparada tratada como ativa | Marcar dependência e manter entregas independentes em andamento. |

## 11. Backlog herdado e cruzamento com o roteiro

O [backlog existente](crm-project-backlog.md) permanece intacto e deve ser consultado com este documento. Os IDs P01–P13 são preservados. Esta seção atualiza o planejamento **dentro deste arquivo**; não autoriza editar outros arquivos nesta etapa.

| ID herdado | Pendência preservada | Etapas de tratamento |
| --- | --- | --- |
| P01 | Vínculo verificável lead–negociação–venda | 03/09; contrato definido antes de cálculos financeiros. |
| P02 | Acesso/sincronização Meta/Google Ads | 11/12, adiado conforme decisão existente. |
| P03 | Entrada real de formulários nativos | 03/11/12, com integração autorizada. |
| P04 | WhatsApp profissional oficial | 03 para ação manual; 11 para conexão. |
| P05 | Custos/CPL/CPA/retorno financeiro | 09/11/12, sem prometer valores antes da cobertura/vínculo. |
| P06 | Agregação/paginação acima do limite | 02 planejamento de carga; evolução em 03/06/12. |
| P07 | Coleta privada/consentimento | 02 preservar; auditoria/correção e validação em 11/12. |
| P08 | Recebimento real GTM/GA4 e clique único | 03/11/12. Preview sem tracking não comprova recebimento. |
| P09 | Comparação independente do Analytics | 12 ou rodada específica autorizada. |
| P10 | Autorização, sessões e polling | Todas as etapas; matriz integrada em 12. |
| P11 | Arquivos/apresentações: expiração/revogação/Range | 05/06/10/12, reconciliando aceites existentes. |
| P12 | Interface/erro/loading/mobile | 02 e todas as etapas; 11/12 para revisão integrada. |
| P13 | Consolidação de PRs e liberação | 12; migrations/previews/merge/produção mantêm escopos próprios. |

**Aceites a preservar:** períodos GA4 7/28/90; imagens da campanha; desempenho e filtro de cadastro; controles de imóvel, motivo opcional de atribuição/transferência e apresentações de rascunhos/pendentes conforme histórico. Não reclassificar tudo como “não testado”; separar teste manual já aprovado de verificação independente ainda pendente.

**Critério de evidência:** cada entrega deve registrar versão/commit, ambiente, perfil, cenário, resultado e limitações. Não salvar credenciais, dados privados de clientes, métricas privadas da captura ou dumps no GitHub. Teste simulado, SQL com claims sintéticas e HTTP anônimo não substituem jornada autenticada real.

## 12. Histórico de decisões e governança

- Antes desta etapa, usuário pediu preservar pendências e acrescentar novas funcionalidades antes da homologação manual final.
- Em 03/11/2026, aprovou o escopo F01–F19 e a sequência de 12 etapas por este pedido.
- Nesta Etapa 01, foram auditados snapshot GitHub e metadados do staging, sem implementar ou mudar banco/ambiente.
- Decisão de interface: operações frequentes no hub, telas complexas preservadas; reduzir controles expostos sem retirar funcionalidades.
- Decisão de negócio: parceria individual autorizada pelo captador, sem transferência de captação; comissões negociadas e versionadas, sem percentual obrigatório.
- Decisão de atendimento: WhatsApp profissional, sem contato fictício e sem disparo automático não autorizado.
- Decisão de arquitetura: reutilização e isolamento existentes; nenhuma implementação multiempresa agora.
- Estados seguintes: 02–12 planejadas, com bases parcialmente implementadas conforme inventário. Nenhuma das novas funções é considerada pronta só por constar no plano.
- **Aguardar confirmação explícita antes de iniciar a Etapa 02.**

## 13. Prompt técnico para o Codex — Etapa 02

O texto abaixo é uma instrução para execução **futura, somente depois da confirmação do usuário**. Não foi executado nesta auditoria.

> **Destinatário: Codex. Etapa 02 — Centralização da interface do Privilege CRM.**
>
> Leia AGENTS.md, docs/crm-broker-productivity-roadmap.md e docs/crm-project-backlog.md. Reconfira o HEAD remoto da branch work/crm-campaign-performance-20261103, a cadeia do PR #13 e alterações desde o snapshot auditado a9f6cbb893b3362478d429d9e6acaa34e7c23d67. Não use uma cópia local antiga nem parta da main. O código funcional de referência é ef193ad49fa5f2dde476d3c78889ceb8f2c25499; commits posteriores auditados eram de documentação. Se houver novo código, revise antes de continuar.
>
> Crie uma branch de trabalho derivada do HEAD que contém este documento, com nome work/crm-campaign-broker-workspace-DATA. Preserve o guard de staging existente, sem chaves privilegiadas. Inclua a desativação de deploy automático da nova branch no primeiro commit antes do primeiro push. Abra PR em rascunho contra a branch de #13; não faça merge.
>
> Implemente somente a centralização da Etapa 02. Crie /admin/meu-trabalho dentro do AdminGuard, WorkspaceProvider e CrmShell existentes. Não crie outro sistema de sessão, outro provedor global de dados ou um segundo Shell. Mantenha /admin e todas as rotas especializadas; não altere o destino de login nesta primeira entrega sem validar o fluxo e o escopo aprovado.
>
> Estruture abas Hoje, Atendimentos, Imóveis e Negócios, com painel contextual e ação Adicionar. Só exponha ações implementadas. Preserve funcionalidades e autorizações; não simule parcerias, comissões, financiamento ou voz como prontas. Agrupe a navegação mantendo acesso aos destinos antigos e visão gerencial agregada separada.
>
> Reutilize Dashboard/Agenda/Contacts/Leads/Properties/Deals, UI, ShareComposer e helpers por extração de partes úteis; não monte páginas completas duplicadas dentro de abas. Extraia editores e handlers necessários sem duplicar validação/RPC/cadastro. O hub deve abrir detalhes, agenda e ações existentes no contexto correto; formulário longo pode continuar na tela especializada.
>
> Defina explicitamente as tabelas necessárias da nova rota/aba em Workspace e carregue por demanda. Não carregue a união de todos os módulos na primeira renderização, não adicione polling/listeners duplicados e não substitua o limite de 500 por leitura ilimitada. Declare o alcance da busca atual. Caso a pesquisa exaustiva exija backend novo, registre a dependência para etapa posterior em vez de fingir completude.
>
> Trate IDs de URL como referências não confiáveis, com autorização em RLS/RPC/API. Ao trocar conta/papel, perder sessão ou negar consulta, descarte seleção e dados privados. Não autorize por user_metadata. Não copie segredos GA4/Ads, não use service_role e não amplie carteiras para facilitar composição da UI.
>
> Construa painel lateral/modal com foco correto, Escape, retorno de foco e rótulos; no celular use apresentação em tela cheia quando necessário. Evite modais empilhados. Preserve voltar/fechar e avise sobre rascunho não salvo quando aplicável. Teste 360, 768 e 1440 px, zoom 200% e teclado.
>
> Loading, vazio, erro e dados incompletos são estados diferentes. SectionState global mantém children em erro; bloqueie explicitamente indicadores e ações que dependem de tabela indisponível. Não mostre zero como substituto de falha. Ausência de registro no CRM não prova ausência de resposta no WhatsApp.
>
> Não implemente novas regras comerciais das etapas 03–11, novas tabelas/migrations/RLS, multiempresa, integrações, env secrets, disparos, deploy ou produção nesta entrega. Se uma dependência exigir mudança de banco, documente-a e limite a entrega à superfície viável. Não reaplique migrations antigas. Não incorpore #5 inteiro sem revisar os arquivos de guard/testes que divergiram.
>
> Execute verificações técnicas apropriadas: lint, TypeScript, testes existentes afetados e build no ambiente seguro. Acrescente testes de paridade de rotas/ações, seleção contextual, carga por aba, erros/limite, troca de conta/papel, teclado/foco e regressões dos fluxos reutilizados. Use fixtures isoladas e não exponha dados pessoais. Documente testes autenticados/visuais bloqueados; não os chame de aprovados a partir de mocks.
>
> Ao concluir, entregue PR em rascunho, resumo das funções preservadas/reutilizadas, alterações, evidências, riscos e pendências. Atualize o roadmap e backlog somente dentro do escopo de escrita autorizado na execução. Deixe a publicação do preview para autorização específica. Não inicie a Etapa 03.

## 14. Referências para retomada

### Arquivos internos

- [Backlog e aceites](crm-project-backlog.md).
- [Desempenho e filtro de cadastro](crm-campaign-performance-20261103.md).
- [Tracking dos cliques](crm-whatsapp-click-tracking-20261103.md).
- [Correção de mídia](crm-campaign-images-fix-20261103.md).
- [Analytics e limites](crm-site-analytics-20261030.md).
- [Workspace](../components/crm/Workspace.tsx), [Shell](../components/crm/Shell.tsx), [UI](../components/crm/UI.tsx), [modelos](../lib/crm/model.ts).
- Migrations de carteiras/gestão/vendas: prefixos 20261019165011, 20261019165034 e 20261019165057.
- Migrations de campanhas/anúncios: 20261029184222 e 20261030185925.

### Fontes técnicas externas consultadas

- [Supabase changelog](https://supabase.com/changelog.md), consultado em 03/11/2026; índice inclui mudança de cifras TLS prevista para 10/11/2026. Verificar clientes antigos em testes de integração; nada foi atualizado nesta auditoria.
- [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition): disponibilidade limitada e possibilidade de processamento remoto.
- [MDN instalação de aplicações web](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing): planejar matriz de dispositivos/navegadores, sem prometer o mesmo fluxo universal.
