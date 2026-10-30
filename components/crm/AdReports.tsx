"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AD_ACCOUNT_STATUS, adCostPerClick, adRatio, formatAdMoney, type AdAccount, type AdReportView } from "@/lib/crm/ad-reports";
import { useWorkspace } from "./Workspace";
import { Badge, Button, Empty, Panel } from "./UI";
function initialPeriod(){
 const until=new Date().toISOString().slice(0,10),start=new Date(`${until}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-29);
 return {since:start.toISOString().slice(0,10),until};
}
export function AdReports(){
 const ctx=useWorkspace();
 const [selection,setSelection]=useState("");
 const [period,setPeriod]=useState(initialPeriod);
 const [revision,setRevision]=useState(0);
 const [accounts,setAccounts]=useState<{identity:string;rows:AdAccount[]}>({identity:"",rows:[]});
 const [result,setResult]=useState<{key:string;data:AdReportView|null;error:string}>({key:"",data:null,error:""});
 const [accountError,setAccountError]=useState<{identity:string;text:string}>({identity:"",text:""});
 const [confirmSuspend,setConfirmSuspend]=useState(false);
 const [checkedAt,setCheckedAt]=useState(()=>Date.now());
 const identity=`${ctx.userId}:${ctx.role}`;
 const visibleAccounts=accounts.identity===identity?accounts.rows:[];
 const accountId=visibleAccounts.some(a=>a.id===selection)?selection:visibleAccounts[0]?.id||"";
 const requestKey=`${identity}:${accountId}:${period.since}:${period.until}:${revision}`;
 const current=result.key===requestKey?result:null;
 useEffect(()=>{
  if(!ctx.userId)return;
  const abort=new AbortController();
  async function load(){
   const {data,error}=await supabase.from("crm_ad_accounts").select("id,name,provider,scope,status,currency,timezone,last_success_at,last_error,last_period_start,last_period_end").order("name").limit(101).abortSignal(abort.signal);
   if(abort.signal.aborted)return;
   if(error||data.length>100){setAccounts({identity,rows:[]});setAccountError({identity,text:"As conexões de anúncios ainda não estão disponíveis. O cadastro manual continua funcionando."});return;}
   setAccounts({identity,rows:data});setAccountError({identity,text:""});
  }
  void load();return()=>abort.abort();
 },[ctx.userId,identity,revision]);
 useEffect(()=>{
  if(!ctx.userId||!accountId)return;
  const abort=new AbortController();
  async function load(){
   const {data,error}=await supabase.rpc("crm_ad_report",{target_account:accountId,period_start:period.since,period_end:period.until}).abortSignal(abort.signal);
   if(!abort.signal.aborted)setResult({key:requestKey,data:error?null:data,error:error?"Não foi possível consultar este período. Confira as datas e tente novamente.":""});
  }
  void load();return()=>abort.abort();
 },[ctx.userId,accountId,period.since,period.until,requestKey]);
 useEffect(()=>{const timer=setInterval(()=>{setCheckedAt(Date.now());setRevision(n=>n+1);},60000);return()=>clearInterval(timer);},[]);
 const account=current?.data?.account;
 const stale=account?.last_success_at&&checkedAt-Date.parse(account.last_success_at)>60*60*1000;
 return <Panel title="Resultados das plataformas" description="Dados de Meta e Google Ads por conta e período. A atualização depende da conexão autorizada da conta.">
  {accountError.identity===identity&&accountError.text?<p role="status">{accountError.text}</p>:!visibleAccounts.length?<Empty title="Nenhuma conta de anúncios conectada" description="A conexão segura precisa ser configurada antes de importar campanhas e resultados. Não informe senhas ou tokens nos campos da campanha."/>:<>
   <div className="crm-toolbar">
    <label>Conta de anúncios <select value={accountId} onChange={e=>{setSelection(e.target.value);setConfirmSuspend(false);}}>{visibleAccounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.provider==="meta"?"Meta":"Google"} · {a.scope==="company"?"Institucional":"Pessoal"}</option>)}</select></label>
    <label>De <input type="date" value={period.since} max={period.until} onChange={e=>setPeriod(p=>({...p,since:e.target.value}))}/></label>
    <label>Até <input type="date" value={period.until} min={period.since} onChange={e=>setPeriod(p=>({...p,until:e.target.value}))}/></label>
    <Button secondary onClick={()=>setRevision(n=>n+1)}>Atualizar painel</Button>
   </div>
   {!current?<p role="status">Consultando resultados...</p>:current.error?<p role="alert">{current.error}</p>:account&&<>
    <p><Badge tone={account.status==="connected"&&!stale?"green":"muted"}>{AD_ACCOUNT_STATUS[account.status]}</Badge> Última sincronização: {account.last_success_at?new Date(account.last_success_at).toLocaleString("pt-BR"):"ainda não realizada"}. Fuso dos relatórios: {account.timezone||"a confirmar"}.</p>
    {(stale||account.status==="error"||account.status==="reauthorize")&&<p role="status">Os dados podem estar desatualizados. A última leitura válida foi preservada.</p>}
    {!current.data?.complete_period&&<p role="status">O período selecionado não tem cobertura completa na última sincronização. Ausência de dados não comprova investimento zero.</p>}
    {current.data?.campaigns.length?<div className="crm-table-wrap"><table className="crm-table"><caption>Resultados por campanha na conta selecionada</caption><thead><tr><th>Campanha</th><th>Estado na plataforma</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Resultados da plataforma</th></tr></thead><tbody>{current.data.campaigns.map(c=>{
     const known=current.data!.complete_period||c.days_with_data>0,ctr=adRatio(c.clicks,c.impressions,100);
     return <tr key={c.external_id}><td>{c.name}<small> · ID {c.external_id}</small></td><td>{c.remote_status}</td><td>{known&&account.currency?formatAdMoney(c.spend_micros,account.currency):"Sem dados"}</td><td>{known?c.impressions:"Sem dados"}</td><td>{known?c.clicks:"Sem dados"}</td><td>{known&&ctr!==null?`${ctr.toFixed(2)}%`:"Indisponível"}</td><td>{known&&account.currency?adCostPerClick(c.spend_micros,c.clicks,account.currency):"Indisponível"}</td><td>{account.provider==="google"?c.platform_conversions??"Sem dados":c.platform_actions.length?c.platform_actions.map(a=><div key={a.type}>{a.type}: {a.value}</div>):"Nenhuma ação reportada"}</td></tr>;
    })}</tbody></table></div>:<p>Nenhuma campanha retornada para esta conta. A sincronização não cria anúncios.</p>}
    <p>Conversões das plataformas não são vendas confirmadas no CRM. No Meta, ações diferentes não são somadas como um único resultado.</p>
    {account.status!=="revoked"&&<div className="crm-detail-actions">{confirmSuspend?<><span>Suspender as próximas consultas? O histórico será preservado. Isso não revoga a permissão no provedor.</span><Button disabled={ctx.busy} onClick={async()=>{const ok=await ctx.run(()=>supabase.rpc("crm_disconnect_ad_account",{target_account:accountId}),"Sincronização suspensa. Revogue também a permissão na plataforma se desejar encerrar o acesso externo.");if(ok){setConfirmSuspend(false);setRevision(n=>n+1);}}}>Confirmar suspensão</Button><Button secondary onClick={()=>setConfirmSuspend(false)}>Cancelar</Button></>:<Button secondary onClick={()=>setConfirmSuspend(true)}>Suspender sincronização</Button>}</div>}
   </>}
  </>}
 </Panel>;
}
