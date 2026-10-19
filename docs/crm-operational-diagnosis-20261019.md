# Privilege CRM: diagnóstico operacional inicial

Data: 19/10/2026. Referência: PR #3, work/crm-integration-security-20261013, commit 6ccddf5a0bd84d376ccb8f5c4f9c1c4a7ee78cda. Branch isolada: work/crm-integration-security-diagnosis-20261019.

**Resultado: há incompatibilidades comprovadas entre o modelo atual e as regras solicitadas. Não é uma correção somente visual.** Nenhuma alteração de banco, conta, permissão ou preview foi realizada. Esta entrega é diagnóstico e especificação para aprovação, não implementação funcional.

## Evidência coletada

Staging sdpqphiooiuglywcmkxv ACTIVE_HEALTHY, Postgres 17.11; 11 migrations registradas; 40 tabelas públicas com RLS; 107 policies, 36 funções em public/crm_private e quatro views examinadas. As quatro views usam security_invoker=true. RLS habilitado não implica que as condições correspondam ao modelo de privacidade.

PR #3 permanece aberto em rascunho, head 6ccddf5. O deployment conhecido dpl_3ixkz3oSGiYMac8EyXEECaqi9kkQ continua READY, target staging e código 72b5420. O código de aplicação é idêntico à referência 6ccddf5; commits posteriores da referência adicionaram testes/documentação. Não houve publicação nova. Não foi confirmado qual URL e sessão produziram cada erro relatado pelo usuário.

Consultas de diagnóstico por perfil rodaram em BEGIN READ ONLY, SET LOCAL ROLE authenticated e claims simuladas, encerradas com ROLLBACK. Nenhum INSERT/UPDATE/DELETE, fixture, trigger, função ou policy foi alterado. SELECT de grants não equivale a autorizar um INSERT pela RLS. Não houve teste com JWT real ou reprodução de formulário autenticado nesta etapa.

## Contas atuais e representação visual

| Destino | ID atual confirmado | Papel em user_roles | Situação |
|---|---|---|---|
| Administrador | 84c5604b-d728-4759-8572-ea4a832af9ce | admin | Confirmado, habilitado, sem banimento |
| Gestor | 0d92c58c-d6f0-4465-95e1-303e7d9f9a69 | manager | Confirmado, habilitado, sem banimento |
| Corretor A | 73a767b8-218d-4910-a370-2b93cf32bf74 | broker | Mesmo ID em brokers, ativo |
| Corretor B | 779c7220-06dd-4180-8b52-05136bee21cb | broker | Mesmo ID em brokers, ativo |

Admin/gestor não têm registro em brokers. As FKs de clients.broker_id e sales.broker_id apontam para auth.users, não brokers; por isso a ausência de perfil de corretor da gestão não explica automaticamente os erros de INSERT.

current_user_role consulta user_roles e disabled_at. Não usa user_metadata para autorização. A conta administrativa já possui o papel esperado: **não há alteração de permissão a fazer com base nesta consulta**. Qualquer mudança futura de conta exigirá autorização específica e confirmação da identidade.

Shell.tsx exibe “Gestão” tanto para admin quanto manager. Esse rótulo não demonstra que as duas permissões no banco sejam manager. Corrigir para Administrador/Gestor/Corretor e separar capacidades de configuração, distribuição, revisão de imóveis e acesso à carteira.

## Resultado de leitura efetiva no banco

| Perfil simulado | Role resolvida | Leads visíveis | Leads pessoais alheios | Clientes visíveis | Clientes alheios | Corretores ativos visíveis | Pode aprovar, segundo helper |
|---|---|---:|---:|---:|---:|---:|---|
| Admin | admin | 4 | 3 | 4 | 4 | 2 | Sim |
| Gestor | manager | 4 | 3 | 4 | 3 | 2 | Sim |
| A | broker | 1 | 0 | 1 | 0 | 2 | Não |
| B | broker | 2 | 0 | 2 | 0 | 2 | Não |

Há uma fila institucional com um lead sem responsável e três leads pessoais atribuídos. Gestão lê todos; corretores não leem a fila nesta consulta. Critérios da NOVA regra geraram 20 verificações de leitura/capacidade: 16 aprovadas e quatro reprovadas, correspondentes à leitura indevida de leads/clientes alheios pela gestão. Isso não é homologação de escrita/API.

O relato de leitura cruzada A/B **não foi reproduzido com essas duas identidades separadas no banco atual**. Precisa de captura da sessão que falha, sem tokens, e teste de troca de conta/cache/transferência. Não foi descartado como problema de interface.

## Causas e limites por problema

