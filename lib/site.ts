export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.privilegeimoveispb.com.br";

export const siteName = "Privilege Imóveis";
export const defaultTitle = "Privilege Imóveis | Imobiliária na Paraíba";
export const defaultDescription =
  "Imobiliária em Campina Grande e Paraíba para quem busca comprar, vender ou alugar com atendimento claro, seguro e especializado.";
export const defaultOgImage = "/brand/logo-horizontal-blue.png";
export const companyEmail = "privilegeimoveis51@gmail.com";
export const companyPhone = "+55 83 99952-1041";
export const companyPhoneDisplay = "(83) 99952-1041";
export const companyWhatsApp = "5583999521041";
export const localKeywords = [
  "imóveis em Campina Grande",
  "imobiliária em Campina Grande",
  "imóveis na Paraíba",
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
