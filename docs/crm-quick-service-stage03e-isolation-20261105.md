# Etapa 03E | Isolamento de mídia corrigido, sem deployment

## Resultado e autorização

Correção local na branch work/crm-broker-quick-service-20261104 do PR #15, base `9bd6d486fc05462c815ceca8055515d458b1f197`. **APTO PARA SOLICITAR PUBLICAÇÃO DO PREVIEW após CI aprovado**, não autorização de deployment. Nenhum preview foi publicado; nova confirmação explícita continua obrigatória. Código funcional do CRM, SQL aplicado, RLS, permissões, contas e dados remotos não foram alterados.

## Causa e solução

Os mapas de PropertyForm/página individual usavam iframe independente da chave. VideoEmbed aceitava URL arbitrária como iframe, inclusive Maps; loading lazy não impedia carregamento. Fallbacks e thumbnails externos também podiam carregar em rotas imobiliárias de teste.

A decisão agora é centralizada no build:
- lib/preview-media-build.mjs reconhece exatamente a branch da Etapa 03 e exige VERCEL_ENV=preview. A branch isolada com target ausente/errado falha no build; um Preview sem identidade de branch também falha fechado. Produção e outros previews identificados recebem comportamento standard.
- next.config.ts preserva integralmente o guard anterior de URL/chave pública staging, rejeição de produção e service_role. Injeta PRIVILEGE_MEDIA_POLICY como constante de build para servidor/cliente. Não é um NEXT_PUBLIC_ENABLE_* escolhido pelo navegador; tentativa de definir modo standard no ambiente ou toggle público não substitui a decisão do config.
- lib/preview-media.ts lê somente a decisão compilada. Se ausente/inválida, bloqueia. A política controla mídia, não substitui autenticação/RLS.
- PropertyMap é compartilhado pelo formulário e página individual. No modo isolado, retorna placeholder antes de construir iframe; endereço/latitude/longitude continuam intactos. Geocoding também é bloqueado nesse modo, mesmo com chave fictícia preenchida.
- VideoEmbed no modo isolado não cria iframe nem video src, incluindo vídeo direto e URL Maps disfarçada de vídeo. Mantém título/contexto e proporção visual com placeholder.
- Imagens desses fluxos (galeria/cards, preview do formulário, avatar da página e thumbnail do CRM) usam o mesmo controle, com fallback local da marca. No isolado são admitidos recursos relativos locais, imagens locais data/blob e os endpoints Storage/mídia necessários no hostname exato do staging. URLs originais e dados persistidos não são removidos.

Nenhuma configuração global de CSP, rota nova ou refatoração geral de mídia foi adicionada. O pequeno ajuste de thumbnails é auxiliar estritamente necessário para não reintroduzir requests externos na navegação testada. Em produção/outras branches conhecidas, esse filtro de imagens não muda as origens existentes.

## Validação de URLs de vídeo em produção simulada

Permitidos HTTPS com host exato para YouTube (watch, youtu.be, embed, shorts/live, nocookie) e Vimeo/player, com IDs validados; vídeos diretos mp4/webm/mov continuam suportados por URL HTTPS ou caminho relativo, incluindo query de assinatura. URLs Vimeo privadas com hash são preservadas.

Não há fallback iframe para qualquer URL. Protocolos inseguros, userinfo, portas não padrão, domínio enganoso, Maps e origem desconhecida sem formato direto suportado resultam em mídia indisponível. hostname.includes não é usado como autorização. Produção mantém mapas e formatos legítimos testados; a rejeição de embeds arbitrários é a validação mínima de segurança expressamente autorizada. Provedores de tour fora dessa lista exigem validação/allowlist explícita, não são implicitamente confiados.

## Auditoria complementar

Mapas/API de geocoding e VideoEmbed: protegidos. GTM já é omitido em Preview; o teste do layout confirma ausência de GTM/Clarity com a configuração isolada e mantém JSON-LD. As 12 variáveis branch-only existentes foram relidas e conferidas sem mudança ou divulgação de valores. Projeto Vercel/repositório conferidos, autoExposeSystemEnvs=true, produção main e deployment automático da branch continua false.

O iframe PDF do Marketing usa blob criado depois de ação do usuário/download autenticado em Storage; não é incorporação automática de terceiro. Não foi modificado. Links sociais/WhatsApp não foram acionados para envio. Não se declara ausência global de rede para toda rota/conteúdo possível: a comprovação de zero requests proibidos limita-se às páginas, dados fictícios e cenários descritos abaixo. Supabase Staging continua necessário e autorizado.

## Testes executados novamente

