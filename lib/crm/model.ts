import type { Property } from "@/types/property";
export type RecordId = number | string;
export interface BaseRow {
  id: number;
  created_at: string;
}
export interface Lead extends BaseRow {
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  broker_id: string | null;
  property_id: number | null;
  property_title: string | null;
  notes: string | null;
  message: string | null;
  first_contact_at: string | null;
  lost_reason: string | null;
}
export interface Contact extends BaseRow {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  broker_id: string | null;
  contact_type: "cliente" | "proprietario" | "ambos";
}
export interface Task extends BaseRow {
  updated_at: string;
  title: string;
  description: string | null;
  due_at: string;
  status: string;
  broker_id: string;
  lead_id: number | null;
  client_id: number | null;
  property_id: number | null;
}
export interface Visit extends BaseRow {
  scheduled_at: string;
  status: string;
  notes: string | null;
  broker_id: string | null;
  client_id: number | null;
  property_id: number | null;
}
export interface Proposal extends BaseRow {
  value: number | null;
  status: string;
  broker_id: string | null;
  client_id: number | null;
  property_id: number | null;
}
export interface Negotiation extends BaseRow {
  proposal_id: number;
  status: string;
  notes: string | null;
}
export interface Sale extends BaseRow {
  value: number;
  date: string;
  broker_id: string | null;
  client_id: number | null;
  property_id: number | null;
}
export interface CrmProperty extends Property {
  owner_id: string | null;
  workflow_status: string;
  property_code: string;
  publish_on_site: boolean;
  presentation_enabled: boolean;
}
export interface Broker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  creci: string | null;
}
export interface Notification extends BaseRow {
  title: string;
  description: string | null;
  read: boolean;
}
export interface ContactLink extends BaseRow {
  contact_id: number;
  lead_id: number | null;
  property_id: number | null;
  relation: string;
}
export interface Activity extends BaseRow {
  description: string;
  type: string;
}
export interface WorkspaceData {
  leads: Lead[];
  clients: Contact[];
  properties: CrmProperty[];
  tasks: Task[];
  visits: Visit[];
  proposals: Proposal[];
  negotiations: Negotiation[];
  sales: Sale[];
  brokers: Broker[];
  notifications: Notification[];
  crm_contact_links: ContactLink[];
}
export const EMPTY_DATA: WorkspaceData = {
  leads: [],
  clients: [],
  properties: [],
  tasks: [],
  visits: [],
  proposals: [],
  negotiations: [],
  sales: [],
  brokers: [],
  notifications: [],
  crm_contact_links: [],
};
export const STAGES = [
  { id: "novo", label: "Lead recebido", color: "#72A3BF" },
  { id: "em atendimento", label: "Em atendimento", color: "#446E87" },
  { id: "visita agendada", label: "Visita agendada", color: "#BFA77A" },
  { id: "convertido", label: "Convertido", color: "#3C8C78" },
  { id: "perdido", label: "Perdido", color: "#B76C6C" },
];
export const normalizeStage = (status: string) => status.replaceAll("_", " ");
export const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const dateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não informado";
export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
export const matches = (
  query: string,
  ...values: (string | null | undefined)[]
) =>
  values
    .join(" ")
    .toLocaleLowerCase("pt-BR")
    .includes(query.toLocaleLowerCase("pt-BR"));
export function periodBuckets(leads: Lead[], now = new Date()) {
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: date.toLocaleDateString("pt-BR", { month: "short" }),
      total: leads.filter((l) => {
        const d = new Date(l.created_at);
        return (
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth()
        );
      }).length,
    };
  });
}
