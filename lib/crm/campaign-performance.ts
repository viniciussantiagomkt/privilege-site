import type { Campaign, LeadAttribution } from "./campaigns";
import type { Lead } from "./model";

export const CAMPAIGN_STAGES = [
  {id:"novo",label:"Novos"},
  {id:"em atendimento",label:"Em atendimento"},
  {id:"visita agendada",label:"Visita agendada"},
  {id:"convertido",label:"Convertidos no pipeline"},
  {id:"perdido",label:"Perdidos"},
  {id:"outro",label:"Outras etapas"},
] as const;
export interface CampaignPeriod {since:string;until:string}
function campaignDateWindow(period:CampaignPeriod){
  const parse=(value:string)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("invalid_period");
    const date=Date.parse(value+"T00:00:00Z");
    if(!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==value)throw Error("invalid_period");
    // Campina Grande has UTC-3 civil dates. End is exclusive at next midnight.
    return date+3*60*60*1000;
  };
  const start=period.since?parse(period.since):-Infinity;
  const end=period.until?parse(period.until)+24*60*60*1000:Infinity;
  if(start>=end)throw Error("invalid_period");
  return {start,end,active:Boolean(period.since||period.until)};
}
export function campaignPerformance(
  campaigns: Pick<Campaign,"id"|"name">[],
  attributions: Pick<LeadAttribution,"campaign_id"|"lead_id">[],
  leads: Pick<Lead,"id"|"status"|"first_contact_at"|"created_at">[],
  period:CampaignPeriod={since:"",until:""},
) {
  const window=campaignDateWindow(period);
  const byLead = new Map(leads.map(lead=>[lead.id,lead]));
  const linked = new Map<number,Set<number>>();
  for(const attribution of attributions){
    let ids=linked.get(attribution.campaign_id);
    if(!ids){ids=new Set();linked.set(attribution.campaign_id,ids);}
    ids.add(attribution.lead_id);
  }
  return campaigns.map(campaign=>{
    const counts:Record<string,number>=Object.fromEntries(CAMPAIGN_STAGES.map(s=>[s.id,0]));
    let total=0,contactRecorded=0,unavailable=0,invalidDates=0;
    for(const id of linked.get(campaign.id)??[]){
      const lead=byLead.get(id);
      if(!lead){unavailable++;continue;}
      if(window.active){
        const created=Date.parse(lead.created_at);
        if(!Number.isFinite(created)){invalidDates++;continue;}
        if(created<window.start||created>=window.end)continue;
      }
      total++;
      const stage=lead.status.replaceAll("_"," ").trim();
      counts[Object.hasOwn(counts,stage)&&stage!=="outro"?stage:"outro"]++;
      if(lead.first_contact_at&&Number.isFinite(Date.parse(lead.first_contact_at)))contactRecorded++;
    }
    return {id:campaign.id,name:campaign.name,total,contactRecorded,unavailable,invalidDates,counts,
      conversionRate:total?counts.convertido/total:null};
  });
}
