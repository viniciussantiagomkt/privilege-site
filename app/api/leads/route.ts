import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createWhatsAppUrl, normalizeBrazilWhatsApp } from "@/lib/whatsapp";

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

function createWhatsAppMessage(lead: LeadRequestBody) {
  const propertyText = lead.property_title
    ? ` no imóvel ${lead.property_title}`
    : "";

  return `Olá! Meu nome é ${lead.name || "um cliente"} e tenho interesse${propertyText}. Gostaria de receber mais informações e falar com um especialista da Privilege Imóveis.`;
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
  let body: LeadRequestBody;
  try {
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    body = input as LeadRequestBody;
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const submittedAt = new Date().toISOString();

  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 160 ||
      typeof body.phone !== "string" || !body.phone.trim() || body.phone.length > 30 ||
      [body.email, body.message, body.source, body.page_path, body.origin_detail,
        body.property_title, body.property_slug, body.whatsapp_number]
        .some((value) => value != null && (typeof value !== "string" || value.length > 2000)) ||
      (body.property_id != null && (!Number.isSafeInteger(body.property_id) || body.property_id < 1))) {
    return NextResponse.json(
      {
        error: "Nome e telefone são obrigatórios.",
      },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const leadPayload = {
    name: body.name.trim(),
    phone: body.phone.trim(),
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
        error: "Não foi possível registrar o contato. Tente novamente.",
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
  const whatsappNumber = normalizeBrazilWhatsApp(body.whatsapp_number);
  const whatsappUrl = createWhatsAppUrl(whatsappNumber, createWhatsAppMessage(body));

  return NextResponse.json({
    ok: true,
    webhook,
    whatsapp_url: whatsappUrl,
  });
}
