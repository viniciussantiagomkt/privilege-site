# Fluxo de Leads - Privilege Imoveis

O site envia leads para a rota interna:

`POST /api/leads`

Essa rota:

- salva o lead no Supabase (`public.leads`)
- envia os mesmos dados para um webhook Make/n8n
- retorna a URL pronta do WhatsApp com mensagem personalizada

## Variaveis de ambiente

Configure na Vercel e, se quiser testar localmente, no `.env.local`:

```env
LEAD_WEBHOOK_URL=https://hook.make.com/seu-webhook-ou-n8n
LEAD_WEBHOOK_SECRET=um-segredo-opcional
```

`LEAD_WEBHOOK_URL` fica no servidor, sem expor a URL da automacao no navegador.

## Payload enviado para Make/n8n

```json
{
  "lead_id": 123,
  "name": "Nome do cliente",
  "phone": "83999999999",
  "email": "cliente@email.com",
  "message": "Mensagem do formulario",
  "source": "imovel",
  "status": "novo",
  "property_id": 1,
  "property_title": "Casa Alto Padrao",
  "property_slug": "casa-alto-padrao",
  "page_path": "/imoveis/casa-alto-padrao",
  "origin_detail": "https://origem.com",
  "submitted_at": "2026-05-21T12:00:00.000Z",
  "channel": "site"
}
```

## Google Sheets

No Make ou n8n:

1. Crie um webhook.
2. Conecte o webhook a um modulo Google Sheets.
3. Mapeie os campos acima para colunas da planilha.
4. Cole a URL do webhook em `LEAD_WEBHOOK_URL`.

Se o webhook falhar, o lead continua salvo no Supabase e o cliente segue para o WhatsApp.
