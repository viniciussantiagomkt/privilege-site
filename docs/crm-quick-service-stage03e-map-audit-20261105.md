# Etapa 03E | Auditoria complementar antes da correção de mapas

**Histórico anterior à correção:** bloqueios de mídia tratados no [relatório de isolamento](crm-quick-service-stage03e-isolation-20261105.md). Este documento preserva a auditoria daquele HEAD; não registra deployment nem homologação autenticada.

## Decisão: BLOCKED por novo carregamento externo reproduzível

Branch work/crm-broker-quick-service-20261104, HEAD preservado `9bd6d486fc05462c815ceca8055515d458b1f197`, PR #15 em rascunho. A autorização exigiu interromper caso outro carregamento externo comprometesse o isolamento. A auditoria anterior à implementação identificou esse caso; nenhum código funcional foi editado, commit criado ou deployment executado.

## Novo bloqueio

`components/VideoEmbed.tsx:25` devolve URLs sem reconhecer/validar o domínio; `components/VideoEmbed.tsx:42` renderiza iframe com esse resultado. `app/imoveis/[slug]/page.tsx:290-300` monta os vídeos cadastrados diretamente na página, sem clique/consentimento que condicione a criação do iframe. loading=lazy não desativa o recurso.

Reprodução local com renderToStaticMarkup, React/TypeScript existentes e apenas três URLs fictícias, sem browser, rede, sessão ou banco:

| Fixture | Resultado observado |
| --- | --- |
| YouTube | iframe externo renderizado, loading lazy |
| Vimeo | iframe externo renderizado, loading lazy |
| URL Google Maps fornecida no campo de vídeo | iframe Google Maps renderizado, loading lazy |

Isso demonstra uma via alternativa concreta para Maps: corrigir somente os dois iframes originalmente apontados não garante ausência de iframe/requisição Maps em Preview. Não foi afirmado que há esse URL no banco ou que uma requisição real aconteceu; o comportamento foi reproduzido exclusivamente por renderização local fictícia.

Bloquear também esse caminho exige abranger VideoEmbed no controle Preview-only. Por ser funcionalidade além dos dois pontos explicitamente autorizados e porque a instrução determina parar diante de novo bloqueio, essa ampliação não foi implementada automaticamente. Não se fez correção global de mídia em produção, nem CSP como substituto para não renderizar iframe.

## Demais ocorrências auditadas

- PropertyForm: iframe Maps original ainda sem controle, e geocoding condicionado à chave. Ambos devem compartilhar a futura política Preview; preservar endereço/latitude/longitude.
- Página individual: iframe Maps original ainda sem controle.
- Layout: GTM condicionado a VERCEL_ENV e Clarity à variável própria. Overrides da auditoria anterior permanecem preparados, sem nova alteração nesta execução.
- Marketing: iframe PDF recebe blob criado após clique e download autenticado do Storage; não é iframe Google Maps/YouTube de carregamento automático de página. Não foi alterado.
- VideoEmbed: também existe video src direto; antes de ampliar a política, contemplar origens externas de mídia e não presumir que controls ou loading lazy eliminam requests.
- PropertyGallery: fallback público de imagem em images.unsplash.com. É recurso visual preexistente, não investigado como incidente nem alterado. Uma política de zero terceiros para toda a plataforma precisa explicitar também mídia visual permitida; não foi declarada garantia global de ausência de tráfego externo.

Nenhum outro serviço foi ativado para testar. Nenhuma conta, sessão real, permissão, RLS, migration ou dado remoto foi alterado.

## Validações e limites

- Auditoria de ocorrências de iframe/scripts/maps: executada.
- Reprodução de três entradas no VideoEmbed: executada, confirmou o bloqueio.
- Nenhuma requisição externa foi feita pelo teste de renderização.
- Correção centralizada dos mapas: NOT_IMPLEMENTED, execução interrompida pela nova condição de bloqueio.
- Renderização corrigida de PropertyForm/página individual, rede de Preview, preservação de produção e quatro módulos Meu Trabalho: NOT_EXECUTED nesta rodada, não classificados PASS.
- Lint/TypeScript/build/regressão completos: não repetidos; nenhum código alterado. [CI #76 do HEAD existente](https://github.com/viniciussantiagomkt/privilege-site/actions/runs/42075048894) já aprovado, não é CI de uma correção nova.
- Novo commit/CI: não existem. HEAD permanece o autorizado.
- Publicação: zero deployments; aprovação posterior continua obrigatória.

## Próximo escopo necessário

Autorizar o mesmo guard centralizado Preview-only também para VideoEmbed/iframes e mídia externa automática que comprometam o isolamento, preservando produção e as origens staging necessárias. Depois: implementar controle derivado do ambiente validado no build, sem toggle público que contorne a validação de staging; falhar fechado em configuração inconsistente; manter campos de endereço e placeholder discreto; adicionar regressões dos dois componentes e da entrada alternativa pelo vídeo; testar quatro módulos Meu Trabalho e rede local isolada; lint/TS/build/CI; apresentar novo HEAD para aprovação antes de qualquer deployment.

Documentação de auditoria local, sem commit/push para não confundir o HEAD autorizado com uma correção inexistente. PR #15 recebe o diagnóstico, preservando o histórico. Nenhuma produção, integração, mensagem, merge ou Etapa 04.
