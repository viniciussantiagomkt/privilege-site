# Etapa 03E | Preflight Vercel e homologação preparada

**Histórico anterior à correção:** bloqueios de mídia tratados no [relatório de isolamento](crm-quick-service-stage03e-isolation-20261105.md). Este documento preserva a auditoria daquele HEAD; não registra deployment nem homologação autenticada.

## Resultado: BLOCKED, nenhum preview publicado

HEAD autorizado/conferido: `9bd6d486fc05462c815ceca8055515d458b1f197`, branch `work/crm-broker-quick-service-20261104`, PR #15 em rascunho e sem merge. [CI #76 aprovado](https://github.com/viniciussantiagomkt/privilege-site/actions/runs/42075048894). Deploy automático continua desativado em vercel.json. Nenhum código, migration ou HEAD foi alterado nesta execução.

Projeto Vercel confirmado: privilege-site, `prj_JBX4aUI5CFbEfyjSVDQYsAT2AzQF`, equipe `team_ztWg4IbkQZV5ffEmNfTiXwn2`, Next.js, branch de produção main. Repositório conectado confere com viniciussantiagomkt/privilege-site. Nenhum destino/deployment de produção selecionado.

## Inventário efetivo e acesso

O conector retornou listagem global truncada, rejeitada como inventário. A CLI oficial 65.11.0 inicialmente iniciou autenticação; a abertura automática do navegador pelo shell foi bloqueada. Posteriormente a própria CLI retornou login concluído, whoami confirmou sessão oficial e as chamadas autenticadas ao projeto correto funcionaram. O relato do usuário de dificuldade no navegador não foi convertido em afirmação de que ele realizou o login; o acesso foi comprovado pelas operações oficiais. Não foram extraídos tokens, cookies ou sessões de navegador.

API oficial, resposta integral processada em memória, sem imprimir valores: 129 variáveis de projeto antes, sem paginação/truncamento. API de variáveis compartilhadas da equipe: 0, paginação next=null. Seis variáveis gerais aplicáveis a Preview: GA4_SERVICE_ACCOUNT_JSON, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_CLARITY_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_GA4_ID e LEAD_WEBHOOK_SECRET. Nenhuma variável própria da branch inicialmente.

Produção/outras branches não são herdadas como tal. As seis variáveis gerais acima podem ser herdadas por Preview. A precedência da configuração específica da branch foi considerada explicitamente, não presumida pela ausência de overrides.

## Configuração exclusiva criada

Criadas 12 variáveis encrypted, target exclusivamente preview, gitBranch exatamente a branch da Etapa 03. API retornou 12 criações/0 falhas. Releitura individual de cada variável confirmou o valor esperado, sem sua divulgação. Inventário posterior completo: 141 registros, seis gerais e 12 específicos; os 12 valores efetivos vêm da branch.

| Nome | Resultado seguro |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | URL pública do staging confirmado |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Chave pública anon do staging, não service_role |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Chave pública publishable do mesmo staging |
| NEXT_PUBLIC_GTM_ID | Vazio |
| NEXT_PUBLIC_GA4_ID | Vazio |
| NEXT_PUBLIC_META_PIXEL_ID | Vazio |
| NEXT_PUBLIC_CLARITY_ID | Vazio |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Vazio; desativa a API, NÃO os iframes abaixo |
| LEAD_WEBHOOK_URL | Vazio |
| LEAD_WEBHOOK_SECRET | Vazio |
| GA4_PROPERTY_ID | Vazio |
| GA4_SERVICE_ACCOUNT_JSON | Vazio, neutralizando a credencial geral herdável |

As chaves públicas foram obtidas diretamente do projeto Supabase autorizado `sdpqphiooiuglywcmkxv`, não copiadas indiscriminadamente de outra branch. Role anon, referência do JWT, formato publishable e SHA-256 exigido pelo guard de build conferiram. Nenhuma chave privilegiada, URL de banco ou credencial administrativa figura no conjunto efetivo. A credencial geral de serviço GA4 não foi lida nem copiada para esse ambiente.

GTM tem adicionalmente bloqueio explícito por VERCEL_ENV=preview no layout. Clarity e credenciais/destinos de analytics/backend/webhook/mapas foram esvaziados. Não se removeram nem editaram configurações de produção, variáveis gerais ou de outras branches. Os overrides seguros ficam preparados, sem constituir um deployment.

## Bloqueio material

Mesmo com NEXT_PUBLIC_GOOGLE_MAPS_API_KEY vazio, existem iframes independentes dessa chave:

- `components/PropertyForm.tsx:832`: Google Maps embed com coordenadas/endereço ou fallback Campina Grande. O bloco não depende da chave nem de flag de desativação no Preview.
- `app/imoveis/[slug]/page.tsx:377`: Google Maps embed com coordenadas/endereço do imóvel, também sem condição de Preview.

loading=lazy apenas posterga a requisição; não desativa o recurso. Assim, o HEAD aprovado não permite comprovar que mapas/recursos externos desnecessários permanecerão desativados em toda a navegação autorizada. Não foi apresentado como observado um request em preview inexistente: a incompatibilidade é comprovada pela inspeção do código.

