# Privilege CRM — interface de staging

A auditoria identificou que /login encaminhava para /admin, cujo dashboard ainda era a administração antiga. /admin/crm concentrava formulários sem layout próprio. Agora /admin abre o novo dashboard e /admin/crm redireciona para ele.

## Interface entregue

- Shell responsivo, sidebar recolhível, busca global, notificações e navegação mobile.
- Dashboard com indicadores, evolução mensal, origens, funil, tarefas, visitas e produtividade provenientes do Supabase.
- Leads: Kanban com arrastar e alternativa por seletor, filtros, atribuição, contato, atividades, histórico e follow-ups.
- Imóveis: cards/tabela, formulário existente completo, mídia privada, código único, aprovação, publicação, disponibilidade e apresentação pública habilitada separadamente.
- Contatos: clientes/proprietários, edição, vínculos com leads e imóveis, arquivamento.
- Agenda: calendário mensal, visitas, tarefas, retornos, responsáveis e atualização de status.
- Comercial: propostas, negociações e registro gerencial de vendas. Registrar venda não altera automaticamente a disponibilidade do imóvel.
- Equipe: indicadores por corretor, períodos, área individual, perfis e exportação CSV.
- Estados de carregamento, erro, confirmação e vazio; assinaturas Realtime com atualização periódica de apoio.

Dados reais respeitam RLS. Não foram inseridos dados demonstrativos permanentes. As duas migrações aditivas foram aplicadas somente ao staging sdpqphiooiuglywcmkxv.

## Verificações

Build Next.js, TypeScript, ESLint e diff sem erros. 81 verificações SQL/RLS passaram em transação revertida, 15 verificações da API anônima, 9 smoke HTTP e 5 guardas de ambiente passaram.

## Limites de homologação

A verificação visual e os fluxos autenticados de ponta a ponta ainda precisam de validação. O download do Chromium falhou. A revisão automática bloqueou a criação de uma conta administrativa temporária por exigir autorização explícita; nenhuma conta foi criada. Provisionamento de usuários não foi habilitado no preview, que não recebe service-role.

Nenhuma alteração de produção, merge ou publicação em produção foi realizada.
