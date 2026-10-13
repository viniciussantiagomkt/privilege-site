# Privilege CRM: recuperação da execução e homologação

Data: 13/10/2026. Ambiente: exclusivamente staging `sdpqphiooiuglywcmkxv`.

## Resultado

O desenvolvimento foi retomado do commit `1df26043bdee91e0433ea3daba2890470ab2f9c0`, na branch `work/crm-staging-audit-20261008`, preservando os três commits do PR #1. Nenhum merge na main, alteração de variáveis de produção ou deployment de produção foi executado.

A execução interrompida havia instalado a migration `20261009174757_crm_marketing_presentations`, mas não havia salvo seu arquivo nem a interface de Marketing/Apresentações no GitHub. O SQL foi recuperado do histórico do próprio staging e incluído com sua versão original, sem reaplicá-lo. Não existe uma cópia recuperável dos arquivos que ficaram apenas na memória da execução anterior. A interface foi continuada sobre os módulos e tabelas existentes, sem reiniciar o projeto.

## Funcionalidades implementadas

| Área | Comportamento disponível | Evidência e limite |
|---|---|---|
| Operação comercial | Dashboard, Kanban, atribuição, contatos, imóveis, aprovação, agenda, propostas, negociações, vendas e desempenho existentes preservados | 81 testes de regressão SQL/RLS passaram; jornadas autenticadas ainda precisam de credenciais |
| Central de Marketing | Busca, filtros por categoria/status/imóvel/empreendimento, favoritos, coleções e kits pessoais, edição e vínculos | Interface integrada ao banco; isolamento e persistência testados em SQL |
| Importação | Lote de até 20 arquivos, JPG/PNG/WebP/PDF/MP4, até 50 MB por arquivo, checksum SHA-256, detecção de duplicação entre versões acessíveis, registro individual de sucesso/falha | Políticas e inserção de metadados passaram; upload de bytes pela interface ainda não homologado |
| Versionamento | Nova versão preserva o arquivo anterior e coloca o material em pendência de aprovação | Teste SQL confirmou que a versão pendente deixa de aparecer na apresentação |
| Construtoras e empreendimentos | Cadastro e edição gerenciais, vinculação de unidades aos imóveis existentes, materiais compartilhados via empreendimento | Interface integrada às tabelas existentes; jornadas autenticadas pendentes |
| Apresentações | Seleção de imóvel elegível, materiais adicionais aprovados, vínculo opcional com lead/cliente, mensagem, canal, validade e token opaco | Geração, validação de vínculos, registro no lead e revogação testados em SQL |
| Compartilhamento | Copiar mensagem/link, abrir WhatsApp oficial, copiar para Direct, confirmar envio manualmente | Confirmação gera evento e atividade uma única vez; abrir WhatsApp não é prova de envio |
| Página pública | Identidade Privilege, código, galeria, características, vídeos por link, materiais selecionados e contato do corretor | Página real com RPC do staging validada em desktop e celular, sem overflow ou exceções de runtime |
| Acessos | Registro opcional com consentimento explícito, nonce idempotente, sem dados pessoais do destinatário na URL | Navegador → endpoint → RPC → evento real confirmado no staging |
| Dashboard de Marketing | Materiais aprovados/vencidos, versões e tamanho cadastrado, links por período/corretor, aberturas autorizadas e imóveis mais apresentados | Somente dados reais visíveis à conta; MB não representa medição completa do bucket nem inclui arquivos órfãos |
| Automação interna | Preferência pessoal para tarefa de retorno após gerar apresentação ligada a lead; eventos persistidos | Preferência, tarefa e idempotência testadas em SQL; nenhum envio externo automático |
| Realtime | Assinaturas existentes preservadas, atualização periódica a cada 60 segundos e atualização ao focar a janela | Interface indica atualização periódica quando a assinatura não está ativa |

## Fluxo prioritário

