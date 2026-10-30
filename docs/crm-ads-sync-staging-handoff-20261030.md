# Campanhas automáticas: continuação de implementação

## Execução da migration concluída em 30/10/2026

Backup novo das 20 migrations e restauração local executados pelo Codex no Windows: **RESTORE PASS**. O SQL aprovado foi testado na cópia restaurada com fixtures fictícias e rollback. Após preflight renovado, a migration foi aplicada **uma única vez** somente no staging como `20261030185925_crm_ad_reporting`; histórico com 21 versões. Arquivo apenas renomeado, SQL preservado.

Postflight: quatro tabelas novas vazias e com RLS, ACLs dos cinco RPCs conforme a revisão e 52 relações anteriores preservadas, assim como permissões, funções anteriores, extensões e cron. Passaram 285 checks PGlite, 59 testes de código, 14 grupos na cópia restaurada, 12 negativas HTTP reais e 5 checks do guard. Corrigidos somente caminhos de três loaders de testes no Windows.

**Sincronização não ativada:** nenhuma publicação de preview ou Edge Function, nenhum cron, segredo ou conexão de conta externa. PR #9 continua em rascunho. Relatório atual: [implantação somente do banco](crm-ads-staging-deployment-20261030.md). Evidência: `tests/security/crm-ads-staging-deployment-20261030.json`.

O texto abaixo é o handoff anterior, preservado como histórico. Não reaplicar o SQL. O backup validado é o snapshot anterior de 20 versões; o script agora exige 21 em backups futuros.

## Estado em 30/10/2026

PR #9 em rascunho, empilhado sobre #8. Esta entrega contém adaptadores, armazenamento proposto, worker e painel. **Ainda não está ativa no staging nem no preview.** Nenhum acesso real a contas Meta/Google foi demonstrado. A tela de consentimento OAuth para conexão autônoma pelo corretor ainda não foi implementada; esta primeira ativação usa provisionamento administrativo seguro de contas previamente autorizadas. Não apresentar uma conta como conectada só porque foram preenchidos IDs no cadastro manual.

O staging foi consultado somente para leitura e continua com 20 migrations, terminando em `20261029184222_crm_campaign_attribution`. A proposta `20261029191800_crm_ad_reporting.sql` foi originalmente criada pela CLI durante a preparação de 29/10 e ainda não foi aplicada. Nenhuma alteração de dados comerciais, permissões existentes, contas, Edge Functions, Vercel ou produção foi executada nesta rodada.

## Código preparado

- Três tabelas públicas: contas autorizadas, identidade de campanhas externas e métricas diárias. RLS separa gestão institucional e carteiras pessoais; anon sem acesso, usuários autenticados sem escrita direta. Uma conta externa pertence a uma carteira explícita, sem compartilhamento automático.
- Estado de execução privado com lease de quatro minutos. RPCs de claim/commit/fail executáveis somente pelo worker com service_role. Nenhuma chave administrativa é adicionada ao Vercel ou ao cliente.
- Commit transacional do relatório completo por período, substituindo observações anteriores. Repetições não acumulam investimento; correções e zeros omitidos substituem dados antigos. Erros/leases antigos não podem sobrescrever uma execução atual. Mudança de moeda/fuso exige reconciliação explícita.
- Worker `crm-ads-sync`: aceita apenas POST com segredo dedicado, conta em allowlist no backend e URL exata de staging. Meta usa credencial de leitura previamente autorizada; Google renova access token usando refresh token no backend. Nenhum endpoint de criação/alteração de anúncios é chamado.
- A cada execução bem-sucedida a conta fica elegível novamente em 30 minutos. Leitura dos últimos 30 dias no fuso da conta, incluindo campanhas pausadas para corrigir histórico. Falhas transitórias têm backoff e jitter; erro de autenticação exige reconexão.
- Painel com conta, período, status remoto, última atualização, gasto, impressões, cliques, CTR, CPC e resultados por definição da plataforma. Ações Meta continuam separadas para evitar soma de conversões sobrepostas; conversões Google não são vendas CRM. Sem CPL/CPA inventado, sem união por nome e sem vinculação automática a imóvel ou lead.
- Suspensão local autorizada invalida lease e preserva histórico. A interface explica que isso não revoga consentimento no provedor. Revogar consentimento exige também a ação oficial na plataforma e remoção da credencial no secret store.
- Arquivo operacional de cron preparado, mas não executado. Verifica extensões existentes, segredo no Vault e ausência de job duplicado. Não habilita extensões nem grava segredos automaticamente.

## Validação local

- 285 verificações PostgreSQL/PGlite passaram, incluindo 11 grupos novos de persistência/RLS. Claims SQL sintéticas, não sessões JWT reais e não PostgreSQL remoto.
- 59 testes de código passaram, incluindo fluxo de worker com fetch simulado e isolamento de respostas da interface após troca de identidade/cleanup.
- Lint e TypeScript passaram. Resultado de build deve ser consultado na evidência desta rodada; não inferir publicação a partir de build local.
- Nenhuma chamada de métricas real autenticada, visual desktop/mobile autenticado, duas conexões PostgreSQL concorrentes ou cron remoto foi homologado. Claim sequencial não prova concorrência real.
- APIs/versões/permissões Meta e Google precisam ser confirmadas antes de qualquer ativação. Versão Meta `v99.0` aparece somente nas fixtures e não é uma versão para produção.

## Ordem da próxima execução no Codex Windows

