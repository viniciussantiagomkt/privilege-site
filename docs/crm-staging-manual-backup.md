# Backup manual antes da migration do PR #7

Exportação autorizada pelo usuário em 19/10/2026. A migration continua condicionada a backup adequado e preflight atualizado; preview não autorizado nesta etapa.

## Bloqueio do agente

O conector Supabase disponível executa SQL e migrations, mas não fornece stream de pg_dump nem credencial PostgreSQL. O ambiente não tem PostgreSQL client, Docker ou senha de banco configurados. As configurações locais disponíveis têm somente URL/chave pública de staging. Nenhum backup foi exportado pelo agente e não foi aplicada a migration. Não substituir um dump por contagens/hashes ou exportação parcial de tabelas via SQL.

## Gerar no Windows do usuário

1. Instalar os clientes PostgreSQL **17**, incluindo pg_dump, pg_dumpall, pg_restore e psql. Fonte: https://www.postgresql.org/download/windows/ . O staging usa PostgreSQL 17.11. O script verifica as versões antes de conectar.
2. Salvar `scripts/backup-crm-staging.ps1` em Downloads. Combinar uma pausa breve nos testes que escrevem dados, para facilitar a comparação posterior de contagens. O script não altera configurações globais do banco nem interrompe outras sessões.
3. Abrir o projeto **privilege-imoveis-staging / sdpqphiooiuglywcmkxv**, clicar Connect. Usar o host Direct connection ou **Session pooler**, porta 5432. Não usar Transaction pooler/6543. O script rejeita outro host direto e fixa o usuário do pooler no ref de staging.
4. Executar no PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\backup-crm-staging.ps1"
```

Se os executáveis estiverem em outra pasta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\backup-crm-staging.ps1" -PgBin "D:\PostgreSQL\17\bin"
```

O ajuste ExecutionPolicy vale somente para esse processo. Digitar a senha do **banco staging** no prompt oculto. Não é sb_secret, anon, publishable nem senha de login do CRM. Não enviar senha ou URL contendo senha no chat. Se não souber a senha, parar: redefini-la afeta conexões e não está autorizado automaticamente.

## Arquivos e limites

Pasta privada em `%LOCALAPPDATA%\PrivilegeCRM-Backups\staging-...`, com ACL para usuário atual e SYSTEM. Não está dentro do repositório, Downloads, OneDrive ou outra pasta compartilhada. A ACL não equivale a criptografia; proteger também o computador/disco e guardar uma segunda cópia em armazenamento privado criptografado apropriado.

- `staging-database.dump`: schema e dados do banco acessíveis ao usuário postgres, preservando definições/grants no arquivo, incluindo public, Auth, metadados Storage e histórico. Falha de permissão aborta o procedimento; não é ignorada para declarar sucesso.
- `roles.sql`: definições dos papéis, sem senhas dos papéis.
- `archive-toc.txt`: índice do arquivo; não enviar porque contém nomes de objetos.
- `source-counts.json`: contagens anteriores ao dump, sem registros pessoais. Não é snapshot compartilhado com a conexão de pg_dump; atividade concorrente pode mudar essas contagens.
- `manifest.json`: projeto, UTC, tamanho, SHA-256 e resultado de listagem/decodificação.

O dump pode conter hashes de senha Auth, tokens/sessões e dados privados: **não subir em GitHub, Library, chat, e-mail ou drive compartilhado**. A senha de conexão fica temporariamente no ambiente do processo e é retirada/restaurada em finally, sem argumento de linha de comando. Arquivos SQL temporários de decodificação são removidos ao terminar com sucesso; em falha podem permanecer na mesma pasta privada.

Não inclui bytes dos arquivos Storage nem configurações externas (SMTP, OAuth, Vercel, Edge Functions). Essas limitações importam em recuperação completa do projeto. A migration proposta não altera os bytes nem as contas/configurações Auth, mas o backup não deve ser anunciado como recuperação de todos os serviços.

## Verificação e retorno ao agente

O script enumera o arquivo, decodifica todos os blocos e confere a presença de tabelas/dados e policy essenciais. SHA-256 permite conferir integridade em cópias. **Isso não é teste de restauração.** O manifest mantém `test_restore=NOT_EXECUTED` até haver evidência independente.

Depois da execução, informar apenas: sucesso/erro, data UTC, tamanho e SHA-256 do arquivo, se o manifest indica PASS e onde a cópia privada está guardada (sem caminho contendo segredos). Não enviar dump, roles, SQL decodificado, senha ou tokens.

A restauração precisa ser ensaiada em Supabase local PostgreSQL 17 ou destino descartável previamente validado, com extensões/roles compatíveis. O script não contém comandos de restore, DELETE, reset, DDL ou migrations. Não testar restauração no staging de homologação nem em produção. Ainda não há ambiente de restauração autorizado/disponível ao agente com acesso a esse backup; preparar o destino e o procedimento com guardas antes de restaurar. A aprovação da migration não transforma automaticamente `list/decode PASS` em backup restaurável validado.

## Validação desta ferramenta

Revisão estática de escopo e segurança realizada. Runtime Windows/PowerShell e acesso PostgreSQL real não disponíveis no ambiente do agente: execução e restauração **não testadas**. Os testes anteriores do CRM não validam este script. O PR permanece em rascunho; nenhum preview novo deve ser disparado.
