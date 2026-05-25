import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const commercialWhatsApp = "5583999999999";

interface LeadRequestBody {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  source?: string;
  page_path?: string;
  origin_detail?: string | null;
  property_id?: number | null;
  property_title?: string | null;
  property_slug?: string | null;
  whatsapp_number?: string | null;
}

function normalizeWhatsApp(value?: string | null) {
  const digits = (value || commercialWhatsApp).replace(/\D/g, "");
  return digits || commercialWhatsApp;
}

function createWhatsAppMessage(lead: LeadRequestBody) {
  const propertyText = lead.property_title
    ? ` no imovel ${lead.property_title}`
    : "";

  return `Ola! Meu nome e ${lead.name || "um cliente"} e tenho interesse${propertyText}. Gostaria de receber mais informacoes e falar com um especialista da Privilege Imoveis.`;
}

async function sendWebhook(payload: Record<string, unknown>) {
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      ok: false,
      skipped: true,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LEAD_WEBHOOK_SECRET
          ? { "x-privilege-secret": process.env.LEAD_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch {
    return {
      ok: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as LeadRequestBody;
  const submittedAt = new Date().toISOString();

  if (!body.name || !body.phone) {
    return NextResponse.json(
      {
        error: "Nome e telefone sao obrigatorios.",
      },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const leadPayload = {
    name: body.name,
    phone: body.phone,
    email: body.email || null,
    message: body.message || null,
    source: body.source || "site",
    status: "novo",
    property_id: body.property_id ?? null,
    property_title: body.property_title ?? null,
    property_slug: body.property_slug ?? null,
    page_path: body.page_path || null,
    origin_detail: body.origin_detail || null,
  };

  const { error } = await supabase
    .from("leads")
    .insert(leadPayload);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  const webhookPayload = {
    ...leadPayload,
    submitted_at: submittedAt,
    channel: "site",
  };

  const webhook = await sendWebhook(webhookPayload);
  const whatsappNumber = normalizeWhatsApp(body.whatsapp_number);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    createWhatsAppMessage(body)
  )}`;

  return NextResponse.json({
    ok: true,
    webhook,
    whatsapp_url: whatsappUrl,
  });
}
