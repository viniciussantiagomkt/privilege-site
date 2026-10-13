import type { BaseRow, CrmProperty } from "./model";
export interface Asset extends BaseRow {
  owner_id: string;
  scope: string;
  title: string;
  category: string;
  tags: string[];
  description: string | null;
  status: string;
  visibility: string;
  expires_at: string | null;
  current_version_id: number | null;
}
export interface AssetVersion extends BaseRow {
  asset_id: number;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  checksum: string;
  original_name: string;
}
export interface AssetRelation extends BaseRow {
  asset_id: number;
  property_id: number | null;
  development_id: number | null;
}
export interface Collection extends BaseRow {
  owner_id: string;
  name: string;
  description: string | null;
}
export interface CollectionItem extends BaseRow {
  collection_id: number;
  asset_id: number | null;
  property_id: number | null;
}
export interface Share extends BaseRow {
  token: string;
  owner_id: string;
  lead_id: number | null;
  client_id: number | null;
  property_ids: number[];
  asset_ids: number[];
  title: string;
  message: string | null;
  channel: string;
  expires_at: string;
  revoked_at: string | null;
}
export interface ShareEvent extends BaseRow {
  share_id: number;
}
export interface Developer extends BaseRow {
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  disclosure_rules: string | null;
}
export interface Development extends BaseRow {
  developer_id: number | null;
  name: string;
  location: string | null;
  description: string | null;
  typologies: string | null;
  sales_conditions: string | null;
  status: string;
  delivery_date: string | null;
}
export interface Unit extends BaseRow {
  development_id: number;
  property_id: number;
  unit_label: string;
}
export interface AutomationPreference {
  owner_id: string;
  share_followup: boolean;
  followup_days: number;
}
export interface EventLog extends BaseRow {
  event_type: string;
  entity_id: number;
  status: string;
}
export interface AssetImport extends BaseRow {
  file_name: string;
  status: string;
  asset_id: number | null;
  error_message: string | null;
}
export const CATEGORIES = [
  "foto",
  "render",
  "planta",
  "video",
  "tour",
  "pdf",
  "folder",
  "tabela",
  "story",
  "feed",
  "anuncio",
  "documento",
];
export const eligibleProperty = (p: CrmProperty) =>
  p.publish_on_site &&
  p.presentation_enabled &&
  ["aprovado", "publicado"].includes(p.workflow_status) &&
  ["ativo", "reservado", "vendido", "alugado"].includes(p.status || "");
export const approvedAsset = (a: Asset, now = Date.now()) =>
  a.status === "aprovado" &&
  a.visibility === "public" &&
  !!a.current_version_id &&
  (!a.expires_at || new Date(a.expires_at).getTime() > now);
export function assetsForProperty(
  assets: Asset[],
  relations: AssetRelation[],
  units: Unit[],
  propertyId: number,
) {
  return assets.filter(
    (a) =>
      approvedAsset(a) &&
      relations.some(
        (r) =>
          r.asset_id === a.id &&
          (r.property_id === propertyId ||
            units.some(
              (u) =>
                u.property_id === propertyId &&
                u.development_id === r.development_id,
            )),
      ),
  );
}
export const shareState = (s: Share) =>
  s.revoked_at
    ? "Revogado"
    : new Date(s.expires_at).getTime() <= Date.now()
      ? "Vencido"
      : "Ativo";
export const sharePath = (s: Pick<Share, "token">) =>
  `/apresentacoes/${s.token}`;
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ASSET_PATH =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}[.](webp|jpg|jpeg|png|pdf|mp4)$/;
export interface PublicPresentation {
  title: string;
  message: string | null;
  expires_at: string;
  broker: { name: string; phone: string | null; creci: string | null } | null;
  properties: {
    id: number;
    title: string;
    property_code: string;
    description: string;
    location: string;
    price: string;
    bedrooms: number;
    bathrooms: number;
    garage: number;
    area: string;
    images: string[];
    videos: string[];
    status: string;
  }[];
  assets: {
    id: number;
    title: string;
    category: string;
    mime_type: string;
    path: string;
    size_bytes: number;
  }[];
}
