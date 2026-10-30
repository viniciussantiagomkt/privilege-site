"use client";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "./Workspace";
import { ATTRIBUTION_FIELDS, CAMPAIGN_STATUSES, PLATFORMS, attributionFromForm, campaignLabel, type Campaign } from "@/lib/crm/campaigns";
import { Badge, Button, Empty, EntityForm, Modal, NewButton, PageHeading, Panel, SectionState, numberId, text, type Field } from "./UI";
import { matches } from "@/lib/crm/model";
import { AdReports } from "./AdReports";
const options = (values: Record<string,string>) => Object.entries(values).map(([value,label])=>({value,label}));
export function Campaigns() {
 const ctx=useWorkspace();
 const [editor,setEditor]=useState<Campaign | "new" | null>(null);
 const [capture,setCapture]=useState<Campaign | null>(null);
 const [status,setStatus]=useState("");
 const campaigns=ctx.data.crm_campaigns.filter(c=>(!status||c.status===status)&&matches(ctx.query,c.name,c.platform,c.external_campaign_id));
 return <>
  <PageHeading eyebrow="Aquisição de clientes" title="Campanhas e origem" description="Organize as campanhas e saiba de onde vieram seus contatos." action={<NewButton onClick={()=>setEditor("new")}>Nova campanha</NewButton>} />
  <AdReports />
  <Panel title="Campanhas e contatos no CRM" description="O registro de contatos nesta tela continua manual. A leitura de anúncios não importa formulários ou conversas do WhatsApp."><p className="crm-detail-pill">Ativar uma campanha no CRM não ativa anúncios nas plataformas. Os IDs informados no cadastro não conectam uma conta de anúncios.</p></Panel>
  <div className="crm-toolbar"><label>Estado no CRM <select className="crm-compact-status" value={status} onChange={e=>setStatus(e.currentTarget.value)}><option value="">Todos</option>{options(CAMPAIGN_STATUSES).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label></div>
  <SectionState tables={["crm_campaigns"]}>
   {campaigns.length ? <div className="crm-campaign-grid">{campaigns.map(c=><Panel key={c.id} title={c.name} description={`${campaignLabel(c.platform)} · ${c.scope==="company"?"Institucional":"Minha carteira"}`}>
    <div className="crm-campaign-body">
     <Badge tone={c.status==="active"?"green":"muted"}>{CAMPAIGN_STATUSES[c.status as keyof typeof CAMPAIGN_STATUSES]}</Badge>
     <p>{c.property_id?`Imóvel: ${ctx.data.properties.find(p=>p.id===c.property_id)?.property_code || "vinculado"}`:c.development_id?`Empreendimento: ${ctx.data.developments.find(d=>d.id===c.development_id)?.name || "vinculado"}`:"Campanha geral"}</p>
     <p>Atendimento: {c.routing==="institutional"?"Recepção institucional":ctx.data.brokers.find(b=>b.id===c.destination_broker_id)?.name || "Corretor responsável"}.</p>
     <p>Configuração de atendimento no CRM. Consulte o painel acima para resultados das contas conectadas.</p>
     <div className="crm-detail-actions"><Button secondary onClick={()=>setEditor(c)}>Editar campanha</Button><Button disabled={ctx.busy||c.status!=="active"} onClick={()=>setCapture(c)}>Registrar contato</Button></div>
    </div>
   </Panel>)}</div>:<Empty title="Nenhuma campanha nesta seleção" description="Cadastre uma campanha institucional ou da sua carteira. Criar uma campanha no CRM não cria anúncios nas plataformas." />}
  </SectionState>
  {editor&&<CampaignEditor campaign={editor==="new"?null:editor} onClose={()=>setEditor(null)} />}
  {capture&&<CampaignCapture campaign={capture} onClose={()=>setCapture(null)} />}
 </>;
}
function CampaignEditor({campaign,onClose}:{campaign:Campaign|null;onClose:()=>void}) {
 const ctx=useWorkspace();
 const company=campaign?campaign.scope==="company":ctx.operations;
 const fields: Field[]=[
  {name:"name",label:"Nome da campanha",required:true,value:campaign?.name},
  {name:"platform",label:"Plataforma",required:true,value:campaign?.platform||"meta",options:options(PLATFORMS)},
  {name:"objective",label:"Objetivo",required:true,value:campaign?.objective||"leads",options:options({leads:"Captação de leads",whatsapp:"Conversas no WhatsApp",traffic:"Visitas à página"})},
  {name:"entry_channel",label:"Canal planejado",required:true,value:campaign?.entry_channel||"native_form",options:options({native_form:"Formulário nativo da plataforma",whatsapp:"WhatsApp",site:"Site / landing page"})},
  {name:"status",label:"Estado no CRM",required:true,value:campaign?.status||"draft",options:options(CAMPAIGN_STATUSES)},
  {name:"property_id",label:"Imóvel exclusivo (opcional)",value:campaign?.property_id,options:ctx.data.properties.filter(p=>company||p.owner_id===ctx.userId||p.broker_id===ctx.userId).map(p=>({value:p.id,label:`${p.property_code} · ${p.title}`}))},
  {name:"development_id",label:"Empreendimento (opcional)",value:campaign?.development_id,options:ctx.data.developments.map(d=>({value:d.id,label:d.name}))},
  ...(company?[
   {name:"routing",label:"Destino do atendimento",required:true,value:campaign?.routing||"institutional",options:options({institutional:"Recepção institucional",broker:"Corretor específico"})},
   {name:"destination_broker_id",label:"Corretor (para atendimento individual)",value:campaign?.destination_broker_id,options:ctx.data.brokers.filter(b=>b.active).map(b=>({value:b.id,label:b.name}))},
  ]:[]),
  {name:"external_account_id",label:"ID da conta de anúncios (opcional)",value:campaign?.external_account_id},
  {name:"external_campaign_id",label:"ID da campanha na plataforma (opcional)",value:campaign?.external_campaign_id},
 ];
 return <Modal title={campaign?"Editar campanha":"Nova campanha"} description={company?"Campanha institucional, visível à gestão.":"Campanha pessoal, com atendimento na sua carteira."} onClose={onClose} wide>
  <p>Escolha um imóvel ou um empreendimento, ou deixe ambos vazios para uma campanha geral. Não informe senhas ou tokens nos identificadores.</p>
  <EntityForm fields={fields} onClose={onClose} onSubmit={async f=>{
   if(numberId(f,"property_id")&&numberId(f,"development_id")){ctx.setNotice({text:"Escolha somente um imóvel ou um empreendimento.",error:true});return false;}
   return ctx.run(()=>supabase.rpc("crm_save_campaign",{target_campaign:campaign?.id||null,payload:{
    name:text(f,"name"),scope:company?"company":"personal",platform:text(f,"platform"),objective:text(f,"objective"),entry_channel:text(f,"entry_channel"),status:text(f,"status"),property_id:numberId(f,"property_id"),development_id:numberId(f,"development_id"),routing:company?text(f,"routing"):"broker",destination_broker_id:company?text(f,"destination_broker_id")||null:ctx.userId,external_account_id:text(f,"external_account_id")||null,external_campaign_id:text(f,"external_campaign_id")||null,
   }}),"Campanha salva no CRM. Nenhum anúncio ou integração externa foi criado.");
  }} />
 </Modal>;
}
function CampaignCapture({campaign,onClose}:{campaign:Campaign;onClose:()=>void}) {
 const ctx=useWorkspace();const captureId=useRef<string|null>(null);
 const fields:Field[]=[{name:"name",label:"Nome do contato",required:true},{name:"phone",label:"Telefone com DDD",type:"tel",required:true,maxLength:30},...Object.entries(ATTRIBUTION_FIELDS).map(([name,label])=>({name,label:`${label} (opcional)`,maxLength:name==="landing_path"?1000:256}))];
 return <Modal title="Registrar contato da campanha" description={campaign.name} onClose={onClose} wide>
  <p>Registro manual. Os dados de origem são informados por você e não foram verificados pela plataforma de anúncios.</p>
  <EntityForm fields={fields} onClose={onClose} onSubmit={async f=>{
   let details:Record<string,string>;
   try {details=attributionFromForm(f);} catch(error){ctx.setNotice({text:error instanceof Error?error.message:"Revise a origem.",error:true});return false;}
   captureId.current ||= crypto.randomUUID();
   let fallback=false;
   const ok=await ctx.run(async()=>{
    const result=await supabase.rpc("crm_capture_campaign_lead",{target_campaign:campaign.id,capture_id:captureId.current,contact_name:text(f,"name"),contact_phone:text(f,"phone"),attribution:details});
    fallback=result.data?.routing_result==="fallback_queue";
    return result;
   },"Contato registrado com a origem da campanha. Nenhuma mensagem foi enviada.");
   if(ok&&fallback)ctx.setNotice({text:"Contato registrado na recepção institucional porque o corretor da campanha está indisponível. A gestão precisa atribuí-lo.",error:false});
   return ok;
  }} />
 </Modal>;
}
