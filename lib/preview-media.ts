// Replaced by next.config at build time on both server and client, never a public toggle.
export function isIsolatedMediaPreview() {
  return process.env.PRIVILEGE_MEDIA_POLICY !== "standard";
}

export function previewMediaSourceAllowed(source: string) {
  if (!source) return false;
  if (!isIsolatedMediaPreview()) return true;
  if (/[\\\u0000-\u0020]/.test(source)) return false;
  if (source.startsWith("/") && !source.startsWith("//") && !source.includes("\\")) return true;
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(source)) return true;
  try {
    const url = new URL(source);
    if (url.protocol === "blob:") return true;
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      url.hostname === "sdpqphiooiuglywcmkxv.supabase.co" &&
      (url.pathname.startsWith("/storage/v1/") || url.pathname === "/functions/v1/crm-presentation-media");
  } catch {
    return false;
  }
}

export function previewMediaSource(source: string) {
  return previewMediaSourceAllowed(source) ? source : "/brand/symbol-blue.png";
}
