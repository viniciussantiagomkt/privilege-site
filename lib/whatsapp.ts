import { companyWhatsApp } from "@/lib/site";

const defaultCompanyWhatsApp = companyWhatsApp;

export function normalizeBrazilWhatsApp(value?: string | null) {
  const digits = (value || defaultCompanyWhatsApp).replace(/\D/g, "");

  if (!digits) return defaultCompanyWhatsApp;
  if (digits.startsWith("55")) return digits;

  return `55${digits}`;
}

export function createWhatsAppUrl(
  value?: string | null,
  message = "Olá! Gostaria de falar com um especialista da Privilege Imóveis."
) {
  const number = normalizeBrazilWhatsApp(value);

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export { defaultCompanyWhatsApp };
