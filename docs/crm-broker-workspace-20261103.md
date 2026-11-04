# Etapa 02 | Meu Trabalho

Implementado somente em desenvolvimento, aguardando revisão. Sem preview, merge, alteração remota de banco ou início da Etapa 03.

## Base verificada

Repositório `viniciussantiagomkt/privilege-site`. Fetch e ls-remote confirmaram `6d867c98fdae1abbfbf84b03cadc8dfe8999ad2f` na branch-base `work/crm-campaign-performance-20261103`, incluindo o commit de planejamento. Não foi utilizada a main. Lidos AGENTS, roadmap e backlog.

Worktree independente `crm-broker-workspace-20261103`, branch `work/crm-campaign-broker-workspace-20261103`. Primeiro commit `a91afc8` desativa o deployment automático dessa branch antes do primeiro push. Guard de staging preservado. PR rascunho contra a branch-base, sem merge. Demais worktrees preservados.

## Entregue e reaproveitado

Rota `/admin/meu-trabalho` dentro do mesmo AdminGuard, WorkspaceProvider e CrmShell. `/admin`, seu painel gerencial, destino de login e todas as rotas especializadas continuam disponíveis.

| Aba | Funcionalidade |
| --- | --- |
| Hoje | Tarefas/retornos e visitas pendentes até o dia atual em Campina Grande; resumo do recorte carregado. Concluir tarefa reutiliza o componente da Agenda. Sem contato registrado não significa ausência de resposta no WhatsApp. |
| Atendimentos | Leads/clientes autorizados, busca, observações, histórico paginado sob demanda, WhatsApp individual, registro de contato pela RPC atual e retorno com lead pré-selecionado na Agenda. |
| Imóveis | Carteira e resumo contextual. Ficha, cadastro, aprovação/publicação, mídia privada e apresentações permanecem nos módulos/componentes existentes. |
| Negócios | Propostas/negociações e acesso aos editores existentes. Vendas e revisão gerencial preservadas na página especializada. Sem comissões/parcerias simuladas. |

Adicionar abre os formulários existentes de cliente/proprietário, lead, imóvel, tarefa, visita e proposta. Não replica campos, validações ou persistência. Ações gerenciais e autorizações continuam nos módulos/RPC/RLS atuais. O menu só aparece para perfis CRM válidos, sem ampliar carteiras.

Sidebar agrupada em Meu Trabalho, Carteira, Marketing e Gestão. Uma única busca no Shell, com alcance declarado por aba. Sem novo Shell, autenticação, provedor, polling ou listener paralelo. Componentes compartilhados extraídos: LeadHistory, RecordContactButton, ContactWhatsAppLink e TaskCompleteButton.

Painel lateral reaproveita Modal: nome acessível único, Escape, ciclo Tab/Shift+Tab, foco inicial/retorno e tela cheia em 360 px com safe-area. Abas com tablist/tab/tabpanel, setas/Home/End e URL `?aba=`. Busca e contexto mantidos entre abas do hub; seleção guarda apenas tipo/ID, não cópia privada de registro. Não persiste após reload completo/troca de conta. Formulários extensos permanecem nas telas especializadas, sem empilhamento pelo hub.

## Plano de dados e segurança

| Aba | Tabelas adicionais ao Shell |
| --- | --- |
| Hoje | tasks, visits, leads, properties, clients |
| Atendimentos | leads, clients, crm_contact_links |
| Imóveis | properties |
| Negócios | proposals, negotiations, clients, properties |

Shell mantém brokers/notifications e RPC de contagem. Mudança de escopo oculta dados da aba anterior até concluir; a geração existente descarta respostas atrasadas. Limite de 500 por tabela preservado, sem leitura ilimitada ou promessa de pesquisa global. Loading, erro, overflow e vazio são estados distintos; falhas não exibem totais como zero.

Histórico consultado apenas para lead presente no snapshot autorizado. Paginação manual de 100, no máximo 101 linhas por consulta para detectar continuação, ordenadas por data/ID. Sem remoção do acesso ao histórico anterior; resultados tardios não substituem a identidade/seleção atual.

