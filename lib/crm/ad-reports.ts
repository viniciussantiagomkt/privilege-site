export interface AdAccount {
 id:string;name:string;provider:"meta"|"google";scope:"company"|"personal";
 status:"pending"|"connected"|"error"|"reauthorize"|"revoked";
 currency:string|null;timezone:string|null;last_success_at:string|null;
 last_error:string|null;last_period_start:string|null;last_period_end:string|null;
}
export interface AdCampaignReport {
 external_id:string;name:string;remote_status:string;active:boolean;observed_at:string;
 days_with_data:number;spend_micros:string;impressions:string;clicks:string;platform_conversions:string|null;
 platform_actions:{type:string;value:string}[];
}
export interface AdReportView{account:AdAccount;campaigns:AdCampaignReport[];complete_period:boolean}
export const AD_ACCOUNT_STATUS={pending:"Conexão pendente",connected:"Conectada",error:"Falha na atualização",reauthorize:"Reconexão necessária",revoked:"Sincronização suspensa"};
export function formatAdMoney(micros:string,currency:string){
 if(!/^\d+$/.test(micros)||!/^[A-Z]{3}$/.test(currency))return "Indisponível";
 const cents=(BigInt(micros)+BigInt(5000))/BigInt(10000);
 return `${currency} ${(cents/BigInt(100)).toLocaleString("pt-BR")},${String(cents%BigInt(100)).padStart(2,"0")}`;
}
export function adRatio(numerator:string,denominator:string,scale=1){
 const n=Number(numerator),d=Number(denominator);
 return !Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d<=0?null:n/d*scale;
}
export function adCostPerClick(micros:string,clicks:string,currency:string){
 if(!/^\d+$/.test(micros)||!/^\d+$/.test(clicks)||BigInt(clicks)===BigInt(0))return "Indisponível";
 return formatAdMoney(((BigInt(micros)+BigInt(clicks)/BigInt(2))/BigInt(clicks)).toString(),currency);
}
