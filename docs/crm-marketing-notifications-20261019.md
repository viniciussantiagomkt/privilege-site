# Central de Marketing e notificações: correção proposta

## Ajuste visual de audiência em 28/10/2026

O usuário informou aprovação dos cenários de material privado e destinatários selecionados orientados no chat. Essa evidência é manual e não equivale à execução pelo agente nem à aprovação de todo o roteiro.

A captura enviada mostrou o formulário de audiência sem estilos: seletor inline, destinatários sem espaçamento e ação encostada na borda do painel. O componente não usava as classes do formulário do CRM. Foram adicionados estilos específicos, cartões de destinatários com checkbox e papel, grade adaptável, espaçamento do formulário, foco visível e quebra do texto do botão. O legend agora pertence ao fieldset de destinatários. O resumo usa papéis em português. Nenhuma migration necessária.

TypeScript, ESLint do componente e os 19 testes de código passaram. O build compilou, mas não concluiu a geração de páginas por ausência das variáveis públicas Supabase neste ambiente. Validação visual ainda pendente: Playwright não encontrou Chromium instalado e o download retornou arquivo inválido. Nenhuma sessão autenticada foi exercitada nesta rodada. O preview publicado anteriormente não contém este ajuste; uma nova publicação exige autorização específica.

19/10/2026. Base: PR #6, commit `14758f9d39b0e982b33d8f839793173910dbe563`. Branch isolada `work/crm-marketing-notifications-20261019`. **Atualização de 28/10/2026: migration aplicada exclusivamente no staging após confirmação específica. Nenhum usuário/papel foi alterado. Preview isolado publicado após autorização separada, conforme registro ao final.** O preview anterior e a homologação do PR #6 foram preservados.

## Diagnóstico comprovado

| Camada | Causa / evidência | Correção |
|---|---|---|
| Diretório | AssetAudience usava crm_transfer_candidates, que só lista brokers e exclui o próprio usuário | Diretório mínimo dedicado de membros elegíveis, incluindo admin/manager/broker/corretor; sem e-mails ou carteiras |
| Validação SQL | crm_set_asset_audience validava destinatários com eligible_broker | Validação de membro ativo, papel em user_roles, Auth não banido e broker ativo somente quando o papel exige broker |
| Upload | Opção institucional aparecia só para gestão; não havia seleção individual no upload | As três opções para todo usuário autorizado: Somente eu, Toda a equipe, Selecionar destinatários |
| Edição | Destinatários não eram pré-selecionados; modal retinha o objeto antigo depois de salvar | Carregamento dos destinatários atuais e material derivado dos dados atualizados; painel de audiência exclusivo do proprietário |
| Aprovação | Aprovar equipe também colocava visibility=public | Aprovação interna separada da autorização explícita para apresentações públicas; destinatários não publicam material pendente |
| Banco atual | Leitura staging: 1 material owner/aprovado e 2 team/pendente, todos com versão. Os pendentes ainda não podem ser consumidos pelos destinatários | Preservar aprovação; ação explícita e idempotente para pedir revisão, inclusive dos pendentes antigos, sem backfill automático |
| Acesso | Gestão podia ler qualquer institucional, inclusive selecionados aprovados sem estar selecionada | Revisão de pendentes pela gestão; aprovados selecionados somente proprietário/destinatários. Equipe inclui gestão ativa |
| Eventos | Há trigger de submissão de imóvel, mas não de resultado, material ou transferência. Distribuição já notificava, sem link/idempotency key | Eventos transacionais persistentes, chaves por evento/ciclo e destinatário, link e mensagens genéricas |
| Cabeçalho | Contagem derivada da lista limitada; exceder 500 causava erro. Links só reconheciam imóveis | RPC de contagem sob RLS, últimas 100 notificações em ordem recente, erros explícitos, links seguros de imóveis/materiais/leads/transferências |
| Atualização | Consulta a cada 60s; tabelas privadas foram retiradas do Realtime por segurança | Consulta a cada 30s e foco da janela, sem recolocar dados privados no Realtime; descarte de respostas da conta anterior preservado |

