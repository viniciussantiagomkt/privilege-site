# Correções operacionais do Privilege CRM

Data: 19/10/2026. Base de produto: PR #3, commit 6ccddf5. Implementação isolada no PR #6 (rascunho), branch `work/crm-integration-security-diagnosis-20261019`.

**Estado: código e cinco migrations preparados; implantação e homologação autenticada pendentes.** Nenhuma migration foi aplicada, nenhuma conta ou permissão foi modificada no staging, nenhum preview foi publicado e produção/main não foram alteradas. O SHA final está registrado na entrega e no histórico do PR.

## Diagnóstico e correções

| Problema | Evidência e causa | Correção preparada |
|---|---|---|
| Admin e gestor com o mesmo nome de perfil | Auth e user_roles atuais distinguem admin e manager. Shell usava o rótulo genérico “Gestão” | Rótulos específicos; revalidação de identidade/papel e remontagem do contexto protegido. Nenhuma alteração de conta |
| Gestão lê carteiras particulares | Policies de leads/clientes e RPCs tinham exceção can_manage_operations | Limites restritivos por proprietário, fila institucional sem responsável, RPCs e associações protegidos na mesma migration |
| Transferência de lead pessoal por gestão | crm_assign_lead aceitava IDs pessoais | Distribuição somente institucional; pessoal exige pedido do dono e aceite do destinatário ativo, com bloqueios de linha, histórico e repetição idempotente |
| Vendas dependentes da gestão | INSERT era gerencial na policy e na interface | Corretor registra venda própria com cliente/imóvel autorizados, autoria e revisão; confirmação financeira separada e sem dados pessoais na fila |
| Materiais do gestor invisíveis | Três materiais existentes são pessoais; dois pendentes e um aprovado/público | Audiência explícita proprietário/equipe/selecionados, consentimento do proprietário para mudança, nova aprovação, proteção de versões e Storage |
| Ausência de notificação de imóvel pendente | Não havia evento persistente de submissão | Evento transacional por ciclo e destinatário ativo, chave única, não lido e link para o imóvel; polling/refresh independentes de Realtime |
| Seletor não mostra corretor A | Não existe filtro por quantidade de imóveis. Falha silenciosa de role/diretório podia produzir lista parcial | RPC mínimo de corretores elegíveis, elegibilidade no servidor e erro explícito; A/B com imóveis existentes passam no teste local |
| Aprovação e INSERT de cliente falham em sessão real | Não reproduzidos na leitura de diagnóstico; papéis atuais e capacidade gerencial corretos. Causa exata original continua sem comprovação | Guarda de identidade antes de gravar, descarte de contexto antigo, propriedade real e testes de INSERT RETURNING. Confirmar reprodução na sessão real |
| Cache mantém dados após falha ou troca de conta | Workspace retinha linhas antigas em erro e carregava papel só inicialmente | Limpeza de dados, consultas e identidade; descarte de respostas atrasadas e desmontagem do conteúdo durante revalidação |
| Privilégios de tabela excedem CRUD | Catálogo confirmou TRUNCATE/REFERENCES/TRIGGER concedidos por padrão em tabelas públicas | Revogação desses privilégios de anon/authenticated; TRUNCATE não é protegido por RLS. Não foi demonstrado endpoint HTTP explorável para isso |

A primeira versão local das novas policies também revelou uma regressão de INSERT RETURNING: helpers STABLE que consultavam a própria tabela não viam a linha nova. A policy de leitura da própria linha passou a avaliar seus campos diretamente. Esta foi uma descoberta dos testes locais, não uma causa atribuída sem evidência ao erro histórico.

## Arquivos principais

- Identidade, contexto e carregamento: components/admin/AdminGuard.tsx, components/crm/Workspace.tsx, components/crm/Shell.tsx.
- Leads/clientes: components/crm/Leads.tsx, LeadTransfer.tsx e Contacts.tsx.
- Imóveis: components/PropertyForm.tsx e components/crm/Properties.tsx.
- Vendas: components/crm/Deals.tsx e SaleReview.tsx.
- Marketing: components/crm/Marketing.tsx, AssetAudience.tsx, lib/crm/marketing.ts.
- Gestão agregada: components/crm/ManagementOverview.tsx, Dashboard.tsx e Team.tsx.
- Contratos: lib/crm/model.ts; PGlite foi acrescentado somente como dependência de desenvolvimento, fixada em 0.3.14, com lockfile.

## SQL proposto para autorização específica

