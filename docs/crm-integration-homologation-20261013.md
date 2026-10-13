# Privilege CRM: homologação da integração Codex + Work

Data: 13/10/2026. Resultado: aprovado para continuidade da homologação técnica; **uso interno comercial ainda não homologado** por falta de login e jornadas autenticadas dos quatro perfis.

## Origem e preservação

- Repositório: `viniciussantiagomkt/privilege-site`.
- Integração examinada: `codex/crm-integration-20261013`, commit `0ce9e893a5e969e60b9cf7c83a14be57da216ce8`.
- PR #2 aberto e em rascunho, com base no Work `6785b6c24be78bc69bc62dc712917e154e25eb72`, PR #1 também em rascunho.
- Branch de correção: `work/crm-integration-security-20261013`, derivada exatamente desse commit de integração.
- A integração incorporou consultas públicas compartilhadas, publicação explícita, busca por código, limites de preço, JSON-LD seguro, validação de corretores e retry do PropertyForm com ID preservado e salvamento atômico de mídia.
- Diff confirmou preservação de CrmShell, Workspace, dashboards, Kanban, Agenda, Deals, contatos, Marketing e apresentações por slug/token. A correção desta rodada também preserva esses módulos.
- Nenhuma migration, repair/reset, recriação de tabelas, alteração de Auth, senha, conta, permissão ou merge foi executado. Produção não foi publicada ou modificada.

## Histórico SQL e staging

O staging `sdpqphiooiuglywcmkxv` possui 11 migrations gerenciadas. As versões/nomes correspondem aos 11 arquivos em `supabase/migrations`. Cinco tiveram hash de conteúdo igual ao histórico; nas seis restantes, comparação linha a linha normalizando quebras e whitespace externo confirmou o mesmo SQL. Não houve divergência de instruções SQL. Evidência: `tests/security/migration-history-comparison.json`.

As três baselines anteriores permanecem em `supabase/historical`, fora do caminho do CLI. Não devem ser reaplicadas ou movidas para migrations. A existência dos objetos não comprova equivalência integral dessas baselines manuais com a instalação original.

As suítes SQL foram reexecutadas com roles `authenticated`/`anon` e claims dos perfis existentes, usando fixtures em `BEGIN/ROLLBACK` e objetos temporários de teste. Nenhuma alteração persistente de schema ou fixture ficou no staging. Ao terminar, imóveis, leads, materiais, links e Storage continuaram com zero registros; o histórico continua com 11 migrations.

## Dependências: 15 alertas analisados

O audit original confirmou 1 alerta crítico, 12 altos, 1 moderado e 1 baixo, distribuídos por 15 pacotes. Isso não representa 15 falhas independentes: parte é propagação de uma vulnerabilidade pela cadeia de dependências.

| Pacote | Direto? / severidade inicial | Versão anterior → versão verificada | Exposição observada e resultado |
|---|---|---|---|
| next | Sim / crítica | 16.2.6 → 16.4.0 | Framework de runtime. Avisos de RCE, SSRF, cache, Server Actions e otimização de imagens resolvidos no audit. Não foram encontrados Server Actions, proxy/middleware, rewrites personalizados ou ImageResponse próprios; a RCE específica de Windows não descreve o runtime Linux da Vercel. Isso não dispensou atualização. |
| eslint-config-next | Sim / alta | 16.2.6 → 16.4.0 | Ferramenta de lint; continua no alerta transitivo de braces |
| @next/eslint-plugin-next | Não / alta | 16.2.6 → 16.4.0 | Lint, dependência fast-glob; pendente por braces |
| fast-glob | Não / alta | 3.3.1 → 3.3.1 | Lint, dependência micromatch; pendente por braces |
| micromatch | Não / alta | 4.0.8 → 4.0.8 | Lint, dependência braces; pendente |
| braces | Não / alta | 3.0.3 → 3.0.3 | DoS por padrões profundamente aninhados. Sem versão corrigida publicada. Não há entrada HTTP do CRM encaminhada a esse parser; risco permanece no processamento de padrões em ferramentas/CI. |
| @babel/core | Não / baixa | 7.29.0 → 7.29.7 | Leitura de arquivo via source map, ferramenta de build/lint; corrigido |
| baseline-browser-mapping | Não / moderada | 2.10.31 → 2.11.28 | Encerramento de processo por entrada inválida, tooling; corrigido |
| brace-expansion | Não / alta | 1.1.14 e 5.0.6 → 1.1.21 e 5.0.12 | DoS por expansão/recursão em padrões, tooling; corrigido |
| browserslist | Não / alta | 4.28.2 → 4.29.3 | Memória e estatísticas não confiáveis, tooling; corrigido |
| js-yaml | Não / alta | 4.1.1 → 4.3.2 | DoS em aliases/merge/omap YAML, lint; corrigido |
| nanoid | Não / alta | 3.3.12 → 3.3.20 | Loops com tamanhos inválidos; não há chamada própria exposta a tamanho fornecido por usuário; corrigido |
| postcss | Não / alta | 8.4.31 e 8.5.15 → 8.5.23 | Source maps/leitura de arquivo e CSS; não há compilação de CSS enviado pelo cliente no CRM; corrigido |
| sharp | Não / alta | 0.34.5 → 0.35.5 | Bibliotecas nativas de processamento de imagem. Otimizador está desativado no preview; corrigido mesmo assim |
| source-map-js | Não / alta | 1.2.1 → 1.2.2 | DoS em source maps não confiáveis, tooling; corrigido |

