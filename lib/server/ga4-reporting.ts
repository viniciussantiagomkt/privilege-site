// Node server only. Never import this module from a client component.
import {createHash,createSign} from "node:crypto";
import type {AnalyticsDays,SiteAnalyticsReport,SiteAnalyticsSummary} from "@/lib/crm/site-analytics";
import {GA_EVENT_LABELS} from "@/lib/crm/site-analytics";
type Json=Record<string,unknown>;
type Fetcher=typeof fetch;
export class Ga4Error extends Error{
 constructor(public code:"not_configured"|"invalid_config"|"provider_access"|"quota"|"unavailable"|"invalid_response"){super(code);this.name="Ga4Error";}
}
interface Config{propertyId:string;serviceAccountJson:string}
function fail():never{throw new Ga4Error("invalid_response");}
function obj(v:unknown):Json{if(!v||typeof v!=="object"||Array.isArray(v))return fail();return v as Json;}
function arr(v:unknown):unknown[]{if(!Array.isArray(v))return fail();return v;}
function string(v:unknown){if(typeof v!=="string"||v.length>1000||/[\x00-\x1f\x7f]/.test(v))return fail();return v;}
function number(v:unknown,rate=false){const s=string(v);if(!/^\d+(\.\d+)?$/.test(s))return fail();const n=Number(s);if(!Number.isFinite(n)||n<0||(!rate&&!Number.isSafeInteger(n))||(rate&&n>1))return fail();return n;}
async function json(fetcher:Fetcher,url:string,init:RequestInit){
 try{
  const r=await fetcher(url,{...init,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Ga4Error(r.status===401||r.status===403?"provider_access":r.status===429?"quota":"unavailable");
  return obj(await r.json());
 }catch(e){if(e instanceof Ga4Error)throw e;throw new Ga4Error("unavailable");}
}
export function validateGa4Config(c:Config){
 if(!c.propertyId||!c.serviceAccountJson)throw new Ga4Error("not_configured");
 if(!/^\d{1,15}$/.test(c.propertyId))throw new Ga4Error("invalid_config");
 try{
  const s=JSON.parse(c.serviceAccountJson);
  if(s.type!=="service_account"||typeof s.client_email!=="string"||!/^[-.a-zA-Z0-9_]+@[-.a-zA-Z0-9]+\.iam\.gserviceaccount\.com$/.test(s.client_email)||typeof s.private_key!=="string"||!s.private_key.startsWith("-----BEGIN PRIVATE KEY-----"))throw Error();
  return {email:s.client_email as string,key:s.private_key as string};
 }catch{throw new Ga4Error("invalid_config");}
}
const hostFilter={filter:{fieldName:"hostName",inListFilter:{values:["www.privilegeimoveispb.com.br","privilegeimoveispb.com.br"]}}};
const privateFilter={notExpression:{filter:{fieldName:"pagePath",stringFilter:{matchType:"FULL_REGEXP",value:"^/(admin|login|api|apresentacoes)(/.*)?$"}}}};
function requests(days:AnalyticsDays){
 const current={startDate:`${days}daysAgo`,endDate:"yesterday"},previous={startDate:`${days*2}daysAgo`,endDate:`${days+1}daysAgo`};
 const summary=["activeUsers","sessions","screenPageViews","engagementRate"];
 const make=(dimensions:string[],metrics:string[],options:Json={})=>({dateRanges:[current],dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),dimensionFilter:{andGroup:{expressions:[hostFilter,privateFilter]}},keepEmptyRows:false,...options});
 const top=(dimension:string,metric:string)=>make([dimension],[metric],{limit:"10",orderBys:[{metric:{metricName:metric},desc:true}]});
 return [make([],summary),make([],summary,{dateRanges:[previous]}),make(["date"],["activeUsers","sessions","screenPageViews"],{limit:"90",orderBys:[{dimension:{dimensionName:"date"}}]}),top("sessionDefaultChannelGroup","sessions"),top("deviceCategory","sessions"),top("pagePath","screenPageViews"),make(["eventName"],["eventCount"],{dimensionFilter:{andGroup:{expressions:[hostFilter,privateFilter,{filter:{fieldName:"eventName",inListFilter:{values:Object.keys(GA_EVENT_LABELS)}}}]}},limit:"30"}),top("city","sessions")];
}
function rows(report:Json,dimensions:string[],metrics:string[]){
 const dh=arr(report.dimensionHeaders??[]).map(x=>string(obj(x).name)),mh=arr(report.metricHeaders).map(x=>string(obj(x).name));
 if(dh.join()!==dimensions.join()||mh.join()!==metrics.join())return fail();
 return arr(report.rows??[]).map(raw=>{
  const r=obj(raw),d=arr(r.dimensionValues??[]).map(x=>string(obj(x).value)),m=arr(r.metricValues).map(x=>string(obj(x).value));
  if(d.length!==dimensions.length||m.length!==metrics.length)return fail();return {d,m};
 });
}
function summary(r:Json):SiteAnalyticsSummary{
 const v=rows(r,[],["activeUsers","sessions","screenPageViews","engagementRate"]);if(v.length>1)return fail();
 const m=v[0]?.m??["0","0","0","0"];return {activeUsers:number(m[0]),sessions:number(m[1]),views:number(m[2]),engagementRate:number(m[3],true)};
}
export async function fetchGa4Report(c:Config,days:AnalyticsDays,fetcher:Fetcher=fetch,now=new Date()):Promise<SiteAnalyticsReport>{
 if(![7,28,90].includes(days))throw new Ga4Error("invalid_config");
 const account=validateGa4Config(c),iat=Math.floor(now.getTime()/1000);
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
 const unsigned=`${encode({alg:"RS256",typ:"JWT"})}.${encode({iss:account.email,scope:"https://www.googleapis.com/auth/analytics.readonly",aud:"https://oauth2.googleapis.com/token",iat,exp:iat+3600})}`;
 let signature:string;try{signature=createSign("RSA-SHA256").update(unsigned).sign(account.key,"base64url");}catch{throw new Ga4Error("invalid_config");}
 const oauth=await json(fetcher,"https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${unsigned}.${signature}`})});
 const token=string(oauth.access_token);if(!token)return fail();
 const specs=requests(days);
 // Google permits at most five reports per batch; all batches must succeed.
 const batches=await Promise.all([specs.slice(0,5),specs.slice(5)].map(async batch=>{
  const p=await json(fetcher,`https://analyticsdata.googleapis.com/v1beta/properties/${c.propertyId}:batchRunReports`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({requests:batch})});
  const reports=arr(p.reports);if(reports.length!==batch.length)return fail();return reports.map(obj);
 }));
 const reports=batches.flat(),warnings=new Set<string>();let timezone="";
 for(const r of reports){const metadata=obj(r.metadata);const zone=string(metadata.timeZone);if(!zone||timezone&&zone!==timezone)return fail();timezone=zone;
  if(metadata.subjectToThresholding)warnings.add("O Google aplicou limites de privacidade a um ou mais relatórios.");
  if(metadata.dataLossFromOtherRow)warnings.add("Parte dos dados foi agrupada pelo Google na categoria outros.");
  if(Array.isArray(metadata.samplingMetadatas)&&metadata.samplingMetadatas.length)warnings.add("Há relatórios com amostragem do Google.");
 }
 const top=(index:number,dimension:string,metric:string)=>rows(reports[index],[dimension],[metric]).map(r=>({label:r.d[0],sessions:number(r.m[0])}));
 const pages=rows(reports[5],["pagePath"],["screenPageViews"]).map(r=>{
  const path=r.d[0];if(!path.startsWith("/")||/[?#]/.test(path)||/^\/(admin|login|api|apresentacoes)(\/|$)/.test(path))return fail();return {path,views:number(r.m[0])};
 });
 const daily=rows(reports[2],["date"],["activeUsers","sessions","screenPageViews"]).map(r=>{
  const date=r.d[0];if(!/^\d{8}$/.test(date))return fail();const formatted=`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}`;
  const parsed=Date.parse(formatted+"T00:00:00Z");if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==formatted)return fail();
  return {date:formatted,users:number(r.m[0]),sessions:number(r.m[1]),views:number(r.m[2])};
 });
 if(daily.length>days||new Set(daily.map(d=>d.date)).size!==daily.length)return fail();daily.sort((a,b)=>a.date.localeCompare(b.date));
 const events=rows(reports[6],["eventName"],["eventCount"]).map(r=>{if(!Object.hasOwn(GA_EVENT_LABELS,r.d[0]))return fail();return {name:r.d[0],count:number(r.m[0])};});
 return {days,generatedAt:now.toISOString(),timezone,cached:false,warnings:[...warnings],current:summary(reports[0]),previous:summary(reports[1]),daily,channels:top(3,"sessionDefaultChannelGroup","sessions"),devices:top(4,"deviceCategory","sessions"),cities:top(7,"city","sessions"),pages,events};
}
// Aggregate data only, bounded cache and single-flight. Authorization is always checked by the handler first.
const cache=new Map<string,{expires:number;data:SiteAnalyticsReport}>();
const inFlight=new Map<string,Promise<SiteAnalyticsReport>>();
export async function cachedGa4Report(c:Config,days:AnalyticsDays){
 validateGa4Config(c);const key=createHash("sha256").update(`${c.propertyId}:${days}:${c.serviceAccountJson}`).digest("hex");
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return {...hit.data,cached:true};
 if(inFlight.has(key))return inFlight.get(key)!;
 const job=fetchGa4Report(c,days).then(data=>{if(cache.size>=3)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+600000,data});return data;}).finally(()=>inFlight.delete(key));
 inFlight.set(key,job);return job;
}
