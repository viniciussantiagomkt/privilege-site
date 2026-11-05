# Etapa 03 | Clientes e Atendimento Rápido

**Atualização de 05/11/2026 — Etapa 03C:** backup novo, restauração PostgreSQL 17, SQL exclusivamente local, 19 grupos de segurança/concorrência, desempenho e recuperação passaram. [Relatório 03C](crm-quick-service-stage03c-20261105.md). Recomendação local APTO para solicitar a próxima autorização, não autorização de aplicação remota. Homologação autenticada continua pendente; nenhum preview, SQL remoto ou produção alterados. As seções abaixo preservam a entrega e o bloqueio anteriores à execução da 03C.

## Escopo e base

Desenvolvimento autorizado, não publicado. Base do PR #14: `work/crm-campaign-broker-workspace-20261103`, HEAD `26d2c1aaff96257383b555031e3d733950de43a2`. PR #14 e #13 conferidos abertos, em rascunho e sem merge. Etapa 02 homologada manualmente pelo usuário: 12/12 cenários, nenhuma falha relatada; não equivale à integração em produção.

Nova branch `work/crm-broker-quick-service-20261104`, worktree separado. Primeiro commit `efeb915` bloqueia deployment automático e estende o guard ao nome exato da branch; `2dccb2a` registra o plano anterior ao SQL. Sem alterar main, worktrees anteriores ou banco remoto.

## Correção de segurança após auditoria, 04/11/2026

PR #15, commit auditado `50d0c0f63933f87f95bd203c39a8a59045d80588`. Correção de código: `e5f77604363fedf3443b419a184b243f1551b81e`. As evidências/documentação subsequentes não alteram esse código. A migration continua **BLOQUEADA para aplicação**, pendente de nova avaliação e dos requisitos operacionais abaixo; aprovação local desta correção não autoriza execução remota.

Antes de editar o SQL, duas leituras autorizadas no staging `sdpqphiooiuglywcmkxv` confirmaram 21 migrations, última `20261030185925`, sem a versão `20261104193943`. A função `crm_normalize_client_phone(text)` e a coluna clients.interest_profile também estavam ausentes. Nenhuma linha comercial, conta ou dado privado foi consultado. Evidência sanitizada: `tests/security/crm-quick-service-phone-staging-check-20261104.json`. Não foi alterada migration já executada.

Causa: o normalizador removia o prefixo explícito e depois reaplicava a inferência nacional pelo comprimento, transformando um internacional incompleto em outro número. TypeScript e SQL agora classificam `+`/`00` antes da inferência: só nacionais sem prefixo explícito de 10/11 dígitos recebem `55`. Internacionais precisam já conter país 55 e comprimento completo. Sinal `+` deslocado/repetido, prefixo estrangeiro e combinação `+00` são rejeitados. O limite de 64 caracteres em TypeScript usa contagem de caracteres Unicode, alinhada a length(text) do PostgreSQL. Formatos nacionais com DDD 55 continuam válidos.

| Entrada | Resultado em TypeScript e SQL |
| --- | --- |
| `+55 (83) 9000-00` | Rejeitada, sem inferência nacional. |
| `0055 (83) 9000-00` | Rejeitada, sem inferência nacional. |
| `(55) 90000-0000` | `5555900000000`. |
| `+55 (55) 90000-0000` | `5555900000000`. |
| `0055 (55) 90000-0000` | `5555900000000`. |

No contrato existente, rejeição é exceção no helper TypeScript e NULL na função SQL. A matriz compartilhada compara os dois comportamentos e os resultados válidos. Inclui 37 casos de formato, DDD, país, incompletos e limites; RPCs adicionais confirmam rejeição antes do INSERT e duplicidade apenas na carteira autorizada. Links de WhatsApp apontam ao destinatário canônico, sem enviar mensagens. A correção não altera RLS, papéis, titularidade, recibos, chaves de idempotência ou revisões de concorrência.

SHA-256 do SQL versionado em UTF-8 com LF:

- Anterior (`50d0c0f`): `75bbaa5461864c73c25f282c891eea97bd46359282262a656cbd2f24eaf7175a`.
- Corrigido (`e5f7760`): `da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa`.

