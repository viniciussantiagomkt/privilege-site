# Roteiro operacional: executar nas sessões reais

Ambiente exclusivo: https://privilege-site-k41rf9x4p-viniciussantiagomkts-projects.vercel.app
Supabase: sdpqphiooiuglywcmkxv. Código do preview: 72b5420. Os quatro logins foram informados como bem-sucedidos pelo usuário; os passos abaixo permanecem pendentes.

## Preparação

Abra quatro perfis separados do Chrome/Edge, um por conta; abas anônimas do mesmo navegador podem compartilhar a mesma sessão. Separe também uma janela sem login para o link público.

Use o prefixo HOMO-20261014 em todos os nomes. Não envie mensagens externas. Para fotos/PDF/vídeo, use somente arquivos neutros fictícios, sem nomes, rostos, documentos ou metadados reais. Anote os IDs dos registros, código do imóvel, perfil, horário, resultado esperado e observado. Links e tokens ficam somente no navegador; não devem ir ao relatório.

## Jornada por perfil

| Passo | Perfil e rota | Ação | Resultado exigido |
|---|---|---|---|
| 1 | A, /admin/imoveis | Cadastrar HOMO-20261014 Imóvel A, preço 250000, dados fictícios, proprietário/responsável A; salvar rascunho | Um imóvel, código único e persistência após F5 |
| 2 | A, mesmo imóvel | Adicionar foto; salvar, atualizar e abrir novamente | Arquivo abre para A; não cria segundo imóvel |
| 3 | B, /admin/imoveis | Buscar código e tentar abrir edição pelo endereço usado por A | Não acessar dados privados nem alterar imóvel de A |
| 4 | A, /admin/contatos e /admin/leads | Criar HOMO-20261014 Cliente A e Lead A; vincular imóvel e responsável A | Relações corretas e persistentes |
| 5 | B, mesmas rotas | Buscar os nomes e tentar abrir os IDs de A | Nenhum dado privado de A |
| 6 | A, /admin/leads | Movimentar pelo Kanban e registrar primeiro contato; atualizar página | Etapa e histórico persistem; perdido exige motivo |
| 7 | A, /admin/agenda | Criar tarefa e visita para 15/10/2026 às 10h, ligadas ao cliente/imóvel | Relações corretas; B não acessa agenda privada de A |
| 8 | A, /admin/negocios | Registrar proposta fictícia de 240000 e negociação de teste | Persistência e trilha de alterações |
| 9 | Gestor, /admin/leads | Localizar Lead A e reatribuir para B | A perde acesso, B recebe; histórico mostra alteração |
| 10 | Gestor, /admin/imoveis | Aprovar/publicar imóvel e habilitar apresentação | Público vê apenas informações previstas; corretor não autoaprova |
| 11 | Admin e gestor, /admin/crm | Conferir indicadores; comparar IDs e filtros com registros criados | Contagens sem duplicação e valores coerentes |
| 12 | Todos | Atualizar página, sair, abrir novamente /admin/crm | Sessão persiste antes de sair; depois redireciona para login |

Reatribuição altera autorização: faça a sequência de Marketing com o atual responsável pelo lead, ou devolva-o a A pelo gestor e registre a devolução.

## APIs: acesso direto com sessão legítima de cada perfil