Corrigir isso exige alteração mínima de código e novo HEAD revisado/autorizado. Não alteramos esse código, não configuramos CSP global que afetaria produção nem publicamos outro commit como atalho. A criação do deployment foi interrompida: **0 chamadas, sem ID, sem URL e sem status READY**. Nenhum deployment anterior foi usado como se fosse a Etapa 03.

## Verificações públicas

| Cenário | Resultado |
| --- | --- |
| Deployment READY e SHA publicado correto | BLOCKED: deployment não criado |
| GET /login | BLOCKED: sem URL desta execução |
| /admin/meu-trabalho sem sessão e HTML sem dados privados | BLOCKED: sem URL |
| Scripts/rede sem tracking não autorizado | BLOCKED para runtime; variáveis e layout revisados |
| Rota com autenticação e carteiras | BLOCKED: sem preview/sessões reais |
| Erros de runtime e ausência de efeitos inesperados | Não testados em preview; nenhum fluxo da aplicação executado pelo agente |

Não se usou HTTP200 como prova de autorização. Nenhuma escrita de banco, mudança de usuário/RLS/migration, mensagem ou integração externa foi executada. A configuração de envs da branch foi a única alteração remota desta tarefa.

## Roteiro de interface: 12 cenários

Todos **NOT_EXECUTED/BLOCKED**, para o preview futuro autorizado. Usar somente contas e fixtures fictícias previamente autorizadas, nunca registros comerciais reais ou imóveis publicados.

1. **Sessões A/B/gestor/admin:** login e alternância; nome/perfil e dados pertencem à sessão atual, restrições de cada papel mantidas.
2. **Cadastro rápido:** cliente fictício com finalidade; um cliente na carteira correta, nenhum lead automático.
3. **Telefone/duplicidade:** formatos nacionais/DDD55 e internacionais equivalentes detectam duplicata somente na própria carteira; prefixos internacionais incompletos são rejeitados.
4. **Perfil/revisão:** duas sessões editam o mesmo cliente fictício; primeira gravação vence, revisão obsoleta informa conflito sem sobrescrever dados.
5. **Histórico/contexto:** dados relacionados e resumos somente do cliente autorizado, sem snapshots privados de auditoria ou carteira alheia.
6. **WhatsApp:** seis modelos editáveis, destinatário e contexto corretos, revisão obrigatória; abrir somente para número fictício autorizado e não enviar mensagem. Abrir/copiar não deve registrar contato.
7. **Contato explícito:** confirmação manual cria um evento; retry da mesma ação não duplica, abrir WhatsApp não gera evento fictício.
8. **Retorno/visita:** criação em fixture e retry com mesma ação produzem um compromisso e uma auditoria; agenda reflete resultado.
9. **Continuidade:** tarefas, imóveis autorizados, propostas e apresentações abrem nas rotas existentes; não alterar imóvel publicado.
10. **Rascunho:** digitar, revisar e aplicar campos selecionados; sem permissão de microfone, gravação de áudio ou serviço externo.
11. **Mobile/teclado:** 360px, tablet e desktop, foco/Tab/Escape, labels, scroll e modais utilizáveis, sem overflow ou perda de rascunho.
12. **Logout/rede:** sair, trocar usuário e repetir com erro/requisição tardia; nenhum dado da sessão anterior aparece nem mensagem de sucesso fictícia.

## Roteiro técnico JWT/HTTP

Todos **NOT_EXECUTED**, sem simulação de sucesso. Obter sessões legítimas por login oficial com contas de teste autorizadas; não extrair sessões/cookies do navegador nem registrar bearer/JWT/HAR com credenciais.

- **JWT real:** chamadas HTTP autenticadas usam papel e carteira atuais do banco, não metadados editáveis como autoridade.
- **A/B:** A lê somente seu cliente, B somente o seu; consulta/RPC de ID alheio é negada sem dados ou alteração.
- **Gestor/admin:** não ganhar acesso à carteira privada alheia por papel de gestão.
- **Anônimo:** três RPCs privilegiadas negam execução; confirmar resposta e ausência de efeito, sem obter dados.
- **Proprietário forjado:** payload com broker_id/dono arbitrário é rejeitado, nenhum registro muda de titular.
- **Idempotência:** mesmo action_id/payload retorna recibo único; mesmo ID com payload diferente é rejeitado, sem duplicação.
- **Concorrência:** conexões HTTP independentes com mesma revisão geram um vencedor e um conflito; nenhuma sobrescrita silenciosa.
- **Logout:** cache/UI da sessão anterior é eliminado; requests tardios não repintam dados de outro usuário. Logout não deve ser presumido como revogação universal de todo access token já emitido; verificar os controles reais sem abrir permissões.

## Continuidade

Recomendação **BLOCKED PARA PUBLICAÇÃO do HEAD atual**. Necessária autorização de ajuste mínimo Preview-only para os iframes e validação de um novo HEAD/CI; somente então retomar preflight/publicação única conforme autorização atualizada. Não pedir credenciais no chat.

Relatório completo também registrado no corpo do PR #15. Este arquivo e a evidência JSON permanecem locais, sem novo commit/push, preservando o HEAD autorizado. Nenhum preview, merge, produção ou Etapa 04.