Arquivos da correção: lib/crm/quick-service.ts, a migration proposta, testes de código/SQL/navegador, fixtures compartilhadas e carregador do módulo real TypeScript. Relatório e JSONs de evidências atualizados separadamente. Nenhum componente visual, outra funcionalidade ou dependência foi alterado.

**Pendências obrigatórias, não aprovadas por estes testes:** restauração isolada de backup atualizado; concorrência com conexões PostgreSQL independentes; avaliação de desempenho da timeline em volume representativo; homologação autenticada A/B/gestor/admin. Permanecem necessárias autorização de migration/preview e revisão do Work. Sem preview, migrations remotas, usuários, mensagens reais, merge, produção ou Etapa 04.

## Entregue

- Adicionar → Cliente / proprietário e Novo cliente em Atendimentos abrem o painel no próprio Meu Trabalho. Nome, WhatsApp e finalidade obrigatórios; observação opcional. Cadastro rápido grava clients, não gera lead.
- Edição em contexto com dados complementares e perfil opcional: finalidade, tipo, cidade/bairros, orçamento, quartos, vagas, preferências, pagamento, financiamento e entrada voluntária. Valores decimais exatos, limites e validação no código/banco. Sem documentos, renda ou dados bancários.
- Telefone brasileiro normalizado por comprimento, incluindo DDD 55. Duplicatas por telefone/e-mail somente no recorte autorizado e novamente na RPC de gravação. Nenhuma consulta global revela carteiras alheias. Duplicatas legadas não são removidas nem bloqueiam uma migration por índice único de telefone.
- Painel lateral/tela cheia mobile com dados, interesse, histórico, imóveis relacionados, tarefas/retornos, visitas, propostas/negociações e apresentações vinculadas. Seções carregam ao expandir, cancelam requisições obsoletas e distinguem erro/vazio/limite. Sem segundo provedor ou polling global.
- Edição e criação de retorno/visita permanecem no painel. AgendaEditor é o mesmo editor usado na rota especializada; TaskCompleteButton continua compartilhado. Datas seguem o fuso do navegador, explicitamente indicado na Agenda; confirmar o fuso no teste real.
- Modelos de WhatsApp: primeiro atendimento, apresentação, visita, documentos, proposta e retorno. Preenche contexto autorizado disponível, permite edição e exige revisão antes de mostrar o link. O destinatário é o cliente; a conta profissional remetente depende do WhatsApp conectado no aparelho, não pode ser imposta por wa.me. Número/nome profissional vêm do cadastro existente do corretor.
- Abrir/copiar WhatsApp não cria contato realizado. Registro de contato exige confirmação separada; timeline reaproveita audit_logs/crm_event_log sem snapshots ou payloads privados. Apresentações/negociações complexas continuam com acesso aos editores existentes; não foi duplicado ShareComposer ou seu sistema de mídia.
- Aviso de rascunho não salvo, Escape/foco, rótulos e layout responsivo. As quatro abas e a busca compartilhada permanecem; nenhuma rota foi criada ou removida.
- Rascunho digitado com extração explícita de Nome/WhatsApp, revisão e aplicação sem salvar. **Não há transcrição funcional ou captura de áudio.** Microfone não é solicitado; nenhum áudio é armazenado ou enviado.

## Reutilização

AdminGuard, CrmShell, WorkspaceProvider/run/reload, autenticação, RLS e timelines de leads permanecem. Campos básicos extraídos em clientFields para a tela de contatos; AgendaEditor extraído da Agenda, com validação de data e cliente pré-selecionado. Modal/EntityForm preservam os usos anteriores, com cancelamento explícito para proteger rascunhos e rótulos acessíveis. Rotas de imóveis, negócios, leads, marketing, apresentações e agenda continuam operacionais.

## Banco: somente proposta

Arquivo `supabase/migrations/20261104193943_crm_quick_service.sql`, criado por `supabase migration new`; não foi aplicado remotamente. [Plano prévio, riscos e rollback](crm-quick-service-migration-plan.md).

