# Apresentações de imóveis da própria carteira

## Atualização operacional de 29/10/2026

Backup novo e restauração local executados pelo agente no Windows: **RESTORE PASS**. Migration aplicada uma única vez somente no staging como `20261029173752_crm_owner_draft_presentations`; SQL autorizado preservado. Edge Function `crm-presentation-media` ACTIVE, versão 1, `verify_jwt=false` intencionalmente, fontes idênticas ao commit autorizado `6cc3c4d`.

As 49 relações monitoradas, contas, grants, RLS e papéis foram preservados. Onze negativas HTTP reais passaram, além de 259 checks SQL locais e 31 testes de código. Mídia privada real, Range 206 real e fluxos autenticados continuam pendentes. Nenhum preview novo foi publicado.

Relatório atual: [implantação no staging](crm-owner-presentations-staging-deployment-20261029.md). Evidência: `tests/security/crm-owner-presentations-deployment-20261029.json`.

As seções abaixo registram a preparação anterior; referências ao arquivo proposto e à implantação ainda não executada são históricas, não o estado atual.

## Regra autorizada

O corretor pode gerar link de apresentação para imóveis dos quais é proprietário ou responsável, inclusive rascunho e pendente, independentemente de publicação no site. presentation_enabled continua sendo a opção explícita para habilitar o compartilhamento. Imóveis arquivados/deletados não são elegíveis. A apresentação não aprova nem publica o imóvel.

## Implementação preparada

- eligibleProperty exige proprietário/responsável atual, apresentação habilitada, ausência de deleted_at e workflow rascunho/pendente/aprovado/publicado. ShareComposer usa essa regra.
- O detalhe de imóvel usa Compartilhar apresentação, que gera link individual /apresentacoes/[token], com validade/revogação. O antigo link por slug /apresentacao/[slug] continua limitado ao conteúdo público e não é usado para apresentar imóveis privados.
- Migration proposta 20261029170649_crm_owner_draft_presentations.sql: guard_share exige carteira própria e identidade correta; valid_share revalida vínculo atual, habilitação e conta ativa em cada resolução; crm_public_presentation devolve somente campos já destinados à apresentação e materiais aprovados, públicos, institucionais para equipe, vigentes e vinculados aos imóveis do link. A publicação do imóvel deixa de ser requisito. Materiais pessoais, selecionados ou pendentes não são liberados.
- public_asset e as policies de Storage/listagens do site permanecem intactas. Nem o bucket nem as fotos privadas recebem leitura anônima global.
- Nova Edge Function crm-presentation-media, entrada pública de capability (verify_jwt=false). Valida o token por RPC usando exclusivamente a chave pública, resolve o imóvel/índice ou material explicitamente selecionado, e só depois lê o objeto exato no Storage usando a credencial interna do servidor Edge. Nenhuma chave privilegiada é adicionada ao navegador ou à Vercel. Não aceita bucket/caminho arbitrário, não segue redirects, falha fechada, usa no-store e preserva streaming/Range. Função não foi publicada.
- Página de token aponta fotos gerenciadas e materiais para essa função. URLs externas de imagens/vídeos continuam externas; a revogação do link não apaga cópias baixadas nem revoga acesso em serviços de terceiros. Imagens gerenciadas dependem da função nova.

## Verificação

- 259 checks locais PGlite passaram, zero falhas. Incluem os 253 anteriores e seis novos cenários: quatro estados do imóvel, bloqueio da listagem anônima/outro corretor, revogação, desabilitação, perda do vínculo, expiração e material aprovado em imóvel oculto sem liberar Storage direto. A migration nova é aplicada no banco descartável após a regressão legada; não é executada no staging.
- 31 testes de código passaram, incluindo capability, caminho indevido, RPC indisponível, negativa Storage e material com Range. Transporte e identidade simulados nesses testes; não substituem bytes HTTP reais.
- Lint e TypeScript passaram.
- npm ci concluído com o lock remoto e dependências isoladas. Build otimizado Next.js 16.4.3 passou, com guard do staging e chave pública verificada, sem credencial privilegiada na Vercel. O bloqueio inicial do symlink foi resolvido pela instalação isolada. Lint, testes de código e SQL foram repetidos nessa instalação.
- Sem sessão autenticada, teste visual, deploy Edge ou teste de mídia em staging nesta rodada.

## Implantação proposta, não executada

1. Revisar código/credencial interna da Edge Function, migrar somente mediante autorização específica e após preflight/backup adequado. A migration compara os fingerprints atuais das três funções (leitura staging em 29/10).
2. Publicar a Edge Function somente no staging sdpqphiooiuglywcmkxv, com verify_jwt=false intencionalmente: o token de apresentação é a autorização e é revalidado antes de cada leitura. Não implantar em outro projeto. Fazer testes HTTP negativos e mídia fictícia real, sem dados comerciais.
3. Confirmar npm ci/build no lock atual e publicar preview somente após autorização própria. Não publicar esta interface sobre o banco/função antigos.
4. Homologar quatro perfis: A gera draft e pendente ocultos com habilitação ligada; B não gera para A; link anônimo funciona sem listar imóvel no site; fotos/PDF/vídeo autorizados; revogação/expiração/desabilitação/perda de vínculo bloqueiam novas requisições; materiais pendentes não aparecem; aprovação e publicação continuam separadas.

Nenhuma migration remota, alteração de usuário/permissão remota, novo preview ou produção executados. PR permanece em rascunho; não fazer merge. Relatório e código não autorizam implantação.
