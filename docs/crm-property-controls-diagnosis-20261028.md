# Imóveis: controles e submissão para revisão

## Falhas reportadas

Usuário não recebeu notificações para gestor/admin e não conseguiu alterar disponibilidade nem habilitação da apresentação. Essa rodada não está homologada.

## Evidências de leitura no staging

Projeto sdpqphiooiuglywcmkxv. Quatro imóveis: três aprovados e um publicado, todos review_cycle=0. Dois revisores elegíveis. Dez notificações de materiais, nenhuma de imóvel. Triggers de ciclo/submissão/resultado presentes. O trigger de submissão notifica somente ao entrar em pendente; não faz backfill. Esses dados não comprovam falha de entrega de uma submissão autenticada específica.

Defaults legados: workflow_status=publicado, publish_on_site=true, presentation_enabled=true. PropertyForm omitia esses campos ao inserir. Gestão podia criar já publicado e aprovado pelo trigger, sem ciclo pendente. Corretor é forçado a rascunho pelo trigger, exigindo envio explícito. Não foi identificado o perfil usado pelo usuário nesta tentativa.

## Correções propostas no código

- Capturar valor dos seletores antes de ctx.run: a checagem assíncrona de identidade permite que React restaure o campo controlado antes da execução do callback. O teste dos handlers reais simula esse atraso e restauração.
- Novos cadastros explicitamente rascunho, sem publicação/apresentação, inclusive no fallback de colunas legadas. Edições não recebem esses defaults e preservam estado atual.
- Mensagem explica salvar versus enviar para aprovação; confirmação após update de submissão.
- Aviso visível no modal de imóvel, inclusive sucesso. O modal já apresenta avisos de erro através de UI.Modal.

## Validação e limites

22 testes de código passaram, incluindo três regressões dos handlers com sessão atrasada; TypeScript e ESLint dos arquivos alterados passaram. Sem navegador/sessões reais; criação e entrega de notificação ainda exigem repetição no preview atualizado. Nenhuma escrita no staging, alteração de conta, schema ou produção. Não há migration proposta nesta correção. Os defaults antigos permanecem no banco; o ajuste cobre o formulário, não outros clientes.

Próximo passo: autorizar novo preview do commit com esta correção, criar fixture como A, confirmar rascunho e clicar Enviar para aprovação, conferir pendente e notificação persistida para gestão. Repetir cadastro como gestão, verificar controles com reload, habilitar apresentação somente com aprovação/publicação para acesso público. Imóveis antigos não são alterados nem geram notificações retroativas.

## Reteste do usuário: falha persiste

Após publicar c58c527, usuário informou que ambos os seletores continuam sem alterar. A correção anterior de captura de evento não comprovou resolução em navegador; causa da falha real permanece sem confirmação por sessão/HTTP.

Novo ajuste: componente PropertySettings mantém escolhas em estado local e usa botão explícito de salvar, com indicação de alterações pendentes/salvamento. A resposta da atualização precisa devolver status e presentation_enabled iguais ao solicitado antes de confirmar sucesso. Negativa de permissão, linha ausente e valores divergentes não geram sucesso. O componente é identificado por id e valores persistidos; polling sem mudança não descarta a escolha local. Não altera autorização, RLS ou banco.

23 testes de código passaram (quatro cenários do componente real com dependências simuladas: escolha local e gravação atrasada, resposta divergente, acesso negado e bloqueio de submissão sem mudança/ocupada). TypeScript e ESLint passaram. Sem reprodução autenticada nem validação visual nesta rodada. É necessário novo preview autorizado e reteste com registro sintético; não declarar resolvido antes disso.
