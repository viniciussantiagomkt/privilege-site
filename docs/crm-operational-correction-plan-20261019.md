# Plano de correção operacional para aprovação

Referência imutável: 6ccddf5, PR #3. Branch: work/crm-integration-security-diagnosis-20261019. Diagnóstico e evidências no documento e JSON de mesmo dia.

Este plano não é autorização de execução. Primeiro aprovar o modelo abaixo; depois preparar código e SQL versionado para revisão. Banco staging, contas e preview permanecem intactos até as autorizações correspondentes. Produção e main fora do escopo.

## 1. Matriz de autorização proposta

| Ação | Administrador | Gestor | Corretor |
|---|---|---|---|
| Sistema, configurações, usuários e permissões | Sim, pelas capacidades específicas | Não, salvo delegação explícita | Não |
| Ler fila institucional não distribuída | Sim, se autorizado à operação | Sim | Não |
| Ler cliente/lead privado de outro usuário | Não | Não | Não |
| Ler, editar e arquivar carteira própria | Somente registros próprios autorizados | Somente registros próprios autorizados | Sim |
| Distribuir fila institucional | Capacidade de distribuição | Sim | Não |
| Transferir carteira pessoal | Não unilateralmente | Não unilateralmente | Solicitar/autorizar a própria transferência |
| Rever imóvel submetido | Sim | Sim | Não aprovar publicação própria |
| Registrar venda comercial própria | Se for responsável comercial elegível | Se for responsável comercial elegível | Sim |
| Confirmar etapa financeira/documental | Capacidade específica, separada | Capacidade específica, separada | Não pelo simples registro comercial |
| Ler indicadores da equipe | Agregados permitidos | Agregados permitidos | Próprios, salvo divulgação autorizada |
| Ler material institucional aprovado | Conforme audiência | Conforme audiência | Conforme audiência |

“Gestão” é uma capacidade operacional, não uma exceção geral ao sigilo. Não alterar can_manage_operations globalmente para false: isso quebraria aprovação de imóveis e outros fluxos válidos. Criar decisões específicas de leitura de carteira, fila, transferência, revisão e distribuição.

Contas com ambos os deveres administrativo/comercial precisam de capacidades explícitas. Não trocar role nem criar brokers para admin/gestor como correção improvisada de INSERT.

## 2. Invariantes de propriedade e associações

1. Lead pessoal pertence ao responsável; institucional sem responsável pertence à fila. Atribuiu responsável, sai imediatamente da fila e torna-se privado. origin_type permanece institucional para rastreio, sem conceder leitura de PII à gestão.
2. Não converter os três leads pessoais atuais em institucionais para contornar RLS. Preservar responsáveis, IDs, origens e histórico existentes.
3. Cliente particular pertence ao usuário identificado em broker_id, cuja FK já é auth.users. Cadastro da gestão em carteira própria deve usar sua identidade real atual. Cadastro em nome de um corretor exige fluxo autorizado específico, nunca confiança em broker_id enviado pelo navegador.
4. Institucional distribuído pode ter supervisão por metadados operacionais separados, sem nome, contato, notas, mensagem ou conteúdo da apresentação. Carteira pessoal não entra nessa listagem por ser apenas do corretor.
5. Transferência pessoal depende de solicitação/consentimento do dono e destinatário elegível; a gestão não pode usar o ID para tomar posse. Transferência institucional depende de autoridade sobre a distribuição, motivo e auditoria.
6. Troca de responsável deve ser transacional, com bloqueio de linha, validação de versão/estado e destinatário ativo/role válida. Atualização direta de broker_id deve ser recusada fora do procedimento auditado.
7. Não usar flag de sessão controlável pelo cliente como autorização para ignorar o trigger de transferência.
8. Não transferir automaticamente todo o cadastro de cliente se ele estiver vinculado a outros negócios privados. Definir relações autorizadas ou cópia mínima consentida de contato com trilha de origem, preservando vínculos e propriedade dos demais negócios.
9. “Excluir” será arquivamento lógico por proprietário autorizado, com restauração, preservando vendas, propostas, visitas e auditoria. Hard DELETE de histórico não será liberado indiscriminadamente. Essa escolha integra o aceite do plano.
10. Quando uma atribuição retirar o acesso de quem fez a operação, o RPC retornará recibo mínimo, não a linha privada via INSERT/UPDATE RETURNING *.

