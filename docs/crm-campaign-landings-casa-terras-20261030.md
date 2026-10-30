# Casa terras: autorização de campanha e consulta real

30/10/2026. Usuário autorizou habilitar Disponível para campanhas apenas no imóvel Casa terras do staging. Executado UPDATE condicional, somente available_for_campaigns=false para true, projeto sdpqphiooiuglywcmkxv, id=1/slug=casa-terras. A condição também exigiu ativo, publicado, publish_on_site=true e ausência de exclusão. Uma linha retornada; nenhum novo imóvel criado ou migration aplicada.

GET real no preview /campanhas/imovel/casa-terras com UTMs fictícias de homologação, via acesso oficial do conector Vercel: HTTP 200, conteúdo Casa terras/hero presentes, sem marcador not-found. Metadata noindex e canonical para a ficha original conferidos. Três CTAs WhatsApp presentes com mesmo destino; nenhuma mensagem, clique interativo ou lead criado durante a consulta. A página reflete os dados atuais do staging, incluindo responsável com identificação de teste. Não usar este preview como anúncio de produção.

URL para conferência: https://privilege-site-6qgyjvxqo-viniciussantiagomkts-projects.vercel.app/campanhas/imovel/casa-terras

Este teste comprova resposta/renderização HTML real, não navegação visual desktop/mobile, galeria interativa, clipboard ou execução dos eventos de clique. A autorização de campanhas permanece habilitada conforme solicitado. Produção/main, contas, integrações Meta/Google e cron não foram alterados. A pendência externa continua adiada.