Next.js e eslint-config-next foram fixados em versões exatas compatíveis da mesma major. As dependências transitivas afetadas foram atualizadas dentro dos ranges compatíveis. Lockfile preserva a resolução final. React não recebeu upgrade desnecessário.

Resultado final:

- `npm audit`: **5 alertas altos**, todos da cadeia `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`.
- `npm audit --omit=dev`: **zero alertas**.
- Sem `audit fix --force`, downgrade ou substituição incompatível de parser.
- O pacote raiz da pendência, braces 3.0.3, não tem patch publicado. A sugestão automática de downgrade para eslint-config-next 14.2.35 foi rejeitada por incompatibilidade com a linha de framework atual.
- Não foi encontrada utilização desses parsers no código HTTP nem nos traces do servidor compilado. Isso reduz a exposição de runtime identificada; não equivale a garantia universal de segurança.

Evidências completas em `tests/security/npm-audit-before.json`, `npm-audit-after.json` e `npm-audit-production.json`.

Referências: https://github.com/vercel/next.js/releases/tag/v16.4.0 ; https://github.com/advisories/GHSA-p293-qw3h-jr36 ; https://github.com/advisories/GHSA-2xp9-vwfh-vxw4 ; https://github.com/advisories/GHSA-vcvr-r3jv-pc5j ; https://github.com/advisories/GHSA-vfj7-8cjw-p6xm . Os demais advisory URLs constam no JSON original.

## Correções de código e mídia

1. Guarda de ambiente estendida à branch de correção: rejeita produção, projeto diferente, chave diferente e service-role. Deploy automático desativado para esta branch.
2. Downloads de mídia passam a usar streaming do Storage, com chave pública e RLS anônimo, sem acumular o arquivo inteiro em Blob no servidor.
3. Encaminhamento de Range simples, resposta 206, Content-Range, Content-Length e Accept-Ranges para reprodução/seek de vídeo e visualização de PDF. Range inválido é recusado; 416 é preservado.
4. Link/token e seleção do material continuam validados antes de qualquer busca de bytes. A rota de fotos de imóveis mantém sua validação de caminho e RLS.
5. Falha de rede, 429 e 5xx do Storage retornam 503 sem diagnósticos privados; negação/ausência continua sem revelar o conteúdo. Cache permanece privado/no-store.

O comportamento anterior não encaminhava Range e fazia o download integral antes da resposta. O suporte a streaming foi validado em testes unitários com resposta sintética de 6 MB e upstream controlado. **Ainda não foi validado no deployment com um vídeo real aprovado**, pois upload autenticado está bloqueado. Não afirmamos ter reproduzido erro 413 na Vercel.

A documentação Vercel indica streaming como alternativa ao limite de resposta não transmitida de 4.5 MB: https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions . Streaming continua sujeito à duração, rede e políticas do provedor.

## Testes executados nesta versão

| Suíte | Resultado e limite |
|---|---|
| Lint | Aprovado |
| TypeScript | Aprovado |
| Build com configuração staging | Aprovado, Next.js 16.4.0 |
| Unitários locais | 17/17, incluindo 8 de streaming/Range/negação; usam upstream controlado, não upload real aprovado |
| SQL/RLS comercial | 81/81, rollback |
| SQL/RLS Marketing/Storage/apresentações | 52/52, rollback |
| API anônima comercial | 15/15 |
| API Marketing e login sintético inválido | 18/18; rejeição de senha inválida não é login bem-sucedido |
| Guardas das três branches | 15/15 |
| HTTP local | 9/9 |
| Browser público/guardas/mobile | 19/19 |
| Upload anônimo com PNG, PDF e MP4 fictícios reais | 3/3 negados por RLS; nenhum arquivo gravado |

São **229 testes/asserções** distribuídos por camadas, não jornadas completas de usuário. Login bem-sucedido, refresh/logout reais, CRUD pelo navegador autenticado, dashboards com registros e upload autenticado não estão incluídos nessa aprovação.

