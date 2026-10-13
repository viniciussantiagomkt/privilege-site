// The public key deliberately keeps upstream downloads subject to anonymous RLS.
// Callers must validate the presentation capability and storage path first.
export async function streamPublicStorageObject(
  request: Request,
  bucket: 'crm-marketing' | 'crm-property-images',
  path: string,
  mimeType: string,
) {
  const headers = new Headers({
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  const range = request.headers.get('range');
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return new Response(null, {status: 400, headers});
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return new Response(null, {status: 503, headers});
  const upstreamHeaders = new Headers({apikey: key});
  // Publishable keys belong in apikey, while legacy anonymous JWTs also use Bearer.
  if (!key.startsWith('sb_')) upstreamHeaders.set('Authorization', `Bearer ${key}`);
  if (range) upstreamHeaders.set('Range', range);
  try {
    const source = await fetch(`${url}/storage/v1/object/authenticated/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, {
      headers: upstreamHeaders,
      cache: 'no-store',
      signal: request.signal,
      redirect: 'error',
    });
    if (source.status === 416) {
      const contentRange = source.headers.get('content-range');
      if (contentRange) headers.set('Content-Range', contentRange);
      await source.body?.cancel();
      return new Response(null, {status: 416, headers});
    }
    if (![200, 206].includes(source.status) || !source.body) {
      await source.body?.cancel();
      return new Response(null, {status: source.status >= 500 || source.status === 429 ? 503 : 404, headers});
    }
    headers.set('Content-Type', mimeType);
    headers.set('Content-Disposition', 'inline');
    for (const name of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const value = source.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(source.body, {status: source.status, headers});
  } catch {
    return new Response(null, {status: 503, headers});
  }
}