Staging inspecionado somente por SELECT e catálogo: `sdpqphiooiuglywcmkxv`. Há 3 imóveis: rascunho, aprovado e publicado, todos com review_cycle=0; nenhum pendente. Há zero notificações e nenhuma das tabelas privadas consultadas na publicação Realtime. Isso não prova uma falha do trigger de submissão já instalado: não há submissão pendente atual para reproduzir, e não houve acesso às sessões de usuário. Não foi atribuída a falha a uma indisponibilidade temporária do serviço sem evidência.

## Mudança de comportamento e segurança

- Proprietário conserva acesso, inclusive a versões; somente ele muda audiência. Gestão revisa pendentes institucionais e vê os destinatários durante revisão; não redireciona conteúdo alheio.
- Mudança real de audiência/destinatários revoga aprovação e divulgação pública. Repetir a mesma solicitação não reinicia o ciclo. Nova versão exige nova aprovação.
- “Toda a equipe” significa acesso interno aprovado para todos os membros elegíveis. Divulgação anônima continua exigindo autorização pública explícita, vínculo a imóvel público, versão atual e validade. Não se tornam públicos materiais pessoais existentes.
- Arquivos previamente baixados não podem ser recuperados; revogação impede novas consultas conforme as policies. Não se promete apagar cópias já obtidas.
- Notifications não contêm nomes, telefones, e-mails ou razões privadas de leads. O antigo dono recebe o resultado da solicitação, sem link ao lead transferido; o registro continua protegido por RLS.
- Escrita direta de notificações continua revogada. Helpers de eventos/eligibilidade têm EXECUTE revogado; RPCs públicos exigem sessão/capacidade. Nenhuma permissão global foi aberta.
- Diretório não depende da quantidade de imóveis/materiais. Fallback de identificação de administrador/gestor usa papel + trecho do UUID, sem expor e-mail; cadastros não foram alterados para obter nomes.
- A interface de rejeição existente arquiva o material (estado permitido pelo schema). A notificação de resultado acompanha o arquivamento. Não foi inventado estado rejeitado incompatível.

## Migration revisada (aplicada em 28/10/2026)

Preparada como `20261019184002_crm_marketing_delivery_notifications.sql` pelo CLI 2.121.0; registrada como `supabase/migrations/20261028143926_crm_marketing_delivery_notifications.sql`. SQL preservado byte a byte, MD5 conferido no histórico gerenciado. Não reaplicar.

Acrescenta delivery_cycle em materiais, índice parcial de não lidas, diretório/RPC de submissão e contagem, helpers/triggers de eventos. Substitui asset_readable, crm_set_asset_audience e crm_assign_lead; ajusta as policies de destinatários durante revisão e de versões/Storage para que destinatários, inclusive gestores, recebam somente a versão atual aprovada. Não altera auth.users/user_roles, não desativa RLS, não recria tabelas e não reaplica M1–M5.

Precondição transacional verifica hashes das três funções substituídas. Antes de aplicar: conferir também as 16 migrations registradas, policies, grants e triggers, alterações concorrentes da homologação e backup restaurável do provedor. Não usar o antigo preflight de 11 migrations como se o staging ainda estivesse anterior à M1. O usuário executou e informou RESTORE PASS do backup manual no contêiner local isolado; escopo e limites estão registrados abaixo.

Locks: ALTER TABLE/CREATE INDEX/CREATE TRIGGER requerem locks; limites de 5s de lock e 30s de statement abortam o pacote. Conferir volumes e transações ativas imediatamente antes da implantação. Sem atualização em massa, backfill de notificações ou publicação histórica. Tudo está em uma transação.

Retorno: não há down automático que reabra o acesso gerencial antigo. Em falha da transação, rollback do próprio pacote. Depois de aplicada, preservar ciclos/notificações/auditoria e corrigir aditivamente. Frontend depende dos novos RPCs: aplicar banco autorizado antes do novo preview autorizado. Não publicar isoladamente esta interface sobre o banco antigo.

## Testes efetivamente executados

