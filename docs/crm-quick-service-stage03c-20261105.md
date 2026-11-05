# Etapa 03C | Backup, restauração e ensaio PostgreSQL isolado

## Resultado e limites da autorização

**APTO para solicitar a próxima autorização de staging**, no escopo ensaiado. Não é autorização para aplicar SQL nem liberação de produção. PR #15 continua em rascunho. Não houve migration, DDL, usuário, integração, preview, merge ou alteração de dados remotos. Etapa 04 não iniciada. Homologação autenticada real continua pendente.

Base conferida localmente e no PR: `c5549031a1ce4e6e2cbb5b2331626405473a4d08`, branch `work/crm-broker-quick-service-20261104`. Correção anterior: `e5f7760`. Staging confirmado pelo inventário oficial: `privilege-imoveis-staging`, ref `sdpqphiooiuglywcmkxv`, região sa-east-1, PostgreSQL 17.11. Histórico exato com 21 versões, terminando em `20261030185925`. Ausência da versão proposta e de sua função reconfirmada ao terminar.

Runner e consulta de comparação versionados em `f8488a2cd4bfebd89c404d898a5611521996fc9f`; hash do runner executado confere com esse arquivo. Commit subsequente somente de relatório/evidências. A aplicação permanece no código aprovado anteriormente.

Migration ensaiada: `20261104193943_crm_quick_service.sql`. SHA-256 UTF-8/LF, preservado: `da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa`. Nenhuma alteração funcional ou de SQL foi necessária nesta fase. Somente runner, evidências e documentação foram acrescentados/atualizados.

## Backup atualizado

Executado o procedimento versionado `scripts/backup-crm-staging.ps1`, com pg_dump/pg_dumpall/pg_restore/psql 17.11, SSL e `default_transaction_read_only=on`. Senha digitada pelo usuário somente em diálogo local mascarado, sem persistência no repositório ou argumento de comando. O processo encerrou e o script restaurou o ambiente de conexão em finally. Nenhuma credencial foi publicada.

- Manifesto concluído em **2026-11-05T12:47:02.6584561Z (UTC)**.
- Arquivo custom: **862.838 bytes**.
- SHA-256: `7de5eb4fc27c0b7badeb72b0dbb246d4ca4e29f3b6ab32558a0afb2d4129590f`.
- Local privado: `%LOCALAPPDATA%/PrivilegeCRM-Backups/staging-20261105-094609-144abeff/staging-database.dump`.
- ACL sem herança, duas regras: usuário local e SYSTEM. Listagem e decodificação completa: PASS. SQL temporário decodificado removido pelo procedimento; originais/manifests preservados.
- Snapshot contém schema, dados, funções, triggers, ACL, RLS e histórico de 21 migrations. Roles exportadas separadamente sem senhas de roles; não foram importadas indiscriminadamente sobre os papéis da imagem.

O dump é consistente por transação de pg_dump. As contagens auxiliares do manifesto são anteriores a essa transação; coincidiram nas restaurações, mas não constituem prova de ausência de atividade concorrente. O horário acima é de conclusão do manifesto, não um horário inventado de início do snapshot.

O arquivo contém dados privados/Auth e **não integra o Git**. Não contém bytes de Storage ou configuração externa de SMTP/OAuth/Vercel/Functions. Chaves originais de Vault e login/serviços HTTP não foram recuperados/testados; este é um ensaio de recuperação do banco, não de toda a plataforma Supabase.

## Restauração comprovada

Docker Desktop local via named pipe, contexto desktop-linux, imagem fixada `supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00`. PostgreSQL **17.6** local, mesma major e patch diferente do staging 17.11. Rede `none`, nenhuma porta publicada, nenhum bind mount de host e sem privileged. Integrações não podem sair pela rede.

Cada restauração usou banco novo criado de template0 e pg_restore transacional com exit-on-error. O `--clean --if-exists` do procedimento limita-se a esse banco novo/vazio, sem DROP CASCADE, sem substituir bancos anteriores. Exit 0, contagens/histórico/checagens do manifesto: PASS. Listar o arquivo não foi tratado como restauração.

