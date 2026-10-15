# Reconciliação e homologação autenticada: 15/10/2026

Conclusão: reconciliação aprovada; homologação autenticada BLOQUEADA por ausência de sessões acessíveis ao executor. Não liberar uso comercial diário com base apenas no login informado ou nos testes SQL.

## Origem e preview

Base inspecionada no GitHub e local: `work/crm-integration-security-20261013`, `6ccddf5a0bd84d376ccb8f5c4f9c1c4a7ee78cda`, PR #3 aberto em rascunho. Correção isolada em `work/crm-auth-qa-20261015`, derivada desse commit. Testes, documentação e guardas de ambiente da nova branch alterados; nenhuma mudança de interface ou regra comercial.

Preview READY: https://privilege-site-k41rf9x4p-viniciussantiagomkts-projects.vercel.app/login
Deployment `dpl_3ixkz3oSGiYMac8EyXEECaqi9kkQ`, código `72b54202f011052f84ea770e31b01e1ab00f22c6`. Não há diferenças de aplicação entre esse código e `6ccddf5`. Nenhum novo runtime foi publicado nesta rodada. A nova branch recebeu bloqueio de deploy automático em vercel.json e a mesma guarda de staging em next.config.ts, sem afetar as branches existentes.

Confirmado diretamente no bundle publicado `/_next/static/immutable/chunks/3uhkxrrfxgr8f.js`: URL do Supabase `https://sdpqphiooiuglywcmkxv.supabase.co`. Dez scripts do login foram consultados com status 200; somente esse projeto Supabase foi encontrado. Chaves não foram exibidas nem salvas no relatório. Acesso pela integração Vercel não fornece sessão de usuário Supabase.

## Contas atuais

| Perfil | ID atual | Role | Confirmado/ativo | Cadastro de corretor |
|---|---|---|---|---|
| Administrador | 84c5604b-d728-4759-8572-ea4a832af9ce | admin | Sim / sim | Ausente |
| Gestor | 0d92c58c-d6f0-4465-95e1-303e7d9f9a69 | manager | Sim / sim | Ausente |
| Corretor A Teste | 73a767b8-218d-4910-a370-2b93cf32bf74 | broker | Sim / sim | Mesmo ID, ativo |
| Corretor B Teste | 779c7220-06dd-4180-8b52-05136bee21cb | broker | Sim / sim | Mesmo ID, ativo |

Admin e gestor foram recriados em 14/10/2026 às 15:04 e 15:03, horário de São Paulo. Seus IDs históricos `7753e8d3-725c-44d7-9a55-402272fd95a4` e `f30a18b4-0190-42ed-8657-f9e0dfa5d10b` não existem mais em Auth nem user_roles. Ausência de brokers para contas de gestão não é falha de login; essas contas não foram cadastradas como corretores e não adicionamos esse vínculo.

Todos têm email_confirmed_at preenchido, disabled_at nulo e banned_until nulo. Os dois corretores mantêm as contas criadas em 08/10 e brokers ativos.

Varredura textual das 40 tabelas públicas, incluindo UUIDs e JSON, encontrou referências antigas somente em duas linhas de audit_logs, entity=user_roles, action=INSERT e actor_id nulo. São registros históricos das permissões anteriores, não vínculos de acesso atuais. Preservados. Nenhuma referência antiga em Storage. Não foi auditado conteúdo binário de arquivos, serviços externos ou schemas internos completos do Auth.

## Matriz por perfil

APROVADO nas colunas SQL significa política executada em PostgreSQL com SET LOCAL ROLE e claims simuladas, não JWT obtido por login.

| Cenário | Admin | Gestor | A | B | Evidência |
|---|---|---|---|---|---|
| Existência Auth, role ativa e confirmação | APROVADO | APROVADO | APROVADO | APROVADO | SELECT Auth/user_roles/brokers |
| Políticas SQL pertinentes a cada perfil | APROVADO | APROVADO | APROVADO | APROVADO | Suítes 89 comercial + 52 Marketing |
| Login observado pelo executor | BLOQUEADO | BLOQUEADO | BLOQUEADO | BLOQUEADO | Navegador disponível sem abas/sessões |
| Navegação, restrições e CRUD em sessão real | BLOQUEADO | BLOQUEADO | BLOQUEADO | BLOQUEADO | Sem sessão |
| API direta com JWT real de cada usuário | BLOQUEADO | BLOQUEADO | BLOQUEADO | BLOQUEADO | Sem sessão |
| Refresh e logout reais | BLOQUEADO | BLOQUEADO | BLOQUEADO | BLOQUEADO | Sem sessão |
| Jornada comercial persistida e dashboard | BLOQUEADO | BLOQUEADO | BLOQUEADO | BLOQUEADO | Sem sessão |
| Upload aprovado, mídia e compartilhamento na UI | BLOQUEADO | BLOQUEADO | BLOQUEADO | BLOQUEADO | Sem sessão |

O usuário informou sucesso dos quatro logins. Não foi convertido em aprovação do executor. O teste real de desativação de usuário descartável também está BLOQUEADO: não há fixture e sessão autorizada disponíveis. Nenhuma conta existente foi desativada.

## Erro comprovado e correção

A suíte comercial original teve 74/81 aprovações e sete reprovações de contagem de Storage. Ela supunha bucket vazio e contava todos os objetos. O staging agora possui 20 arquivos existentes, tornando essas contagens inválidas para a fixture.

