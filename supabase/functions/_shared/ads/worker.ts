// @ts-expect-error Explicit extension required by Deno; not bundled by Next.
import { AdsReadError, readGoogleReport, readMetaReport } from "./reporting.ts";
export interface AdsConnection {
 id: string; provider: "meta"|"google"; externalId: string; version: string; timezone: string;
 accessToken?: string; clientId?: string; clientSecret?: string; refreshToken?: string; loginCustomerId?: string;
}
export interface WorkerEnv { url: string; serviceKey: string; cronSecret: string; connections: string }
type Fetcher=typeof fetch;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function bad():never {throw new AdsReadError("invalid_config");}
function connection(raw:string,id:string):AdsConnection {
 const values:AdsConnection[]=JSON.parse(raw);
 if(!Array.isArray(values)||values.length>100||new Set(values.map(c=>c.id)).size!==values.length)return bad();
 const c=values.find(x=>x.id===id);
 if(!c||!uuid.test(c.id)||!/^\d{1,30}$/.test(c.externalId)||!["meta","google"].includes(c.provider))return bad();
 try{new Intl.DateTimeFormat("en",{timeZone:c.timezone});}catch{return bad();}
 return c;
}
export function reportPeriod(now:Date,timezone:string){
 const parts=new Intl.DateTimeFormat("en",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const part=(key:string)=>parts.find(x=>x.type===key)?.value;
 const until=`${part("year")}-${part("month")}-${part("day")}`;
 const start=new Date(`${until}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-29);
 return {since:start.toISOString().slice(0,10),until};
}
async function authorized(header:string|null,secret:string){
 if(secret.length<32||!header||header.length>1024)return false;
 const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([digest(header),digest(`Bearer ${secret}`)]);
 let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
function reply(status:number,code:string){return Response.json({status:code},{status,headers:{"Cache-Control":"no-store"}});}
export async function syncAds(request:Request,env:WorkerEnv,fetcher:Fetcher=fetch,now=new Date()):Promise<Response>{
 if(request.method!=="POST")return reply(405,"method_not_allowed");
 if(!await authorized(request.headers.get("authorization"),env.cronSecret))return reply(401,"unauthorized");
 if(env.url!=="https://sdpqphiooiuglywcmkxv.supabase.co"||!env.serviceKey)return reply(503,"not_configured");
 let accountId:string;
 try{
  const raw=await request.text();if(raw.length>200)return reply(400,"invalid_request");const body=JSON.parse(raw);
  if(!body||Object.keys(body).length!==1||!uuid.test(body.account_id))return reply(400,"invalid_request");accountId=body.account_id;
 }catch{return reply(400,"invalid_request");}
 let lease:string|null=null;
 const rpc=async(name:string,body:Record<string,unknown>)=>{
  const r=await fetcher(`${env.url}/rest/v1/rpc/${name}`,{method:"POST",redirect:"error",signal:AbortSignal.timeout(20000),headers:{apikey:env.serviceKey,Authorization:`Bearer ${env.serviceKey}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok)throw new AdsReadError("unavailable");return r.status===204?null:await r.json();
 };
 try{
  const c=connection(env.connections,accountId);
  const claim=await rpc("crm_claim_ad_sync",{target_account:accountId});if(!claim)return reply(200,"skipped");
  lease=claim.lease;
  if(!lease||!uuid.test(lease)||claim.account_id!==accountId||claim.provider!==c.provider||claim.external_id!==c.externalId||(claim.timezone&&claim.timezone!==c.timezone))return bad();
  let token:string;
  if(c.provider==="meta"){token=c.accessToken||"";if(!token)return bad();}
  else{
   if(!c.clientId||!c.clientSecret||!c.refreshToken)return bad();
   const r=await fetcher("https://oauth2.googleapis.com/token",{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",client_id:c.clientId,client_secret:c.clientSecret,refresh_token:c.refreshToken})});
   if(!r.ok)throw new AdsReadError(r.status===400||r.status===401?"auth":r.status===429?"rate_limit":"unavailable");
   const p=await r.json();token=p.access_token;if(typeof token!=="string"||!token)throw new AdsReadError("invalid_response");
  }
  const period=reportPeriod(now,c.timezone),config={accountId:c.externalId,version:c.version,accessToken:token,...period,loginCustomerId:c.loginCustomerId};
  const report=await(c.provider==="meta"?readMetaReport(config,fetcher):readGoogleReport(config,fetcher));
  if(report.timezone!==c.timezone)throw new AdsReadError("invalid_response");
  await rpc("crm_commit_ad_report",{target_account:accountId,lease,report,period_start:period.since,period_end:period.until});
  return reply(200,"synced");
 }catch(e){
  const code=e instanceof AdsReadError?e.code:"unavailable";
  if(lease){try{await rpc("crm_fail_ad_sync",{target_account:accountId,lease,error_code:code});}catch{/* DB unavailable: lease expires */}}
  return reply(503,code);
 }
}