## 3. Pacotes de migrations a preparar

M1–M5 são identificadores de planejamento, não versões registradas. Após aceite, gerar arquivos pelo Supabase CLI migration new, conferir as 11 versões existentes e apresentar o SQL final. Nada será aplicado por “repair”, reset ou repetição de migration antiga.

| Pacote | Conteúdo necessário | Impacto e reversibilidade |
|---|---|---|
| M1 private_portfolios_and_transfers | Helpers privados por ação; substituir as condições abrangentes de leads/clients e dependências; rever policies permissivas e restritivas; corrigir simultaneamente crm_assign_lead, crm_record_contact, confirmação de share e leitura de tokens; adicionar solicitação/auditoria de transferência pessoal, arquivamento lógico de leads e índices por responsável/origem | A gestão deixa de receber PII particular. Mudanças de políticas e RPCs na mesma transação, sem janela em que um RPC antigo contorne o novo sigilo. Não reatribuir registros existentes. Rollback estrutural possível por snapshot; nunca restaurar automaticamente leitura ampla |
| M2 management_aggregates | RPCs/projeções de contagens, somas e desempenho autorizadas, parâmetros de período/equipe validados, sem nomes/contatos/notas, sem drill-down privado e sem IDs/tokens de apresentações | Dashboard deixa de baixar carteira inteira. Usar somente projeções agregadas em funções privilegiadas estreitas, com papel ativo e search_path fixo. Views comuns mantêm security_invoker. Retirada dos endpoints é reversível, com painel temporariamente indisponível em vez de liberar dados |
| M3 commercial_sale_ownership | INSERT/UPDATE de venda própria para corretor ativo; propriedade imutável, autoria registrada, validação de cliente/imóvel/proposta e participação autorizada; confirmação financeira/documental em estado/tabela independente, protegida de autoaprovação | Dá autonomia sem permitir escolher broker_id alheio ou usar imóvel público como autorização de venda. Acrescentar vínculos de proposta/autoria quando necessário. Novas constraints avaliadas contra dados existentes antes de validar; nenhum backfill com valores inventados. Preservar vendas em rollback |
| M4 property_review_notifications | Evento de submissão de imóvel, ciclo de revisão e notificação persistente por gestor/admin ativo; referência de entidade/link; chave única por usuário/evento/ciclo; leitura própria e marcação de lido | Transição rascunho→pendente produz notificação; edição repetida em pendente não duplica. Restauração não remove histórico nem duplica eventos. Não emitir notificações em massa sobre dados antigos sem operação explícita |
| M5 approved_marketing_audience | Audiência explícita pessoal/equipe/destinatários; elegibilidade ativa e expiração nas policies de materiais, versões e Storage; mudança de escopo somente por fluxo autorizado, auditado e com nova revisão; compatibilidade com apresentações públicas | Corrige a imutabilidade que hoje impede converter um material pessoal para equipe. Não tornar os três uploads existentes públicos/institucionais automaticamente. Preservar owner, versões, checksums, arquivos e links. Revogar compartilhamento quando versão/aprovação/audiência perder validade |

M1 inclui lead_activities, lead_assignments, crm_contact_links, tasks, visits, proposals, negotiations, sales na leitura, notifications, audit_logs, marketing_shares, eventos e acessos de mídia pertinentes. Não fechar somente leads e deixar cópias do mesmo conteúdo em históricos/notificações.

