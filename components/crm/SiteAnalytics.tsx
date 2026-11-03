"use client";
import {useEffect,useState} from "react";
import {Users,MousePointer2,Eye,Activity} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {GA_EVENT_LABELS,changeLabel,type AnalyticsDays,type SiteAnalyticsReport} from "@/lib/crm/site-analytics";
import {useWorkspace} from "./Workspace";
import {PageHeading,Metric,Panel,Button,Empty} from "./UI";
import "./site-analytics.css";
interface State{key:string;data:SiteAnalyticsReport|null;error:string;code:string}
function SessionsChart({daily}:{daily:SiteAnalyticsReport["daily"]}){
 const maximum=Math.max(...daily.map(d=>d.sessions),1);
 const first=Math.min(...daily.map(d=>Date.parse(d.date))),last=Math.max(...daily.map(d=>Date.parse(d.date)));
 const x=(date:string)=>20+(Date.parse(date)-first)*660/Math.max(1,last-first);
 const points=daily.map(d=>`${x(d.date)},${160-d.sessions/maximum*140}`).join(" ");
 return daily.length?<><svg className="crm-analytics-chart" viewBox="0 0 700 180" role="img" aria-label="Evolução das sessões nos dias com registros"><line x1="20" y1="160" x2="680" y2="160" stroke="#ccd9dd"/><polyline points={points} fill="none" stroke="#446e87" strokeWidth="3"/>{daily.map(d=><circle key={d.date} cx={x(d.date)} cy={160-d.sessions/maximum*140} r="4" fill="#1d4052"><title>{d.date}: {d.sessions} sessões</title></circle>)}</svg><details><summary>Ver valores por dia</summary><div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Data</th><th>Usuários ativos</th><th>Sessões</th><th>Visualizações</th></tr></thead><tbody>{daily.map(d=><tr key={d.date}><td>{d.date}</td><td>{d.users}</td><td>{d.sessions}</td><td>{d.views}</td></tr>)}</tbody></table></div></details></>:<Empty title="Sem sessões registradas neste período" description="Confira também a coleta e os filtros na propriedade do Analytics."/>;
}
function Breakdown({title,rows}:{title:string;rows:{label:string;sessions:number}[]}){
 return <Panel title={title} description="Até 10 grupos por número de sessões.">{rows.length?<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Grupo</th><th>Sessões</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.label}:${i}`}><td>{r.label||"Não informado"}</td><td>{r.sessions.toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>:<p>Sem registros neste período.</p>}</Panel>;
}
export function SiteAnalytics(){
 const ctx=useWorkspace();const [days,setDays]=useState<AnalyticsDays>(28);const [revision,setRevision]=useState(0);
 const [state,setState]=useState<State>({key:"",data:null,error:"",code:""});
 const identity=`${ctx.userId}:${ctx.role}:${days}:${revision}`;const current=state.key===identity?state:null;
 useEffect(()=>{
  if(!ctx.userId||!ctx.operations)return;
  const abort=new AbortController();
  async function load(){
   try{
    const {data}=await supabase.auth.getSession();if(abort.signal.aborted)return;
    if(!data.session?.access_token){setState({key:identity,data:null,error:"Entre novamente no CRM para consultar o Analytics.",code:"session"});return;}
    const r=await fetch(`/api/admin/site-analytics?days=${days}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:"no-store",signal:abort.signal});
    const body=await r.json();if(abort.signal.aborted)return;
    setState({key:identity,data:r.ok?body.data:null,error:r.ok?"":body.error||"Não foi possível consultar os dados.",code:body.code||""});
   }catch{if(!abort.signal.aborted)setState({key:identity,data:null,error:"Falha na consulta. Nenhum dado foi substituído por zero.",code:"network"});}
  }
  void load();return()=>abort.abort();
 },[ctx.userId,ctx.operations,days,identity]);
 if(!ctx.operations)return <Empty title="Painel do site" description="Os indicadores institucionais do site estão disponíveis para gestores e administradores."/>;
 const report=current?.data;
 return <>
  <PageHeading eyebrow="Presença digital" title="Resultados do site" description="Resumo do Google Analytics, separado dos resultados comerciais do CRM." action={<><select aria-label="Período do Analytics" className="crm-scope-select" value={days} onChange={e=>setDays(Number(e.target.value) as AnalyticsDays)}><option value={7}>Últimos 7 dias completos</option><option value={28}>Últimos 28 dias completos</option><option value={90}>Últimos 90 dias completos</option></select><Button secondary onClick={()=>setRevision(n=>n+1)}>Consultar novamente</Button></>}/>
  {!current?<p role="status">Consultando o Google Analytics...</p>:current.error?<Panel title={current.code==="not_configured"?"Conexão de relatórios pendente":"Não foi possível carregar o painel"}><p role="status">{current.error}</p><p>A tag de coleta do site e o acesso de leitura aos relatórios são configurações diferentes. Os indicadores aparecerão após a conexão de leitura ser validada.</p></Panel>:report&&<>
   <p className="crm-analytics-note">Dados até ontem no fuso {report.timezone}. Consulta em {new Date(report.generatedAt).toLocaleString("pt-BR")}{report.cached?" · Resultado em cache de até 10 minutos":""}. Tráfego dos domínios oficiais; páginas do CRM, login, API e apresentações privadas excluídas.</p>
   {report.warnings.map(w=><p className="crm-alert" role="status" key={w}>{w}</p>)}
   <div className="crm-metrics"><Metric label="Usuários ativos" value={report.current.activeUsers.toLocaleString("pt-BR")} detail={changeLabel(report.current.activeUsers,report.previous.activeUsers)} icon={<Users size={18}/>}/><Metric label="Sessões" value={report.current.sessions.toLocaleString("pt-BR")} detail={changeLabel(report.current.sessions,report.previous.sessions)} icon={<MousePointer2 size={18}/>}/><Metric label="Páginas vistas" value={report.current.views.toLocaleString("pt-BR")} detail={changeLabel(report.current.views,report.previous.views)} icon={<Eye size={18}/>}/><Metric label="Taxa de engajamento" value={report.current.sessions?`${(report.current.engagementRate*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`:"Sem sessões"} detail={report.current.sessions&&report.previous.sessions?changeLabel(report.current.engagementRate,report.previous.engagementRate):"Sem base de sessões para comparar"} icon={<Activity size={18}/>}/></div>
   <Panel title="Movimento do site" description="Sessões por dia com registros. Totais de usuários do período não são a soma dos usuários diários."><SessionsChart daily={report.daily}/></Panel>
   <div className="crm-analytics-grid"><Breakdown title="Origem das visitas" rows={report.channels}/><Breakdown title="Dispositivos" rows={report.devices}/><Breakdown title="Principais cidades" rows={report.cities}/></div>
   <Panel title="Páginas mais vistas" description="Até 10 páginas. Caminhos sem parâmetros de consulta.">{report.pages.length?<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Página</th><th>Visualizações</th></tr></thead><tbody>{report.pages.map(p=><tr key={p.path}><td>{p.path}</td><td>{p.views.toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>:<p>Sem páginas registradas no período.</p>}</Panel>
   <Panel title="Interações registradas" description="Eventos individuais do GA4. Tipos diferentes não são somados como leads.">{report.events.length?<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Interação</th><th>Evento</th><th>Quantidade</th></tr></thead><tbody>{report.events.map(e=><tr key={e.name}><td>{GA_EVENT_LABELS[e.name]}</td><td>{e.name}</td><td>{e.count.toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>:<p>Sem eventos correspondentes. A ausência pode indicar que a tag ainda não encaminha esses eventos.</p>}<p className="crm-analytics-note">Na configuração atual do GTM, cliques de WhatsApp são enviados como generate_lead. Isso não comprova contato recebido, conversa ou venda. Os nomes originais e os nomes do GA4 podem representar a mesma ação; não some essas linhas como pessoas únicas.</p></Panel>
  </>}
 </>;
}