1. Em Imóveis ou no detalhe do lead, abrir **Compartilhar apresentação**.
2. Selecionar um imóvel aprovado, publicado, com apresentação habilitada e disponibilidade elegível.
3. Selecionar os materiais adicionais aprovados para divulgação, vigentes e vinculados ao imóvel ou empreendimento.
4. Escolher lead/cliente, mensagem, canal e prazo; gerar o link.
5. Copiar a mensagem ou abrir o WhatsApp oficial; enviar manualmente.
6. Confirmar o envio no gerador ou na lista de Apresentações. O CRM registra a confirmação no atendimento sem duplicar o evento.
7. O cliente abre a página sem login. Se autorizar, a abertura é registrada. Uma abertura não comprova leitura completa.
8. Revogar o link quando necessário. Ocultar o imóvel bloqueia também a apresentação existente. Material vencido ou nova versão pendente deixa de aparecer.

A jornada inteira ainda não foi executada pela interface com um corretor autenticado. As operações de criação, aprovação, registro e isolamento foram testadas nos papéis reais do PostgreSQL com claims de autenticação; isso não equivale a login pelo Supabase Auth.

## Migrations

| Versão | Ação nesta recuperação |
|---|---|
| 20261008144426 até 20261009144156 | Preservadas, sem reaplicação |
| 20261009174757_crm_marketing_presentations | Arquivo recuperado do histórico, sem execução |
| 20261013180730_crm_marketing_upload_recovery | Migration nova aplicada uma vez somente no staging |

A correção nova remove a duplicação de escape na expressão de caminhos de arquivos, que rejeitava nomes válidos; restringe a listagem anônima do Storage; revalida vínculos do material na apresentação pública; e acrescenta a RPC de confirmação manual de envio com autorização e idempotência.

O histórico original anterior à auditoria continua incompleto, conforme o runbook anterior. Os arquivos recuperados dependem da base já existente. **Não executar `db push`, reset ou replay global de migrations.**

## Verificações desta execução

| Verificação | Resultado |
|---|---|
| Build Next.js com staging e guarda da branch | Aprovado |
| TypeScript | Aprovado |
| ESLint | Aprovado |
| SQL/RLS comercial | 81/81 |
| SQL/RLS Marketing/Apresentações/Storage | 52/52 |
| API anônima comercial | 15/15 |
| API Marketing e rejeição de login inválido no Auth | 18/18 |
| Guardas de ambiente | 5/5 |
| Smoke HTTP | 9/9 |
| Browser público e redirecionamentos anônimos | 15/15 |
| Apresentação pública real e consentimento, desktop/mobile | 5/5 |

São 200 assertivas distribuídas por camadas, não 200 jornadas completas. Evidências ficam em `tests/*results*.json`. Screenshots sintéticos foram usados apenas para inspeção local, sem inclusão no GitHub.

Os testes SQL usam `BEGIN/ROLLBACK`. A apresentação usada no navegador foi um registro sintético temporário, claramente identificado como teste, removido ao terminar. Sua exclusão precisou contornar somente o trigger de proibição de hard delete, dentro de uma transação com lock exclusivo, restaurando o trigger antes do commit. Nenhum imóvel real foi excluído. Sequências de códigos podem apresentar lacunas depois dos testes.

## Serviço versus aplicação

- Staging identificado como `ACTIVE_HEALTHY`; SQL, REST, Auth e RPC responderam.
- A página oficial de status consultada indicou instabilidade de Realtime e monitoramento da recuperação de Edge Functions. Não usamos Edge Functions para o fluxo de apresentações desta etapa.
- `removeChild` é uma exceção da interface do painel. Não é, por si só, evidência de corrupção ou perda no banco. A causa exata do erro do painel não foi reproduzida nesta sessão.
- Erros reais reproduzidos e corrigidos: expressão de caminho de upload inválida e verificação de origem HTTP que confundia host interno com host público.
- Download padrão do Chromium chegou truncado. A validação pública foi concluída com um binário alternativo obtido do pacote `@sparticuz/chromium@138.0.2` fora das dependências do projeto.

