# CRM operacional: entrega local e gate de Preview

## Entrega efetiva

Branch codex/crm-operational-priority-20261125, descendente da base Work67b9b114c72e42a551f4df84691acd8761034626. Referencia remota conferida por leitura em26/11/2026; nenhuma integracao, push, merge, migration ou publicacao executada. Worktrees e evidencias da Etapa03 preservados.

O erro de acesso foi causado pelo CORS do backend sintetico: content-profile era rejeitado na RPC current_user_role. Correcao preservada e validada em navegador Edge real via Playwright, sem interception, cookies/storage injetados, JWT fabricado fora do backend local ou CORS desabilitado. API permite apenas a origem loopback especifica e headers explicitos. Login, AdminGuard e autorizacao real da aplicacao nao foram relaxados.

Hoje o servidor antigo estava desligado. Servidor novo iniciado como processo local independente, sem janela, vinculado somente a127.0.0.1. Ao reiniciar esse servidor, os dados sinteticos em memoria e sessoes de demonstracao reinicializam. Ele nao e um servico automatico do Windows: apos desligar/reiniciar o computador, usar npm run dev:crm-demo no repositorio.

URL: http://127.0.0.1:3210/login. Conta a@example.invalid, senha demo-local-only. Outros perfis: b@example.invalid, gestor@example.invalid e admin@example.invalid, mesma senha de fixture. Nunca utilizar credenciais reais nesta demonstracao.

## Incremento comercial

- Agenda existente: vencidos, hoje, proximos sete dias e qualquer periodo; mesmos filtros nas listas e calendario.
- Situacao pendente, concluida/cancelada ou todos. Tarefas canceladas nao aparecem como pendencias.
- Busca das tarefas inclui cliente e imovel relacionados, apenas no snapshot ja autorizado, sem ampliar consultas/permissoes.
- Edicao operacional reconhece PT409 e continua reconhecendo40001 para orientar reabertura. Copiada somente a mensagem de frontend da correcao aprovada, sem SQL, reaplicacao ou mudanca na frente de homologacao.
- Permanecem dashboard, hub de quatro abas, criar/editar/concluir tarefas, agendar visitas, filtros e comparacao de imoveis, pendencias de captacao, negocios e apresentacoes existentes.

Limites da demo: apenas tarefas e visitas aceitam gravacao em memoria. Outros cadastros mantem seus formularios e recusam gravacao nao implementada. Realtime/WebSocket nao e implementado na API sintetica; leitura HTTP e atualizacao manual disponiveis. Isso nao e homologacao de RLS/Supabase hospedado.

## Validacao real

- Quinze verificacoes de acesso no navegador: quatro perfis pelo formulario, senha incorreta rejeitada, anonimo redirecionado, seis modulos, recarga, filtros de agenda, logout e troca A/B sem linhas residuais.
- Onze jornadas operacionais: criacao/edicao/conclusao de tarefa, visita, filtros/comparacao/ficha, negocios, teclado e quatro telas360px sem overflow.
- Lint e TypeScript: PASS.
-203 testes de codigo: PASS.
-396 verificacoes CRM locais: PASS.
- npm ci --ignore-scripts e npm run build: PASS em copia limpa com lockfile e ambiente allowlisted, somente URL Supabase loopback inativa e chave ficticia. Build Next16.4.6/Turbopack; nenhuma credencial remota ou arquivo .env copiado. Build final inclui mensagem PT409.

Relatorios de browser em tests/security. Evidencias antigas da Etapa03 nao foram reclassificadas por estes testes locais.

## Preparacao de integracao

A branch e descendente da referencia Work conferida; propor PR independente com base em work/crm-stage03f-controlled-fixes-20261109. Revisar separadamente dependencias1173506, interfacebcd1b48 e ajustes atuais. Nao restaurar admin antigo, duplicar rotas ou importar SQL historico em lote. O unico trecho de cliente vindo da correcao e o mapa de mensagem PT409; reconciliar esse trecho semanticamente na revisao, sem sobrescrever o arquivo inteiro.

Nenhuma mudanca em supabase/, app/login/page.tsx ou components/admin/AdminGuard.tsx nesta frente. As versoes H26/PT409 ja aplicadas no staging devem ser reconciliadas com os arquivos aprovados pelo fluxo Work; nenhuma aplicacao remota faz parte desta entrega. PR16 permanece fora de qualquer merge automatico.

## Preview ainda NAO publicado

Preparados no codigo: deployment automatico desativado para esta branch; guard de build exige projeto staging e hash da chave publica aprovada, rejeitando producao/service_role; isolamento de mapas/videos para a branch exata. O runner local usa identificacao local/crm-demo, nao uma variavel publica para contornar o guard de deployment.

Ainda NAO comprovados: variaveis efetivas Vercel/precedencia, protecao de deployment, CI do novo HEAD, configuracao externa e sessoes reais dos perfis. Sem inventario completo ou protecao confirmada, nao publicar.

Autorizacoes solicitadas separadamente:

1. Enviar somente commits sanitizados da branch operacional e criar PR Draft com base na branch Work, sem merge e mantendo deployments automaticos desligados. Nenhum push executado nesta tarefa.
2. Depois de revisao independente, CI e preflight de variaveis/protecao: autorizar um unico Preview manual com Supabase staging sdpqphiooiuglywcmkxv, sem chaves administrativas, analytics/webhooks/integracoes externas, migrations, mensagens ou producao. Se alguma configuracao externa precisar de alteracao, apresentar nomes/escopos antes da mudanca. Nao transportar contas sinteticas locais para o Supabase.

O segundo aceite so pode ser executado com o HEAD revisado e protecao/autenticacao oficiais confirmados. Telefone celular nao acessa127.0.0.1 do computador: ate a publicacao autorizada, a demonstracao e local e a validacao mobile e de viewport. Nao expor o backend sintetico na rede para contornar isso.