| Problema | Diagnóstico | Confiança e correção proposta |
|---|---|---|
| Admin e gestor apresentados como gestor | Rótulo genérico de Shell.tsx; banco resolve admin/manager corretamente | Confirmado no código e no banco. Corrigir rótulos/capacidades, sem alterar usuários |
| Gestão lê carteiras privadas | Policies de leads/clients e entidades dependentes usam can_manage_operations como exceção irrestrita; Workspace baixa select(*) e dashboard agrega esses dados no navegador | Confirmado por leitura com três leads pessoais alheios. Fechar RLS e RPCs, oferecer fila e agregações sem PII |
| Todos os corretores veem todos os leads | Não reproduzido em SQL para A/B. Workspace guarda role/userId na inicialização, não acompanha Auth diretamente e mantém dados anteriores quando consultas falham | Defeito de ciclo de estado confirmado; relação causal com a sessão relatada ainda é hipótese. Invalidar dados/role por identidade e testar JWT real, API e cache |
| A ausente no responsável por já possuir imóvel | Não existe filtro por quantidade de imóveis em PropertyForm.tsx ou Leads.tsx nem UNIQUE por properties.broker_id. Ambos aparecem como ativos na consulta de diretório | Causa relatada não confirmada. PropertyForm restringe a si próprio quando papel não é gestão e ignora erro da consulta de role. Padronizar diretório elegível e diagnosticar role real |
| Erro de aprovação | crm_protect_property_approval lança exatamente a mensagem quando auth.uid está definido e can_manage_operations=false. Com IDs atuais de admin/gestor, helper retorna true | Erro real ainda não reproduzido por UPDATE. Correlacionar sessão/UID/role/projeto; não remover proteção para fazê-lo passar |
| INSERT de cliente negado na gestão | Contacts.tsx envia broker_id=ctx.userId. Policy permite gestão ou proprietário; FK aceita auth.users; gestão atual tem role/capacidade válidas | Não reproduzido. Capturar SQLSTATE, UID real e payload sanitizado; corrigir contexto obsoleto/propriedade, sem liberar INSERT global |
| Venda bloqueada ao corretor | Policy operations write sales permite apenas admin/manager; Deals.tsx oculta registro ao corretor e orienta procurar gestor | Confirmado como desenho atual incompatível com autonomia solicitada. Liberar registro próprio com validação de todos os vínculos, separando confirmação financeira |
| Venda negada à gestão | Com a role atual, o helper e os grants permitem a etapa de gestão; não há evidência suficiente da requisição que falhou | Causa exata pendente. Não confundir com a negação intencional ao corretor |
| Materiais do gestor invisíveis | Três materiais estão em scope=personal: dois pendente/internal e um aprovado/public. A/B veem zero. assets_read exige escopo institucional aprovado para equipe | Reproduzido. Upload oferece pessoal por padrão; escopo é imutável pelo trigger. Oferecer audiência explícita e conversão autorizada/auditada, nunca publicar pessoais em lote |
| Falta de notificação de imóvel pendente | Não há trigger/evento de criação para transição de imóvel a pendente; nenhuma notificação persistida. Shell não tem link para a entidade | Confirmado na estrutura. Criar evento persistente idempotente por destinatário e link, com leitura própria e fallback de consulta |

## Caminhos que não podem ficar abertos

- crm_assign_lead é SECURITY DEFINER e hoje permite à gestão transferir qualquer lead por ID, inclusive pessoal. Corrigir apenas SELECT deixaria uma tomada de posse possível. O RPC também não verifica brokers.active, apesar da mensagem mencionar inatividade.
- crm_record_contact e crm_confirm_presentation_share também têm exceção operacional. marketing_shares permite à gestão ler tokens/mensagens e vínculos privados. Revisão tem que incluir esses caminhos.
- tasks, visits, proposals, negotiations, lead_activities, lead_assignments, crm_contact_links, audit_logs, notificações e Storage precisam obedecer à mesma propriedade/autorização. Não basta esconder a lista de leads.
- Há policies legadas permissivas coexistindo com boundaries RESTRICTIVE. As permissivas combinam por OR, e as restritivas limitam por AND. Não diagnosticar vazamento apenas pelo nome de uma policy antiga nem criar outra policy permissiva esperando restringir acesso.
- As views usam security_invoker, mas herdam a abertura atual da gestão. Agregação no navegador não é anonimização se a aplicação já recebeu os registros.
- 23 tabelas estão na publicação Realtime. O Workspace assina mudanças gerais de todas as tabelas. DELETE em Postgres Changes exige cuidado especial: a documentação informa limites de filtro/RLS sobre registros apagados; preferir arquivamento e canais autorizados sem payload/IDs de carteiras alheias.
- Eventos públicos de consentimento/apresentação são intencionais e precisam continuar limitados a link válido, material selecionado, validade e aprovação. Não revogar EXECUTE em bloco quebrando esses fluxos.

## Por que os testes anteriores não bastam

A suíte existente contém “Manager reads all synthetic leads”, “Admin reads all synthetic leads” e “A cannot write sales”. Ela validava precisamente os comportamentos que as regras atuais rejeitam. As fixtures são criadas com privilégios administrativos antes de simular claims; não reproduzem o payload/ciclo Auth dos formulários. Os testes anteriores não comprovam o novo sigilo nem o erro atual de INSERT na gestão.

A correção da contagem de Storage e os testes adicionais do PR #5 continuam trabalho válido separado, mas não foram incorporados à referência solicitada nem confundidos com correção de privacidade. As migrations antigas não devem ser reexecutadas.

## Arquivos desta primeira entrega

- docs/crm-operational-diagnosis-20261019.md: este diagnóstico.
- docs/crm-operational-correction-plan-20261019.md: regras, migrações propostas, testes, riscos, implantação e rollback.
- tests/security/crm-operational-diagnosis-20261019.json: evidência sem conteúdo pessoal de leads/clientes.
- tests/crm-operational-diagnosis-readonly.sql: consultas de reprodução por perfil, somente leitura.
- vercel.json: desabilitar deploy automático da branch de diagnóstico; nenhuma publicação.

Nenhuma migration SQL executável foi criada nesta etapa inicial. Os pacotes M1–M5 são especificações de mudanças a versionar após aprovação do plano; a aplicação ao staging terá autorização separada, com SQL final apresentado previamente.

**Prontidão: reprovada para uso comercial diário.** Aprovar o plano não autoriza alterar contas, executar migrations ou publicar preview automaticamente.

