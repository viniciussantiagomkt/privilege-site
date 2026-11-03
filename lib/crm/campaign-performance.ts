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
export function campaignPerformance(
  campaigns: Pick<Campaign,"id"|"name">[],
  attributions: Pick<LeadAttribution,"campaign_id"|"lead_id">[],
  leads: Pick<Lead,"id"|"status"|"first_contact_at">[],
) {
  const byLead = new Map(leads.map(lead=>[lead.id,lead]));
  const linked = new Map<number,Set<number>>();
  for(const attribution of attributions){
    let ids=linked.get(attribution.campaign_id);
    if(!ids){ids=new Set();linked.set(attribution.campaign_id,ids);}
    ids.add(attribution.lead_id);
  }
  return campaigns.map(campaign=>{
    const counts:Record<string,number>=Object.fromEntries(CAMPAIGN_STAGES.map(s=>[s.id,0]));
    let total=0,contactRecorded=0,unavailable=0;
    for(const id of linked.get(campaign.id)??[]){
      const lead=byLead.get(id);
      if(!lead){unavailable++;continue;}
      total++;
      const stage=lead.status.replaceAll("_"," ").trim();
      counts[Object.hasOwn(counts,stage)&&stage!=="outro"?stage:"outro"]++;
      if(lead.first_contact_at&&Number.isFinite(Date.parse(lead.first_contact_at)))contactRecorded++;
    }
    return {id:campaign.id,name:campaign.name,total,contactRecorded,unavailable,counts,
      conversionRate:total?counts.convertido/total:null};
  });
}
