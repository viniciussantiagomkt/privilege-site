# Preview de campanhas publicado

29/10/2026. Publicação expressamente autorizada pelo usuário após a migration.

- Deployment: dpl_9b6xzbp8TSJQbh4hiKfQHKPR9ZAC.
- URL: https://privilege-site-fl7kbwiif-viniciussantiagomkts-projects.vercel.app/login
- Commit publicado: cd8d53eb967e9c1ef4766d74606df327e21a0dca.
- Branch: work/crm-campaign-attribution-20261029. PR #8 em rascunho.
- Ambiente: Preview (target null), status READY, Next.js. Build concluído em 23 segundos conforme log.
- CI do commit: sucesso, execução 40934678337.

## Isolamento

Dez variáveis específicas desta branch, target preview: URL e duas chaves públicas do staging, quatro identificadores de analytics vazios, webhook URL/secret vazios e Google Maps vazio. Chave pública conferida contra o SHA-256 exigido no next.config.ts. Nenhuma credencial privilegiada aplicável ao preview. Variáveis de produção e outras branches preservadas. Deploy automático continua desativado.

## Verificação HTTP

Acesso oficial pelo conector Vercel, mantendo Deployment Protection. GET /login: HTTP 200, formulário presente, x-robots-tag noindex e sem scripts de analytics externos no HTML. GET /admin/campanhas: HTTP 200 para o shell da aplicação. Este resultado não comprova autenticação, autorização, hidratação ou operações de campanhas.

## Próxima validação

Sessões legítimas de administrador, gestor e dois corretores. Conferir campanhas institucionais/pessoais, isolamento, edição e status, captura manual com dados fictícios, destino e atribuição, repetição da mesma ação, filtro no pipeline e desktop/mobile. Concorrência multisessão continua pendente. Não atribuir testes locais ou claims sintéticas a JWT real.

Nenhuma migration reaplicada, merge, promoção ou mudança de produção nesta publicação. Integrações automáticas Meta/Google/WhatsApp e custos continuam fora desta entrega.
