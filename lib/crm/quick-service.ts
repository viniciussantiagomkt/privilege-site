import type { Contact } from "./model";

export type InterestProfile = {
  purpose?: "compra" | "aluguel" | "investimento";
  property_type?:
    | "apartamento"
    | "casa"
    | "condominio"
    | "terreno"
    | "comercial"
    | "outro";
  city?: string;
  neighborhoods?: string[];
  budget_min?: string;
  budget_max?: string;
  bedrooms?: number;
  parking_spaces?: number;
  preferences?: string;
  payment_method?: "a_vista" | "financiamento" | "consorcio" | "indefinido";
  financing?: boolean;
  down_payment?: string;
};
export const PURPOSES = {
  compra: "Compra",
  aluguel: "Aluguel",
  investimento: "Investimento",
};
export function normalizeClientPhone(value: string) {
  if (Array.from(value).length > 64 || /[a-z]/i.test(value))
    throw Error("Informe um WhatsApp brasileiro com DDD.");
  const significant = value.replace(/[^0-9+]/g, "");
  const internationalPlus = significant.startsWith("+");
  const international00 = significant.startsWith("00");
  if (significant.includes("+") && !/^\+55[0-9]+$/.test(significant))
    throw Error("Informe um WhatsApp brasileiro com DDD.");
  // Explicit country prefixes must never be retried as shorter national numbers.
  let digits = internationalPlus
    ? significant.slice(1)
    : international00
      ? significant.slice(2)
      : significant;
  if (!internationalPlus && !international00 && /^\d{10,11}$/.test(digits))
    digits = "55" + digits;
  if (!/^55[1-9]\d\d{8,9}$/.test(digits))
    throw Error("Informe um WhatsApp brasileiro com DDD.");
  return digits;
}
export function possibleClientDuplicates(
  rows: Contact[],
  input: { id?: number; phone: string; email?: string },
) {
  const phone = normalizeClientPhone(input.phone);
  return rows.filter((row) => {
    if (row.id === input.id) return false;
    let same = false;
    try {
      same = !!row.phone && normalizeClientPhone(row.phone) === phone;
    } catch {
      /* Legacy incomplete phone. */
    }
    return (
      same ||
      (!!input.email?.trim() &&
        row.email?.trim().toLowerCase() === input.email.trim().toLowerCase())
    );
  });
}
const profileKeys = new Set([
  "purpose",
  "property_type",
  "city",
  "neighborhoods",
  "budget_min",
  "budget_max",
  "bedrooms",
  "parking_spaces",
  "preferences",
  "payment_method",
  "financing",
  "down_payment",
]);
export function moneyCents(value: string) {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value))
    throw Error("Informe um valor positivo com até duas casas decimais.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function validateInterest(value: unknown): InterestProfile {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Perfil de interesse inválido.");
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some((key) => !profileKeys.has(key)))
    throw Error("O perfil contém campos não permitidos.");
  const choice = (key: string, values: string[]) => {
    if (
      key in p &&
      (typeof p[key] !== "string" || !values.includes(p[key] as string))
    )
      throw Error("Selecione uma opção válida para o perfil.");
  };
  choice("purpose", Object.keys(PURPOSES));
  choice("property_type", [
    "apartamento",
    "casa",
    "condominio",
    "terreno",
    "comercial",
    "outro",
  ]);
  choice("payment_method", [
    "a_vista",
    "financiamento",
    "consorcio",
    "indefinido",
  ]);
  for (const [key, max] of [
    ["city", 100],
    ["preferences", 1000],
  ] as const)
    if (
      key in p &&
      (typeof p[key] !== "string" ||
        (p[key] as string).length > max ||
        /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(p[key] as string))
    )
      throw Error("Revise os textos do perfil.");
  if (
    "neighborhoods" in p &&
    (!Array.isArray(p.neighborhoods) ||
      p.neighborhoods.length > 20 ||
      p.neighborhoods.some(
        (n) =>
          typeof n !== "string" ||
          !n.trim() ||
          n.length > 100 ||
          /[\x00-\x1f]/.test(n),
      ))
  )
    throw Error("Informe até 20 bairros, com até 100 caracteres cada.");
  for (const key of ["bedrooms", "parking_spaces"])
    if (
      key in p &&
      (!Number.isInteger(p[key]) || Number(p[key]) < 0 || Number(p[key]) > 30)
    )
      throw Error("Quartos e vagas devem ser inteiros entre 0 e 30.");
  for (const key of ["budget_min", "budget_max", "down_payment"])
    if (key in p) {
      if (typeof p[key] !== "string") throw Error("Valor monetário inválido.");
      moneyCents(p[key] as string);
    }
  if (
    "budget_min" in p &&
    "budget_max" in p &&
    moneyCents(p.budget_min as string) > moneyCents(p.budget_max as string)
  )
    throw Error("O orçamento mínimo não pode superar o máximo.");
  if ("financing" in p && typeof p.financing !== "boolean")
    throw Error("Informe o interesse em financiamento.");
  return structuredClone(p) as InterestProfile;
}
export function interestFromForm(f: FormData) {
  const p: Record<string, unknown> = {};
  for (const key of profileKeys) {
    const text = String(f.get(key) || "").trim();
    if (!text) continue;
    p[key] =
      key === "neighborhoods"
        ? [
            ...new Set(
              text
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ]
        : ["bedrooms", "parking_spaces"].includes(key)
          ? Number(text)
          : key === "financing"
            ? text === "true"
            : text;
  }
  return validateInterest(p);
}
export const MESSAGE_TEMPLATES = {
  first: "Primeiro atendimento",
  presentation: "Enviar apresentação",
  visit: "Confirmar visita",
  documents: "Solicitar documentos",
  proposal: "Acompanhar proposta",
  followup: "Retorno após atendimento",
};
export type MessageKind = keyof typeof MESSAGE_TEMPLATES;
export function serviceMessage(
  kind: MessageKind,
  c: {
    name: string;
    broker?: string;
    property?: string;
    code?: string;
    date?: string;
    presentationUrl?: string;
  },
) {
  const greeting = `Olá, ${c.name}! Aqui é ${c.broker || "seu corretor"}, da Privilege Imóveis.`;
  const property = c.property
    ? `${c.property}${c.code ? ` (${c.code})` : ""}`
    : "o imóvel de seu interesse";
  const texts = {
    first:
      "Quero entender o que você procura para ajudar a encontrar seu próximo imóvel. Podemos conversar?",
    presentation: `Preparei uma apresentação de ${property}.${c.presentationUrl ? `\n${c.presentationUrl}` : " Selecione uma apresentação autorizada antes de enviar."}`,
    visit: c.date
      ? `Podemos confirmar nossa visita a ${property} em ${c.date}?`
      : `Vamos combinar uma visita a ${property}? Qual data e horário funcionam para você?`,
    documents:
      "Podemos alinhar os documentos necessários para a próxima etapa? Vou orientar você sobre o canal seguro para compartilhá-los.",
    proposal: `Gostaria de conversar sobre a proposta de ${property} e esclarecer suas dúvidas.`,
    followup:
      "Estou à disposição para dar continuidade ao seu atendimento. Qual é o melhor próximo passo para você?",
  };
  return `${greeting}\n\n${texts[kind]}`;
}
export function reviewedWhatsAppUrl(phone: string, message: string) {
  if (!message.trim() || message.length > 3000)
    throw Error(
      "Revise a mensagem antes de abrir o WhatsApp (até 3.000 caracteres).",
    );
  return `https://wa.me/${normalizeClientPhone(phone)}?text=${encodeURIComponent(message.trim())}`;
}
export function draftFields(text: string) {
  if (text.length > 2000)
    throw Error("Use um rascunho de até 2.000 caracteres.");
  const name = text.match(/^nome:\s*(.+)$/im)?.[1]?.trim() || "";
  const phone =
    text.match(/^(?:whatsapp|telefone):\s*(.+)$/im)?.[1]?.trim() || "";
  return { name, phone };
}