1. No perfil A abra F12 → Network, filtre o hostname staging e a requisição REST de leads. Anote apenas o ID do Lead A.
2. No perfil B abra a listagem de leads e encontre a própria requisição REST. Use “Edit and Resend”, se disponível, mantendo os cabeçalhos do próprio B. Não copie cabeçalhos ou tokens entre perfis.
3. Faça GET em /rest/v1/leads?select=id,name&id=eq.ID_DO_LEAD_A. Esperado: nenhuma linha, ou negativa; nunca dados de A.
4. Reenvie PATCH para /rest/v1/leads?id=eq.ID_DO_LEAD_A com JSON {"notes":"HOMO-20261014 tentativa B"} e Prefer: return=representation. Esperado: negativa ou zero linhas alteradas. Confira pelo gestor que notes permaneceu igual. HTTP 200/204 sozinho não prova autorização.
5. Repita GET para clients com o ID do Cliente A. Repita PATCH apenas nos registros fictícios explicitamente criados para este teste.
6. Pelo B, teste as operações reais de atribuição e confirmação de compartilhamento usando requisições geradas pela própria interface e alterando somente o ID alvo. Esperado: negativa e nenhum evento novo no lead de A.
7. Teste anônimo sem cabeçalho de autorização em janela separada. Esperado: ausência de dados privados. Não exporte HAR sem sanitização, pois contém sessões.
8. Para refresh, confirme renovação real em /auth/v1/token?grant_type=refresh_token, continuidade da operação e role atual. Não registre o corpo da resposta.
9. Após logout, o refresh token não deve renovar a sessão encerrada. Um access token previamente emitido pode continuar válido até expirar; não considerar isso isoladamente como falha.
10. Conta desativada: usar uma fixture descartável previamente autorizada. Não desativar A/B/admin/gestor durante homologação concorrente. Confirmar bloqueio no banco, APIs e interface, inclusive com sessão anterior. Este teste continua pendente até existir fixture/sessão apropriada.

Se o navegador não oferece “Edit and Resend”, registrar o bloqueio; não colar scripts que imprimam credenciais. O executor pode repetir essas chamadas quando tiver sessão autorizada disponível.

## Central de Marketing

1. Acessar /admin/empreendimentos pela gestão. Criar construtora e empreendimento HOMO-20261014 e associar a unidade de teste.
2. No perfil responsável, abrir /admin/marketing. Enviar foto PNG/JPG, PDF neutro de uma página e MP4 curto. Vincular ao imóvel e ao empreendimento/construtora nos campos existentes.
3. Abrir cada arquivo, atualizar página e verificar persistência. Testar um arquivo acima de 4,5 MB e abaixo de 50 MB para Marketing; foto de imóvel abaixo de 10 MB.
4. Corretor tenta aprovar: operação deve ser negada. Gestor aprova somente materiais de divulgação. Manter um material pendente e outro interno como controles negativos.
5. Enviar nova versão: anterior deve permanecer no histórico, atual volta a pendente e sai da apresentação pública até aprovação.
6. Criar coleção, adicionar/remover material, favoritar/desfavoritar. B não vê a coleção/favoritos privados de A.
7. Rejeição formal com motivo está ausente no esquema atual. Registrar como pendência; arquivar apenas testa retirada da divulgação.
8. Gerar apresentação escolhendo imóvel, materiais aprovados, lead e validade. Copiar o link para a janela sem autenticação.
9. Abrir foto/PDF/vídeo e testar seek. Materiais pendentes, internos e não selecionados não podem aparecer. Testar também o endpoint de mídia de item não selecionado.
10. Abrir sem consentir: nenhum evento de abertura. Dar consentimento explícito: um evento; repetição com o mesmo nonce não duplica.
11. No CRM, clicar em “Confirmar envio ao lead” somente para simular confirmação manual deste teste. Não enviar WhatsApp real. Geração e confirmação devem ser eventos diferentes; repetir confirmação não duplica evento nem tarefa.
12. Revogar pela interface e recarregar a página pública e a mídia. Ambas devem negar acesso. Confirmar que alteração de URL/ID não permite outro material.
13. Expiração do link: criar com a menor validade permitida, anotar horário e verificar após expirar; não alterar relógio do servidor, trigger ou banco para acelerar. Material vencido e link vencido são cenários distintos.
14. Testar em celular ou emulação 390×844 e desktop: menus, modais, teclado, uploads, seletor de etapa e acesso ao link. Registrar overflow, foco e mensagens de erro.

## Registro e encerramento

Para cada passo: APROVADO / FALHOU / BLOQUEADO, perfil, ID sintético, horário, resultado observado e evidência sem segredos. Mensagem de sucesso precisa de leitura posterior para confirmar persistência.

Não remover fixtures com SQL improvisado ou desabilitar triggers. Arquivar/revogar pela operação suportada; objetos órfãos exigem plano de limpeza separado. Não alterar schema, Auth global ou produção.

Enviar ao executor somente a tabela de resultados e screenshots sem credenciais. A partir disso, corrigir falhas reproduzíveis na branch e revalidar o fluxo afetado. Qualquer migration exige proposta, impactos e autorização antes da aplicação.