Comparação adicional staging/restauração: 88 tabelas, 375 constraints, 101 funções, 49 triggers, 130 políticas e 1.956 grants de tabelas com assinaturas equivalentes. Os 297 grants de funções também coincidiram. Uma diferença inicial era exclusivamente de deparse: search_path local incluía auth. Igualando apenas o search_path da conexão local a public,extensions, todas as assinaturas coincidiram. Nenhuma configuração remota foi alterada.

Banco do ensaio final ampliado: `privilege_restore_66f60c723a24`. Banco adicional de recuperação, mantido sem a migration: `privilege_restore_b09d84436ab2`. Relatórios completos ficam na pasta privada do backup. Bancos de tentativas anteriores foram preservados; nenhum banco existente foi excluído ou reutilizado para forçar PASS.

## Aplicação exclusivamente local

O runner `tests/crm-quick-service-postgres-local.mjs` exige backup/restauração PASS, hash, branch, contexto, Unix socket, imagem e isolamento esperados. Aplica o SQL uma vez em cada cópia nova, rejeitando reaplicação se as funções já existem. Não utiliza credenciais/host remoto. O histórico espelhado continua com 21 versões; a execução local não foi disfarçada de migration remota registrada.

Expansão comprovada: 4 colunas, 3 índices, 4 constraints, 1 trigger e 6 funções. Nenhuma tabela nova. Funções anteriores, políticas, grants de tabelas, dados legados de clients/tasks/visits e contagens de auditoria/eventos/histórico permaneceram iguais imediatamente após o DDL. Novos índices e constraints válidos, nenhuma tabela public sem RLS. RPCs negados a anon e permitidos a authenticated, mantendo checagens internas por carteira.

## Segurança e concorrência

**19 grupos PASS**, com 74 backends PostgreSQL distintos observados na fase de segurança/contratos. Cada operação usa um processo psql/conexão independente; cenários simultâneos usam Promise.all/Promise.allSettled e retenção transacional antes do commit, não uma fila de uma única conexão nem PGlite.

Cobertura: duas criações concorrentes do mesmo telefone; retry do mesmo action_id; mesmo action_id com payload diferente; duas edições com a mesma revisão; duplicata por carteira/DDD55; isolamento A/B nos dois sentidos; gestor/admin sem leitura ou alteração de A; anon, identidade inexistente e corretor inativo negados; titularidade forjada negada por RPC e tabela; contato/evento único; retry concorrente de tasks/visits com uma inserção/auditoria; contratos legados da Etapa 02; atualização legada preservando perfil estruturado e auditoria; timeline sem telefone/e-mail/observações/snapshots.

Somente identidades/registros sintéticos locais foram usados. SET LOCAL ROLE/claims testa autorização SQL/RLS real, **não valida assinatura JWT, sessões Auth HTTP ou login remoto**. Essa limitação não foi convertida em homologação autenticada.

## Desempenho da timeline

Plano aninhado real da função capturado com auto_explain em JSON, ANALYZE e BUFFERS; não apenas o Result opaco de uma chamada de função. Módulo configurado como administrador local antes de assumir authenticated. Parâmetros não são registrados pelo instrumento; logs integrais permanecem privados. O JSON versionado conserva somente métricas/nós permitidos, sem predicados/valores privados.

Duas carteiras sintéticas, cada uma com 2.000 tarefas, 1.000 visitas, 500 propostas, 500 negociações e 100 apresentações existentes e vinculadas. Mais 1 mil/10 mil/100 mil/300 mil eventos sintéticos adicionais, distribuídos entre entidades reais dessas carteiras; aproximadamente 1/19 direcionado ao cliente consultado. Os eventos de criação das fixtures também estão presentes. Não se usaram IDs órfãos no resultado final.

Cinco execuções instrumentadas por página (0, 20, 200), 60 execuções no total. Cache aquecido pela carga; sem teste de disco frio, concorrência de leitores em carga ou garantia de SLA de produção.

| Eventos adicionais | Mediana pág. 0 | Maior tempo entre páginas |
| --- | --- | --- |
| 1.000 | 8,132 ms | 10,607 ms |
| 10.000 | 10,372 ms | 13,287 ms |
| 100.000 | 35,501 ms | 38,459 ms |
| 300.000 | 89,750 ms | 120,732 ms |