Helpers SECURITY DEFINER só quando necessários, sem confiar em user_metadata, com validação da identidade/estado e privilégios mínimos. Funções internas em crm_private não devem ser expostas na Data API. Revisar EXECUTE individualmente; manter os RPCs públicos intencionais de apresentação/consentimento sem lhes conceder acesso comercial.

## 4. Correções de aplicação previstas

| Arquivo/módulo | Alteração a implementar depois do aceite |
|---|---|
| components/crm/Workspace.tsx | Vincular estado à identidade Auth atual, limpar dados/role/consultas ao trocar usuário, cancelar respostas atrasadas, revalidar role/capacidades, descartar dados privados em erro de autorização; carregar por módulo com limites no servidor |
| components/admin/AdminGuard.tsx | Revalidar contexto de forma consistente com Workspace; impedir interface administrativa obsoleta durante mudança de identidade/permissão |
| components/crm/Shell.tsx | Exibir Administrador/Gestor/Corretor; busca sem indexar carteiras não autorizadas; notificações do destinatário com não lido/link e recarga persistente |
| components/crm/Leads.tsx | Separar fila institucional, minha carteira e metadados de distribuição; transferir pelo fluxo autorizado; arquivar próprio sem permitir hard delete indevido |
| components/crm/Contacts.tsx | Validar ator real e propriedade; cadastrar na carteira autorizada sem confiar em ctx.userId obsoleto; tratar perda de acesso após atribuição sem retornar PII |
| components/PropertyForm.tsx | Diretório mínimo de corretores elegíveis: brokers.active, role apta e usuário habilitado; sem filtro por imóveis; exibir falha ao consultar permissão em vez de assumir corretor silenciosamente |
| components/crm/Properties.tsx | Aprovação só por capacidade real, dono pode submeter, payload da aprovação não mistura mudança de responsável; diagnosticar role/UID/projeto sem imprimir token |
| components/crm/Deals.tsx | Liberar registro comercial próprio, validar responsáveis e vínculos; deixar confirmação financeira/documental separada; retirar texto que exige gestor para cada venda |
| components/crm/Marketing.tsx e lib/crm/marketing.ts | Exibir explicitamente audiência e revisão; oferecer biblioteca de equipe sem converter materiais pessoais silenciosamente; permitir mudança autorizada de audiência com nova aprovação |
| components/crm/Dashboard.tsx e Team.tsx | Consumir agregações autorizadas; não baixar dados pessoais para calcular contadores ou preencher filtros |
| ShareComposer, Presentations e rotas presentation-media/property-media | Revalidar propriedade do lead, seleção dos materiais, audiência, versão atual, revogação e expiração; não confiar apenas em link mostrado na UI |
| app/api/admin/brokers/route.ts | Manter administração restrita a admin real, estado habilitado, validação server-side e nenhuma chave administrativa no cliente |
| lib/supabase.ts e assinaturas Realtime | Ciclo de sessão coerente, renovação/saída e limpeza de cache/canais por identidade; nunca trocar para service-role para “resolver” RLS |
| tests/crm-staging-rls.sql, crm-marketing-rls.sql e suites de API/browser | Reescrever expectativas antigas e adicionar cenários equivalentes aos formulários reais |

## 5. Imóveis, clientes e erros ainda não reproduzidos

O erro de aprovação indica que o banco classificou a requisição como não operacional. Hoje admin/gestor resolvem corretamente. Antes de modificar o trigger, reproduzir com a sessão que falha e registrar apenas request ID, horário, projeto, auth UID, role efetiva e campos de autorização do payload. Não armazenar cabeçalhos/token.

Para clientes e vendas pela gestão, fazer o mesmo: SQLSTATE, operação, broker_id pretendido e UID real. Conferir INSERT seguido de SELECT/RETURNING, FKs e relação com outro cliente/negócio. Não transformar hipótese de cache em causa comprovada. Não desativar RLS, criar policy true ou preencher automaticamente um perfil de corretor para gestão.

