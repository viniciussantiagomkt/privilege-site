# CRM staging: Storage e preview

Data: 08/10/2026. Produção não alterada.

Bucket privado `crm-property-images`, limite de 10 MiB e apenas WebP. Upload restrito à pasta do usuário comercial; sem sobrescrita ou exclusão pelo cliente. As fotos só ficam acessíveis anonimamente quando vinculadas a imóvel aprovado e publicado. Despublicar bloqueia novas leituras. A rota de imagens responde sem cache, e o preview desativa a otimização que poderia manter cópias públicas em cache.

O formulário mantém URLs estáveis para a rota e usa prévias autenticadas com validade de 60 segundos. Links temporários já emitidos permanecem válidos até expirar. Uma aba aberta pode precisar recarregar as prévias após esse período. URLs externas anteriores continuam com as regras do provedor externo.

75/75 assertivas PostgreSQL/RLS aprovadas, incluindo isolamento de mídia, publicação, ocultação e preservação de fotos após reatribuir o corretor. Dados sintéticos revertidos com rollback. 9/9 testes HTTP locais aprovados. Lint, TypeScript e build aprovados com staging. Estes resultados não substituem upload real nem login real na interface.

Migrations adicionais aplicadas somente no staging:

- `20261008163217_crm_private_property_storage.sql`
- `20261008163432_crm_private_media_assignment.sql`
- `20261008163623_crm_preserve_private_media.sql`

As três migrations originais continuam sem fonte reconciliada no repositório; não foram reaplicadas. Admin e Manager de teste não têm e-mail confirmado. Não foram alteradas senhas nem enviados e-mails. Login real, upload real, validação visual, renovação das prévias e miniaturas privadas na listagem administrativa ainda precisam de homologação.

GTM desativado no preview para evitar que testes entrem nas métricas reais. As variáveis Supabase de preview são exclusivas da branch `work/crm-staging-audit-20261008`. Deploy automático dessa branch permanece desativado. Não houve merge na main.

A revisão automática bloqueou a comunicação de telemetria da CLI Supabase com PostHog. A execução prosseguiu pela integração Supabase, sem usar essa comunicação. O aviso de proteção contra senhas vazadas e os avisos de funções SECURITY DEFINER do relatório anterior continuam pendentes de revisão: https://supabase.com/docs/guides/database/database-linter e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