O Chromium alternativo `@sparticuz/chromium@138.0.2` foi utilizado fora das dependências do projeto. A primeira tentativa do navegador não executou a suíte porque o binário temporário não estava mais disponível; após instalação, as 19 verificações passaram. Não houve bypass do AdminGuard ou login simulado para aprovar fluxos reais.

## Segurança Supabase e Auth

Revisadas as definições de 20 funções SECURITY DEFINER públicas, além das regras privadas de compartilhamento/materiais já auditadas. As operações sensíveis verificam role e responsabilidade/gestão. `current_user_role` consulta `user_roles` com `disabled_at`, sem usar role de user_metadata; o trigger de cadastro atribui visitor, nunca administração. RPC de confirmação recusa anon e corretor alheio. A leitura pública se limita a token válido e campos selecionados.

Advisor sem ERROR; persistem 16 avisos de execução anônima de funções privilegiadas, 20 de execução autenticada, registro de códigos com RLS sem políticas e proteção de senhas vazadas desativada. Parte dos EXECUTE pertence a helpers e triggers, e os RPCs públicos de apresentação/consentimento são intencionais. A existência do aviso não prova exploração; recomenda-se reduzir grants desnecessários e manter revisão de cada função.

Não alteramos esses grants ou schema. Um eventual endurecimento exige plano de migration, comparação de chamadas/policies, testes e autorização específica.

A proteção de senhas vazadas depende de plano Pro ou superior. Ativá-la rejeita novas senhas comprometidas e mudanças para senhas fracas; a documentação também descreve sinalização de fraqueza em logins existentes. É necessário validar tratamento de WeakPasswordError/aviso e recuperação de acesso para evitar bloquear usuários por tratamento incorreto na interface. Nenhuma configuração, senha ou sessão foi modificada. Não houve contratação ou upgrade de plano.

Fonte: https://supabase.com/docs/guides/auth/password-security . A verificação de logout também deve considerar que access tokens podem permanecer válidos até expiração; controles adicionais de sessão requerem desenho e autorização próprios.

## Problemas e pendências funcionais

- Falta de sessões/credenciais autorizadas dos quatro perfis existentes. Não foi criada conta nova nem resetada senha.
- Upload/download autenticado de arquivos, aprovação pela interface, favoritos/kits, jornada inteira de geração/envio/registro no lead e revogação/expiração pelo navegador permanecem pendentes.
- Não há estado formal de rejeição nem campo próprio de motivo em Marketing: o esquema oferece pendente/aprovado/arquivado. Arquivar retira divulgação, mas não equivale a homologar uma rejeição formal com motivo.
- Alteração de validade/descrição não força nova aprovação; trocar o arquivo força. É necessária decisão de negócio e, se for endurecido no banco, migration especificamente autorizada.
- Limpeza de arquivos órfãos e importação retomável continuam pendentes.
- Drive, WhatsApp Business Platform, Meta Lead Ads e Calendar não estão conectados. Envio manual por link oficial é a operação disponível; não há envio externo automático homologado.
- Workspace acumula todos os registros visíveis no navegador. Paginação de consultas em blocos não elimina esse crescimento.

## Proposta de desempenho, sem mudança de schema nesta rodada

1. Carregar somente dados necessários ao módulo aberto; separar catálogo de imóveis de versões/importações/eventos de Marketing.
2. Busca, filtros e ordenação no servidor, com cursor estável (created_at/id), limite por página e abort de requests substituídos. Manter RLS e JWT do usuário; nunca usar service-role para contornar permissões.
3. Listas com 25–50 registros e detalhes sob demanda. Contadores e gráficos por período calculados em agregações com autorização equivalente às listas.
4. Assinaturas Realtime restritas a tabelas relevantes; invalidar somente consultas afetadas. Preservar atualização manual/periódica quando o serviço estiver indisponível.
5. Medir requests, memória e latência com volume controlado; só então propor índices/RPCs/views, com plano de migration, security invoker, comparação de histórico e autorização específica.

## Participação necessária e recomendação

O roteiro pronto está em `docs/crm-authenticated-homologation-checklist.md`. Disponibilizar sessões autorizadas de Administrador, Gestor, A e B, ou executar esse roteiro localmente com credenciais de teste em arquivo ignorado. Não enviar senhas no chat.

Recomendação: disponibilizar o preview para **QA técnico controlado**. Não considerar o CRM homologado para uso comercial diário antes de passar login dos quatro perfis, isolamento, persistência de operações e arquivos reais no mesmo commit. As pendências de schema/negócio acima devem ser resolvidas ou aceitas explicitamente no escopo de homologação. Não liberar produção.

## Commit e preview

O commit de código e o deployment exatos serão registrados após o salvamento e a conclusão do build remoto. Variáveis criadas somente para preview desta branch, com Supabase staging e analytics/webhook externos desativados. Sem service-role. PRs permanecem em rascunho.
