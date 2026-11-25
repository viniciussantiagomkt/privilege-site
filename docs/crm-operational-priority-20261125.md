# CRM operacional: entrega gradual independente

## Base e isolamento

Branch `codex/crm-operational-priority-20261125`, worktree separado `crm-operational-priority-20261125`, base `11735068faa301a3e530b9cd0cb19aff19e65fbe` (codigo PR16 + correcao local compativel Next16.4.6). PR16 e todos os worktrees/evidencias H26 preservados. Nenhum SQL, migration, policy, usuario, papel ou integracao alterado. Sem staging, producao, push, merge ou deployment nesta entrega.

## Implementado

- Proximas acoes pessoais no Meu Trabalho e dashboard: tarefas/retornos e visitas, ordenacao deterministica, motivo da prioridade, vencidos/hoje/proximos sete dias, contexto e conclusao pelo componente existente. Horario civil de Campina Grande. Visita passada significa falta de desfecho registrado, NAO ausencia do cliente.
- Nova tarefa, retorno, visita e edicao abrem AgendaEditor dentro do hub, com confirmacao de descarte e validacoes ja existentes. Cadastro de cliente continua no drawer existente; imoveis e propostas usam os destinos/editores especializados ja implementados.
- Busca combinada de imoveis por cidade, categoria, valor maximo, quartos e disponibilidade; limpeza de filtros e combinacao com pesquisa global/status/portfolio existente. Preco desconhecido nao vira zero para caber no orcamento.
- Comparacao de dois ou tres imoveis acessiveis, usando IDs e dados frescos; abertura da ficha existente a partir da comparacao. Direitos de apresentacao continuam em eligibleProperty/ShareComposer, sem concessao nova.
- Pendencias da captacao: fotos, localizacao, preco e vinculo de proprietario carregado. A rota de imoveis agora carrega crm_contact_links no mesmo leitor autorizado/limitado; o dashboard carrega clients para exibir o contexto das visitas. Ausencia de vinculo carregado nao afirma inexistencia do proprietario.
- Conferencia das propostas pessoais: cliente/imovel carregados e valor, com abertura da edicao existente. Nao simula aprovacao documental, comissao recebida ou fechamento.
- Controles responsivos, tabs com teclado, selecao privada somente por ID e descarte das linhas apos troca de identidade, preservando AdminGuard, Workspace e RLS atuais.

## Visualizacao local

Servidor separado: `node scripts/crm-local-demo.mjs --local-fixtures`.
Atalho: `npm run dev:crm-demo`. Com o servidor ligado, `npm run test:crm-operations-browser` executa as jornadas locais.

URL `http://127.0.0.1:3210/login`. Perfis sinteticos: `a@example.invalid`, `b@example.invalid`, `gestor@example.invalid`, `admin@example.invalid`. Senha de fixture para todos: `demo-local-only`. Nao usar credenciais reais. URLs: `/admin`, `/admin/meu-trabalho`, `/admin/agenda`, `/admin/imoveis`, `/admin/negocios`, `/admin/apresentacoes`.

API fake somente loopback3212, Next local3211 e proxy3210. Ambiente filho allowlisted, sem credenciais herdadas; CSP do proxy bloqueia scripts, frames e conexoes externas. O login normal da aplicacao usa exclusivamente sessoes sinteticas em memoria do servidor local. Nao existe bypass nem modo fixture em AdminGuard/Workspace ou em rotas publicadas. A flag local adicionada ao Shell muda apenas o rotulo do ambiente, nunca autorizacao.

Somente tarefas e visitas aceitam escrita na demonstracao, em memoria. Outros cadastros abrem os formularios existentes, mas a API local rejeita gravacoes nao implementadas em vez de fingir sucesso. Registros somem ao reiniciar. Nenhum WhatsApp/email ou integracao e enviado. O backend fake modela escopo pessoal, mas NAO certifica RLS real ou autentica contas Supabase.

Para parar: Ctrl+C no processo que iniciou o script, ou comando `stop` em seu stdin. Se3210 estiver ocupado, escolha CRM_DEMO_PORT antes de iniciar outro processo; nao iniciar duas instancias na mesma porta.

## Reorganizacao das 12 etapas

| Etapa original | Entrega/reuso agora | Dependencia real restante |
| --- | --- | --- |
| 01 Auditoria | Roadmap original reutilizado; sem nova auditoria geral | Revisao independente das entregas |
| 02 Centralizacao | Hub, drawers, acoes de agenda e navegacao existentes integrados | Homologacao real por perfil |
| 03 Atendimento | Modulos existentes preservados em outra branch | Conflito H17/PT409 e aceites Work; nao bloqueia esta UI |
| 04 Assistente diario | Fila explicavel, filtros por prazo, abrir/concluir/editar | Automacoes futuras e concorrencia de backend |
| 05 Captacao | Ficha existente, pendencias e vinculos carregados | Captacao minima nova exige regra de campos; nao criada por suposicao |
| 06 Busca/apresentacoes | Filtros combinados, comparador, ficha e ShareComposer existentes | Matching de preferencias, alertas e homologacao de capacidades |
| 07 Visitas | Agendar, editar e contexto por editor existente | Sobreposicoes e regras de resultado/historico adicionais |
| 08 Parcerias | Nenhum acesso ampliado ou parceria ficticia | Contrato de autorizacao, modelo/RLS e aceite especifico |
| 09 Negocios | Propostas/negociacoes/vendas existentes + conferencia de pendencias | Comissoes/parcelas/documentos versionados e regras aprovadas |
| 10 Documentacao/credito | Preparacao no fluxo de negocio, sem falsa aprovacao | Persistencia privada/checklists e premissas financeiras oficiais |
| 11 Mobile/automacoes | Interface360px, teclado, sem envios automaticos | Provedores, PWA/offline e autorizacoes separados |
| 12 Homologacao | Testes locais e roteiro por modulo, nao homologacao remota | Aceites autenticos, recuperacao e publicacao controlada futura |

Ordem curta: revisar/homologar hub+agenda; depois imoveis+comparacao+proprietarios; depois propostas e apresentacoes ja existentes. Corrigir H17 em sua branch separada. Somente apos aceites preparar integracao/release autorizado. Parcerias, financeiro e documentacao completa ficam como incrementos com regras/persistencia proprias, nao como condicao para usar a agenda e o catalogo.

## Validacao e limites

Testes de codigo, tipos, lint, suite CRM e build registrados no relatorio de validacao. Novo browser fixture testa login local, criar/editar/concluir tarefa, agendar visita, filtros, comparacao, pendencias, quatro telas360px, teclado e logout/troca A/B. Imagens/screenshots locais verificadas. Sao testes da UI e backend de fixtures, NAO homologacao HTTP/JWT/RLS do staging. Os cinco PASS/um FAIL da Etapa03 nao foram reclassificados.

Prontos para solicitar homologacao: hub/daily queue, agenda contextual, filtros/comparacao e conferencia de captacao/propostas. Bloqueios delimitados: H17 para conflitos de cliente; ausencia de schema/regras aprovadas para novos documentos/comissoes/parcerias; credenciais/aceites futuros para testes remotos. Nenhum deles impede visualizar e testar localmente os modulos entregues.
