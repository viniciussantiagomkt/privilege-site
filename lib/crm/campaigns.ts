export interface Campaign {
  id: number;
  owner_id: string;
  scope: "company" | "personal";
  name: string;
  platform: string;
  objective: string;
  entry_channel: string;
  status: string;
  property_id: number | null;
  development_id: number | null;
  routing: "institutional" | "broker";
  destination_broker_id: string | null;
  external_account_id: string | null;
  external_campaign_id: string | null;
  created_at: string;
}
export interface LeadAttribution {
  id: number;
  lead_id: number;
  campaign_id: number;
  campaign_name: string;
  platform: string;
  provenance: "manual";
  details: Record<string,string>;
  routing_result: "institutional_queue" | "assigned" | "personal" | "fallback_queue";
  created_at: string;
}
export const PLATFORMS = {meta:"Meta",google:"Google",instagram:"Instagram",organic:"Orgânico",other:"Outro"};
export const CAMPAIGN_STATUSES = {draft:"Rascunho",active:"Ativa",paused:"Pausada",archived:"Arquivada"};
export const ATTRIBUTION_FIELDS = {
 utm_source:"Origem UTM",utm_medium:"Meio UTM",utm_campaign:"Campanha UTM",utm_content:"Criativo UTM",utm_term:"Termo UTM",adset_id:"ID do conjunto/grupo",ad_id:"ID do anúncio",keyword:"Palavra-chave",landing_path:"Página de entrada",
};
export function campaignLabel(platform: string) { return PLATFORMS[platform as keyof typeof PLATFORMS] || "Não identificada"; }
export function attributionFromForm(form: FormData) {
 const result: Record<string,string> = {};
 for(const key of Object.keys(ATTRIBUTION_FIELDS)) {
  const raw=form.get(key);
  if(typeof raw!=="string" || !raw.trim())continue;
  const value=raw.trim();
  if(value.length>(key==="landing_path"?1000:256) || /[\x00-\x1f\x7f]/.test(value))throw Error("Revise os campos de origem.");
  if(key==="landing_path" && (!value.startsWith("/") || value.startsWith("//") || /[?#]/.test(value)))throw Error("Informe só o caminho da página, sem parâmetros. Exemplo: /imoveis/casa.");
  result[key]=value;
 }
 return result;
}
