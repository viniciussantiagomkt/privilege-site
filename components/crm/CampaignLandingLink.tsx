"use client";
import { useState } from "react";
import type { Campaign } from "@/lib/crm/campaigns";
import { CAMPAIGN_UTM_FIELDS, campaignLandingEligible, campaignLandingLink } from "@/lib/crm/campaign-links";
import { useWorkspace } from "./Workspace";
import { Button, Modal } from "./UI";
const labels:Record<string,string>={utm_source:"Origem",utm_medium:"Meio",utm_campaign:"Nome de referência da campanha",utm_content:"Anúncio ou criativo (opcional)",utm_term:"Termo (opcional)"};
export function CampaignLandingLink({campaign}:{campaign:Campaign}){
 const ctx=useWorkspace();const [open,setOpen]=useState(false);const [link,setLink]=useState("");const [notice,setNotice]=useState("");
 const property=ctx.data.properties.find(p=>p.id===campaign.property_id);
 const eligible=property&&campaignLandingEligible(property);
 return <><Button secondary onClick={()=>{setOpen(true);setLink("");setNotice("");}}>Montar link de campanha</Button>
 {open&&<Modal title="Link da página do imóvel" description={campaign.name} onClose={()=>setOpen(false)}>
  {!eligible?<p>Vincule um imóvel ativo, aprovado para publicação no site e liberado para campanhas. Imóveis sem publicação continuam disponíveis apenas pelos links privados de apresentação autorizados.</p>:<>
   <p>{property.title} · {property.property_code}</p><p>Os campos de origem aparecem no link enviado ao cliente. Use referências de campanha, sem dados pessoais. O atendimento segue o responsável público do imóvel ou a recepção institucional.</p>
   <form onSubmit={e=>{e.preventDefault();setLink("");setNotice("");try{const form=new FormData(e.currentTarget);const params=new URLSearchParams();for(const field of CAMPAIGN_UTM_FIELDS)params.set(field,String(form.get(field)||""));setLink(campaignLandingLink(window.location.origin,property.slug,params));}catch(error){setNotice(error instanceof Error?error.message:"Revise os campos.");}}}>
    {CAMPAIGN_UTM_FIELDS.map(field=><label key={field} style={{display:"block",marginBottom:14}}>{labels[field]}<input name={field} maxLength={160} style={{display:"block",width:"100%"}} defaultValue={field==="utm_source"?campaign.platform:field==="utm_medium"?(campaign.platform==="google"?"cpc":campaign.platform==="meta"?"paid_social":"referral"):field==="utm_campaign"?campaign.name:""}/></label>)}
    <Button type="submit">Gerar link</Button>
   </form>
   {link&&<div style={{marginTop:20}}><label>Link deste ambiente<textarea readOnly value={link} rows={4} style={{display:"block",width:"100%"}}/></label><p>O link usa o mesmo ambiente em que você está. Confirme a página antes de usar em anúncios.</p><div className="crm-detail-actions"><Button secondary onClick={async()=>{try{await navigator.clipboard.writeText(link);setNotice("Link copiado.");}catch{setNotice("Não foi possível copiar automaticamente. Selecione e copie o link acima.");}}}>Copiar link</Button><a href={link} target="_blank" rel="noopener noreferrer">Conferir página ↗</a></div></div>}
   <p>O clique no WhatsApp é medido como clique. Ele não confirma contato recebido ou venda no CRM.</p>
  </>}
  {notice&&<p role="status">{notice}</p>}
 </Modal>}
 </>;
}