- 242 verificações PostgreSQL/WASM locais aprovadas, zero falhas, com usuários/arquivos inteiramente fictícios. Resultado detalhado: tests/security/crm-operational-local-results.json.
- Inclui os 211 checks anteriores e 31 novos: diretório completo por quatro perfis, privado, equipe pendente/aprovada, selecionados admin/gestor, negativa de usuários não selecionados e desativados, Storage RLS, revogação, aprovações, notificações de material/imóvel/distribuição/transferência, repetição idempotente, leitura individual e contagem, acesso anônimo negado e proteção do ciclo.
- 19 testes de código aprovados. Lint e TypeScript aprovados. Build otimizado com ambiente público de staging validado pelo guard aprovado.
- Revisão React aplicada: efeitos cancelam resultados atrasados, diretório e audiência são buscados em paralelo, modal usa dados atuais e polling não depende do Realtime.
- As simulações reproduziram a limitação de diretório/validação anterior através das definições reais inspecionadas; não reproduzem a interação original de cada sessão do preview.

**Bloqueados:** login real, renovação/logout/troca multiaba, upload/download de bytes pelos serviços HTTP de Storage, eventos em navegador, cabeçalho após reload e layout mobile. Os testes SQL de Storage usam objetos fictícios e RLS local; não são upload de JPG/PDF/MP4 reais. Nenhum teste com JWT dos quatro usuários foi alegado. A sessão Vercel/CRM autorizada continua indisponível para o agente; não envie senhas ou tokens no chat.

## Roteiro de homologação com os quatro usuários

Após autorização específica da migration e, separadamente, do novo preview:

1. Abrir quatro perfis de navegador independentes e entrar como admin, gestor, A e B no novo deployment. Conferir commit/URL e Supabase staging.
2. Cada perfil importa JPG, PDF e MP4 fictícios em “Somente eu”. Outros três não podem listar, visualizar, baixar ou acessar a versão por API/Storage. Dono mantém acesso.
3. Cada proprietário muda para “Toda a equipe”. Confirmar mensagem de pendente; só dono e gestão revisora acessam antes de aprovação. Gestão recebe uma notificação persistente, inclusive após atualizar página.
4. Aprovar sem autorizar apresentação pública. Todos os quatro passam a acessar internamente; anônimo continua bloqueado. Salvar sem mudança/repetir requisição não duplica eventos.
5. Proprietário muda para selecionados, incluindo administrador e gestor em rodadas distintas; depois A ou B. Confirmar seleção atual ao reabrir. Não selecionados devem perder acesso, inclusive gestão não selecionada após aprovação. Gestão tem acesso temporário ao material pendente para revisá-lo.
6. Trocar destinatários, enviar nova versão, revogar para “Somente eu” e testar expiração. Revalidar arquivo atual e versão antiga por API/Storage. Não reutilizar credencial administrativa para testar RLS.
7. Submeter imóvel fictício novo; verificar notificação de admin/gestor, recarregar, abrir imóvel exato, marcar lida e comparar contagem. Aprovar/devolver e conferir resultado para autor/responsável. Edição sem nova submissão não duplica.
8. Distribuir lead institucional fictício. Apenas destinatário recebe link ao próprio lead. Solicitar transferência pessoal A→B; B recebe solicitação, aceita, ambos recebem resultado genérico. Repetição não duplica; A não acessa mais o lead. Repetir B→A com fixture independente.
9. Solicitar aprovação de material antigo pendente com o botão explícito. Repetir: um evento por destinatário/ciclo. Aprovar, conferir notificação de compartilhamento só para audiência elegível e não para usuários desativados.
10. Testar atualização a cada 30s e ao voltar à aba, inclusive com Realtime indisponível. O cabeçalho usa a contagem de não lidas do servidor e a lista mostra as 100 mais recentes; indisponibilidade deve mostrar erro, sem total falso zero.
11. Trocar usuário e sair/entrar na mesma janela. Nunca devem reaparecer notificações/materiais da conta anterior. Conferir em 390px/768px. Registrar papel, operação, horário, fixture e erro sem tokens/cabeçalhos.

## Próximo passo seguro

Revisar este pacote e autorizar especificamente apenas a nova migration no staging, condicionada à conferência de drift e backup adequado. Depois da verificação do banco, obter autorização separada do preview desta branch, com variáveis restritas a staging. O deployment automático da branch está desativado e seu build bloqueia produção/outro projeto/chave administrativa. Não houve merge nem alteração de produção. Prontidão: correção preparada e testes locais aprovados; homologação operacional ainda pendente.

