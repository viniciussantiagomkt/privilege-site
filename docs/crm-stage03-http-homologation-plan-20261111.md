# Etapa 03 | Roteiro de homologacao HTTP independente
Estado de TODOS os casos abaixo nesta entrega: **NAO EXECUTADOS / BLOCKED**.
Preparacao documental; nao e autorizacao para criar dados, contas, alterar papeis ou aplicar SQL no staging.

## Pre-condicoes e isolamento
- Usar somente Supabase Staging sdpqphiooiuglywcmkxv e Preview aprovado do PR #16.
- Nao confundir o Preview antigo do PR #15, o Preview com erro do PR #19 ou o HEAD novo sem deploy.
- Reconfirmar SHA do app realmente publicado e versao/hash da migration realmente aplicada. Sem a nova migration, negativas nas tres views administrativas ainda nao devem ser declaradas PASS.
- Quatro contas ficticias JA EXISTENTES A, B, Gestor e Administrador, confirmadas, habilitadas, com papeis broker/broker/manager/admin. Nao criar contas; nao modificar papeis para produzir o cenario.
- A/B precisam de brokers ativos vinculados; registrar somente aliases nos relatorios.
- Sessoes obtidas por login oficial de cada conta em runner dedicado autorizado. Nunca copiar cookies/localStorage/JWT do navegador do usuario, usar service_role ou claims SQL para este teste.
- Chave publica apikey do staging; Authorization Bearer da sessao propria por perfil. Para anon, chave publica com sessao ausente, conforme o tipo de chave. Nunca usar chave privilegiada.
- Segredos somente em memoria/canal local seguro; desabilitar logs de headers, screenshots de credenciais, historico de shell contendo JWT e exportacao de colecoes autenticadas.
- Nao enviar links/WhatsApp/email. Nenhum teste exige envio de mensagem.
- Esta rodada NAO dispoe de sessoes proprias nem autorizacao de escritas remotas; para executar casos mutantes, obter autorizacao especifica para fixtures sinteticas, sem abrir permissoes.
- O executor Work deve registrar PASS, FAIL ou BLOCKED por identidade e caso; 200 sozinho nao prova seguranca.

## Dados necessarios (controle privado fora do Git)
Manifesto: run_label, ambiente, SHA do app, migration/hash, aliases A/B/G/M, IDs dos registros sinteticos, broker proprietario, action_ids, revisions, timestamps, tokens de capacidades somente no armazenamento privado autorizado, e status de limpeza.
O relatorio publico deve conter alias de fixture e resultado, nunca dados pessoais/JWT/token de apresentacao completo.
- CLIENT_A e CLIENT_B: contatos sinteticos novos ou fixtures preexistentes inequivocamente identificadas, cada um na carteira propria. Nao usar IDs de clientes reais.
- CLIENT_LEGACY_A: fixture antiga controlada, com interesse vazio, apenas se existente e autorizada; nao alterar contato comercial para simular legado.
- Propriedade sintetica propria para midia/apresentacao, ja autorizada para teste, sem modificar imovel publicado.
- SHARE_VALID, SHARE_REVOKED e SHARE_EXPIRED: apresentacoes sinteticas existentes e autorizadas; sem esses recursos, marcar BLOCKED. Nao revogar/expirar links comerciais reais para testar.
- WRONG_TOKEN: UUID bem formado aleatorio inexistente. Token malformado e um caso diferente.
- Telefones sintaticamente validos para o cadastro, sem enviar mensagem. Nenhum numero brasileiro e declarado reservado; verificar colisao na carteira autorizada e usar apenas dados controlados.
- Emails de cliente sob example.invalid, nomes HML03-<run>-A/B, observacoes com sentinela sintetica exclusiva.
- UUID action_id por operacao; reutilizar o MESMO UUID em retries idempotentes.

## Contrato base das chamadas
Base: https://sdpqphiooiuglywcmkxv.supabase.co/rest/v1
Headers: apikey=<chave publica>; Authorization=Bearer <sessao propria>; Content-Type=application/json.
Somente nos PATCH de prova: Prefer: return=representation para observar zero linhas afetadas.
Nao colar valores secretos no terminal/chat. Formularios ou runner devem solicitar credenciais por canal local seguro.