| Ordem | Arquivo em supabase/migrations | Impacto |
|---|---|---|
| M1 | 20261019160810_crm_private_portfolios_and_transfers.sql | Privacidade, RPCs, arquivamento/restauração, consentimento de transferência, privilégios e retirada de tabelas privadas da publicação Realtime |
| M2 | 20261019160914_crm_management_aggregates.sql | Indicadores agregados em períodos permitidos de 30/90/180/365 dias, sem pessoas, notas, tokens ou IDs de negócios privados |
| M3 | 20261019160943_crm_commercial_sale_ownership.sql | Registro próprio, autoria/revisão, confirmação independente e revisão financeira com controle de versão |
| M4 | 20261019161013_crm_property_review_notifications.sql | Diretório elegível, validação de responsável, autoria da aprovação no servidor, ciclos e notificações persistentes |
| M5 | 20261019161031_crm_approved_marketing_audience.sql | Audiência/destinatários, nova revisão, versão atual, Storage e apresentação pública |

Todas foram geradas com Supabase CLI 2.121.0 e testadas sobre snapshot de catálogo, sem recriar tabelas do staging. Cada arquivo é transacional, com lock_timeout de 5s e statement_timeout de 30s. M1 exige exatamente as 11 versões anteriores; divergência interrompe a aplicação.

Leitura final do staging: 4 leads, 4 clientes, 1 venda e 3 materiais. **Zero materiais institucionais para backfill de audiência.** Os três pessoais permanecem pessoais. M3 não inventa recorded_by para vendas antigas; a confirmação financeira antiga não é presumida.

As novas colunas com defaults constantes não exigem backfill comercial inventado. Índices, constraints e alterações de policies ainda precisam de locks; reconferir volume/tamanho antes de aplicar. As tabelas novas têm RLS, grants explícitos e nenhuma escrita direta pelo navegador para transferência, destinatários ou confirmação financeira. Funções privilegiadas novas têm search_path fixo e EXECUTE negado a anon/PUBLIC.

## Testes executados

| Verificação | Resultado | Limite da evidência |
|---|---|---|
| npm run test:crm-local | **211 APROVADAS, 0 REPROVADAS** | PostgreSQL/WASM PGlite isolado; claims SQL sintéticas |
| npm test | **19 APROVADAS** | Testes de lógica, rotas e streaming com dependências simuladas |
| npm run lint | APROVADO | Análise estática |
| npm run typecheck | APROVADO | TypeScript |
| npm run build | APROVADO | Build local otimizado; sem deployment |
| npm audit --omit=dev | Zero vulnerabilidades | Dependências de execução |
| npm audit completo | 5 alertas altos pendentes | Uma cadeia de desenvolvimento, descrita abaixo |

A suíte local executa também os dois scripts SQL revisados (crm-staging-rls.sql e crm-marketing-rls.sql), substituindo os IDs por usuários inteiramente fictícios. As expectativas antigas de leitura geral da gestão e bloqueio de toda venda pelo corretor foram retiradas. O guard de nome do banco é adaptado ao banco descartável; o restante dos testes SQL é executado.

O snapshot preserva definições de funções, tabelas, constraints, triggers, views, policies e grants do catálogo consultado. Auth e Storage são adaptadores SQL mínimos; ele não reproduz servidor Auth, transporte PostgREST, serviço Storage, WebSockets, planos de execução/índices de produção ou concorrência entre conexões. Hashes de função no preflight normalizam CRLF/LF para evitar falso drift textual.

Os testes iniciais de build encontraram limitações do ambiente (node_modules por symlink e --env-file propagado aos workers). Foram resolvidas localmente com dependências próprias e carregamento das variáveis antes de iniciar o build, sem contornar o guard de staging.

### Matriz por perfil

| Perfil | Papel e carteira no banco local | INSERT próprio de cliente | Ataques a carteira alheia/RPC | Imóveis | Venda/revisão | Auth/API/browser reais |
|---|---|---|---|---|---|---|
| Administrador | APROVADO, fila institucional sem carteiras alheias | APROVADO | APROVADO, acesso negado | APROVADO, aprovação | APROVADO, revisão sem cliente | BLOQUEADO |
| Gestor | APROVADO, fila institucional sem carteiras alheias | APROVADO | APROVADO, acesso negado | APROVADO, seleção e aprovação | APROVADO, revisão sem cliente | BLOQUEADO |
| Corretor A | APROVADO, própria carteira | APROVADO | APROVADO, contra B | APROVADO, submissão sem autoaprovação | APROVADO, registro próprio sem confirmação | BLOQUEADO |
| Corretor B | APROVADO, própria carteira | APROVADO | APROVADO, contra A | APROVADO, elegibilidade com imóvel existente | APROVADO, registro próprio | BLOQUEADO |
| Descartável local desativado | APROVADO, perde acesso com mesmas claims; estado restaurado no teste | Negado como esperado | Negado como esperado | Fora do diretório | Negado | BLOQUEADO |

