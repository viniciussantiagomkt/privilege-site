# Preview das páginas de campanha

30/10/2026. Publicação do preview autorizada pelo usuário, somente com staging.

- URL: https://privilege-site-6qgyjvxqo-viniciussantiagomkts-projects.vercel.app/login
- Deployment: dpl_BUo8BKkc19LZpsbkt9nZbJCeQQAJ, READY, target Preview (null).
- Commit publicado: 246de8f14da67cbe5a56d8310880789889bf8625. CI aprovado, run 41116717014.
- Branch work/crm-campaign-landing-20261030, PR #10 em rascunho, deploy automático desativado.
- Dez variáveis específicas da branch conferidas, chave pública/URL de staging e analytics/maps/webhooks externos vazios. Sem credencial administrativa no preview. Variáveis de outras branches/produção preservadas.

## Verificação HTTP real

Acesso oficial pelo conector Vercel, mantendo Deployment Protection. GET /login: HTTP 200, formulário presente e x-robots-tag noindex.

GET /campanhas/imovel/homologacao-imovel-inexistente: HTTP 200 de resposta transmitida pelo Next.js, com marcador NEXT_HTTP_ERROR_FALLBACK;404, metadata Imóvel indisponível e noindex. Sem título/hero de imóvel. **Não foi observado HTTP 404 efetivo:** o notFound ocorreu após início do streaming. As referências anteriores a retorno 404 descrevem a tela lógica de indisponibilidade e não comprovam status HTTP. Não atribuir PASS de HTTP 404 a esta consulta. Status HTTP estrito 404, se virar critério de aceite, exige tratamento antes de iniciar o streaming e nova validação.

## Limite do cenário positivo

Consulta somente de contagem no staging: nenhum imóvel reunia todas as condições publish_on_site=true, workflow aprovado/publicado, ativo, sem exclusão e available_for_campaigns=true. Nenhuma flag, imóvel, dado comercial ou permissão foi alterado para criar cenário positivo. Portanto página completa, telefone real/fallback e visual desktop/mobile continuam pendentes de imóvel elegível e sessão/ambiente de teste autorizados. Nenhum clique WhatsApp ou mensagem externa foi enviado.

Contas Ads continuam 0 e cron.job ausente. Meta/Google continuam adiados a pedido do usuário. Nenhuma migration, merge, publicação em produção ou configuração de conexão foi executada nesta rodada. A função de anúncios não foi republicada.

Próximo passo: homologar no preview com imóvel autorizado para campanha, sem publicar rascunho ou dados privados como atalho. Confirmar visual desktop/mobile, gerador de link, destino e ausência de lead fictício. O commit deste relatório só registra evidência e não muda o código do preview acima.