| Verificação | Resultado |
| --- | --- |
| npm run lint | PASS, sem avisos finais |
| npm run typecheck | PASS |
| npm test | 180/180 PASS, 30 regressões novas de mídia |
| npm run test:crm-local | 349/349 PASS, PGlite local, sem banco remoto |
| Build Next otimizado com target Preview da Etapa 03 | PASS |
| Guard anterior de staging | 5/5 PASS |
| Navegador CRM com fixtures | 35/35 PASS |
| Navegador local dos HTML reais dos três componentes | PASS, três páginas isoladas e três controles standard |

Regressões cobrem configuração ausente/inconsistente, produção/outro Preview, tentativa de opt-in público e falha do guard com projeto/chave incorretos, HTML dos três componentes, preservação de coordenadas/endereço, Maps como vídeo, YouTube/Vimeo, domínios enganosos, protocolos inseguros, credenciais em URL, portas e vídeos diretos.

Os testes de HTML usam os componentes reais PropertyForm, página individual e VideoEmbed com dados/consultas fictícios, substituindo somente integrações e folhas auxiliares. No navegador loopback: **0 iframe, 0 video e 0 tentativa de request externo** em cada uma das três páginas isoladas. O controle standard produziu iframes/vídeos e requests esperados, todos interceptados/abortados antes da saída: a instrumentação não confunde bloquear request com ausência de tentativa nem usa loading lazy como prova. Não houve integração real ativada.

A regressão em aplicação hidratada usa o build real do Preview, mocks de Auth/REST, nenhuma sessão real. Testa as quatro abas Hoje/Atendimentos/Imóveis/Negócios e cenários anteriores, 360/768/1440, teclado, erros, troca de sessão e fluxo rápido. O novo caso injeta thumbnail externa fictícia, abre cadastro, preserva endereço/inputs de coordenadas e aciona Usar localização sem iframe/request de terceiro. O último build foi deliberadamente feito com chave Maps fictícia preenchida, opt-in público true e PRIVILEGE_MEDIA_POLICY=standard fornecido ao processo: a decisão do build permaneceu isolated e os 35 cenários passaram.

Produção foi verificada por decisão de configuração e renderização standard, não por deployment ou consulta a dados de produção. Essas evidências não encerram a homologação JWT/HTTP real do staging.

## Ambiente e falhas do instrumento

A primeira invocação node --env-file fez o Next transportar essa opção a NODE_OPTIONS dos workers, que a rejeitaram. Corrigido somente o lançamento local: process.loadEnvFile seguido de processo Node filho sem essa opção. Build completou. A tentativa inicial de navegador sobre build incompleto expôs espera por exit já ocorrido; o runner agora verifica estado e instala a espera antes de encerrar o processo. Não se alterou código funcional para contornar falha de teste. Primeira rodada de lint tinha um import não usado no teste novo, removido; lint final sem avisos.

Configuração pública local de staging fica fora do Git em pasta privada; nenhum arquivo env, token, dump, senha ou sessão real foi incluído. Capturas fictícias ficam em %LOCALAPPDATA%/PrivilegeCRM-Operations/stage03e-isolation-20261105. O SQL aplicado continua com SHA-256 da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa, sem diff em migrations.

## Evidências e revisão

- tests/preview-media.test.mjs e tests/helpers/render-preview-media.mjs.
- tests/preview-media-browser.mjs e tests/security/crm-preview-media-browser-20261105.json.
- tests/security/crm-preview-media-workspace-browser-20261105.json.
- tests/security/crm-preview-media-build-guard-20261105.json.
- tests/security/crm-preview-media-isolation-20261105.json e resultado atualizado da suíte PGlite.
- Relatórios das duas auditorias anteriores preservados como histórico, agora superados pela correção neste escopo.

Revisão React: guard antes de criar recurso, sem iframe oculto, sem efeito/event listener global novo, mesma decisão em SSR/cliente, placeholders com role/status e contexto, dimensões reservadas, hooks existentes preservados. Sem mudança de layout/identidade e sem bypass de autenticação.

## Pendências

Aguardar CI do novo commit e registrar seu resultado no PR; só classificar APTO com CI concluído. Novo HEAD precisa ser aprovado pelo usuário antes de qualquer publicação. Revalidar env efetivas no instante da futura publicação, criar um único preview somente quando autorizado, validar READY/SHA/rotas/ausência de dados privados e executar homologação autenticada real com contas fictícias autorizadas. Nenhum novo bloqueio material observado nos cenários auditados/testados. Não houve migration, usuário/RLS alterado, mensagem, merge, produção ou Etapa 04.