## Histórico de 28/10/2026: bloqueio anterior à confirmação específica

O usuário informou RESTORE PASS do backup SHA-256 A40307EE86FF4D128168DBAA6C47EC431C57721440651AFBD352AB403C6A72E8, 764683 bytes, criado em 2026-10-28T13:01:25.5280876Z. Restauração local no banco privilege_restore_0584dc840775, no contêiner sem rede/portas. Foi necessário criar somente no contêiner o papel interno supabase_realtime_admin com os atributos NOLOGIN/NOSUPERUSER registrados no roles.sql. Nenhum papel/usuário foi criado ou alterado no staging. O agente não recebeu o dump nem o relatório privado: a evidência da execução é a saída enviada pelo usuário. Não confundir este ensaio de banco com validação de Auth HTTP, bytes Storage, chaves Vault ou configurações externas.

Preflight remoto renovado contra o commit a052928693195705dc0b4758c274cc15ff2bfc6d do PR #7: zero drift nas três funções e três policies substituídas; 16 migrations anteriores, novo RPC/coluna ausentes; zero locks aguardando e zero transações com mais de um minuto no instante da leitura. Regressão local reexecutada: 242 aprovadas, zero falhas. SQL candidato preservado, SHA-256 2792d6e169a6aa617e4bf4d968e5ac72f815afc88d2f73ade34d22bdc5cbc563.

A tentativa de aplicar crm_marketing_delivery_notifications foi rejeitada pela revisão automática antes da execução. Motivo informado: não reconheceu autorização explícita e inequívoca para exatamente esta migration. Não foi tentado outro caminho. É necessária confirmação explícita do nome do arquivo/projeto antes de nova tentativa; o preflight será reconferido.

Leitura após a rejeição: histórico permanece com 16 migrations, novo RPC e coluna continuam ausentes, contagens e fingerprints das 43 tabelas públicas inalterados; fingerprint das identidades/papéis e quatro usuários Auth preservado. Nenhuma migration, publicação de preview ou alteração de produção foi realizada. Evidência sanitizada: tests/security/crm-marketing-preflight-20261028.json. PR #7 continua em rascunho. O SQL preparado não deve ser marcado como aplicado nem renomeado para uma versão gerenciada inexistente.


## Estado final em 28/10/2026: migration aplicada

Após o bloqueio, o usuário confirmou especificamente a aplicação do arquivo revisado, incluindo schema/funções/policies/triggers, somente no staging. O preflight foi reconferido: zero drift, 16 versões, sem objetos novos ou locks/transações longas. A chamada gerenciada seguinte retornou success.

- Versão real: **20261028143926_crm_marketing_delivery_notifications**. Histórico agora tem **17 migrations**, com um único registro deste pacote. M1–M5 não foram repetidas.
- Arquivo renomeado para o timestamp emitido pelo Supabase. MD5 local/gerenciado **aef87907d0a1e92fd52bc3adf945324f**; SHA-256 do SQL **2792d6e169a6aa617e4bf4d968e5ac72f815afc88d2f73ade34d22bdc5cbc563**, sem alteração dos bytes. O comentário PROPOSED ONLY preserva a origem da revisão, não o estado atual.
- Contagens e fingerprints dos registros das **43 tabelas públicas** permaneceram iguais, excluindo só a coluna delivery_cycle adicionada com default previsto. Identidades, papéis, vínculos e quatro usuários Auth preservados. Nenhum material pessoal foi publicado e nenhuma notificação histórica foi inventada.
- Coluna e quatro triggers instalados. Três novos RPCs públicos sem EXECUTE para anon, com grant autenticado e search_path fixo. Nenhuma tabela pública sem RLS.
- Leitura por SET ROLE e claims simuladas no staging real: admin resolveu admin, gestor resolveu manager, A/B resolveram broker. Todos receberam diretório com quatro membros: 1 admin, 1 manager e 2 brokers. Contagem não lida retornou zero para os quatro. Não são sessões JWT nem homologação de interface.
- Regressão local após renomear o arquivo: **242/242 aprovadas**; runner atualizado para incluir esta versão gerenciada posterior às cinco de 19/10. O SQL não foi executado novamente no staging para testar.
- Advisors: 1 informação de RLS sem policy no registro interno property_code_registry, 16 avisos de funções SECURITY DEFINER anônimas e 34 autenticadas; proteção contra senhas vazadas continua desabilitada. Os dois RPCs SECURITY DEFINER públicos novos são intencionais, com guardas e sem acesso anônimo; a contagem usa SECURITY INVOKER. Revisão individual dos avisos legados permanece pendente. Nenhuma configuração Auth foi alterada. Remediações estão na evidência JSON.

