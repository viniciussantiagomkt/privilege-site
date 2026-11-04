import { matches, type WorkspaceData } from "./model";

export const WORK_TABS = [
  { id: "hoje", label: "Hoje" },
  { id: "atendimentos", label: "Atendimentos" },
  { id: "imoveis", label: "Imóveis" },
  { id: "negocios", label: "Negócios" },
] as const;
export type WorkTab = (typeof WORK_TABS)[number]["id"];
export type WorkKind =
  | "task"
  | "visit"
  | "lead"
  | "contact"
  | "property"
  | "proposal"
  | "negotiation";
export const WORK_TABLES: Record<WorkTab, (keyof WorkspaceData)[]> = {
  hoje: ["tasks", "visits", "leads", "properties", "clients"],
  atendimentos: ["leads", "clients", "crm_contact_links"],
  imoveis: ["properties"],
  negocios: ["proposals", "negotiations", "clients", "properties"],
};
export function workTab(value: string | null): WorkTab {
  return WORK_TABS.find((t) => t.id === value)?.id || "hoje";
}
export function recordId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
export function canAddWork(role: string, userId: string) {
  return !!userId && ["admin", "manager", "broker", "corretor"].includes(role);
}
export const WORK_DESTINATIONS: Record<
  WorkKind,
  { path: string; key: string; create: string }
> = {
  task: { path: "/admin/agenda", key: "task", create: "task" },
  visit: { path: "/admin/agenda", key: "visit", create: "visit" },
  lead: { path: "/admin/leads", key: "lead", create: "lead" },
  contact: { path: "/admin/contatos", key: "contact", create: "contact" },
  property: { path: "/admin/imoveis", key: "imovel", create: "property" },
  proposal: { path: "/admin/negocios", key: "proposal", create: "proposal" },
  negotiation: {
    path: "/admin/negocios",
    key: "negotiation",
    create: "negotiation",
  },
};
export function workDestination(kind: WorkKind, id?: number) {
  const target = WORK_DESTINATIONS[kind];
  return `${target.path}?${id === undefined ? `novo=${target.create}` : `${target.key}=${id}`}`;
}
export interface WorkRecord {
  kind: WorkKind;
  id: number;
  title: string;
  detail: string;
  status: string;
  when?: string;
  description?: string | null;
}
const civilFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Fortaleza" });
const civilDay = (date: Date) => civilFormatter.format(date);
export function workRecords(
  tab: WorkTab,
  data: WorkspaceData,
  query: string,
  now = new Date(),
): WorkRecord[] {
  const property = (id: number | null) =>
    data.properties.find((p) => p.id === id)?.title || "Imóvel não carregado";
  const client = (id: number | null) =>
    data.clients.find((c) => c.id === id)?.name || "Cliente não carregado";
  let rows: WorkRecord[] = [];
  if (tab === "hoje") {
    const today = civilDay(now);
    rows = [
      ...data.tasks
        .filter((t) => t.status !== "concluida")
        .map(
          (t): WorkRecord => ({
            kind: "task",
            id: t.id,
            title: t.title,
            detail: "Tarefa / retorno",
            status: t.status,
            when: t.due_at,
            description: t.description,
          }),
        ),
      ...data.visits
        .filter((v) => !["realizada", "cancelada"].includes(v.status))
        .map(
          (v): WorkRecord => ({
            kind: "visit",
            id: v.id,
            title: `Visita · ${client(v.client_id)}`,
            detail: property(v.property_id),
            status: v.status,
            when: v.scheduled_at,
            description: v.notes,
          }),
        ),
    ]
      .filter(
        (r) =>
          r.when &&
          Number.isFinite(Date.parse(r.when)) &&
          civilDay(new Date(r.when)) <= today,
      )
      .sort((a, b) => a.when!.localeCompare(b.when!));
  }
  if (tab === "atendimentos")
    rows = [
      ...data.leads.map(
        (l): WorkRecord => ({
          kind: "lead",
          id: l.id,
          title: l.name,
          detail: l.property_title || l.phone || l.email || "Lead",
          status: l.status,
          description: l.notes || l.message,
        }),
      ),
      ...data.clients.map(
        (c): WorkRecord => ({
          kind: "contact",
          id: c.id,
          title: c.name,
          detail: c.phone || c.email || "Contato",
          status: c.contact_type,
          description: c.notes,
        }),
      ),
    ];
  if (tab === "imoveis")
    rows = data.properties.map((p) => ({
      kind: "property",
      id: p.id,
      title: p.title,
      detail: `${p.property_code || "Sem código"} · ${p.location || "Localização não informada"}`,
      status: `${p.workflow_status} · ${p.status}`,
      description: p.description,
    }));
  if (tab === "negocios")
    rows = [
      ...data.proposals.map(
        (p): WorkRecord => ({
          kind: "proposal",
          id: p.id,
          title: `Proposta #${p.id} · ${client(p.client_id)}`,
          detail: property(p.property_id),
          status: p.status,
        }),
      ),
      ...data.negotiations.map(
        (n): WorkRecord => ({
          kind: "negotiation",
          id: n.id,
          title: `Negociação #${n.id}`,
          detail: `Proposta #${n.proposal_id}`,
          status: n.status,
          description: n.notes,
        }),
      ),
    ];
  return rows.filter((r) => matches(query, r.title, r.detail, r.status));
}
