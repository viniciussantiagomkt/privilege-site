# Entrega operacional integrada

## Acesso

http://127.0.0.1:3210/login, a@example.invalid / demo-local-only. Outros perfis sinteticos: b@example.invalid, gestor@example.invalid, admin@example.invalid, mesma senha. Processo independente do terminal, somente loopback. Reiniciar Windows exige iniciar novamente npm run dev:crm-demo. Nenhuma credencial real deve ser usada na demonstracao.

CORS corrigido, sem relaxar AdminGuard. Browser Edge real via Playwright, formulario e credenciais fornecidas ao usuario, sem interceptacao, storage/cookie injetado ou CORS desabilitado. Validacao integrada inclui quatro perfis, senha incorreta, anonimo, recarga, seis modulos, logout/troca de conta e criacao contextual de retorno/visita. Dados locais sinteticos em memoria; somente tarefas/visitas aceitam gravacao. Realtime/WebSocket da API fake nao implementado.

## Integracao local

Base Work conferida:67b9b114c72e42a551f4df84691acd8761034626. Branch operacional ja e descendente dessa base; nao houve merge automatico, rebase, push ou alteracao no worktree da homologacao. Frontend preserva PT409 e40001 como contratos distintos, sem substituicao global.

Conferido por leitura o historico de25 versoes do staging sdpqphiooiuglywcmkxv. Duas fontes canonicas copiadas byte a byte para a cadeia local, com versoes e nomes ja registrados:

-20261118163136_crm_preserve_omitted_client_interest.sql:32398a29e75d062baac775cbf449648ce737f60882486a09ce0492f8c947bb33.
-20261125140440_crm_quick_client_revision_conflict.sql:f7eaf871f07b25c4b23d690efb079557804dd4f0dcdfba179420c6ca0d7bbd0a.

Nao se executou SQL remoto nem se modificou conteudo de migration aplicada. Os comentarios historicos PROPOSED foram preservados para manter os bytes aprovados, nao representam o estado atual do historico remoto. .gitattributes fixa LF. Os23 arquivos anteriores nao foram alterados.

Conflito semantico resolvido: o teste da recuperacao antiga continua exigindo exatamente as22 versoes do seu contrato, sem ignorar sua guarda. As tres versoes posteriores sao verificadas separadamente. O ensaio local executa primeiro os contratos historicos; depois aplica localmente H26/PT409 e verifica corpo5d06ec04e18c2a7a73c101f7d87ab57f, perfil omitido, PT409 e titularidade. A expectativa40001 de crm_review_sale permaneceu intacta. Resultados novos gravados em arquivos integrados, sem sobrescrever as evidencias historicas.

## Implementado nesta entrega

- Agendar retorno ou visita a partir do detalhe do cliente proprio, no editor existente, sem repetir o cadastro/selecao do cliente.
- Titulo do retorno preenchido com o nome do cliente; finalidade, vinculos e validacoes continuam no fluxo existente.
- Vendedor/proprietario e comprador continuam como tipos do mesmo contato, sem nova tabela ou nova arquitetura.
- Backend fake local modela quick_action_id com conflito ignorado, sem duplicar agendamentos ou dar acesso a outra carteira.
- Proxy Next no servidor restringe rotas por escopo apenas na branch operacional. Sem CRM_OPERATIONAL_SCOPE=daily-operations, rotas admin ficam fechadas. APIs Next e apresentacoes publicas ficam bloqueadas nesse Preview; rotas nao homologadas nao sao liberadas por esconder menu.

IMPORTANTE: o proxy NAO intercepta chamadas diretas ao Supabase. Portanto esse gate de rota, sozinho, NAO satisfaz o bloqueio completo de capacidades no provedor. A publicacao continua bloqueada ate comprovar os bloqueios necessarios em RPCs/Storage ou aprovar uma solucao adicional delimitada. Nao se alterou RLS/permissoes para contornar essa lacuna. Nao habilitar a variavel de escopo sem essa conferencia.

## Matriz das12 etapas

