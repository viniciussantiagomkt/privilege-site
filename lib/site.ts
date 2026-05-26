export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.privilegeimoveispb.com.br";

export const siteName = "Privilege Imóveis";
export const defaultTitle = "Privilege Imóveis | Imóveis de alto padrão na Paraíba";
export const defaultDescription =
  "Curadoria imobiliária premium em Campina Grande e Paraíba para casas, apartamentos, condomínios, terrenos e oportunidades exclusivas.";
export const defaultOgImage = "/brand/logo-horizontal-blue.png";
export const companyEmail = "contato@privilegeimoveis.com.br";
export const companyPhone = "+55 83 99999-9999";
export const localKeywords = [
  "imóveis em Campina Grande",
  "imobiliária em Campina Grande",
  "imóveis de alto padrão na Paraíba",
  "casas em condomínio em Campina Grande",
  "Privilege Imóveis",
];

export function absoluteUrl(path = "") {
  if (!path) return siteUrl;
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function cleanMetadataText(value: string | null | undefined, minLength = 8) {
  const text = value?.trim();
  return text && text.length >= minLength ? text : null;
}

export function canonicalPath(path = "") {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}