- clients.interest_profile JSONB validado, interest_revision e trigger de concorrência otimista.
- Índice não único por dono/telefone normalizado; funções de validação sem privilégios de leitura global.
- RPCs restritas de salvar cliente, registrar contato real e consultar timeline paginada (50 + 1), com auth.uid, papel atual e carteira atual. SECURITY DEFINER é limitado a essas operações para reutilizar recibos/eventos privados; EXECUTE revogado de PUBLIC/anon. Sem exposição direta dos snapshots de auditoria.
- Recibo de cadastro por usuário/action_id e lock transacional por corretor; reenvio do mesmo payload não duplica cliente/evento. Payload diferente com mesmo recibo e revisão obsoleta são rejeitados.
- tasks/visits.quick_action_id UUID UNIQUE opcional para reenvio de agendamento no painel. Escrita continua pela API com RLS, sem RPC privilegiada de agenda. O editor mantém a chave por payload e confirma a linha autorizada após conflito; não atualiza silenciosamente outro compromisso.
- Sem nova tabela comercial, alteração de políticas, ampliação de carteiras, backfill, reaplicação histórica ou alteração de mídia/Storage.

Sem a migration, a gravação nova informa recurso pendente e preserva os campos, sem sucesso fictício. Contatos/Agenda e demais fluxos antigos continuam disponíveis. Antes de aplicação futura, conferir catálogo real, backup atualizado, restauração isolada, preflight/rollback e autorização específica. Advisors remotos e teste JWT real não foram executados nesta etapa restrita a desenvolvimento.

## Verificações

Evidências sanitizadas em `tests/security/crm-quick-service-*.json`. Banco local usa PGlite com claims sintéticas; navegador usa build local e fixtures Auth/REST, bloqueando conexões externas e WebSockets. Nenhuma sessão real é extraída, nenhuma mensagem é enviada. Essas verificações **não equivalem à homologação autenticada do staging**.

| Verificação | Resultado |
| --- | --- |
| npm run lint | PASS, sem erros ou avisos na execução final. |
| npm run typecheck | PASS. |
| npm test | 150/150 PASS após correção de telefone (112 anteriores + 38 regressões). |
| npm run test:crm-local | 349/349 PASS, somente PGlite (310 anteriores + 39 verificações de telefone/paridade/RPC). |
| Guard de staging | 5/5 PASS: staging verificado aceito; produção, outro projeto, chave não verificada e chave privilegiada bloqueados. |
| Navegador Edge headless | 34/34 PASS: 32 anteriores + 2 cenários específicos de telefone. |
| npm run build | PASS, Next.js 16.4.3, branch real com configuração pública verificada de staging e guard ativo. |
| npm audit --omit=dev | Zero vulnerabilidades de runtime. |
| Revisão de versionamento | Sem .env, dumps, backups, chaves privadas ou tokens literais detectados nos arquivos novos/alterados; fixtures fictícias, nenhuma linha comercial remota consultada. |

Cobertura nova: cadastro/perfil/duplicatas, nenhuma criação de lead, histórico e erro por seção, WhatsApp sem envio/contato fictício, retorno com resposta perdida após commit e retry sem duplicar, visita, rascunho sem microfone, schema ausente sem sucesso fictício, revisão inicial congelada apesar de refresh de fundo e cancelamento de Escape protegendo o rascunho. Testes responsivos/teclado e capturas fictícias conferidas em 360/768/1440; suíte anterior inclui viewport equivalente a zoom 200%, não zoom nativo de dispositivo.

Evidências: `crm-quick-service-local-results.json` (inclui hash atualizado do SQL), `crm-quick-service-browser-20261104.json`, `crm-quick-service-guard-20261104.json` e `crm-quick-service-phone-staging-check-20261104.json`, em tests/security. Capturas ficam somente na pasta operacional local, fora do Git. A falha reproduzível da auditoria foi corrigida localmente; a aplicação continua **BLOQUEADA**, aguardando revisão e os quatro requisitos operacionais citados acima. Não há preview da Etapa 03 autorizado/publicado.

Para repetir o navegador: usar `CRM_TEST_ENV_FILE` apontando apenas para a configuração pública de staging já verificada; `CRM_BROWSER_BRANCH=work/crm-broker-quick-service-20261104`, `CRM_QUICK_SERVICE_BROWSER=1`, `CRM_BROWSER_REPORT_PATH=tests/security/crm-quick-service-browser-20261104.json`, `CRM_BROWSER_ARTIFACT_NAME=quick-service-20261104`; executar `node tests/crm-broker-workspace-browser.mjs` após build local seguro. Para PGlite, definir `CRM_LOCAL_REPORT_PATH=tests/security/crm-quick-service-local-results.json`. Não imprimir nem versionar o arquivo de ambiente.

