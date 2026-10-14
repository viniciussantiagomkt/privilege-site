# Roteiro de homologação autenticada do CRM integrado

Somente staging `sdpqphiooiuglywcmkxv`. Não executar em produção. Atualização de 14/10/2026: o usuário confirmou login dos quatro perfis; o executor ainda não tem acesso às sessões para executar as jornadas. Login informado não equivale a autorização homologada. Veja o roteiro operacional detalhado em `docs/crm-operational-manual-20261014.md` e o relatório da rodada em `docs/crm-operational-homologation-20261014.md`.

## Acesso necessário

Utilizar as quatro contas existentes de Administrador, Gestor, Corretor A e Corretor B. Não criar papéis administrativos, alterar senhas nem desabilitar contas existentes sem autorização própria. Senhas e tokens não devem ser enviados no chat, incluídos no Git, screenshots ou relatórios. O acesso deve ocorrer em uma sessão de navegador autorizada ou por credenciais locais em arquivo ignorado pelo Git, usado apenas pelo executor autorizado.

Abrir quatro contextos de navegador separados. Confirmar primeiro a branch/commit do preview, o hostname do Supabase nos requests e a ausência de service-role no cliente. Proteção Vercel e login Supabase são barreiras independentes.

## Evidência exigida

Para cada cenário registrar perfil, ação, resultado esperado, resultado observado e referência do registro sintético. Confirmar persistência após atualizar a página. Não considerar uma operação concluída por mensagem de sucesso sem verificar o registro no banco pelo perfil autorizado. Não guardar dados pessoais reais.

## Autenticação e operação comercial

1. Entrar com cada perfil, confirmar a role retornada pelo banco, renovar sessão, atualizar a página, sair e conferir redirecionamento. Validar conta desabilitada somente com fixture autorizada; não desabilitar uma conta real para isso.
2. Criar um lead sintético com A. B não pode ler, alterar, atribuir ou vincular o lead, mesmo chamando a API diretamente. Gestor pode atribuir e reatribuir; A perde acesso após reatribuição.
3. Conferir cards, gráficos, filtros por período e desempenho com os mesmos registros visíveis no Supabase. Um dashboard vazio pode mostrar zero; não inserir números decorativos.
4. Mover o lead no Kanban, verificar persistência, histórico e perda com motivo obrigatório. Testar a alternativa por seletor em mobile e teclado.
5. Agendar tarefa e visita, editar status e conferir relações autorizadas. Criar cliente/proprietário e proposta, registrar negociação e venda nos perfis permitidos. Venda não deve alterar disponibilidade silenciosamente.
6. Cadastrar imóvel sintético. Conferir código único, responsável, retry após falha de mídia sem duplicar imóvel, aprovação da gestão, publicação e habilitação da apresentação.
7. Revisar navegação, modais, busca, mensagens de erro, foco, teclado e overflow em 375/390 px e desktop. Simular interrupção de Realtime e conferir atualização periódica e manual.

## Marketing e arquivos

Usar foto PNG/JPG/WebP, PDF de uma página e MP4 fictício curto. Depois testar arquivo acima de 4.5 MB, respeitando limite de 50 MB do bucket, e fotos de imóvel dentro do limite de 10 MB. Nunca usar documentos ou imagens de cliente real.

1. Upload autenticado de cada formato, checksum, versão atual e download pelo perfil correto. Conferir negativa para anônimo, outro corretor e pasta alheia.
2. Vincular o material a imóvel e empreendimento/construtora. Relacionar unidades e conferir que material compartilhado não duplica o arquivo.
3. Aprovar para divulgação pela gestão. Corretor não pode se autoaprovar. Material pendente, interno, vencido ou arquivado não aparece publicamente.
4. Testar retirada da divulgação por arquivamento. O esquema atual não possui estado próprio de rejeição nem campo de motivo; isso é uma pendência funcional, não um cenário aprovado de rejeição formal.
5. Enviar nova versão. Conferir preservação da anterior, retorno a pendência, retirada pública e reapresentação somente após nova aprovação.
6. Criar kit, adicionar/remover itens, favoritar/desfavoritar, editar nome e conferir isolamento entre A e B.
7. Selecionar imóvel autorizado e materiais aprovados; vincular lead; personalizar mensagem e validade; gerar link.
8. Abrir o link publicamente. Conferir somente campos autorizados, contatos do corretor e os materiais selecionados. Verificar imagem, PDF e vídeo, incluindo seek/Range e download acima de 4.5 MB.
9. Copiar ou abrir WhatsApp oficial; enviar manualmente; confirmar envio. A geração e confirmação são distintas. Repetir confirmação não duplica atividade no lead.
10. Abrir sem consentir: nenhum evento de abertura. Clicar em consentimento explícito: um evento. Repetir nonce não duplica evento.
11. Revogar e expirar links, ocultar/arquivar imóvel, expirar material, trocar versão e remover vínculo. Testar página e endpoint de mídia, não somente a tela de lista.
12. Habilitar retorno automático e conferir uma tarefa ligada ao lead. Repetição não gera tarefas extras. Não enviar mensagens externas automáticas.

## Limpeza e aprovação

Definir antes da criação das fixtures como arquivá-las ou removê-las sem alterar triggers, RLS, Auth ou schema nesta etapa. Não utilizar o procedimento antigo de desabilitar trigger para limpar imóvel. Testes de SQL que terminam em rollback não substituem o login e o upload real pelo navegador.

Liberar uso interno somente quando login dos quatro perfis, isolamento, persistência comercial, arquivos reais e geração/envio/revogação do link passarem na mesma versão de código do preview. Definir a política de reaprovação de alterações de validade/descrição e resolver ou aceitar formalmente as pendências de rejeição, paginação e integrações externas.
