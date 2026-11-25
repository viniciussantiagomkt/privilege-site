import { getPropertyNumericPrice, normalizeText } from "../property-filters";
import { type WorkspaceData, type CrmProperty } from "./model";
import { type WorkRecord } from "./broker-workspace";

const civilFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Fortaleza" });
const day = (d: Date) => civilFormatter.format(d);
export type AgendaPeriod = "today" | "overdue" | "week" | "all";
export function dailyQueue(data: WorkspaceData, userId: string, now = new Date()) {
  if (!userId) return [];
  const rows: (WorkRecord & { reason: string; priority: number })[] = [];
  for (const task of data.tasks.filter(t => t.broker_id === userId && !["concluida", "cancelada"].includes(t.status))) {
    if (!Number.isFinite(Date.parse(task.due_at))) continue;
    const late = Date.parse(task.due_at) < now.getTime();
    rows.push({ kind: "task", id: task.id, title: task.title, detail: "Tarefa / retorno", status: task.status, when: task.due_at, reason: late ? "Prazo vencido" : day(new Date(task.due_at)) === day(now) ? "Prevista para hoje" : "Próximo compromisso", priority: late ? 0 : 3 });
  }
  for (const visit of data.visits.filter(v => v.broker_id === userId && !["realizada", "cancelada"].includes(v.status))) {
    if (!Number.isFinite(Date.parse(visit.scheduled_at))) continue;
    const past = Date.parse(visit.scheduled_at) < now.getTime();
    const contact = data.clients.find(c => c.id === visit.client_id && c.broker_id === userId);
    rows.push({ kind: "visit", id: visit.id, title: `Visita · ${contact?.name || "Cliente não carregado"}`, detail: data.properties.find(p => p.id === visit.property_id)?.title || "Imóvel não carregado", status: visit.status, when: visit.scheduled_at, reason: past ? "Horário passado, sem desfecho registrado" : "Visita agendada", priority: past ? 1 : 2 });
  }
  return rows.sort((a, b) => a.priority - b.priority || Date.parse(a.when!) - Date.parse(b.when!) || a.id - b.id || a.kind.localeCompare(b.kind));
}
export function inAgendaPeriod(when: string, period: AgendaPeriod, now = new Date()) {
  const timestamp = Date.parse(when);
  if (!Number.isFinite(timestamp)) return false;
  if (period === "all") return true;
  if (period === "overdue") return timestamp < now.getTime();
  if (period === "today") return day(new Date(timestamp)) === day(now);
  const last = new Date(now); last.setUTCDate(last.getUTCDate() + 7);
  return day(new Date(timestamp)) >= day(now) && day(new Date(timestamp)) <= day(last);
}
export interface PortfolioFilters { city: string; category: string; maxPrice: string; bedrooms: string; available: boolean }
export const EMPTY_PORTFOLIO_FILTERS: PortfolioFilters = { city: "", category: "", maxPrice: "", bedrooms: "", available: false };
export function filterPortfolio(rows: CrmProperty[], f: PortfolioFilters) {
  return rows.filter(p => {
    const price = getPropertyNumericPrice(p.price);
    return !p.deleted_at && (!f.city || normalizeText(p.city || "") === normalizeText(f.city)) &&
      (!f.category || normalizeText(p.category) === normalizeText(f.category)) &&
      (!f.maxPrice || (price !== null && price > 0 && price <= Number(f.maxPrice))) &&
      (!f.bedrooms || (p.bedrooms !== null && p.bedrooms >= Number(f.bedrooms))) &&
      (!f.available || p.status === "ativo");
  });
}
export function captureGaps(p: CrmProperty, data: WorkspaceData, userId: string) {
  const gaps: string[] = [];
  if (!p.images?.length && !p.main_image_url) gaps.push("Fotos pendentes");
  if (!p.city || !p.neighborhood) gaps.push("Localização incompleta");
  if (!getPropertyNumericPrice(p.price)) gaps.push("Valor a confirmar");
  const ownOwner = data.crm_contact_links.some(l => l.property_id === p.id && data.clients.some(c => c.id === l.contact_id && c.broker_id === userId && ["proprietario", "ambos"].includes(c.contact_type)));
  if (!ownOwner) gaps.push("Vínculo de proprietário não carregado");
  return gaps;
}
export function proposalGaps(data: WorkspaceData, userId: string) {
  return data.proposals.filter(p => p.broker_id === userId && !["recusada", "cancelada"].includes(p.status)).map(p => ({
    proposal: p,
    gaps: [!data.clients.some(c => c.id === p.client_id && c.broker_id === userId) && "Cliente não carregado", !data.properties.some(i => i.id === p.property_id) && "Imóvel não carregado", (!p.value || p.value <= 0) && "Valor pendente"].filter((x): x is string => !!x),
  }));
}
