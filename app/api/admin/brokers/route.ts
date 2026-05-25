import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeBrazilWhatsApp } from "@/lib/whatsapp";

interface BrokerCreateBody {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  whatsapp?: string;
  creci?: string;
  instagram?: string;
  position?: string;
  bio?: string;
  avatar_url?: string;
}

function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Configure SUPABASE_SERVICE_ROLE_KEY para criar usuários corretores pelo admin.",
      },
      { status: 501 }
    );
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Sessão ausente." }, { status: 401 });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (roleData?.role !== "admin") {
    return NextResponse.json(
      { error: "Apenas administradores podem criar corretores." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as BrokerCreateBody;

  if (!body.email || !body.name) {
    return NextResponse.json(
      { error: "Nome e e-mail são obrigatórios." },
      { status: 400 }
    );
  }

  const password =
    body.password && body.password.length >= 8
      ? body.password
      : crypto.randomUUID().replace(/-/g, "").slice(0, 14);

  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email: body.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: body.name,
        role: "corretor",
      },
    });

  if (createError || !createdUser.user) {
    return NextResponse.json(
      { error: createError?.message || "Não foi possível criar o corretor." },
      { status: 500 }
    );
  }

  await admin.from("user_roles").upsert({
    id: createdUser.user.id,
    role: "corretor",
    updated_at: new Date().toISOString(),
  });

  const { data: broker, error: brokerError } = await admin
    .from("brokers")
    .upsert({
      id: createdUser.user.id,
      email: body.email,
      name: body.name,
      phone: body.phone || null,
      whatsapp: body.whatsapp ? normalizeBrazilWhatsApp(body.whatsapp) : null,
      creci: body.creci || null,
      instagram: body.instagram || null,
      position: body.position || null,
      role_title: body.position || null,
      bio: body.bio || null,
      avatar_url: body.avatar_url || null,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (brokerError) {
    return NextResponse.json({ error: brokerError.message }, { status: 500 });
  }

  return NextResponse.json({
    broker,
    temporary_password: body.password ? undefined : password,
  });
}
