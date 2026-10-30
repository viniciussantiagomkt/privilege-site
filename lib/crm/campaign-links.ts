import type { Property } from "@/types/property";
import { isPublicProperty } from "@/lib/property-publication";
export const CAMPAIGN_UTM_FIELDS=["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;
export function campaignLandingEligible(p:Property){
 return isPublicProperty(p)&&p.status==="ativo"&&p.available_for_campaigns===true&&Boolean(p.slug);
}
export function campaignUtm(input:URLSearchParams){
 const out=new URLSearchParams();
 for(const field of CAMPAIGN_UTM_FIELDS){
  const values=input.getAll(field);
  if(values.length>1)throw Error("Use um único valor por campo de origem.");
  const value=(values[0]||"").trim();
  if(!value)continue;
  if(value.length>160||/[\x00-\x1f\x7f]/.test(value))throw Error("Revise os campos de origem: use até 160 caracteres, sem quebras de linha.");
  out.set(field,value);
 }
 return out;
}
export function campaignLandingLink(origin:string,slug:string,params:URLSearchParams){
 const base=new URL(origin);
 if(!["https:","http:"].includes(base.protocol)||base.username||base.password)throw Error("Endereço do site inválido.");
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error("O imóvel precisa de um endereço válido no site.");
 const url=new URL(`/campanhas/imovel/${slug}`,base.origin);url.search=campaignUtm(params).toString();return url.toString();
}