IDs positivos seguros nos deep links são resolvidos exclusivamente nas listas autorizadas dos módulos. Ausência/negação não aciona consulta privilegiada por ID. `run` mantém revalidação antes da gravação. Conteúdo privado remonta por identidade/papel, inclusive quando alteração é detectada pelo polling. Sem service_role no cliente, novas tabelas/migrations/RLS, credenciais de integrações copiadas ou mudanças de ambiente remoto.

## Verificações

- Lint, TypeScript e build Next.js 16.4.3: PASS. Build local com branch real e configuração pública verificada de staging; rota nova e antigas presentes. Sem deployment remoto.
- Código: 107/107 PASS, incluindo 8 novos testes de planos, IDs, busca, perfis, rotas e estados.
- PGlite: 285/285 PASS, exclusivamente local; não comprova JWT real no Supabase.
- Guard: 5/5 PASS. Staging aceito; produção, projeto errado, chave não verificada e chave privilegiada recusados.
- Navegador local: resultados detalhados em `tests/security/crm-broker-workspace-browser-20261103.json`. Auth/REST são fixtures fictícias; demais requisições externas/WebSockets bloqueados. Nenhuma gravação remota ou mensagem enviada.
- Layouts 360/768/1440 px e viewport equivalente a 200% de 1440 px sem overflow; capturas de lista/drawer conferidas. Isso não substitui zoom nativo ou dispositivos iOS/Android reais.
- Audit runtime: zero vulnerabilidades. Instalação completa indicou 16 moderadas na cadeia de desenvolvimento herdada; sem audit fix ou atualização ampla fora do escopo.

Corrigidos durante a execução: ciclo de foco do drawer e exposição transitória de conteúdo de outro escopo. A primeira invocação do build com `node --env-file` falhou ao propagar essa opção aos workers no Windows. Build final carregou env no processo pai antes de iniciar Next, sem relaxar o guard.

## Reprodução

Executar `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:crm-local`. Para build seguro, carregar somente o env público de staging já verificado no processo pai e definir `VERCEL_GIT_COMMIT_REF=work/crm-campaign-broker-workspace-20261103`. Não usar produção ou chave privilegiada.

Após o build, definir `CRM_TEST_ENV_FILE` para esse arquivo privado e executar `node tests/crm-broker-workspace-browser.mjs`. Runner abre servidor em loopback/porta livre e o encerra ao finalizar. Capturas fictícias ficam fora do Git em `%LOCALAPPDATA%/PrivilegeCRM-Operations/broker-workspace-20261103`. Helper de guard agora aceita `CRM_GUARD_ENV_FILE`, preservando o padrão anterior.

## Pendências e roteiro manual

**BLOCKED nesta entrega:** homologação com sessões legítimas/carteiras reais, pois não há preview autorizado deste código. Fixtures não comprovam RLS real ou streaming/revogação de arquivos. Não foi solicitado acesso externo.

1. Após autorização específica de preview, entrar como corretor A, alternar abas/pesquisar. Esperado: só dados permitidos, alcance declarado, sem flash da aba anterior.
2. Abrir lead, registrar contato e criar retorno. Esperado: uma gravação, histórico atualizado e lead correto no formulário. Abrir WhatsApp não registra contato automaticamente.
3. Abrir imóvel/apresentação e proposta/negociação. Esperado: validações, aprovação/publicação e mídia privada preservadas; não publicar imóvel apenas para testar.
4. Repetir com corretor B, gestor/admin e ID alheio. Esperado: nenhuma ampliação de acesso ou revelação de registro fora da carteira.
5. Trocar conta, expirar sessão e negar consulta. Esperado: seleção/dados antigos removidos, erro distinto de vazio e nenhuma gravação após perda de autorização.
6. Conferir celular real, teclado, zoom nativo 200% e voltar/fechar editor. Esperado: foco previsível, sem cortes/overflow ou modais empilhados pelo hub.

P01–P13 preservados. Paginação global, auditoria de tracking privado, homologação completa e etapas futuras não foram declaradas concluídas. Aguardar revisão do usuário antes de avançar.
