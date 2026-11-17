# Etapa 03 - Recuperacao renovada apos Storage 80

## Parecer e escopo

**PASS para backup e restore no escopo contratado; revisao Work obrigatoria das diferencas de plataforma antes de qualquer retomada da aplicacao. Fidelidade global de ownership: PARCIAL, nao aprovada automaticamente.** Nao e homologacao HTTP nem autorizacao de migration. Nenhuma migration CRM ou Storage foi executada/reaplicada, nenhuma permissao gerenciada reparada, nenhum usuario, producao, deployment ou merge alterado.

Base: 8f0bbc87ae009029dd61e36622ba0da9c4ec7824, branch work/crm-stage03f-controlled-fixes-20261109, PR #16 Draft. Mudancas restritas a procedimentos de recuperacao, testes e evidencias sanitizadas.

## Contrato corrigido

- Backup exige DestinationRoot, BaselineFile e ExpectedBaselineSha256 explicitos. Pasta nova aleatoria no root privado local, sem destino padrao para um arquivo antigo.
- Restore exige BackupDirectory, ExpectedArchiveSha256, ExpectedArchiveBytes e ExpectedManifestSha256 explicitos; removidos todos os defaults de backups historicos.
- Manifesto v2 registra algoritmo **crm-recovery-catalog-v2** e SHA-256 do SQL de fingerprint. Versoes desconhecidas/legadas sao rejeitadas antes de criar o banco local.
- Exige exatamente dez categorias: columns, constraints, function_grants, functions, policies, schemas, table_grants, tables, triggers e views. Categoria ausente ou extra bloqueia.
- Algoritmo v2 preserva as correcoes de texto sem truncamento, search_path pg_catalog e ordinal logico; adiciona owners de schemas/tabelas/funcoes/views e ordenacao C deterministica. Hashes v1 nao sao reinterpretados como v2.
- Historicos CRM e Storage separados: exatamente 22 versoes CRM esperadas e historico Storage de id 0 ate 80, com nome/hash final fixados. Storage 80 significa **81 registros**, nao 80 registros. A baseline revisada fixa tambem os nomes/hashes anteriores, roles e memberships; qualquer mudanca posterior bloqueia, nao e absorvida automaticamente.

## Delta auditado

Storage 80: revoke-extra-lifecycle-postgres-grants, hash interno **18cfbf5c5b356469e1e95f3aa1b59ba111d82a06**.

Removidos diretamente de postgres 14 grants em relacoes e dois EXECUTE. Nas tabelas storage.bucket_lifecycle_states e storage.lifecycle_abandoned_artifacts, SELECT direto permanece; INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN diretos foram removidos. Nas funcoes storage.delete_lifecycle_objects(uuid[]) e storage.reconcile_lifecycle_state(text,boolean), EXECUTE direto foi removido.

**Acesso efetivo nao equivale a ACL direta:** pg_has_role(postgres,service_role,USAGE) e verdadeiro; has_function_privilege continua verdadeiro nos dois RPCs internos e has_table_privilege UPDATE continua verdadeiro nas duas tabelas, por service_role. Isso foi conferido na fonte e no restore. Nao se declara revogacao efetiva total nem se reabre grant algum.

Comparacao inicial com o algoritmo anterior e a evidencia bloqueada de 12/11: nenhum delta adicional de catalogo. Definicoes/memberships do roles.sql antigo e novo coincidem apos remover somente comentarios, linhas vazias e marcadores restrict/unrestrict gerados pelo pg_dump. Nenhum conteudo de roles.sql e publicado.

## Backup e restauracao reais

Backup concluido em **2026-11-16T18:03:26.9666681Z** (15:03:26 em Sao Paulo), somente staging sdpqphiooiuglywcmkxv, PostgreSQL 17.11, TLS exigido e default_transaction_read_only=on. Clientes oficiais pg_dump, pg_dumpall, pg_restore e psql 17.11. Senha somente em campo local mascarado e ambiente temporario do subprocesso, sem argumentos/arquivos/chat/Git.

- Arquivo custom: **900229 bytes**.
- SHA-256 do dump: **93e1b967c3a51188fc3cb5196495f44a62f39b8e3ffd02901770f6b3b976f3db**.
- SHA-256 do manifesto: **f43460775803aa09e2deb39ec1d5d57eb24b2987847d3e7902d8edfce358603b**.
- SHA-256 do fingerprint SQL: **07d1261c90393c95ab4d0ed43792695c99a6b8c3c34d6af6f80dcea08417accd**.
- SHA-256 da baseline revisada privada: **134d962d5562a93028e146e7a45fbc03314690658797af92d8e942480e073532**.
- Pasta privada: %LOCALAPPDATA%\PrivilegeCRM-Backups\staging-20261116-150230-2566c4fb, ACL restrita ao usuario local e SYSTEM. Dump, roles, manifesto original, logs e SQL decodificado nao vao ao GitHub.

Restore real em banco **novo** privilege_restore_55d939ac264d, concluido em **2026-11-16T18:03:57.3934504Z**. pg_restore --single-transaction --exit-on-error: exit 0. Container aprovado, imagem fixada por digest no script, network none, sem portas/bind mounts, nao privilegiado. Hash do arquivo copiado e original conferidos. Nenhum banco anterior sobrescrito ou apagado.

O script final produziu **RESTORE PASS**, sem ressalva suplementar: dez categorias iguais, 22 migrations CRM, 81 registros Storage ate 80, oito roles relevantes e 13 memberships iguais. Checks RLS passaram. Verificacao adicional somente leitura de owners incluiu schemas, tabelas, views, sequences, funcoes e tipos: **458 owners**, MD5 agregado 95b490d7bc701921ee111ac2e681f0f3, identico na fonte e no restore. MD5 e comparador de catalogo, nao assinatura criptografica; integridade de arquivos usa SHA-256.