## Limites e riscos

1. Sem autorização de migration/preview: validação real remota permanece BLOCKED por escopo, não falha funcional.
2. Voz intencionalmente parcial, conforme alternativa autorizada. Não usa SpeechRecognition potencialmente remoto.
3. Limite existente de 500 por tabela/lista mantido, inclusive opções de agenda. Histórico paginado tem limite máximo de 201 páginas. Pesquisa não é global; listas acima do limite falham explicitamente.
4. Prevenção transacional de duplicidade vale para a RPC rápida; fluxos legados e importações não passam a garantir unicidade global. Validar concorrência multi-sessão em PostgreSQL real antes de produção; PGlite não simula conexões simultâneas independentes.
5. Link wa.me transporta destinatário/mensagem ao WhatsApp somente na ação explícita. URLs internas, logs e analytics novos não recebem dados pessoais. O risco herdado P07 (GTM/Clarity globais no CRM em produção) continua pendente; ausência de novos eventos aqui não prova ausência de coleta global.
6. Oito vulnerabilidades moderadas foram informadas na instalação completa, incluindo ferramentas de desenvolvimento; auditoria de dependências de runtime retornou zero. Nenhuma dependência/lockfile foi alterada nesta etapa.
7. Templates não comprovam envio, entrega, resposta ou autorização de documentos. Links expirados/revogados são omitidos; a validade final continua nas regras de apresentação existentes.
8. Campos e listas dependem de RLS no ambiente final. Não há serviço administrativo no cliente; nenhum segredo foi copiado para a nova branch.

## Roteiro manual posterior (não executar sem autorização)

Usar somente registros fictícios autorizados e o futuro preview exclusivo de staging. Registrar PASS/FAIL/BLOCKED por perfil e cenário. Não modificar imóveis publicados ou contatos comerciais reais.

| Etapa | Ação | Resultado esperado |
| --- | --- | --- |
| 1 | Login A/B, gestor e admin | Mesmo Shell/guard; cada carteira privada isolada, inclusive após troca de usuário. |
| 2 | Adicionar cliente com nome, WhatsApp e finalidade | Salva uma vez em clients e abre seu painel; nenhum lead automático. |
| 3 | Repetir telefone com outra máscara / e-mail com caixa diferente | Indica duplicidade somente na própria carteira; permite abrir existente. Telefone de outra carteira não revela terceiro. |
| 4 | Completar perfil, editar em duas sessões | Campos opcionais persistem; revisão obsoleta pede reabrir, sem sobrescrever silenciosamente. |
| 5 | Expandir seções e simular falha de rede | Dados relacionados autorizados; erro não vira vazio/zero; retry restaura sem dados de sessão anterior. |
| 6 | Preparar seis modelos, revisar e abrir WhatsApp sem enviar | Cliente/contexto corretos, edição preservada, conta profissional conferida no aparelho. Abrir/copiar não registra contato. |
| 7 | Confirmar contato realizado | Um evento real, sem mensagens inventadas. Reenvio da mesma ação não duplica. |
| 8 | Criar retorno e visita, repetir após resposta perdida | Um compromisso por ação, cliente vinculado, dados na Agenda/Hoje e histórico. Não confiar em clique como confirmação de mensagem. |
| 9 | Concluir tarefa e abrir imóvel/apresentação/negociação | Ações existentes preservadas; histórico e agenda atualizados; mídia privada protegida. |
| 10 | Rascunho digitado → revisar → aplicar | Não acessa microfone nem salva automaticamente; correções possíveis antes da confirmação final. |
| 11 | Desktop/360/768/1440, Tab/Shift+Tab/Escape e cancelar rascunho | Sem overflow, foco contido/retornado, aviso protege alterações não salvas. |
| 12 | Logout, troca de papel/conta e resposta atrasada | Painel/campos/listas anteriores desaparecem. URLs, console e analytics não contêm PII. |

Aguardar confirmação do usuário antes de preview, migration remota ou Etapa 04. Nenhuma integração externa, cron, produção ou merge integra esta entrega.
