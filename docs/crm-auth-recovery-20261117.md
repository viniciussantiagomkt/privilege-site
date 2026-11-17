# Etapa 03 - Recuperacao renovada apos delta Auth

## Resultado e natureza da evidencia

**PASS no escopo de recuperacao solicitado; aguardar revisao independente Work antes de retomar a aplicacao.** Execucao e verificacoes abaixo sao do Codex implementador, nao auditoria independente do Work. Base c9f816c770b0ea1b3604944f6470066a29e26713, branch work/crm-stage03f-controlled-fixes-20261109, PR #16 Draft.

Nenhuma migration CRM ou interna Auth/Storage foi aplicada/reaplicada no staging nem executada como migration no novo banco restaurado. O restore reproduz o conteudo do arquivo, inclusive DDL e registros historicos; nao roda scripts internos de atualizacao. Nenhum repair, usuario, sessao Auth, permissao/RLS gerenciada, owner de extensao, producao, deployment ou merge alterado.

## Delta revisado, sem inferencia de datas

Comparadas TODAS as 82 versoes Auth da restauracao anterior com TODAS as 84 versoes da origem. Somente adicoes 20260911120000 e 20261030120000; nenhuma remocao/substituicao. Listas completas no JSON sanitizado e lista revisada pinada em scripts/crm-recovery-auth-versions.json. Identificadores nao comprovam data/hora de execucao.

Mapeamento oficial informado/revisado pelo Work, estado observado pelo Codex: auth.one_time_tokens.link_token_hash text nullable sem default; auth.saml_providers.dedicated_scope boolean nullable sem default. Foi confirmado tambem o indice one_time_tokens_link_token_hash_hash_idx, owner supabase_auth_admin, definicao CREATE INDEX ... ON auth.one_time_tokens USING hash (link_token_hash), nao unico, valido/pronto/live.

Comparacao independente de indices da copia anterior e fonte: 272 -> 273; somente esse indice adicionado, zero alteracoes nos 272 anteriores e zero remocoes. Constraints nao foram usadas como substituto de cobertura de indices.

## Contrato de recuperacao ampliado

- Mantidos exatamente dez grupos e algoritmo crm-recovery-catalog-v2, SQL SHA-256 07d1261c90393c95ab4d0ed43792695c99a6b8c3c34d6af6f80dcea08417accd, sem alterar nem reinterpretar hashes antigos.
- Snapshot complementar novo crm-recovery-indexes-v1 nos mesmos cinco schemas: public, crm_private, auth, storage e supabase_migrations. Captura cada nome/tabela, definicao, owner, valid, ready, live, unique, primary e exclusion, com ordenacao C.
- Snapshot de plataforma formato 2 inclui historico Auth completo, separado de CRM e Storage. Manifesto formato 3 referencia hashes dos SQL auxiliares, snapshot de indices e os tres historicos. Manifestos antigos nao sao convertidos/sobrescritos; o procedimento novo os rejeita.
- Backup compara baseline previamente fixada por SHA-256 antes de pg_dump e repete catalogo/plataforma/indices depois. Restore compara cada categoria, cada versao e cada indice; nao aceita automaticamente novas migrations internas nem novos indices.
- Historicos exigidos: 22 versoes CRM especificas; Storage ids 0..80 com todos os nomes/hashes revisados; exatamente as 84 versoes Auth revisadas, nao apenas contagem.
- Parametros explicitos de backup/restauracao e hashes de arquivo/manifesto permanecem obrigatorios. Nenhum default para backup antigo foi restaurado.

## Backup novo e protecao dos originais

Fonte exclusiva sdpqphiooiuglywcmkxv, PostgreSQL 17.11; clientes oficiais pg_dump/pg_dumpall/pg_restore/psql 17.11. Conexao direta TLS exigido, default_transaction_read_only=on. Senha por campo local mascarado, temporaria no ambiente do processo, nunca em argumentos, chat ou arquivo.

- Backup concluido 2026-11-17T19:19:26.6448607Z (16:19:26 em Sao Paulo).
- Arquivo custom: 889967 bytes.
- Dump SHA-256: 73357c35cf3ff17a1a357a27cd3f7ab94ce060534a8b7153b55bec1df6781b5b.
- Manifesto SHA-256: 69f747f96b7160d8e30f59d37f2c378ffb875976f467e4930c1ebd479ec405d9.
- Baseline nova SHA-256: 33d2ca19b94e090c8ce45ca320d35f504ea743e421d3ba531c43c3b463d48734.
- Snapshot de plataforma SHA-256: 99184543947f6fe9db81f7986e5c634e9864958ea0216b6ccd33e1a57db5cc54.
- Snapshot de indices SHA-256: 0e5471fa91c014808b510ffaa5c2882d550489c2b0d27196758e5cd5e545892c.

