# Preview e worker bloqueado de anúncios

30/10/2026. Publicações expressamente autorizadas pelo usuário: novo preview e instalação da função no staging, sem credenciais de anúncios ou agendamento.

## Preview

- URL: https://privilege-site-737s0gxjw-viniciussantiagomkts-projects.vercel.app/login
- Deployment: dpl_6TJqxPeiQ1C9VVN9zvqpbrmVky3q.
- Status: READY. Target Preview (null), sem promoção ou domínio de produção.
- Commit publicado: 8f2cbd9f9a5a26b110b4e92079455de4ae0af97f, CI aprovado na execução 41112891612.
- Branch: work/crm-campaign-ads-sync-20261029; PR #9 permanece em rascunho.
- Dez variáveis específicas desta branch conferidas após criação: URL/chaves públicas staging; analytics, maps e lead webhook vazios. Nenhuma credencial administrativa ou de anúncios aplicável ao preview. Guard do build aprovado. Variáveis de produção e outras branches preservadas.
- GET /login via acesso oficial do conector Vercel: HTTP 200, formulário presente, x-robots-tag noindex. Scripts de analytics externos no HTML: não detectados.
- GET /admin/campanhas: HTTP 200, shell da aplicação. Não comprova login, hidratação, autorização ou interface desktop/mobile autenticada.

## Função instalada, sincronização bloqueada

Staging sdpqphiooiuglywcmkxv: crm-ads-sync ACTIVE v1 (instalada), id 8f0365cd-d235-41a0-937b-87947fe19dd7, verify_jwt=false. O handler faz autenticação própria de máquina com segredo dedicado de pelo menos 32 caracteres antes de ler payload ou acessar banco/provedores. Nenhum segredo de cron ou anúncio foi criado/configurado nesta rodada. A função de apresentação preexistente permanece ACTIVE v1, sem republicação.

Testes HTTP reais contra a função:

| Caso | Resposta | Resultado |
| --- | --- | --- |
| POST sem Authorization | 401, unauthorized | PASS |
| POST com credencial fictícia inválida | 401, unauthorized | PASS |
| GET | 405, method_not_allowed | PASS |

Antes/depois: contas=0, campanhas=0, métricas diárias=0, leases=0. Catálogo cron.job continua ausente. Nenhuma conta provisionada, metadado de anúncios importado ou agendamento criado. Estado ACTIVE da Edge significa função instalada; **não significa sincronização habilitada**.

## Limites e próximo passo

Nenhuma migration repetida, conexão Meta/Google, nova credencial de anúncios, consentimento externo, alteração de conta/permissão comercial, merge ou mudança de produção/main. Publicação automática continua desativada; este preview corresponde ao commit acima, e o commit deste relatório só acrescenta evidência.

O painel deve ser homologado com sessões legítimas de quatro perfis e desktop/mobile. Sem contas provisionadas, o estado esperado é nenhuma conta conectada. Não solicitar senha/token pelo chat. Provisão administrativa segura de contas autorizadas, credenciais e consentimento de leitura, primeira consulta real e cron são próximas etapas, ainda não autorizadas nesta publicação. OAuth self-service por corretor permanece pendente. Seguir docs/crm-ads-sync-staging-handoff-20261030.md sem reaplicar SQL.
