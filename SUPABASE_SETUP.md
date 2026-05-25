# Setup Supabase - Privilege Imoveis

Este projeto precisa de uma estrutura Supabase completa para funcionar como plataforma imobiliaria com CMS, admin, upload, leads e analytics.

## 1. Rodar estrutura do banco

Abra o Supabase:

`Project > SQL Editor > New query`

Cole e execute o arquivo:

`supabase-admin-setup.sql`

Ele cria:

- tabela `properties`
- tabela `leads`
- tabela `user_roles`
- tabela `brokers`
- tabela `property_views`
- tabela `property_favorites`
- tabela `property_comparisons`
- tabela `site_settings`
- bucket publico `property-images`
- bucket publico `property-videos`
- policies/RLS para site publico, corretores e administradores
- trigger para o primeiro usuario virar admin automaticamente
- funcao `set_user_role` para promover usuarios

## 2. Criar administrador master

No Supabase, crie o usuario em:

`Authentication > Users > Add user`

Depois rode no SQL Editor:

```sql
select public.set_user_role('seu-email@dominio.com', 'admin');
```

Novos usuarios criados depois entram como `corretor` por padrao.

## 3. Upload de imagens

O SQL cria o bucket:

`property-images`

Configuracao:

- publico
- upload apenas para usuarios autenticados
- formatos: `jpeg`, `png`, `webp`, `avif`
- limite: 10MB por arquivo

O painel admin salva imagens em pastas por slug do imovel.

## 4. Google Maps

Para localizacao inteligente, adicione no `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_google_maps
```

Ative no Google Cloud:

- Geocoding API
- Maps Embed API

## 5. Variaveis existentes

O projeto ja usa:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Nao coloque `service_role` no frontend.

## 6. Depois de rodar

Execute:

```bash
npm run build
```

Depois acesse:

- `/login`
- `/admin`
- `/imoveis`
- uma pagina individual de imovel

