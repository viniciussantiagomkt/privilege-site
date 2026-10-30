export type AnalyticsDays=7|28|90;
export interface SiteAnalyticsSummary{activeUsers:number;sessions:number;views:number;engagementRate:number}
export interface SiteAnalyticsReport{
 days:AnalyticsDays;generatedAt:string;timezone:string;cached:boolean;warnings:string[];
 current:SiteAnalyticsSummary;previous:SiteAnalyticsSummary;
 daily:{date:string;sessions:number;users:number;views:number}[];
 channels:{label:string;sessions:number}[];devices:{label:string;sessions:number}[];cities:{label:string;sessions:number}[];
 pages:{path:string;views:number}[];events:{name:string;count:number}[];
}
export const GA_EVENT_LABELS:Record<string,string>={view_item:"Visualizações de imóveis (tag GA4)",property_view:"Visualizações de imóveis (evento original)",generate_lead:"Cliques WhatsApp enviados como generate_lead",whatsapp_lead:"Cliques WhatsApp (evento original)",campaign_whatsapp_click:"Cliques WhatsApp na página de campanha",search:"Buscas no site (tag GA4)",property_search:"Buscas no site (evento original)",add_to_wishlist:"Favoritos (tag GA4)",property_favorite:"Favoritos (evento original)",social_click:"Cliques em redes sociais",CentralDigitalClick:"Cliques na central digital"};
export function changeLabel(current:number,previous:number){
 if(previous===0)return current===0?"Sem variação":"Sem base no período anterior";
 const value=(current-previous)/previous*100;return `${value>=0?"+":""}${value.toLocaleString("pt-BR",{maximumFractionDigits:1})}% vs. período anterior`;
}
