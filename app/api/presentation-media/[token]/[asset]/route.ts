import { streamPublicStorageObject } from "@/lib/storage-stream";
import { createServerClient } from "@/lib/supabase-server";
import { UUID, ASSET_PATH, type PublicPresentation } from "@/lib/crm/marketing";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; asset: string }> },
) {
  const { token, asset } = await params;
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (!UUID.test(token) || !/^\d+$/.test(asset))
    return new Response(null, { status: 404, headers });
  const client = createServerClient();
  const { data, error } = await client.rpc("crm_public_presentation", {
    target_token: token,
  });
  if (error) return new Response(null, { status: 503, headers });
  const item = (data as PublicPresentation | null)?.assets.find(
    (a) => String(a.id) === asset,
  );
  if (!item || !ASSET_PATH.test(item.path))
    return new Response(null, { status: 404, headers });
  return streamPublicStorageObject(request, "crm-marketing", item.path, item.mime_type);
}