As 211 verificações incluem criação/alteração, zero linhas indevidas, RPC negado, integridade após transferência, histórico, contato, propostas, tarefas, visitas, vendas, revisão invalidada após edição, notificações idempotentes, marketing/versões/destinatários e apresentações com consentimento, expiração e revogação.

Evidências: tests/security/crm-operational-local-results.json contém cada resultado e SHA-256 das cinco migrations. Os fingerprints anteriores estão em crm-operational-baseline-fingerprints.json.

## Dependências pendentes

npm audit aponta braces, micromatch, fast-glob, @next/eslint-plugin-next e eslint-config-next, todos na mesma cadeia de desenvolvimento. A vulnerabilidade raiz é GHSA-vfj7-8cjw-p6xm / CVE-2026-93687, estouro de pilha com padrões profundamente aninhados. O advisory informa nenhuma versão corrigida; npm view confirmou braces 3.0.3 como versão publicada atual.

A proposta automática do npm rebaixa eslint-config-next para 14.2.35, incompatível com a decisão de manter a stack Next 16.4 validada. Não foi aplicada. Não foi observado caminho de entrada de padrões externos no runtime do CRM; a análise de alcance aqui é sobre a cadeia de lint/desenvolvimento, não uma garantia universal de não exploração.

Referência: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm. Relatórios npm completos e de runtime estão em tests/security/npm-audit-*-20261019.json. Nenhum alerta do PGlite apareceu nesta auditoria.

## Limitações e impactos deliberados

1. Nenhuma dessas correções está ativa no staging. A reprovação anterior de privacidade da gestão continua relevante até implantar e testar.
2. O preview anterior não corresponde a este código. Não foi gerada nova URL, e a branch continua com deployment automático desativado.
3. As listas agora carregam somente módulos necessários, com limite de 500 registros e erro explícito ao exceder. Não há paginação navegável completa nesta entrega. Próxima evolução: keyset por (created_at,id), filtros no servidor e contagem agregada, preservando RLS. A fila financeira limita 200 itens recentes.
4. Pessoal ou destinatários selecionados nunca entram em apresentação pública. Para divulgação pública, o dono precisa pedir mudança para equipe e a gestão aprovar. A alteração de audiência revoga aprovação anterior.
5. Um material antes pessoal/aprovado/public deixa de ter download anônimo após M5. Registro, arquivo e versão são preservados. Não há publicação automática dos três uploads existentes.
6. Materiais deliberadamente públicos para equipe podem ser baixados pelo Storage público autorizado. Revogar uma apresentação bloqueia seu link e a rota de mídia vinculada; não torna secreto um arquivo já aprovado para divulgação pública.
7. Arquivamento não é DELETE físico. RPCs de restauração preservam responsáveis e vínculos; o seletor de arquivados/restauração na interface ainda pode ser ampliado. Arquivar um cliente oculta negócios vinculados nas listas que exigem cliente ativo; restaurar recupera a visibilidade.
8. Transferir lead não transfere o cadastro inteiro do cliente, suas notas ou outros negócios. O novo dono recebe os campos do próprio lead e vincula/cria cliente de sua carteira.
9. Redistribuição institucional auditada existe no RPC; uma tela de supervisão das atribuições por metadados sem PII ainda é uma evolução.
10. Testes com usuários reais, renovação/logout multiaba, upload de bytes JPG/PDF/MP4, layout mobile e Realtime real não foram executados. Não são aprovados por inferência.

## Implantação controlada no staging

1. Revisar o diff SQL dos cinco arquivos e este relatório. Obter autorização específica para aplicar ao projeto sdpqphiooiuglywcmkxv; publicação do preview é uma autorização separada.
2. Executar somente o preflight de leitura tests/crm-operational-preflight-readonly.sql. Exigir zero drift de funções/policies, as mesmas 11 migrations e volumes conferidos. Comparar também a quantidade de objetos com o JSON de fingerprints. Mudanças paralelas exigem reconciliação.
3. Confirmar backup/snapshot e disponibilidade para breves locks. Não executar db reset, db push indiscriminado, repair ou migrations antigas.
4. Aplicar M1–M5 em ordem, com registro gerenciado das versões e reconferência após cada transação. Não publicar cliente novo antes das dependências SQL.
5. Rodar advisors e verificar grants, funções, views security_invoker, RLS e publicação Realtime. Não adicionar novamente tabelas privadas à publicação para “resolver” notificações.
6. Após autorização de preview, usar apenas a URL/key pública já verificadas de staging, sem service-role no cliente. Conferir SHA e ambiente do deployment.
7. Executar os testes reais abaixo. Não limpar fixtures por DELETE amplo: usar apenas IDs identificados e operações suportadas.

