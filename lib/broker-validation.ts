export interface BrokerCreateBody {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  whatsapp?: string;
  creci?: string;
  instagram?: string;
  position?: string;
  bio?: string;
  avatar_url?: string;
  active?: boolean;
}

export function validateBrokerCreate(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Dados do corretor inválidos.";
  const body = input as Record<string, unknown>;
  if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.name !== "string" || !body.name.trim() || body.name.length > 160) return "Informe nome e e-mail válidos.";
  for (const field of ["password", "phone", "whatsapp", "creci", "instagram", "position", "bio", "avatar_url"]) {
    if (body[field] !== undefined && (typeof body[field] !== "string" || (body[field] as string).length > 4000)) return "Revise os campos do corretor.";
  }
  if (typeof body.password === "string" && body.password && body.password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (body.active !== undefined && typeof body.active !== "boolean") return "Visibilidade inválida.";
  return null;
}
