"use client";
import {useState} from "react";
import type {Campaign} from "@/lib/crm/campaigns";
import {campaignPerformance,CAMPAIGN_STAGES} from "@/lib/crm/campaign-performance";
import {useWorkspace} from "./Workspace";
import {Button,Empty,Panel,SectionState} from "./UI";

export function CampaignPerformance({campaigns}:{campaigns:Campaign[]}){
 const ctx=useWorkspace();
 const [period,setPeriod]=useState({since:"",until:""});
 if(!ctx.loading&&["crm_campaigns","crm_lead_attributions","leads"].some(table=>ctx.errors[table]))return <Panel title="Desempenho das campanhas no CRM"><p role="alert" className="crm-campaign-note">Não foi possível carregar a base completa desta consulta. Os indicadores não serão calculados com dados incompletos.</p><Button secondary onClick={()=>void ctx.reload()}>Consultar novamente</Button></Panel>;
 let rows:ReturnType<typeof campaignPerformance>=[];
 let periodError="";
 try{rows=campaignPerformance(campaigns,ctx.data.crm_lead_attributions,ctx.data.leads,period);}catch{periodError="Escolha datas válidas, com o início anterior ou igual ao fim.";}
 const unavailable=rows.some(row=>row.unavailable>0);
 const invalidDates=rows.some(row=>row.invalidDates>0);
 const filtered=Boolean(period.since||period.until);
 return <SectionState tables={["crm_campaigns","crm_lead_attributions","leads"]}>
  <Panel title="Desempenho das campanhas no CRM" description="Etapa atual dos leads vinculados às campanhas desta seleção. Apenas registros disponíveis para sua conta.">
   <div className="crm-toolbar"><label>Cadastro do lead, de <input type="date" value={period.since} max={period.until||undefined} onChange={e=>setPeriod(p=>({...p,since:e.target.value}))}/></label><label>Até <input type="date" value={period.until} min={period.since||undefined} onChange={e=>setPeriod(p=>({...p,until:e.target.value}))}/></label><Button secondary disabled={!filtered} onClick={()=>setPeriod({since:"",until:""})}>Todo o histórico</Button></div>
   <p className="crm-campaign-note">{filtered?"Filtro pela data de cadastro do lead, no horário de Campina Grande (UTC−3), incluindo os dias escolhidos.":"Todos os cadastros carregados, sem filtro de período."} A origem foi registrada no CRM e ainda não foi conferida com as plataformas. Um lead conta uma vez em cada campanha vinculada; não some as linhas como pessoas únicas.</p>
   {periodError&&<p role="alert" className="crm-campaign-note">{periodError}</p>}
   {invalidDates&&<p role="alert" className="crm-campaign-note">Há leads vinculados sem data de cadastro válida. Revise esses registros antes de calcular os indicadores deste período.</p>}
   {unavailable&&<p role="status">Há vínculos sem lead disponível nesta consulta. Os indicadores abaixo consideram somente os leads acessíveis; não representam um total institucional completo.</p>}
   {!periodError&&!invalidDates&&(rows.length?<div className="crm-table-wrap"><table className="crm-table"><caption>Etapas atuais dos leads cadastrados na seleção, sem estimativa de investimento ou vendas</caption><thead><tr><th>Campanha</th><th>Leads acessíveis</th><th>Primeiro atendimento registrado</th>{CAMPAIGN_STAGES.map(stage=><th key={stage.id}>{stage.label}</th>)}<th>Conversão no pipeline</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.name}</td><td>{row.total}</td><td>{row.contactRecorded}</td>{CAMPAIGN_STAGES.map(stage=><td key={stage.id}>{row.counts[stage.id]}</td>)}<td>{row.conversionRate===null?"Sem base":`${(row.conversionRate*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</td></tr>)}</tbody></table></div>:<Empty title="Nenhuma campanha nesta seleção" description="Os indicadores aparecerão depois do cadastro e vínculo dos contatos à campanha."/>)}
   <p className="crm-campaign-note">As etapas mostram a situação atual, não todo o caminho percorrido pelo lead ou as conversões ocorridas nas datas escolhidas. Primeiro atendimento significa que sua data foi registrada, mesmo fora do período de cadastro. “Convertido” no pipeline não comprova venda. Investimento, CPL, CPA e retorno financeiro aguardam conexão dos custos e vínculo verificável das vendas.</p>
  </Panel>
 </SectionState>;
}
