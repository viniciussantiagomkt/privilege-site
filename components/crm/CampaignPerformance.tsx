"use client";
import type {Campaign} from "@/lib/crm/campaigns";
import {campaignPerformance,CAMPAIGN_STAGES} from "@/lib/crm/campaign-performance";
import {useWorkspace} from "./Workspace";
import {Button,Empty,Panel,SectionState} from "./UI";

export function CampaignPerformance({campaigns}:{campaigns:Campaign[]}){
 const ctx=useWorkspace();
 if(!ctx.loading&&["crm_campaigns","crm_lead_attributions","leads"].some(table=>ctx.errors[table]))return <Panel title="Desempenho das campanhas no CRM"><p role="alert" className="crm-campaign-note">Não foi possível carregar a base completa desta consulta. Os indicadores não serão calculados com dados incompletos.</p><Button secondary onClick={()=>void ctx.reload()}>Consultar novamente</Button></Panel>;
 const rows=campaignPerformance(campaigns,ctx.data.crm_lead_attributions,ctx.data.leads);
 const unavailable=rows.some(row=>row.unavailable>0);
 return <SectionState tables={["crm_campaigns","crm_lead_attributions","leads"]}>
  <Panel title="Desempenho das campanhas no CRM" description="Etapa atual dos leads vinculados às campanhas desta seleção. Apenas registros disponíveis para sua conta.">
   <p className="crm-campaign-note">Todos os cadastros carregados, sem filtro de período. A origem foi registrada no CRM e ainda não foi conferida com as plataformas. Um lead conta uma vez em cada campanha vinculada; não some as linhas como pessoas únicas.</p>
   {unavailable&&<p role="status">Há vínculos sem lead disponível nesta consulta. Os indicadores abaixo consideram somente os leads acessíveis; não representam um total institucional completo.</p>}
   {rows.length?<div className="crm-table-wrap"><table className="crm-table"><caption>Distribuição atual por campanha, sem estimativa de investimento ou vendas</caption><thead><tr><th>Campanha</th><th>Leads acessíveis</th><th>Primeiro atendimento registrado</th>{CAMPAIGN_STAGES.map(stage=><th key={stage.id}>{stage.label}</th>)}<th>Conversão no pipeline</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.name}</td><td>{row.total}</td><td>{row.contactRecorded}</td>{CAMPAIGN_STAGES.map(stage=><td key={stage.id}>{row.counts[stage.id]}</td>)}<td>{row.conversionRate===null?"Sem base":`${(row.conversionRate*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</td></tr>)}</tbody></table></div>:<Empty title="Nenhuma campanha nesta seleção" description="Os indicadores aparecerão depois do cadastro e vínculo dos contatos à campanha."/>}
   <p className="crm-campaign-note">As etapas mostram a situação atual, não todo o caminho percorrido pelo lead. Primeiro atendimento significa que sua data foi registrada. “Convertido” no pipeline não comprova venda. Investimento, CPL, CPA e retorno financeiro aguardam conexão dos custos e vínculo verificável das vendas.</p>
  </Panel>
 </SectionState>;
}