Corrigidas as sete consultas para filtrar o caminho exato do arquivo fictício. Não removemos arquivos, mudamos políticas ou relaxamos o resultado esperado. Acrescentadas oito negativas para leitura de cliente e alteração/exclusão cruzada de leads/clientes entre A e B. Resultado final: 89/89.

Isso é uma correção do teste, não uma falha de autorização comprovada da aplicação. A execução original reprovada foi preservada na evidência para comparação. Nenhuma falha nova de runtime foi comprovada nesta rodada. A guarda da branch de QA também passou a recusar ambiente de produção, projeto/chave diferentes e chave administrativa; deployment automático foi desabilitado para essa branch.

## Testes efetivamente executados

- Comercial/RLS corrigido: 89/89, incluindo as oito novas negativas de acesso entre corretores.
- Marketing/RLS: 52/52, incluindo aprovação, versões, relações, consentimento, confirmação de compartilhamento e revogação.
- Unitários: 17/17. Bloqueio de admin desativado e streaming são testados com dependências controladas, não com uma sessão real.
- Guardas de quatro branches: 20/20, incluindo a nova branch de QA.
- Total final: 178 asserções aprovadas. Não somar com as 212 históricas da rodada anterior.
- Varredura de referências antigas, reconciliação Auth/roles/brokers, estado de PR/deployment e configuração pública do cliente.
- SQL com BEGIN/ROLLBACK e fixtures fictícias; nenhuma fixture persistida consultada ao final. Sequências podem avançar apesar de rollback.
- 20 objetos de Storage antes e depois; 11 migrations antes e depois. Nenhum upload autorizado novo foi executado.
- Lint, TypeScript e build staging foram reexecutados e aprovados após a extensão das guardas da nova branch. Build com VERCEL_GIT_COMMIT_REF=work/crm-auth-qa-20261015 e VERCEL_ENV=preview. Nenhuma interface ou regra comercial foi alterada.

Evidência estruturada: `tests/security/auth-reconciliation-20261015.json`. Script corrigido: `tests/crm-staging-rls.sql`.

## Roteiro manual preciso e desbloqueio

Usar `docs/crm-operational-manual-20261014.md`, com os ajustes abaixo para esta rodada. O documento contém rotas, registros fictícios, expectativas, APIs e critérios de persistência para a jornada de 12 passos.

1. Abrir quatro perfis distintos de navegador, um por conta atual da tabela; manter outra janela sem sessão para o link público. Não compartilhar senhas ou tokens.
2. Usar prefixo HOMO-20261015; para tarefa e visita usar 16/10/2026 às 10h. Não reutilizar a data passada do roteiro original.
3. Executar o imóvel, responsável, cliente, lead, funil, tarefa, visita e proposta nos passos 1 a 12 do roteiro. Registrar IDs e confirmar persistência após atualizar a página.
4. Enviar foto, MP4 e PDF fictícios; gestão aprova; gerar apresentação vinculada ao lead; abrir sem autenticação e conferir mídias/privacidade; confirmar envio somente no CRM, sem enviar mensagens externas; revogar e testar expiração real.
5. Em Network, mantendo o token do próprio perfil, GET de ID privado do colega deve devolver zero linhas/negação. PATCH e DELETE dos registros fictícios do colega devem negar ou alterar zero linhas. Conferir pelo dono que nada mudou. Status 200/204 sozinho não prova alteração ou acesso.
6. Repetir simetricamente A contra B e B contra A para lead e cliente; testar mídia privada e ações administrativas. Não exportar HAR com credenciais.
7. Registrar refresh real sem copiar a resposta; efetuar logout e testar proteção da página. Access token antigo pode sobreviver até expirar; refresh encerrado não deve renovar sessão.
8. Desativação: usar somente uma quinta conta descartável, separada dos quatro perfis. Registrar disabled_at/role/estado anteriores, desativar pelo mecanismo administrativo autorizado, testar chamadas com sessão anterior e reativar/restaurar os valores em seguida. Se não houver fixture ou mecanismo autorizado, marcar BLOQUEADO. Não basta mudar brokers.active: a autorização consulta user_roles.disabled_at. Não executar SQL de exemplo com IDs das quatro contas.
9. Para cada linha, devolver perfil, ação, ID fictício, esperado, observado e APROVADO/REPROVADO/BLOQUEADO, sem link/token de sessão. Se surgir erro, registrar texto e horário para correlacionar logs.

Não é possível concluir os passos dependentes por meio da conexão SQL administrativa sem fabricar uma sessão. Para o executor realizá-los, precisa de uma sessão autorizada acessível no navegador da tarefa; logins feitos em outro computador não são transferidos. Não pedir senha no chat nem gerar sessão administrativa como substituta.

## Pendências e prontidão

Sem sessão, continuam pendentes os fluxos reais e a expiração completa do link no navegador. Rejeição formal com motivo continua ausente; arquivamento não equivale a rejeição formal. Paginação/agregações e integrações externas continuam fora desta validação.

Recomendação: manter staging para QA. Não declarar pronto para uso comercial diário até a matriz autenticada e a jornada de mídia/apresentação passarem. Produção, main, contas e permissões não foram alteradas; nenhuma migration executada.

