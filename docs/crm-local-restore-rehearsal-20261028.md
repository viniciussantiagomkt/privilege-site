# Ensaio de restauração local do backup de staging

Preparado em 28/10/2026. Nenhuma migration ou publicação de preview faz parte deste procedimento.

## Evidências recebidas do usuário

- Backup criado em 2026-10-28T13:01:25.5280876Z.
- Arquivo: 764683 bytes.
- SHA-256: A40307EE86FF4D128168DBAA6C47EC431C57721440651AFBD352AB403C6A72E8.
- Listagem e decodificação: PASS, conforme saída local enviada pelo usuário. O arquivo não foi enviado ao agente.
- Docker Desktop funcionando no contexto desktop-linux, Windows named pipe.
- Imagem baixada: supabase/postgres:17.6.1.136, digest sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00.
- Contêiner privilege-crm-restore-20261028: rede none e portas {}. PostgreSQL accepting connections. postgres tem CREATEDB sem SUPERUSER; supabase_admin tem SUPERUSER e CREATEDB.

A documentação oficial atual e o docker-compose do Supabase foram consultados para a imagem. O estágio foi consultado somente para extensões instaladas: pg_stat_statements 1.11, pgcrypto 1.3, plpgsql 1.0, supabase_vault 0.3.1 e uuid-ossp 1.1. Não houve leitura de segredos Vault nem alterações remotas.

## Executar no Windows

Salvar scripts/restore-crm-backup-local.ps1 em Downloads. Deixar o Docker Desktop aberto.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\restore-crm-backup-local.ps1"
```

A pasta padrão aponta para o backup específico informado pelo usuário. Se o arquivo foi movido para outra pasta privada, passar -BackupDirectory com o caminho local. Não passar senha ou URL de banco. O script não recebe nem solicita credenciais remotas.

## Guardas e escopo

O script verifica hash/tamanho e manifest, contexto Docker local via named pipe, imagem por digest, rede none, ausência de portas, bind mounts e privileged. Copia o dump para /tmp do contêiner e confere seu hash. Cria um banco NOVO a cada execução, a partir de template0; não reusa, exclui ou reseta bancos anteriores. Restaura com supabase_admin via socket local usando pg_restore --single-transaction --exit-on-error --clean --if-exists. O clean está limitado ao banco recém-criado, inclusive seu schema public vazio; não atinge o banco postgres de inicialização ou qualquer servidor remoto.

Não importa roles.sql indiscriminadamente sobre os papéis já existentes na imagem. O restore preserva ownership/grants do arquivo e aborta se algum papel necessário estiver ausente. Caso isso aconteça, examinar as dependências e preparar somente os papéis necessários no contêiner isolado antes de repetir o ensaio; não ignorar erros para declarar PASS.

Um restore transacional sem erros é seguido por contagens de Auth/leads/clientes/materiais/histórico comparadas ao manifest e verificações de RLS/policy/função. Atividade concorrente durante a geração original pode causar diferenças porque o manifest usa contagens anteriores ao snapshot de pg_dump. Diferenças produzem REVIEW_REQUIRED e precisam ser examinadas; não modificar dados para forçar correspondência.

O original do dump e seu manifest não são alterados. A verificação grava restore-validation-privilege_restore_....json na pasta privada existente, com UTC, digest, banco local, resultado, contagens e limites. Logs de erros ficam na mesma pasta. O contêiner e os bancos de teste não são removidos automaticamente.

## Critérios e limites

PASS exige: restore com exit 0, contagens do manifest iguais, histórico/M5 e estado de ausência/presença do novo RPC iguais ao manifest, tabelas public com RLS, policy marketing_storage_read e função de audiência presentes, dump original com hash inalterado.

Isso valida restauração de banco para este ensaio; não testa login Auth, HTTP Storage, dados criptografados Vault com a chave original, bytes de arquivos externos ou configurações SMTP/OAuth/API. Não equivale a recuperação integral de todos os serviços Supabase nem homologa os fluxos do CRM.

O script foi revisado estaticamente; PowerShell e Docker não estão disponíveis no runtime do agente. A execução será feita no Windows do usuário; até receber resultado verificável, a restauração segue PENDENTE. Não alegar execução, aprovação de restore ou aplicação de migration antecipadamente.

Enviar ao agente somente a mensagem final PASS ou a mensagem genérica de falha. Não enviar dumps, roles.sql ou logs completos: um erro COPY pode conter valores privados. Em caso de falha, orientar extração sanitizada do diagnóstico mínimo antes de novas ações. Não usar --no-owner/--no-acl para contornar falhas sem discutir o impacto sobre a fidelidade do restore.

## Continuação

Após resultado e relatório sanitizado do ensaio, renovar preflight remoto do PR #7 (histórico, drift, volumes e locks). A autorização da migration já foi recebida e permanece condicionada a esses requisitos. Não repetir M1–M5. Publicação de preview do PR #7 exige autorização separada. Produção e main permanecem fora do escopo.
