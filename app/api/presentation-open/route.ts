import { createServerClient } from "@/lib/supabase-server";
import { UUID } from "@/lib/crm/marketing";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // This endpoint only accepts an explicit consent and same-origin browser action.
  const requestUrl = new URL(request.url);
  const publicHost = request.headers.get("host") || requestUrl.host;
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== `${requestUrl.protocol}//${publicHost}`)
  )
    return Response.json(
      { error: "Origem inválida." },
      { status: 403, headers },
    );
  if (Number(request.headers.get("content-length") || 0) > 1024)
    return new Response(null, { status: 413, headers });
  let body: unknown;
  try {
    const input = await request.text();
    if (input.length > 1024)
      return new Response(null, { status: 413, headers });
    body = JSON.parse(input);
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const b = body as {
    token?: unknown;
    nonce?: unknown;
    consented?: unknown;
  } | null;
  if (
    !b ||
    typeof b.token !== "string" ||
    typeof b.nonce !== "string" ||
    !UUID.test(b.token) ||
    !UUID.test(b.nonce) ||
    b.consented !== true
  )
    return new Response(null, { status: 400, headers });
  const { data, error } = await createServerClient().rpc(
    "crm_record_presentation_open",
    { target_token: b.token, event_nonce: b.nonce, consented: true },
  );
  return Response.json(
    { recorded: !error && data === true },
    { status: error ? 503 : 200, headers },
  );
}