Payload valido de crm_save_quick_client:
```json
{
  "target_client": null,
  "expected_revision": null,
  "action_id": "<UUID_DA_OPERACAO>",
  "payload": {
    "name": "HML03-<run>-A",
    "phone": "<telefone controlado valido com DDD>",
    "email": "fixture-a@example.invalid",
    "contact_type": "cliente",
    "notes": "Sentinela sintetica de homologacao",
    "interest_profile": {"purpose": "compra"}
  }
}
```
Para atualizar: target_client=<CLIENT_A>, expected_revision=<revisao atual>. Nunca enviar broker_id/organization_id dentro do payload.
Para caso alheio, usar payload previamente provado valido, cliente B conhecido no manifesto e revisao valida; nao aceitar erro de formato como prova de autorizacao.

## Matriz de casos e criterios
| ID | Perfil | Chamada/acao | Resultado esperado | Verificacao adicional |
| --- | --- | --- | --- | --- |
| H01 | A/B/G/M individualmente | Login oficial e GET Auth /user | 200 com identidade esperada; papel do proprio perfil via current_user_role | Guardar so alias; token expirado/invalido deve negar, nao produzir papel autorizado |
| H02 | A e B | POST /rpc/crm_save_quick_client com fixture propria | 200, id e revision | Proprietario igual ao usuario autenticado; nenhum lead criado automaticamente |
| H03 | A->B e B->A | GET /clients?id=eq.<CLIENT_ALHEIO>&select=id,name | 200 com [] (ou negacao explicita sem dados) | Sentinela alheia ausente; nao usar inexistencia de ID desconhecido como prova |
| H04 | G e M | Mesmo GET contra CLIENT_A/CLIENT_B | Nenhum cliente privado alheio | Indicadores agregados nao conferem leitura de carteira |
| H05 | A/B/G/M contra alheio | POST /rpc/crm_save_quick_client com payload valido | 403, code 42501 | Proprietario legitimo relê fixture e confirma nome/revisao inalterados |
| H06 | A/B contra alheio | PATCH /clients?id=eq.<ALHEIO>, Prefer return=representation | 200 [] ou negacao 403/42501, zero linhas | Reler com dono; nao aceitar 204 sozinho nem sobrescrita silenciosa |
| H07 | A/B/G/M | POST /clients com broker_id de OUTRO usuario | 403, code 42501 | Nenhum registro inserido; payload valido em todos os demais campos |
| H08 | A/B/G/M contra alheio | POST /rpc/crm_record_client_contact com target_client e action_id validos | 403/42501 | Nenhum evento ou sentinela alheia revelado |
| H09 | A/B/G/M contra alheio | POST /rpc/crm_client_timeline com target_client e page_number=0 | 403/42501 | Corpo sem notas/snapshot/telefone alheio |
| H10 | A/B/G/M contra alheio | POST /rpc/crm_archive_client | 403/42501 | deleted_at da fixture continua inalterado no acesso do dono |
| H11 | Anon | POST tres RPCs privadas de cliente | 401, code 42501 | Sem evento, cadastro ou timeline; erro generico, sem detalhe de registro |
| H12 | Anon apos hardening | GET /admin_dashboard_metrics, /property_admin_metrics, /lead_origin_metrics?select=* | 401, code 42501 | Sem contagens/linhas; antes da migration documentar comportamento anterior, nao falsear aprovacao |
| H13 | A/B/G/M apos hardening | GET mesmas views administrativas | 200, dados limitados pela RLS vigente | Comparar metricas com consultas autorizadas do proprio perfil; nao com base completa privilegiada |
| H14 | Anon | GET /property_metrics?select=id | 200 com somente imoveis publicamente permitidos | Contrato publico preservado; nenhuma ficha privada liberada |
| H15 | A/B/G | POST /rpc/set_user_role com alvo sintetico e new_role=admin | 403/42501 | Nao alterar papel de ninguem. Admin positivo mutante permanece BLOCKED sem autorizacao propria |
| H16 | Anon | POST /rpc/set_user_role e /rpc/sync_property_media_arrays | 401/42501 | ACL reduzida; sem alteracao de usuario/imovel |
| H17 | A | Atualizar CLIENT_A com revisao atual; depois revisao antiga | Primeiro 200; segundo code 40001, sem nova alteracao | Reler nome/revisao; ver nota sobre HTTP 500 abaixo |
| H18 | A | Repetir mesma action_id e mesmo payload | 200, mesmo id/revision, um recibo | Nao criar segundo cliente; mudar payload com mesmo action_id deve negar com 400/22023 |
| H19 | A | Mesmo telefone/email normalizado na propria carteira | 409, code 23505 | Nao criar duplicata nem retornar cliente de outra carteira |
| H20 | B | Mesmo telefone da fixture A, sem duplicata em B | Cadastro proprio permitido | Nenhuma indicacao de existencia na carteira A |
| H21 | A | POST /rpc/crm_record_client_contact duas vezes, mesmo action_id | 200 true nas duas; um evento | Nenhuma mensagem enviada; timeline resumida sem snapshots brutos |
| H22 | Anon | POST /rpc/crm_public_presentation, WRONG_TOKEN/REVOKED/EXPIRED | 200 null para UUIDs validos | Sem DTO privado, URL de midia ou dados de cliente |
| H23 | Anon | POST /rpc/crm_record_presentation_open, mesmos tres tokens e consented=true | 200 false | Nenhum novo evento |
| H24 | Anon | SHARE_VALID: obter DTO; abrir com consented=false e depois true, nonce repetido | DTO seletivo; false sem consentimento; true para duas tentativas com mesmo nonce, um evento | Nao retornar broker_id/owner_id/cliente/notas privadas; sem login obrigatorio indevido |
| H25 | A e B | Dono sincroniza midia de propriedade sintetica; outro tenta mesmo ID | Dono autorizado; outro 403/42501 | Nenhuma mudanca em imovel real/publicado |
| H26 | A | CLIENT_LEGACY_A autorizado, editar preservando tipo Cliente/Proprietario/Ambos | 200, campos validos e revisao coerente | Sem transformar contato antigo em lead nem apagar interesse por omissao |
| H27 | A/B/G/M | Logout e novo login; tentar URL e API com sessao ausente | UI exige login; APIs negam sem dados | JWT antigo ainda valido nao e o mesmo que sessao ausente; teste de revogacao precisa criterio separado |
| H28 | Quatro perfis | Falhas de todos os casos | Mensagens/codigos esperados sem dados privados ou credenciais | Qualquer leak e FAIL; nao tratar HTTP 500 generico como autorizacao negada |