| Etapa | Estado integrado e utilizavel localmente | Limite para liberacao |
|---|---|---|
|01 Base e seguranca|25 fontes CRM reconciliadas, contratos separados|Revisao independente e gates remotos|
|02 Central operacional|Meu Trabalho, dashboard, drawers e navegacao existentes|Preview autenticado real|
|03 Clientes/atendimento|Comprador/proprietario/ambos, perfil, contatos, PT409|15 PASS/8 PARTIAL/5 BLOCKED preservados|
|04 Assistente/retornos|Fila diaria, filtros de prazo, retorno direto do cliente|Sem automacao de envio|
|05 Captacao/imoveis|Catalogo, pendencias e vinculos existentes|Midia privada e fluxos ainda nao homologados|
|06 Busca/apresentacoes|Filtros, comparacao e ficha existentes|Publicacao/apresentacao externa fora da liberacao inicial|
|07 Agenda/visitas|Criar/editar/concluir tarefa, visita contextual com cliente preenchido|Homologacao remota do novo atalho|
|08 Parcerias|Sem modulo novo criado nesta entrega|Contrato comercial, autorizacao e persistencia ainda necessarios|
|09 Propostas/fechamento|Propostas, negociacoes, revisao de venda existentes|Comissoes/parcelas novas nao implementadas|
|10 Financiamento/documentos|Sem calculadora ou aprovacao ficticia|Regras, dados e persistencia privada nao aprovados|
|11 Automacoes/campanhas/mobile|Modulos existentes preservados, WhatsApp manual, mobile360px|Sem conectar provedores/enviar mensagens; automacoes fora do escopo|
|12 Homologacao/release|Regressoes locais e gate de servidor|CI remoto, protecao Vercel e bloqueio de capacidades Supabase|

Nao se declara conclusao de parcerias, financeiro, credito ou documentacao inexistentes. O fluxo diario continua independente dessas frentes, sem criar cadastros duplicados ou simular resultados comerciais.

## Impacto das13 pendencias

| ID | Classificacao principal | Consequencia |
|---|---|---|
|H01 PARTIAL|Impeditivo comercial de seguranca|Negativa de sessao legitimamente expirada pendente|
|H02 PARTIAL|Funcionalidade especifica|Validacao completa do cadastro ainda nao certificada|
|H13 PARTIAL|Funcionalidade especifica|Metricas funcionais por perfil nao servem como painel financeiro homologado|
|H19 PARTIAL|Funcionalidade especifica|Deduplicacao de email isolada nao comprovada remotamente|
|H22 PARTIAL|Funcionalidade especifica de seguranca|Apresentacoes com tokens revogados/expirados fora da liberacao|
|H26 PARTIAL|Funcionalidade especifica|Edicao de cliente legado sem fixture conhecida|
|H27 PARTIAL|Homologacao de interface|Preview protegido e troca real de contas pendentes; local nao substitui|
|H28 PARTIAL|Impeditivo comercial de seguranca|Erros dos caminhos nao executados ainda nao certificados|
|H15 BLOCKED|Impeditivo comercial de seguranca|Autorizacao de alteracao de privilegios exige prova especifica|
|H16 BLOCKED|Impeditivo comercial de seguranca|Superficie de funcoes privilegiadas/trigger necessita contrato de teste revisado|
|H23 BLOCKED|Funcionalidade especifica|Registro de abertura publica nao homologado|
|H24 BLOCKED|Funcionalidade especifica|Compartilhamento/consentimento/nonce nao homologados|
|H25 BLOCKED|Funcionalidade especifica|Sincronizacao/midia sem fixture autorizada conhecida|

Nenhum desses itens foi convertido em PASS por teste local. Restricoes de apresentacoes/midia so permitem liberar outros modulos se forem efetivas tambem no provedor; esconder rotas nao basta. Como melhorias nao impeditivas ficam os avisos de desenvolvimento de imagens/Reatime fake e conveniencias de demonstracao, nao as pendencias de seguranca acima.

## Validacao e limitacoes

Lint/TypeScript,205 testes de codigo,397 verificacoes locais e build Next16.4.6 aprovados. Build em copia limpa com dependencias travadas e ambiente allowlisted usando somente Supabase loopback inativo; sem .env ou credenciais remotas. Browser e suite operacional usam dados ficticios locais; nenhum replay de S2/B1/B2/B3 ou limpeza no staging. O conjunto mutante de browser requer fixtures locais reinicializadas: filas limitadas nao devem ser usadas como se exibissem todos os registros acumulados. Inicialmente houve503 de inicializacao e falha de seletor com fixtures repetidas; ajuste de readiness e identificador unico no teste, sem retry de autenticacao/escrita.

Nao ha autorizacao para uso comercial real ou homologacao integral. Entrega apta para revisao/homologacao restrita do que foi efetivamente testado. O acesso pelo celular externo depende do Preview protegido:127.0.0.1 nao e endereco de rede do computador.

## Autorizacao remota consolidada proposta

Autorizar somente envio desta branch e PR Draft com base na branch Work, leitura da configuracao efetiva Preview e protecao do projeto Vercel correto, sem merge/main. Depois de revisao independente e CI, permitir um unico deployment manual Preview SOMENTE se staging/public key forem conferidos, integracoes/analytics/webhooks desativados, ausencia de chave administrativa, protecao oficial validada e bloqueio de capacidades no Supabase comprovado. Preservar deploy automatico desligado. Nenhum SQL, novo usuario, permissao, Storage ou configuracao de producao esta incluido. Se for necessario alterar backend/RLS ou criar projeto isolado, apresentar proposta e pedir autorizacao propria antes de qualquer escrita. Sem todos os gates, nao publicar.