Em 300 mil, o plano varreu audit_logs, retornou 19.890 registros candidatos e filtrou 288.461; 5.305 blocos em cache, sem leitura física nessa amostra. Depois de Append/Sort, Limit entrega 51 registros. Ramos relacionados usaram Bitmap/Index Scan em tasks/visits/proposals, Hash Join para negotiations e scans em marketing_shares/crm_event_log. Todos os ramos constam das métricas, não apenas o filtro de cliente.

O OR/EXISTS ainda induz varredura e custo aproximadamente linear. OFFSET elevado não evita essa leitura. Não houve gargalo impeditivo no recorte medido; não se justifica alterar o SQL autorizado apenas para produzir números menores. Em crescimento muito superior, reavaliar índice por entity/entity_id/data e referências de cliente, possível decomposição por entidades e paginação por cursor, com novo plano e revisão de segurança. Nenhum índice extra foi criado no staging ou na migration.

Critério local de engenharia declarado pelo runner: máximo 500 ms até 100 mil e 1.500 ms em 300 mil, não um SLA acordado. PASS folgado nesse recorte; os números e limites permitem revisão independente.

## Recuperação ensaiada

1. **Rollback de aplicação:** contratos antigos executados sobre schema expandido; inserções antigas usam defaults e atualização legada preserva perfil novo, revisão e auditoria. Reverter frontend não requer apagar colunas/recibos/eventos. Isso é ensaio de contrato SQL, não deployment/rollback de Vercel ou login real da interface antiga.
2. **Reversão de schema:** não executada, nem recomendada como primeira resposta. Exigiria autorização adicional, backup/exportação protegida de dados novos e análise de dependências. Não usar DROP CASCADE nem apagar auditoria, eventos ou perfis.
3. **Recuperação de backup:** restaurado novamente em banco novo `privilege_restore_b09d84436ab2`, PASS, histórico original de 21 versões e objetos da Etapa 03 ausentes. O banco expandido anterior foi mantido com perfis/eventos sintéticos presentes. Isso prova recuperação independente, sem destruir dados pós-migration para forçar comparação. Em incidente real, reconciliar alterações posteriores ao snapshot antes de qualquer substituição/autorização de cutover.

Arquivo original e manifesto não foram sobrescritos; hash original reconfirmado. Bancos isolados e logs privados não foram removidos automaticamente.

## Regressão e dificuldades encontradas

Lint, TypeScript, build: PASS. Código 150/150; PGlite 349/349; navegador Edge com fixtures 34/34, incluindo as regressões da Etapa 02 e 360/768/1440. Nenhum mock foi chamado de sessão autenticada real.

Primeiro helper teve incompatibilidade de PSModulePath do PowerShell 5.1; corrigido apenas no processo local. Tentativas de backup incompletas foram mantidas e não classificadas como backup. Diálogo relançado em processo visível; o backup concluído é somente o identificado acima. Na instrumentação local, LOAD após SET ROLE gerou 42501; depois VERBOSITY sqlstate ocultou os planos NOTICE. Corrigido apenas o runner: configuração administrativa antes da troca de papel e verbosidade completa apenas nas medições, com logs privados. Cada repetição usou restauração nova; nenhuma função/RLS foi enfraquecida para adaptar resultados.

## Entrega e próxima autorização

Evidências sanitizadas: `tests/security/crm-quick-service-postgres-20261105.json` e `crm-quick-service-stage03c-20261105.json`; plano completo privado junto ao backup. SHA do runner executado consta da evidência e corresponde ao arquivo versionado. SQL/funcionalidades originais continuam no hash aprovado.

**Recomendação: APTO para a próxima autorização específica de staging, após revisão do Work.** Antes de qualquer execução remota, renovar identidade/histórico/hash, dependências/locks, backup conforme frescor necessário, plano de aplicação única/postflight/rollback e autorização explícita. A nova autorização não está implícita neste PASS. Preview, homologação autenticada, merge, produção e Etapa 04 permanecem não autorizados nesta fase.

Referências técnicas: [pg_dump 17](https://www.postgresql.org/docs/17/app-pgdump.html), [auto_explain 17](https://www.postgresql.org/docs/17/auto-explain.html). Script de backup/restauração homologado mantido sem alterações.