### Retorno seguro

Não existe down migration automática que restaure a leitura ampla antiga. Se uma transação falhar, ela reverte seu próprio pacote. Se uma etapa posterior falhar, manter M1 fechado, bloquear o módulo dependente e corrigir por migration adicional. Preservar vendas, versões, consentimentos, notificações e auditoria. Não reverter banco restaurando acesso geral à gestão. Não excluir ou recriar usuários.

## Roteiro manual para os testes reais bloqueados

O navegador conectado estava sem abas/sessões. Não envie senhas, access tokens, refresh tokens, chaves ou arquivos HAR com credenciais no chat.

1. Abrir quatro perfis independentes de navegador. Entrar no novo preview autorizado como admin, gestor, A e B; registrar somente papel exibido, horário e ID da fixture.
2. A cria lead/cliente/imóvel fictícios; B cria os seus. Guardar os IDs localmente. Cada corretor deve encontrar somente os próprios leads/clientes em lista, busca, filtros, dashboard e URLs diretas. Gestão vê apenas fila institucional e registros próprios; visão da equipe contém agregados.
3. Na aba Network, reutilizar localmente uma requisição autenticada de leitura, sem compartilhar cabeçalhos. Alterar o filtro para o ID privado do outro corretor. GET deve trazer zero linhas ou negação; PATCH/DELETE devem negar ou afetar zero linhas, com persistência conferida pelo dono. Repetir A→B, B→A, gestor→A e admin→B, incluindo clientes, históricos, propostas, tarefas, shares e versões. HTTP 200 vazio não equivale a acesso concedido.
4. Tentar RPC de contato/envio/atribuição com IDs alheios. Gestão não pode atribuir lead pessoal. PATCH direto de broker_id deve falhar. A solicita transferência pessoal e B aceita; A perde acesso, B recebe, cliente/notas de A permanecem privados; repetição não duplica histórico.
5. Gestão cria institucional em fila, atribui a A e deixa de receber sua PII. Verificar auditoria da distribuição. Comparar contadores agregados com os dados fictícios.
6. A e B devem aparecer no seletor elegível mesmo com um ou mais imóveis. Corretor cria rascunho, submete e não se autoaprova. Admin/gestor recebem notificação persistente e conseguem revisar. Recarregar a página, testar link e marcar lida; editar pendente não duplica e nova submissão gera novo ciclo.
7. Cada corretor registra sua própria venda; tentar cliente/imóvel/profissional alheio deve falhar. Gestão revisa sem ver o cliente privado. Alterar valor depois da confirmação deve invalidá-la e uma revisão de versão antiga deve falhar.
8. Fazer upload de JPG/PNG, PDF e MP4 fictícios reais. Material pessoal permanece privado; dono pede equipe/selecionados e a gestão aprova. Conferir download autenticado, exclusão de destinatário, expiração, versão antiga e substituição com nova revisão.
9. Gerar apresentação com imóvel público e material institucional/equipe aprovado, abrir em janela anônima e confirmar que não há contato/nota do lead. Registrar confirmação de envio duas vezes; deve existir um evento/histórico. Revogar e expirar, verificando também a rota de bytes. Visualização só é registrada após consentimento.
10. Trocar A→gestor→B na mesma janela e em abas distintas, testar logout/renovação, rede lenta e requisições atrasadas. Não pode reaparecer dado da conta anterior. O teste de desativação real exige uma conta descartável identificada e autorização específica para alterar seu estado; não tocar nas quatro contas principais.
11. Repetir navegação e formulários em 390px e 768px. Registrar erro, horário, request ID, operação, UID e fixture, sem cabeçalhos secretos.
12. Distinguir falha de serviço (5xx/rede/Realtime/Storage indisponível) de negação esperada (RLS/42501/zero linhas). Não contornar com service-role ou desativando RLS.

**Recomendação:** implementação pronta para revisão de SQL e implantação controlada autorizada. Uso interno ainda não homologado: faltam aplicação no staging, preview correspondente e validação autenticada real. Os alertas de desenvolvimento e limites de paginação estão explicitamente pendentes.

