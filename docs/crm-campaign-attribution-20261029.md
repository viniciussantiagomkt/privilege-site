# Campanhas e atribuição: primeira entrega

## Atualização operacional

Implantação autorizada no staging concluída em 29/10/2026, após backup novo e **RESTORE PASS** executados no Windows. Versão real: `20261029184222_crm_campaign_attribution`; SQL aprovado preservado, sem reaplicação. Postflight aprovado e sem alteração dos dados/permissões anteriores. Nenhum preview publicado, merge ou alteração de produção.

Veja [relatório de implantação](crm-campaign-staging-deployment-20261029.md). As referências abaixo à migration proposta e à implantação ainda pendente pertencem à preparação anterior e não substituem o estado atual. JWT real, interface e concorrência multisessão continuam pendentes.

## Escopo

Base: PR #7, commit b6969d8a05613d2e256fcf76c35d6bb01940be24. Nova branch work/crm-campaign-attribution-20261029; PR empilhado sobre a branch do PR #7. A implantação homologada de apresentações permanece intacta.

Entrega funcional preparada: página /admin/campanhas com criação/edição, campanhas institucionais e pessoais, plataforma, objetivo, canal planejado, estado no CRM, vínculo opcional a imóvel ou empreendimento, destino institucional ou corretor e identificadores externos opcionais. Cadastro no CRM não cria/ativa anúncios. Campanhas pessoais ficam na própria carteira; gestão vê campanhas institucionais sem acesso automático às campanhas pessoais.

Ações: registrar contato manual em campanha ativa, persistir origem da campanha e campos UTM/conjunto/anúncio/termo/página, exibir a atribuição no detalhe do lead e filtrar o pipeline por campanha. Os campos externos são informações manuais, não prova de conta conectada nem identificação verificada por provedor. A tela informa expressamente que as conexões automáticas não existem nesta entrega.

## Banco e limites de segurança

Migration proposta 20261029180616_crm_campaign_attribution.sql, criada pelo Supabase CLI. Nova crm_campaigns, nova crm_lead_attributions e recibos em crm_private.campaign_receipts. RLS habilitado, apenas SELECT autenticado nas duas tabelas públicas, sem escrita direta. Duas RPCs de escrita, com verificação de identidade/role e sem EXECUTE anônimo: crm_save_campaign e crm_capture_campaign_lead. Nenhuma função existente substituída; nenhuma coluna de tabela comercial alterada. Destino/responsável é resolvido no servidor, nunca por UTM.

- Pessoal: propriedade da campanha permanente; contatos sempre na carteira do próprio corretor elegível. Cadastro não aceita owner_id arbitrário. Não há gestão lendo campanhas pessoais.
- Institucional: somente gestão configura/registra. Rota para recepção ou chama crm_assign_lead para atribuição, usando tarefa/notificação/auditoria existentes. Se o destino ficou inativo, mantém o contato na fila institucional e retorna fallback_queue, mostrado no aviso ao operador.
- Atribuição: leitura segue crm_private.lead_readable, inclusive após transferência aceita. O novo responsável vê a origem do lead, mas não ganha acesso à campanha pessoal anterior. Nome de campanha é snapshot; edição não altera histórico anterior.
- Recibos: UUID de ação manual + ator, fingerprint de conteúdo para recusar reutilização com outro conteúdo e lock de linha. Repetir a mesma ação não cria outro lead, atribuição, tarefa de atribuição ou notificação. Isso não é deduplicação de eventos verificados de Meta/Google, ainda não conectados, nem deduplicação global por telefone. Telefones iguais entre carteiras não são mesclados.
- Atribuição informada: allowlist de campos, limites, sem parâmetros de URL, fragmentos ou URLs externas no landing_path. Não há campo livre para token/secret de integração. Provenance é manual e não pode ser marcada como verificada pelo cliente.
- Referência ao imóvel é revalidada na captura, evitando usar vínculo de carteira que mudou após o cadastro da campanha. Empreendimentos seguem o catálogo já legível pelos perfis comerciais.

## Validação

- 274 checks SQL/PGlite aprovados, zero falhas: 259 anteriores + 15 de campanhas. Ambiente descartável com fixtures e claims sintéticas; não são sessões Auth HTTP reais. Incluem isolamento dos quatro perfis, negativa anônima/direta, overposting, routing pessoal, gestão institucional, idempotência, destino inativo/fallback, transferência, limites, campanhas pausadas/arquivadas, validação do imóvel e snapshots. Replay sequencial foi executado; concorrência entre conexões reais não foi exercitada.
- 38 testes de código aprovados: 31 anteriores + quatro de normalização e três dos handlers de formulário com dependências simuladas. A escolha de escopo/destinatário e reutilização do ID de ação após erro são verificadas.
- npm ci com lock da branch, lint, TypeScript e build otimizado Next.js 16.4.3 aprovados. Build executado com guard da nova branch, URL/chave pública do staging verificadas e sem service-role.
- Cinco checks do guard da nova branch passaram: staging verificado aceito; produção, outro projeto, chave desconhecida e credencial privilegiada recusados localmente. Nenhuma publicação foi executada.
- Leitura remota confirma staging com 19 migrations e ausência das duas tabelas/RPC de captura desta entrega. Nenhuma migration/fixture remota foi executada.
- Advisors lidos apenas como baseline do projeto já implantado. Avisos legados não foram alterados nem apresentados como validação de schema ainda não aplicado. Reavaliar após implantação autorizada; justificativa das duas funções SECURITY DEFINER fica nesta revisão.
- Pendentes: interface autenticada e visual desktop/mobile, API HTTP com JWT real, concorrência multisessão e fluxo real do fallback no preview. Não executar escrita no staging antes de autorização da migration.

## Implantação proposta

1. Revisar este PR separado. Não fazer merge automático, nem no PR #7 nem em main.
2. Autorizar especificamente a migration, gerar/validar backup atual de 19 versões, renovar preflight de ausência de objetos, grants e locks, aplicar somente no staging e conferir preservação dos dados/roles. Script atual da branch-base já espera exatamente essas 19 versões; não usar Downloads antigo.
3. Depois de verificação do banco e autorização própria, configurar somente a nova branch/preview com URL e chave pública do staging, analytics/webhook externos desativados e sem credencial privilegiada. Deployment automático está desativado no primeiro commit desta nova branch; guard de build impede produção/projeto diferente.
4. Publicar preview autorizado do commit exato, sem substituir os URLs imutáveis homologados, e testar cadastro, origem, filtro, repetição e isolamento com quatro perfis e dados fictícios.

Nenhuma publicação, alteração de usuário/permissões existentes, integração externa, envio de mensagem, migration remota ou mudança de produção foi executada nesta etapa.

## Continuidade

Ainda não implementados: entrada automática Meta Lead Ads/Google, assinatura e verificação dos webhooks de provedor, janela/modelo de atribuição first/last touch, outros eventos para um lead existente, WhatsApp oficial com status de entrega, importação de custos, dashboard financeiro e landing pages de exclusivos. O endpoint público existente do site e a rota de preparação de conversões não foram conectados artificialmente a essas integrações. Não houve novo formulário público no site.
