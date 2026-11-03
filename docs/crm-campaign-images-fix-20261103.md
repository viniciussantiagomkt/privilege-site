# Imagens de campanhas em previews

03/11/2026. Falha reportada pelo usuário após publicação do PR #12.

HTML da Casa Terras continha URLs absolutas de /api/property-media de um deployment anterior. O conector oficial conseguiu consultar uma imagem tanto pelo endereço anterior quanto pela rota equivalente no preview atual, com HTTP 200 image/webp. Isso comprova disponibilidade pela rota autorizada, mas não acesso do navegador ao outro deployment: a proteção Vercel depende do host e da sessão. A dependência de outro preview é um defeito confirmado; bloqueio exato no navegador não foi capturado pelo agente.

attachPropertyImages agora normaliza URLs HTTPS estritamente reconhecidas da Privilege e seus previews, apenas no caminho /api/property-media/<uuid>/<uuid>.webp, para a rota relativa equivalente. Capa e galeria são normalizadas antes da deduplicação. Mantém fontes externas, caminhos privados de apresentação, query/fragmento, credenciais e portas fora dessa transformação. Nenhum fetch arbitrário novo, serviço privilegiado, bucket público, mudança de RLS ou alteração de URLs no banco. Armazenamento e permissões continuam os do ambiente atual.

89 testes, lint, TypeScript e build passaram. Quatro regressões verificam preview antigo/produção para caminho relativo, limites de host e caminhos, deduplicação e preservação de capa. Ainda exige verificação de imagens no novo preview e validação visual pelo usuário.
