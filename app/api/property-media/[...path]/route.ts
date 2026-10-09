import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const name = path.join("/");
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(name)) {
    return new Response(null, { status: 404 });
  }
  // Public credentials deliberately keep the download subject to anonymous RLS.
  const { data, error } = await createServerClient().storage
    .from("crm-property-images").download(name);
  const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
  if (error || !data) return new Response(null, { status: 404, headers });
  return new Response(data, { headers: { ...headers, "Content-Type": "image/webp" } });
}
