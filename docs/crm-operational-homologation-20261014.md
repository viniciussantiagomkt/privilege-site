# Privilege CRM: homologação operacional de 14/10/2026

Resultado: verificações técnicas concluídas parcialmente; uso comercial diário ainda não homologado. O usuário informou login bem-sucedido dos quatro perfis. Isso não comprova autorização nem execução das jornadas.

## Versão e ambiente

Branch: `work/crm-integration-security-20261013`, PR #3 aberto e em rascunho, base `codex/crm-integration-20261013`. Head inicial conferido no GitHub: `59ba35c01b7c85c386caffe9a27469eb3fdd25b2`.

Preview: https://privilege-site-k41rf9x4p-viniciussantiagomkts-projects.vercel.app/login
Deployment `dpl_3ixkz3oSGiYMac8EyXEECaqi9kkQ`, READY, target staging, código `72b54202f011052f84ea770e31b01e1ab00f22c6`. O head inicial acrescenta somente documentação a esse código. Esta rodada altera testes e documentação, sem alterar o código publicado; por isso o preview existente permanece correspondente ao runtime, não ao SHA dos novos testes.

Staging exclusivo: `sdpqphiooiuglywcmkxv`. Nenhum merge, deploy de produção, migration, mudança de senha, criação de usuário ou desativação de conta nesta rodada.

## Contas e acesso

As quatro contas foram consultadas em Auth e user_roles: todas confirmadas, ativas, com roles admin, manager, broker e broker. Administrador e gestor têm novos IDs após recriação:

- Admin: `84c5604b-d728-4759-8572-ea4a832af9ce`.
- Gestor: `0d92c58c-d6f0-4465-95e1-303e7d9f9a69`.
- A: `73a767b8-218d-4910-a370-2b93cf32bf74`.
- B: `779c7220-06dd-4180-8b52-05136bee21cb`.

O navegador disponibilizado ao executor tinha somente about:blank, sem sessão do CRM. Os logins no computador do usuário não são automaticamente transferidos. Não foram pedidas senhas, copiados tokens ou geradas sessões administrativas.

## Testes executados agora

| Camada | Resultado | Limite |
|---|---|---|
| SQL/RLS comercial | 81/81 | Claims simuladas, transação com rollback; sem login HTTP |
| SQL/RLS Marketing/Storage | 52/52 | Metadados de arquivos e objetos SQL sintéticos; não upload de bytes aprovado |
| Unitários | 17/17 | Inclui bloqueio de admin desativado no endpoint com dependências controladas e streaming/Range |
| API comercial anônima | 15/15 | Sem dados privados ou RPC privilegiado acessível |
| API Marketing anônima | 18/18 | Inclui login inválido sintético; não inclui login bem-sucedido |
| Guardas de ambiente | 15/15 | Três branches; produção, projeto/chave incorretos e service-role recusados |
| Upload anônimo real | 3/3 negados | PNG, PDF e MP4 válidos gerados localmente; não gravação autorizada |
| HTTP local | 9/9 | Rotas públicas, apresentação ausente e payloads inválidos |
| Preview via integração Vercel | 2/2 | Login 200 e mídia de token inexistente 404; sem sessão Supabase |
| Lint e TypeScript | Aprovados | Código local |
| Build staging | Aprovado | Primeira tentativa falhou por --env-file herdado em NODE_OPTIONS; execução limpa passou |

212 asserções aprovadas nas suítes acima. Não somar as 229 históricas nem contar repetição da suíte como novos cenários. Acesso HTTP direto ao preview teve dois timeouts e um 401 antes de validar a aplicação. Pela integração Vercel autenticada, /login respondeu 200 e mídia inexistente respondeu 404. Proteção do deployment não foi desativada; esse bloqueio de transporte não foi classificado como falha do CRM. O POST remoto de consentimento não foi validado após a proteção; consentimento foi testado na API Supabase e em SQL.

Evidências novas: `tests/security/operational-commercial-20261014.json`, `operational-marketing-20261014.json`, além dos JSON das suítes API/HTTP/upload/guardas. A tentativa direta bloqueada está em operational-preview-20261014.json; a verificação válida via integração está em operational-vercel-authenticated-20261014.json. Nenhum segredo de acesso foi salvo.

Após rollback: zero resíduos dos imóveis, leads, materiais e objetos sintéticos consultados; continuam 11 migrations. Consulta de encerramento mostrou zero imóveis, leads, clientes, materiais, compartilhamentos e objetos no staging. Nenhuma tabela pública sem RLS foi encontrada. Sequências PostgreSQL podem avançar apesar de rollback.

## Funcionalidades aprovadas no escopo SQL

- A/B só leem leads e clientes autorizados; não alteram registros do colega nem se promovem a administrador.
- Gestor atribui/reassocia lead; A perde acesso e B recebe acesso; registros de atribuição e auditoria existem.
- Cadastro de rascunho, código de imóvel, mídia atômica, tarefa, visita, proposta e negociação testados com dados fictícios transacionais.
- Corretor não autoaprova imóvel/material; publicação exige aprovação e vínculo permitido.
- Favoritos, coleções, versões, retirada de material expirado/pendente e restrições de Storage validados no banco.
- Geração registrada no lead; confirmação de envio e follow-up idempotentes; consentimento obrigatório e nonce deduplicado.
- Revogação bloqueia payload e abertura; ocultar imóvel bloqueia apresentação e acesso público ao material.

Não foram aprovados como jornada UI/API autenticada: Kanban persistido pelo navegador, dashboards reconciliados com registros persistentes, upload/download aprovado, seek real no deployment, confirmação de envio pelo botão, refresh/logout e bloqueio de conta com sessão real. Expiração do link completo no tempo também segue pendente; expiração de material passou em SQL.

## Correções realizadas

Os testes ainda apontavam para os IDs excluídos do administrador/gestor. Atualizadas as referências para as contas reais atuais. Adicionadas pré-condições que conferem existência no Auth e role ativa antes de simular claims, evitando testar permissões de identidades inexistentes.

Nenhuma falha de runtime foi comprovada nas verificações concluídas; não houve alteração especulativa na aplicação. Não foi necessário republicar o preview, pois o runtime permanece idêntico.

## Pendências funcionais e operacionais

- Rejeição formal com motivo não existe: o esquema aceita pendente/aprovado/arquivado. Arquivamento não equivale a rejeição formal.
- Alterações de descrição/validade não exigem reaprovação atualmente. Nova versão exige.
- Workspace ainda acumula registros visíveis; implementar paginação/filtros no servidor e agregações de dashboard exige desenho e verificação de consistência/RLS.
- Cadastro de novos corretores pelo endpoint administrativo depende de service-role, ausente intencionalmente no preview. Isso não foi alterado nem homologado.
- Recuperação de senha apresentou email rate limit exceeded durante suporte anterior. Recriar usuários não corrige limite do provedor; SMTP e redirects precisam homologação separada. Não alteradas configurações de Auth.
- Falha de conexão, Realtime indisponível e erro da interface Supabase não constituem automaticamente erro do CRM. Nenhum desses incidentes antigos foi reproduzido nesta rodada.

## Próxima ação do usuário

Executar o roteiro `docs/crm-operational-manual-20261014.md` nas sessões já abertas, ou disponibilizar uma sessão de navegador acessível ao executor. Não enviar senha, JWT, service-role, links com tokens ou exportação de sessão no chat.

Conclusão: liberado para continuar QA em staging. Ainda não liberar operação comercial diária até concluir os fluxos autenticados e resolver ou aceitar explicitamente as lacunas funcionais.