Para o seletor do imóvel, testar A e B com zero, um e vários imóveis. Inatividade, papel inapto e disabled_at devem excluir o candidato por elegibilidade, não por quantidade de imóveis. Erro no diretório deve aparecer como erro, não como lista vazia ou parcial silenciosa.

## 6. Notificações e Realtime

- Enviar evento somente ao entrar em pendente, inclusive no INSERT quando esse estado for permitido. Num novo ciclo de revisão, gerar novo evento; no mesmo ciclo, reaproveitar chave idempotente.
- Destinatários: IDs atuais habilitados em user_roles de gestão, sem exigir registro em brokers.
- Criar persistência na mesma transação da submissão; não depender de conexão WebSocket. O refresh e o polling devem mostrar a pendência.
- Contagem de não lido e SELECT devem ser do destinatário. Nenhum gestor deve ler todas as notificações comerciais privadas apenas por ser gestor.
- Link limitado a rota interna do imóvel; ao clicar, verificar novamente o acesso.
- Realtime deve usar RLS/autorizações corretas, renovar autenticação e refazer canais na troca de conta. Um filtro no JavaScript não é barreira de segurança.
- Para carteiras privadas, preferir UPDATE de arquivamento e eventos/canais autorizados. Não assinar DELETE global contendo identidade de registros alheios. Verificar replica identity e payload real de old/new no staging.

## 7. Plano de testes de aceitação

| Grupo | Positivos | Negativos obrigatórios |
|---|---|---|
| Identidade e sessão | Quatro perfis resolvem o ID/role atual, refresh mantém papel, logout limpa tela/cache | Login A→gestor→B na mesma janela e em abas distintas; respostas antigas não reaparecem; conta descartável desativada perde acesso, sem tocar nas quatro contas principais |
| Leads/clientes | Próprio CRUD/arquivamento, gestão lê fila institucional, atribuição torna privado | A contra B e B contra A em SELECT/PATCH/DELETE/RPC; admin/gestor contra pessoais; institucional já atribuído fora da fila; transferência pessoal sem consentimento |
| Transferência | Dono solicita/autoriza, destinatário elegível, auditoria, acesso muda atomicamente | RPC direto por ID pessoal, origem forjada, destino inativo, broker_id alterado por PATCH, duas transferências simultâneas e repetição de pedido |
| Clientes na gestão | INSERT com ator atual e propriedade permitida, FK íntegra e persistência | ctx/UID antigos, propriedade de terceiro, vínculo a lead privado alheio, retorno de linha que o ator não pode mais ler |
| Imóveis | A/B sempre elegíveis mesmo com imóveis; submeter próprio; admin/gestor aprovam pendente | Corretor se autoaprova, marca approved_by de outro, publica sem revisão, transfere por PATCH ou cadastra em nome alheio |
| Vendas | A/B registram negócio próprio; autoria e histórico persistem | Cliente/imóvel/proposta alheios, broker_id forjado, valor inválido, alteração de venda alheia ou confirmação financeira forjada |
| Marketing | Upload real JPG/PNG/PDF/MP4, revisão, institucional aprovado visível à equipe correta | Pessoal não compartilhado, pendente, vencido, destinatário não autorizado, versão antiga, listagem/download direto de Storage |
| Apresentações | Imóvel autorizado + material aprovado + lead próprio; link público restrito ao DTO | Enumeração de IDs, arquivo não selecionado, vínculo removido, revogação/expiração, retries que duplicam envio/atividade |
| Notificações | Submissão produz evento persistido, não lido e link; aparece após refresh | Repetição de UPDATE duplica evento; usuário lê/marca notificação de outro; destinatário desativado recebe PII |
| Gestão agregada | Contadores e somas conferem com fixture controlada | select(*), exportação, busca, filtros, drill-down, RPC e eventos revelam pessoa/mensagem/token de carteira privada |