Pasta privada nova: %LOCALAPPDATA%\PrivilegeCRM-Backups\staging-20261117-161824-2e4a820c, ACL usuario local/SYSTEM. Dump, roles.sql, manifestos originais e logs continuam fora do Git. O helper terminou e nao guardou a senha em arquivo.

Originais de16/11 reconferidos sem alteracao: dump 93e1b967c3a51188fc3cb5196495f44a62f39b8e3ffd02901770f6b3b976f3db; manifesto f43460775803aa09e2deb39ec1d5d57eb24b2987847d3e7902d8edfce358603b; baseline 134d962d5562a93028e146e7a45fbc03314690658797af92d8e942480e073532. Hash de roles.sql original confere. Relatorios e banco restaurado de16/11 preservados.

## Restauracao real e preflight renovado

Banco NOVO privilege_restore_94d1854396fe, no container local aprovado, PostgreSQL17.6, imagem fixada por digest, rede none, zero portas/binds, nao privilegiado. Restauracao transacional pg_restore --single-transaction --exit-on-error terminou exit0 e gerou RESTORE PASS em 2026-11-17T19:19:47.7471150Z. Nenhuma conexao/destino remoto pelo restore, nenhum banco anterior sobrescrito ou descartado.

Confirmados no banco novo: 22 migrations CRM; 81 registros Storage ids0..80, ultima80/hash18cfbf5c5b356469e1e95f3aa1b59ba111d82a06; todas as84 versoes Auth; 809 colunas; 273 indices, incluindo o hash index previsto, com todas as definicoes/owners/estados iguais a origem. Dez fingerprints iguais, RLS/grants/owners preservados no escopo. Oito roles relevantes e13 memberships iguais. Consulta adicional:458 owners de schemas/relacoes/rotinas/tipos nos schemas abrangidos, MD5 agregado95b490d7bc701921ee111ac2e681f0f3, iguais. MD5 e comparador de catalogo; integridade de arquivos usa SHA-256.

Ressalvas ja aceitas pelo Work, verificadas inalteradas: local17.6 versus origem17.11; pg_stat_statements1.11, pgcrypto1.3 e uuid-ossp1.1 com owner postgres na origem e supabase_admin local. Versoes/schemas iguais; plpgsql e supabase_vault tambem preservados. Nenhuma tentativa de corrigir owners ou permissoes. Esse limite nao e alegacao de equivalencia global binaria ou de todos os membros de extensoes fora dos cinco schemas.

Releitura remota na mesma janela: baseline revisada e origem iguais em catalogo/plataforma/indices; extensoes sem delta adicional. Zero locks aguardando, indices invalidos ou tabelas publicas sem RLS. Projeto saudavel. Health Advisors sem alertas; Security Advisors mantem avisos conhecidos (3 INFO sem policy,16 WARN anon SECURITY DEFINER,40 WARN authenticated SECURITY DEFINER,1 WARN leaked-password protection). Remediacoes no JSON; nao alteradas fora do escopo.

## Validacao, limites e proximo passo

192 testes de codigo PASS, incluindo sete de recuperacao; parser PowerShell, lint, typecheck e diff-check PASS. Testes reais de rejeicao PowerShell: Auth ausente/extra/substituida com contagem igual; alteracao de definicao ou owner de indice, indice nao pronto, ausente ou extra; versoes legadas/categorias inesperadas continuam bloqueadas. Corrigido no teste local um detalhe de enumeracao de array JSON do Windows PowerShell5 antes do backup; a lista completa permanece84strings, inclusive 00.

A CI da publicacao sera registrada no PR. Sua suite SQL usa fixtures sinteticas isoladas, nao homologacao HTTP, aplicacao no staging ou modificacao no novo banco restaurado. Nenhuma homologacao HTTP autenticada e declarada a partir desta recuperacao.

Backup logico nao inclui bytes Storage nem configuracoes externas SMTP/OAuth/Vercel/Functions. Contagens auxiliares nao sao o mesmo snapshot transacional de pg_dump. Evidence JSON e metadados de indices nao contem linhas de clientes, valores de tokens ou credenciais. Alteracoes restritas aos procedimentos de recuperacao, SQL de leitura, testes e evidencias.

SQL de seguranca aprovado inalterado, SHA-256042b3f49dc27e91fefa95854af0bca5c5d5be687b301e69ecc3c362fb04b874d; alvo segue ausente do staging. Evidencia: tests/security/crm-auth-recovery-20261117.json. Entregar ao Work para verificacao independente da baseline/recuperacao; NAO retomar a aplicacao nesta tarefa.