## Diferencas de plataforma e preservacao

1. Fonte PostgreSQL **17.11**, servidor local **17.6**. Diferenca de patch explicita; mesmo major 17. Restore transacional, catalogo, ACLs, owners, roles, memberships e historicos passaram. Nao declarar igualdade binaria de versoes.
2. A imagem Supabase local preexistente fornece roles/extensoes necessarios. Nenhuma adaptacao nova foi necessaria ou executada; isso nao prova portabilidade a PostgreSQL vanilla sem preparacao.
3. roles.sql tem hash de arquivo diferente por marcadores de seguranca gerados/comentarios; os comandos reais comparados sao iguais. Nenhuma diferenca de definicao de papel ou membership foi aceita silenciosamente.
4. Backup anterior representa Storage 79 e permanece intacto: dump 76e2026889d7325df891e8c4eb5616b0b7ff3f93f9a84b408699d5c8b7a94567 e manifesto 74300323d5cae8057795de7f12033baab6c137dfda9fe5fc99c04505a7330878 reconferidos. Relatorio original REVIEW_REQUIRED e complemento normalizado anteriores preservados, assim como a restauracao antiga. Nao adulterar evidencias historicas para refletirem a baseline nova.

A checagem complementar de pg_extension encontrou as tres diferencas abaixo, fora dos cinco schemas do fingerprint e do agregado dos 458 owners. Publicacao foi pausada para investigar; nao se alterou owner nem permissao para ocultar o delta. O mesmo padrao existe no banco restaurado anterior, e a TOC deste arquivo registra EXTENSION sem owner explicito.

| Extensao | Versao fonte/local | Schema fonte/local | Owner fonte -> local | Tratamento |
| --- | --- | --- | --- | --- |
| pg_stat_statements | 1.11 / 1.11 | extensions / extensions | postgres -> supabase_admin | Revisao Work, nao aceitar automaticamente |
| pgcrypto | 1.3 / 1.3 | extensions / extensions | postgres -> supabase_admin | Revisao Work, nao aceitar automaticamente |
| uuid-ossp | 1.1 / 1.1 | extensions / extensions | postgres -> supabase_admin | Revisao Work, nao aceitar automaticamente |

plpgsql 1.0 e supabase_vault 0.3.1 coincidem em versao, schema e owner. As tres diferencas sao consistentes com a criacao pelo usuario local do restore: a [documentacao PostgreSQL 17](https://www.postgresql.org/docs/17/sql-createextension.html) estabelece que o executor de CREATE EXTENSION se torna owner. O [formato logico de extensoes](https://www.postgresql.org/docs/17/extend-extensions.html) recria a extensao, em vez de serializar cada membro individualmente. Esta explicacao nao equivale a aprovacao operacional: ownership pode afetar privilegios administrativos, e os objetos membros fora dos cinco schemas nao receberam prova completa de equivalencia de ACL/owner nesta rodada. Nao se afirma igualdade global de ownership/ambiente nem prontidao para aplicar o SQL. Work deve aceitar explicitamente o limite ou especificar ensaio complementar, sem alterar permissoes gerenciadas por iniciativa do agente.

## Preflight renovado e validacao

Releitura remota apos restauracao: zero divergencias adicionais de fingerprint, roles/memberships ou historicos contra a baseline capturada antes do backup. Zero locks aguardando, indices invalidos e tabelas publicas sem RLS. Projeto ACTIVE_HEALTHY. Migration CRM de seguranca continua ausente, SQL aprovado inalterado: SHA-256 **042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d**.

Health Advisors: nenhum alerta. Security Advisors preservam baseline conhecida: rls_enabled_no_policy 3 INFO, anon_security_definer_function_executable 16 WARN, authenticated_security_definer_function_executable 40 WARN, auth_leaked_password_protection 1 WARN. URLs de remediacao no JSON; nada corrigido fora do escopo.

Testes locais: **191 testes de codigo PASS**, incluindo seis de recuperacao e rejeicoes reais em PowerShell; parser PowerShell, lint, typecheck e diff-check PASS. Os testes de rejeicao cobrem versao legada, categorias ausentes/extras, Storage 81 nao autorizada, CRM 23 e baseline divergente. A CI do commit publicado sera registrada no PR, sem reutilizar resultados antigos como novos.

## Operacao e limites

Executar os scripts a partir do repositorio com o contrato e os dois SQL auxiliares ao lado, nao copiar apenas um ps1 para Downloads. Exemplo de backup: .\scripts\backup-crm-staging.ps1 -DestinationRoot <root-privado> -BaselineFile <baseline-revisada> -ExpectedBaselineSha256 <hash-conferido>. Exemplo de restore: .\scripts\restore-crm-backup-local.ps1 -BackupDirectory <nova-pasta> -ExpectedArchiveSha256 <hash> -ExpectedArchiveBytes <bytes> -ExpectedManifestSha256 <hash-conferido>. Nunca usar valores antigos por conveniencia nem obter hash de fonte nao revisada.

O snapshot consistente e o do pg_dump; contagens auxiliares sao de outra transacao. Nao inclui bytes Storage, configuracoes SMTP/OAuth/Vercel/Functions ou recuperacao completa Supabase. Nao houve homologacao HTTP autenticada. Publicar somente este relatorio, SQL de leitura, scripts/testes e JSON sanitizado. Evidencia: tests/security/crm-storage80-recovery-20261116.json. Aguardar revisao Work; nao retomar aplicacao nesta tarefa.