1. Atualizar a branch do PR #9 e conferir o commit. Preservar outros worktrees. Não publicar/mesclar automaticamente.
2. Aguardar autorização específica da nova migration. Após autorizada, usar scripts do repositório para backup NOVO das 20 migrations atuais e restauração local em cópia isolada. O backup validado de 19 versões é anterior à migration de campanhas e não substitui esta etapa. Manter dumps, roles, logs e senhas privados, fora do Git/chat.
3. Renovar preflight imediatamente antes da escrita: staging correto, histórico exato de 20, objetos novos ausentes, dependências presentes, locks/transações e baseline de dados/permissões anteriores. Testar SQL na cópia restaurada com fixtures e rollback. Se houver drift, parar e analisar, sem reaplicar SQL por tentativa.
4. Aplicar a migration aprovada uma única vez somente no staging. Reconciliar eventual timestamp gerenciado e runner, sem repetir SQL. Postflight: tabelas novas vazias e com RLS, ACL das cinco RPCs, recibos/leases privados, dados e permissões anteriores preservados. Atualizar baseline de backup somente depois de aplicação comprovada.
5. Publicação da função e ativação do agendamento exigem escopo específico. Primeiro publicar desativada, sem contas/segredos/schedule, e testar negativas HTTP sem criar registros. `verify_jwt=false` é intencional: há autenticação de máquina no próprio handler, com segredo dedicado. Sem segredo válido, recusar antes de qualquer consulta/chamada externa.
6. Conexão das contas: obter autorização explícita do proprietário e conta exata. Verificar acesso e metadados reais com a API antes de marcar `connected`; nunca deduzir acesso por IDs manuais ou pelo nome. Contas pessoais somente com consentimento do corretor. O assistente não deve solicitar senhas/tokens pelo chat.
7. Configurar via ambiente seguro os segredos Edge `CRM_ADS_CRON_SECRET` (aleatório, >=32 caracteres) e `CRM_ADS_CONNECTIONS` (JSON descrito abaixo). Segredo de cron correspondente no Vault sob `crm_ads_cron_secret`. Credenciais permanecem somente no secret store; nunca arquivos versionados, frontend, URLs, logs ou relatório. Não imprimir JSON real ao executar comandos.
8. Provisionar linha de `crm_ad_accounts` em operação administrativa expressamente autorizada, com owner/scope/provider/external_id/name e status inicialmente pending. Conferir role/consentimento do owner e vínculo de conta da plataforma. Preencher currency/timezone verificados; marcar connected só ao habilitar a conta escolhida. UUID deve corresponder exatamente ao secret JSON. Não criar usuários nem alterar roles para conseguir testar.
9. Testar leitura real individual autorizada antes do cron. Conferir conta/periodização/moeda, status, dinheiro no painel contra gerenciador de anúncios, renovação Google e tratamento de Meta revogado. Só então ativar `supabase/operations/enable-crm-ads-sync.sql`, se aprovado. Se extensões estiverem ausentes, obter aprovação específica antes de habilitá-las. Não incluir valor do segredo em SQL versionado.
10. Novo preview da branch exige autorização separada e variáveis específicas, somente chave pública/URL staging, sem analytics/webhooks externos. Homologar quatro perfis e desktop/mobile por sessões legítimas. Se controle do navegador bloquear, não contornar nem extrair cookies/tokens. Produção/main fora do escopo.

## Formato do segredo de conexões

JSON array com um objeto por conta. Exemplos estruturais sem valores de credenciais:

```json
[
 {"id":"UUID_DA_CONTA_CRM","provider":"meta","externalId":"ID_NUMERICO","version":"VERSAO_SUPORTADA_VERIFICADA","timezone":"America/Sao_Paulo","accessToken":"CONFIGURAR_SOMENTE_NO_SECRET_STORE"},
 {"id":"OUTRO_UUID_CRM","provider":"google","externalId":"CUSTOMER_ID_SEM_HIFENS","version":"VERSAO_SUPORTADA_VERIFICADA","timezone":"America/Sao_Paulo","clientId":"CONFIGURAR_NO_SECRET_STORE","clientSecret":"CONFIGURAR_NO_SECRET_STORE","refreshToken":"CONFIGURAR_NO_SECRET_STORE"}
]
```

`loginCustomerId` Google é opcional e só se aplica ao acesso por MCC. O JSON não autoriza uma conta por si: o provisionamento deve verificar acesso real e consentimento antes da ativação. Erros de configuração não devem ser resolvidos ampliando permissões de corretor ou liberando acesso público.

## Limites e operação

O painel lê até 100 contas por usuário e falha explicitamente se ultrapassado; não mostra total truncado. Adaptadores têm limite de paginação e período; contas muito grandes podem precisar de jobs menores antes de ativar. Se o worker ultrapassar a duração da função/lease, o commit é recusado e a execução deve ser investigada. Resultados de atribuição dos provedores podem mudar além da janela de 30 dias; backfill explícito com janelas de até 31 dias requer operação dedicada e autorização. O histórico anterior a cada janela é preservado, mas a interface sinaliza cobertura incompleta.

Secret store compartilhado é uma primeira etapa de provisionamento administrativo, não onboarding multiempresa/self-service pronto para comercialização. OAuth por usuário com state/PKCE/callback, gestão de consentimento, rotação/revogação automatizada e eventual Vault por conexão continuam pendentes. Não declarar integração integral enquanto conexão real e agendamento não estiverem homologados.

Referência do agendamento: https://supabase.com/docs/guides/functions/schedule-functions.
