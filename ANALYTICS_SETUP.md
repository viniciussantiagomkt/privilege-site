# Analytics Setup - Privilege Imoveis

Este projeto usa o Google Tag Manager como camada principal de tracking.

Container GTM:

```txt
GTM-5FJ54Q2C
```

O site nao dispara Meta Pixel ou GA4 diretamente no codigo. Ele envia eventos ricos para `window.dataLayer`, e o GTM deve ser responsavel por encaminhar esses eventos para Meta Ads, GA4 e Google Ads futuramente.

## Auditoria atual

Instalado no codigo:

- Google Tag Manager global em `app/layout.tsx`
- Microsoft Clarity opcional via `NEXT_PUBLIC_CLARITY_ID`
- Helper de eventos em `lib/analytics.ts`

Removido para evitar duplicacao:

- GA4 manual via `gtag`
- Meta Pixel manual via `fbq`

## Helper principal

Arquivo:

```txt
lib/analytics.ts
```

Funcoes:

- `pushDataLayer(eventData)`
- `trackEvent(name, payload)`
- `trackWhatsAppLead(payload)`
- `createAnalyticsEventId(prefix)`

Todo evento recebe automaticamente:

- `event_id`
- `page_url`

O `event_id` prepara a base para deduplicacao futura com Meta Conversions API.

## Eventos implementados

| Evento site | Quando dispara | Meta sugerido | GA4 sugerido |
| --- | --- | --- | --- |
| `property_view` | Ao abrir a pagina individual de um imovel | `ViewContent` | `view_item` |
| `whatsapp_lead` | Ao clicar em botao/link de WhatsApp rastreavel | `Lead` | `generate_lead` |
| `property_search` | Ao usar busca da hero ou filtros da pagina `/imoveis` | `Search` | `search` |
| `property_favorite` | Ao curtir ou remover um imovel dos favoritos | `CompleteRegistration` ou evento customizado | `add_to_wishlist` |
| `CentralDigitalClick` | Ao clicar em links internos/externos da Central Digital | Evento customizado | Evento customizado |
| `social_click` | Ao clicar em redes sociais rastreadas | Evento customizado | Evento customizado |

## Parametros por evento

### property_view

Dispara em:

```txt
components/PropertyViewTracker.tsx
```

Parametros:

- `property_id`
- `property_slug`
- `property_title`
- `property_type`
- `property_category`
- `property_price`
- `city`
- `neighborhood`
- `bedrooms`
- `parking_spaces`
- `area`
- `broker_id`
- `broker_name`
- `event_id`
- `page_url`

### whatsapp_lead

Dispara em:

- pagina individual do imovel
- CTA sticky mobile do imovel
- pagina de contato
- CTA final da home
- cards de corretores
- Central Digital `/links`

Parametros:

- `lead_type`
- `page_url`
- `property_id`
- `property_slug`
- `property_title`
- `property_price`
- `broker_name`
- `button_location`
- `source`
- `event_id`

Valores comuns de `button_location`:

- `property_page`
- `property_page_mobile_sticky`
- `broker_card`
- `contact_page`
- `contact_social`
- `home_final_cta`
- `links_hub`

### property_search

Dispara em:

- busca rapida da hero
- filtros da pagina `/imoveis`

Parametros:

- `search_type`
- `search_term`
- `category`
- `city`
- `neighborhood`
- `min_price`
- `max_price`
- `bedrooms`
- `property_status`
- `sort_order`
- `event_id`
- `page_url`

### property_favorite

Dispara em:

```txt
components/FavoriteButton.tsx
```

Parametros:

- `action`
- `property_id`
- `property_title`
- `property_price`
- `event_id`
- `page_url`

## Como configurar no GTM

1. Criar acionadores de Evento Personalizado:
   - `property_view`
   - `whatsapp_lead`
   - `property_search`
   - `property_favorite`

2. Criar variaveis de Camada de Dados para os parametros usados:
   - `event_id`
   - `property_id`
   - `property_title`
   - `property_price`
   - `city`
   - `neighborhood`
   - `broker_name`
   - `button_location`
   - `search_type`
   - `category`
   - `min_price`
   - `max_price`
   - `bedrooms`

3. Criar tags Meta Pixel dentro do GTM:
   - `property_view` -> `ViewContent`
   - `whatsapp_lead` -> `Lead`
   - `property_search` -> `Search`
   - `property_favorite` -> `CompleteRegistration` ou evento customizado

4. Criar tags GA4 dentro do GTM:
   - `property_view` -> `view_item`
   - `whatsapp_lead` -> `generate_lead`
   - `property_search` -> `search`
   - `property_favorite` -> `add_to_wishlist`

5. Usar `event_id` como parametro em Meta Pixel para preparar deduplicacao futura com Conversions API.

## Preparacao para Meta Conversions API

Endpoint criado:

```txt
POST /api/conversions
```

Este endpoint ainda nao envia eventos para a Meta. Ele apenas prepara a estrutura e retorna um `event_id` para uso futuro.

Exemplo de payload:

```json
{
  "event_name": "Lead",
  "event_source_url": "https://www.privilegeimoveispb.com.br/imoveis/exemplo",
  "custom_data": {
    "property_id": 123,
    "property_title": "Apartamento no Catole"
  }
}
```

## Debug

Em desenvolvimento, os eventos aparecem no console como:

```txt
Analytics Event: {...}
```

Em producao, nenhum log de analytics e exibido no console.

## Proximos passos no GTM

- Publicar tags de Meta Pixel dentro do GTM usando os eventos acima.
- Publicar tags GA4 dentro do GTM.
- Configurar Google Ads apenas quando houver conta/campanhas ativas.
- Testar com Preview Mode do GTM.
- Testar Meta Pixel Helper.
- Validar eventos em GA4 DebugView.
