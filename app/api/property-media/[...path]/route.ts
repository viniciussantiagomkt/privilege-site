import { streamPublicStorageObject } from "@/lib/storage-stream";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const name = path.join("/");
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(name)) {
    return new Response(null, { status: 404 });
  }
  return streamPublicStorageObject(request, "crm-property-images", name, "image/webp");
}