Asserções antigas que exigem leitura geral da gestão ou negam venda própria ao corretor devem ser substituídas. Testar o payload exato do formulário e a sessão real além de claims simuladas. Não inferir autorização de um HTTP 200; conferir linhas realmente lidas/alteradas e persistência pelo dono.

Os 20 checks atuais de leitura são baseline com quatro reprovações esperadas pela nova regra. Eles não são teste de INSERT/UPDATE/DELETE. Não executar a suíte mutante atual no staging nesta primeira fase; mesmo rollback pode consumir sequências e não representa autorização para modificar o banco.

## 8. Implantação controlada e rollback

1. Aprovar este plano e os critérios de propriedade, arquivamento, transferência pessoal e audiência. Isso não autoriza modificar contas.
2. Implementar código/SQL em branch isolada, reutilizando apenas correções compatíveis do PR #5 depois de revisão, sem merge automático. Gerar versões novas pelo CLI e snapshot dos objetos afetados.
3. Testar migrations em ambiente local/descartável isolado autorizado, com instalação equivalente e dados sintéticos; validar up/rollback, FKs, concorrência e endpoints. Nenhuma tabela de staging será recriada.
4. Apresentar diff SQL final, hashes/nomes dos objetos atuais, tamanho dos backfills, locks previstos e resultados positivos/negativos. Solicitar autorização específica para aplicar ao staging.
5. Antes de aplicar, reconferir histórico de migrations e ausência de alterações paralelas. Não reaplicar as 11 existentes. Backup e plano de retorno sem perda de dados.
6. Aplicar por transação/grupo coerente. M1 fecha políticas e RPCs juntos. Não deixar operação antiga privilegiada acessível durante a troca. Revisar índices sem scans/locks indevidos.
7. Validar SQL e APIs com as quatro sessões reais. Limpar estado do navegador e renovar canais após mudança de autorização. Casos não executados ficam BLOQUEADO, nunca APROVADO.
8. Publicar novo preview somente após autorização específica, exclusivamente staging e sem chaves administrativas públicas; conferir SHA, URL/key do projeto e disabled/active. Nenhuma publicação de produção.
9. Executar jornada real e testes mobile; reconciliar métricas agregadas com fixtures. Preservar arquivos existentes e limpar apenas fixtures identificadas por operação suportada.
10. Se houver falha, manter comportamento fechado: desabilitar a função/tela afetada em staging e corrigir. Rollback não pode reabrir acesso da gestão às carteiras privadas. Não apagar vendas, versões, auditoria ou notificações geradas; preferir rollback aditivo/corretivo.

## 9. Riscos e critérios de parada

- Mudança de escopo é intencionalmente incompatível com listas/dashboards atuais da gestão. As consultas e a UI precisam acompanhar o banco; não preencher resultados vazios com dados em cache.
- FKs e relações comerciais podem cruzar proprietários hoje. Auditar antes de backfill; não presumir que toda relação existente é compartilhamento autorizado.
- Mudança de audiência pode divulgar arquivo pessoal. Somente conversão explícita, auditada e reavaliada; os três materiais atuais não serão publicados em massa.
- Desativação/transferência pode deixar token e cache antigos; testar servidor, UI e eventos. Não alterar configuração global de Auth sem apresentar impacto.
- Agregações também podem permitir inferência. Restringir dimensões/períodos permitidos e nunca retornar linhas individuais junto com totais.
- Não homologar aprovação/INSERT da gestão enquanto a causa dos erros reais não tiver reprodução e correção confirmadas.
- Se houver divergência de schema/histórico ou ambiente, interromper somente a etapa dependente e preservar o trabalho.

Referências técnicas consultadas: Supabase Row Level Security (https://supabase.com/docs/guides/database/postgres/row-level-security) e Postgres Changes (https://supabase.com/docs/guides/realtime/postgres-changes). As regras do produto e as autorizações específicas do usuário prevalecem sobre sugestões genéricas de implementação.

