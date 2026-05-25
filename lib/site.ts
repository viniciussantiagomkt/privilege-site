export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.privilegeimoveispb.com.br";

export function absoluteUrl(path = "") {
  if (!path) return siteUrl;
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function cleanMetadataText(value: string | null | undefined, minLength = 8) {
  const text = value?.trim();
  return text && text.length >= minLength ? text : null;
}