Evidência: tests/security/crm-marketing-staging-application-20261028.json. O arquivo de preflight/bloqueio anterior é histórico, não o estado atual. O backup privado permaneceu no Windows e seu ensaio local não valida bytes Storage/configurações externas/HTTP Auth.

**Próximo passo atual:** executar o roteiro dos quatro usuários no preview atualizado do PR #7, já autorizado/publicado conforme a seção seguinte. Não declarar uso interno homologado antes dos testes reais. Produção/main permanecem inalteradas e o PR continua em rascunho.

## Preview autorizado e publicado em 28/10/2026

- URL imutável: https://privilege-site-gyuklg1hy-viniciussantiagomkts-projects.vercel.app/login
- Deployment dpl_73cWfhtj6FMj9CHCG1zfxmk8z4V4, **READY**, ambiente preview (target nulo na API).
- Commit publicado **ae5ab0c1d5a9f647e05201eda52200ec3204b74d**. Logs do build confirmam a branch work/crm-marketing-notifications-20261019 e ae5ab0c; build remoto 40s. CI GitHub 40708696155 concluiu com success para esse SHA. Commits posteriores exclusivamente documentais não alteram o conteúdo deste deployment.
- Nove variáveis configuradas exclusivamente para preview desta branch. URL e chave pública de staging validadas; hash da chave: 1d6911a13f337d0eec833199e2ed4b45ad44f2262e0b9a1e5b25c7c33ae131d5. Analytics e webhook externo desativados; nenhuma variável de produção foi alterada. Sem credencial administrativa de Supabase no preview.
- Guard de build de staging aprovado: impede produção, outro projeto/chave e service-role. A migration 20261028143926 já está aplicada; nenhuma migration foi executada nesta publicação.
- Abertura normal do /login em navegador retornou **Log in to Vercel**. Proteção preservada, sem sessão disponível neste navegador. Nenhum link temporário de bypass foi criado. Isso é um bloqueio de autenticação Vercel, não evidência de falha do CRM.
- Testes reais de CRM/Storage/mobile com quatro usuários continuam BLOQUEADOS sem sessões; o deployment READY não homologa esses fluxos. O usuário deve abrir a URL com sua conta Vercel autorizada ao projeto e depois entrar no CRM em sessões separadas.
- Evidência sanitizada: tests/security/crm-marketing-preview-20261028.json. O PR #7 permanece em rascunho; produção/main e preview do PR #6 preservados.

Próxima etapa: executar o roteiro dos quatro perfis descrito acima. Priorizar upload privado, equipe e selecionados (incluindo admin/gestor), aprovação, revogação/versões/Storage e notificações persistentes após reload/troca de usuário. Autorizar nova publicação não substitui essas verificações.

## Continuidade no Windows: motivos opcionais, 28/10/2026

Esta seção atualiza o estado operacional; as seções anteriores são evidência histórica.

