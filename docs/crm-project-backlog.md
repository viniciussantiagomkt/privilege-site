# Continuidade do Privilege CRM

Atualizado em 30/10/2026.

## Pendência adiada por decisão do usuário

**Acesso e conexão Meta/Google Ads: ADIADO.** O usuário informou que ainda não conseguiu acesso e pediu para continuar o projeto, guardando essa pendência para resolver depois. Não voltar a exigir esse acesso para avançar em entregas independentes.

Retomar quando o usuário informar que conseguiu acesso ou pedir expressamente: cadastrar/configurar app Meta e projeto Google Cloud, conferir consentimento/permissões e contas autorizadas, configurar credenciais somente no ambiente seguro, validar primeira leitura real e renovação, e autorizar agendamento antes de ativar. Nunca solicitar senhas, tokens ou códigos pelo chat. Onboarding OAuth self-service por corretor permanece pendente.

Estado já concluído dessa frente: schema no staging com 21 migrations, painel de resultados publicado em preview, worker crm-ads-sync instalado v1 e bloqueado, testes negativos reais aprovados. Não há conta conectada, métrica real importada ou cron habilitado. Evidência: docs/crm-ads-preview-worker-20261030.md no PR #9.

## Entrega independente em desenvolvimento

Páginas públicas de campanha para imóveis, com fotos/características reais, CTA WhatsApp e link com UTMs montado no CRM. Não depende dos aplicativos de anúncios. Somente imóvel ativo, publicado/aprovado para o site e explicitamente liberado para campanhas; apresentação privada de rascunho não autoriza landing pública. Sem novo formulário no site e sem lead fictício gerado por clique.

Outras frentes do escopo original continuam no planejamento: entrada verificada de formulários nativos, WhatsApp oficial, vínculo de custos a resultados comerciais e onboarding autônomo por corretor. Não marcar essas integrações como concluídas pelo cadastro manual ou por evento de clique.

## Regras de continuidade

Preservar PRs em rascunho, previews existentes e produção/main. Implementar e validar código autonomamente. Novas migrations e publicações seguem os escopos específicos autorizados na conversa. Nenhuma migration deve ser reaplicada para publicar páginas ou conectar provedores.