### Mapeamento de erros: nao presumir HTTP 409 para toda concorrencia
PostgREST normalmente mapeia 42501 para 403 autenticado / 401 anon, 23505 para 409 e 22023 para 400.
**40001 pertence a classe 40 e pode retornar HTTP 500** na versao em uso. O teste de revisao deve exigir code=40001, mensagem controlada e ausencia de mutacao, nao apenas status 409. Um 500 sem esse codigo esperado e FAIL/investigacao.
O editor atual reconhece 40001 para orientar reabertura. Alterar o contrato HTTP exigiria patch separado, nao modificar a migration aprovada.
UUID sintaticamente invalido pode produzir 400/22P02; nao substitui UUID inexistente/expirado/revogado, que deve retornar null/false.
PGRST202/404 indica ausencia/assinatura/cache e NAO prova de seguranca.
Referencia: https://docs.postgrest.org/en/stable/references/errors.html

## Gate de aprovacao
- Executar nas duas direcoes A/B, com controle positivo proprio e identificadores sinteticos conhecidos; guardar manifesto privado.
- Exigir todas as negativas sem leak E controles positivos funcionais; nao aprovar um sistema que simplesmente nega tudo.
- API e SQL isolado sao evidencias distintas. Claims sinteticas locais nunca viram PASS HTTP.
- Verificar que nao houve criacao/alteracao de usuarios, mensagem externa ou registro comercial real.
- Nao executar DELETE para limpar ao final sem autorizacao; registrar fixtures criadas e limpeza pendente.
- Se faltarem sessao legitima, recurso sintetico ou autorizacao para escrita, marcar BLOCKED com motivo; nao improvisar service_role.
- Gate permanece aberto enquanto a auditoria independente HTTP nao for concluida. A preparacao deste roteiro nao autoriza sua execucao mutante remota.