Status oficial: https://status.supabase.com/
Documentação consultada: https://supabase.com/docs/guides/storage/security/access-control e https://supabase.com/docs/guides/storage/schema/helper-functions

## Pendências e bloqueios

| Item | Estado | Próximo passo concreto |
|---|---|---|
| Login bem-sucedido de Admin, Manager, Corretor A/B, refresh e conta desabilitada | Bloqueado por falta de credenciais/sessões de teste disponíveis | Disponibilizar contas de homologação pelo fluxo seguro, sem alterar senhas existentes |
| Upload/download de bytes de fotos/PDF/vídeo na interface autenticada | Não homologado | Executar com essas contas e conferir versão, aprovação e leitura pública |
| Jornada de corretor pela interface, de seleção ao registro no lead | Não homologada de ponta a ponta | Executar com sessão de homologação; backend e página pública já testados |
| Google Drive, WhatsApp Business Platform, Meta Lead Ads e Google Calendar | Não conectados | Configurar conectores oficiais e autorizações próprias; as telas não simulam conexão |
| Extração/OCR de PDF, importação de pastas Drive, thumbnails e processamento de vídeo | Pendente | Implementar processamento controlado e jobs |
| Templates visuais de stories/feed com personalização e exportação | Pendente | Desenvolver editor/gerador de materiais; coleções/kit já disponíveis |
| Scheduler de integrações, retries e dead-letter queue | Pendente | Implementar quando houver os conectores; automação interna atual é transacional |
| Limpeza de arquivos órfãos após falha de rede e upload interrompido | Pendente | Reconciliar Storage com versões/importações; falhas atuais ficam registradas e arquivos não são apagados automaticamente |
| Paginação no servidor e agregações para volume elevado | Pendente | Workspace pagina consultas de 500 linhas, mas acumula registros visíveis no cliente |
| Homologação de mídia pública com arquivo real e revogação pelo navegador | Pendente | Testar download de bytes reais com as contas autorizadas; RLS e revogação foram validados em SQL |
| Segurança antes de produção | Pendente de revisão final | Advisor sem ERROR; alertas sobre funções SECURITY DEFINER, registro de códigos fechado e proteção de senhas vazadas permanecem documentados |

Não foram criadas contas administrativas, alteradas senhas existentes nem concedidos novos papéis de usuário nesta execução. A nova função SECURITY DEFINER é limitada a apresentação acessível e lead autorizado, tem EXECUTE negado para anon e foi testada para impedir confirmação por outro corretor.

## Reprodução dos testes

- SQL: executar `tests/crm-staging-rls.sql` e `tests/crm-marketing-rls.sql` somente no staging. As transações terminam em rollback.
- API: `node --env-file=.env.staging.local tests/crm-anon-api.mjs` e `node --env-file=.env.staging.local tests/crm-marketing-api.mjs`.
- Ambiente: `node --env-file=.env.staging.local tests/crm-preview-guard.mjs`.
- Build: carregar `.env.staging.local` no processo que inicia `npm run build`; evitar propagar `--env-file` para workers do Next.js.
- Browser anônimo: `CRM_CHROMIUM_PATH=/caminho/do/chromium node tests/crm-local-browser-runner.mjs`. O runner inicia e encerra seu próprio servidor.
- O teste público com fixture exige setup sintético explícito e cleanup em staging. Não executar sobre produção.

## Preview e revisão

O PR #1 permanece aberto e em rascunho: https://github.com/viniciussantiagomkt/privilege-site/pull/1

O preview será registrado após a conclusão do deployment. As duas variáveis públicas do Supabase da branch foram comparadas com o staging e conferem. A guarda de build bloqueia produção, projeto diferente, chave diferente e service-role nesta branch.
