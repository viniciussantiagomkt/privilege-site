const branch = "codex/crm-operational-priority-20261125";
const allowed = new Set(["/admin", "/admin/meu-trabalho", "/admin/contatos", "/admin/agenda", "/admin/imoveis", "/admin/leads", "/admin/negocios"]);

// Route restriction is additional to authentication/RLS, never a substitute for them.
export function operationalRouteBlocked(path: string, env: { VERCEL_ENV?: string; VERCEL_GIT_COMMIT_REF?: string; CRM_OPERATIONAL_SCOPE?: string }) {
  if (env.VERCEL_GIT_COMMIT_REF !== branch) return false;
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (normalized.startsWith("/api/") || normalized === "/api" || /^\/apresentac(?:ao|oes)(?:\/|$)/.test(normalized)) return true;
  if (normalized === "/admin" || normalized.startsWith("/admin/"))
    return env.VERCEL_ENV !== "preview" || env.CRM_OPERATIONAL_SCOPE !== "daily-operations" || !allowed.has(normalized);
  return false;
}