- HEAD remoto conferido: `743b5356f6127d81e297758d655eacdce03f0609`. Worktree separado; checkpoint e trabalho anterior preservados.
- O usuário confirmou manualmente os cenários orientados de material privado, selecionados, equipe/revogação, controles visuais, disponibilidade/apresentação com salvamento explícito, notificações de imóveis, distribuição institucional e transferência com aceite, isolamento/persistência/leitura/contagem sem duplicação. São **confirmações do usuário**, não testes executados pelo agente; não encerram a homologação completa.
- Backup atual conferido pelo agente: criado `2026-10-28T17:49:30.3238971Z`, 783325 bytes, SHA-256 `ACB3D4B0C0033D8BB4D88134BA3BE3B5E99E28E01EE741D64581D58C5D23A6A5`. Listagem/decodificação não foram usadas como prova de restauração.
- Docker estava parado e foi iniciado. **RESTORE PASS executado pelo agente**, usando o script versionado com parâmetros explícitos, no novo banco local `privilege_restore_1f7178826be2`, contêiner `privilege-crm-restore-20261028`, rede none, sem portas e imagem fixada. Restauração transacional sem erro; contagens e verificações do manifesto aprovadas. Nenhum papel novo necessário. Dump, manifesto e logs privados preservados, sem upload.
- Preflight renovado imediatamente: lista exata de 17 migrations, candidata ausente, fingerprints `0f587cadfdba9ddeb12f9e07cc216b91` / `0edfb30fb7f2d0e54542dc028031f0c8`, constraint anterior 1–500, EXECUTE anônimo negado, zero locks aguardando e transações longas. Nenhuma precondição removida.
- Aplicação única, gerenciada e já autorizada: **20261028180043_crm_optional_lead_reasons** somente no staging. SQL MD5 `f49239be81391911ea31ff0b142935ba`, idêntico ao blob aprovado. O arquivo proposto `20261028173753_crm_optional_lead_reasons.sql` foi apenas renomeado para a versão real, sem reaplicação. O comentário PROPOSED ONLY preserva os bytes históricos, não indica o estado atual.
- Pós-verificação: 18 migrations, defaults opcionais, constraint 0–500, ACL/owner/SECURITY DEFINER/search_path preservados e anon negado. Contagens e fingerprints de **47 relações** iguais antes/depois: 43 tabelas públicas, Auth users/identities e Storage objects/buckets. Nenhuma alteração em contas, papéis, registros comerciais ou notificações históricas. Todas as tabelas públicas seguem com RLS.
- Testes: 253 verificações PGlite e 23 de código passaram. O runner agora normaliza SQL para LF antes do replay e do hash: CRLF do checkout Windows alterava o texto das funções e causava falso drift. Não foi alterado o SQL autorizado nem afrouxado o preflight.
- Regressão adicional no **PostgreSQL 17 restaurado**: vazio/espaços/NULL/omitido/preenchido/500 caracteres, aceite e repetição idempotente, negativas de autorização, destinatário inválido, 501 caracteres, isolamento, auditoria, notificações e expiração aprovados; fixtures locais revertidas. Claims SQL não são sessão Auth HTTP. Nenhuma fixture inserida no staging. No staging real, teste anônimo read-only confirmou rejeição dos dois RPCs com motivo omitido.
- A inspeção de uma janela existente de CRM foi interrompida pelo guard de Computer Use por impossibilidade de validar a URL no Windows. Não foi contornado nem substituído por extração de tokens. Nenhuma homologação autenticada de navegador é alegada.
- O primeiro build compilou, mas terminou bloqueado por vulnerabilidade conhecida no Next 16.4.0. Correção local de patch para Next/eslint-config-next **16.4.3** e atualização transitiva compatível para Zod **4.6.7**, sem force ou mudança de arquitetura. Validações finais são registradas na evidência da execução; atualização não publicada em preview/produção.
- Scripts de backup alinhados ao histórico exato de 18 versões. Defaults do ensaio local apontam para a cópia realmente restaurada; continuam aceitando parâmetros explícitos e recusando divergências. O backup pré-migration foi preservado; não é apresentado como backup pós-migration.
- Validação final com Next 16.4.3: **build, ESLint e TypeScript aprovados**, 253 verificações PGlite e 23 testes de código aprovados; `npm audit` completo e de runtime sem vulnerabilidades reportadas. Não foi repetido o bloqueio da UI por outro caminho.

Evidência sanitizada: `tests/security/crm-optional-reasons-staging-application-20261028.json`. PR #7 permanece em rascunho. Próximo passo: solicitar autorização separada para publicar o commit reconciliado em novo preview; nenhum deploy autorizado ou executado nesta continuidade. Depois, ampliar evidência de API/Storage/expiração e fallback de Realtime com sessões autorizadas, sem tratar toda a homologação como concluída.
