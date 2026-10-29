type MediaEnvironment = { url: string; publicKey: string; storageKey: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
export async function presentationMedia(request: Request, env: MediaEnvironment, send: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "GET") return new Response(null, { status: 405, headers });
  const query = new URL(request.url).searchParams;
  const token = query.get("token") || "";
  const property = query.get("property") || "";
  const index = query.get("image") || "";
  const asset = query.get("asset");
  const validImage = /^[1-9]\d*$/.test(property) && /^\d{1,4}$/.test(index);
  if (!uuid.test(token) || (asset !== null ? !/^[1-9]\d*$/.test(asset) || !!property || !!index : !validImage)) return new Response(null, {status:404, headers});
  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new Response(null,{status:400,headers});
  if (!env.url || !env.publicKey || !env.storageKey) return new Response(null, {status:503, headers});
  try {
    // Resolve the capability using ONLY the public key. Never accept a storage path from the caller.
    const rpc = await send(`${env.url}/rest/v1/rpc/crm_public_presentation`, {
      method:"POST", headers:{apikey:env.publicKey,"Content-Type":"application/json", ...(!env.publicKey.startsWith("sb_") ? {Authorization:`Bearer ${env.publicKey}`} : {})},
      body: JSON.stringify({target_token:token}), signal:request.signal, redirect:"error", cache:"no-store",
    });
    if (!rpc.ok) { await rpc.body?.cancel(); return new Response(null,{status:503,headers}); }
    const data = await rpc.json();
    let path: string | null = null;
    let mime = "image/webp";
    let bucket = "crm-property-images";
    if (asset !== null) {
      const item = data?.assets?.find((a: {id:number}) => String(a.id) === asset);
      const allowed: Record<string,string> = {webp:"image/webp",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",pdf:"application/pdf",mp4:"video/mp4"};
      const match = typeof item?.path === "string" ? item.path.match(/^([0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png|pdf|mp4))$/) : null;
      if (match && allowed[match[2]] === item.mime_type) {path=match[1];mime=item.mime_type;bucket="crm-marketing";}
    } else {
      const item = data?.properties?.find((p: {id: number}) => String(p.id) === property);
      const image = item?.images?.[Number(index)];
      path = typeof image === "string" ? image.match(/\/api\/property-media\/([0-9a-f-]{36}\/[0-9a-f-]{36}\.webp)$/)?.[1] || null : null;
    }
    if (!path) return new Response(null,{status:404,headers});
    // Built-in Edge secret stays on the server. Buckets remain private, RLS is not widened.
    const source = await send(`${env.url}/storage/v1/object/authenticated/${bucket}/${path}`, {
      headers:{apikey:env.storageKey,Authorization:`Bearer ${env.storageKey}`,...(range?{Range:range}:{})}, signal:request.signal,redirect:"error",cache:"no-store",
    });
    const output = new Headers(headers);
    if (source.status === 416) {
      const value = source.headers.get("content-range");if(value)output.set("Content-Range",value);
      await source.body?.cancel();return new Response(null,{status:416,headers:output});
    }
    if (![200,206].includes(source.status) || !source.body) { await source.body?.cancel(); return new Response(null,{status:source.status>=500||source.status===429?503:404,headers}); }
    output.set("Content-Type",mime);output.set("Content-Disposition","inline");
    for(const name of ["Content-Length","Content-Range","Accept-Ranges"]) {const value=source.headers.get(name);if(value)output.set(name,value);}
    return new Response(source.body,{status:source.status,headers:output});
  } catch { return new Response(null,{status:503,headers}); }
}
