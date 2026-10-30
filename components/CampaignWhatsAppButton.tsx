"use client";
import { useState } from "react";
import { campaignUtm } from "@/lib/crm/campaign-links";
import { trackEvent } from "@/lib/analytics";
interface Props{phone:string;title:string;propertyCode:string;propertyId:number;label?:string;location:string}
export function CampaignWhatsAppButton({phone,title,propertyCode,propertyId,label="Quero saber mais",location}:Props){
 const [failed,setFailed]=useState(false);
 const message=`Olá! Tenho interesse no imóvel ${propertyCode||title}: ${title}. Gostaria de mais informações.`;
 const href=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
 return <><a className="campaign-whatsapp" href={href} target="_blank" rel="noopener noreferrer" onClick={e=>{
  // This is a click, never a fabricated contact, conversation or sale.
  let utm:URLSearchParams;
  try{utm=campaignUtm(new URLSearchParams(window.location.search));}catch{utm=new URLSearchParams();}
  const source=utm.get("utm_source"),campaign=utm.get("utm_campaign");
  const originNote=[source,campaign].filter(Boolean).join(" / ");
  e.currentTarget.href=`https://wa.me/${phone}?text=${encodeURIComponent(message+(originNote?`\nReferência da campanha: ${originNote}`:""))}`;
  try{trackEvent("campaign_whatsapp_click",{property_id:propertyId,button_location:location,page_url:window.location.origin+window.location.pathname,...Object.fromEntries(utm)});}catch{setFailed(true);}
 }}>{label}<span aria-hidden="true"> ↗</span></a>{failed&&<small role="status">O WhatsApp pode ser aberto normalmente.</small>}</>;
}
