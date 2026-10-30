/** Real staging ACL negatives only; no provider calls, secrets or created fixtures. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url,"https://sdpqphiooiuglywcmkxv.supabase.co");
assert.equal(createHash("sha256").update(key||"").digest("hex"),"1d6911a13f337d0eec833199e2ed4b45ad44f2262e0b9a1e5b25c7c33ae131d5");
assert.ok(!process.env.SUPABASE_SERVICE_ROLE_KEY);
const id=randomUUID();
const cases=[
 ...["crm_ad_accounts","crm_ad_campaigns","crm_ad_daily"].flatMap(table=>[
  {name:`anonymous read ${table}`,path:`/${table}?select=*&limit=1`},
  {name:`anonymous direct write ${table}`,path:`/${table}`,body:{}},
 ]),
 {name:"anonymous worker claim",path:"/rpc/crm_claim_ad_sync",body:{target_account:id}},
 {name:"anonymous worker commit",path:"/rpc/crm_commit_ad_report",body:{target_account:id,lease:id,report:{},period_start:"2026-10-01",period_end:"2026-10-02"}},
 {name:"anonymous worker fail",path:"/rpc/crm_fail_ad_sync",body:{target_account:id,lease:id,error_code:"unavailable"}},
 {name:"anonymous disconnect",path:"/rpc/crm_disconnect_ad_account",body:{target_account:id}},
 {name:"anonymous report",path:"/rpc/crm_ad_report",body:{target_account:id,period_start:"2026-10-01",period_end:"2026-10-02"}},
 {name:"private lease read",path:"/ad_sync_leases?select=account_id&limit=1",profile:"crm_private"},
];
const results=[];
for(const test of cases){
 try{
  const response=await fetch(url+"/rest/v1"+test.path,{method:test.body?"POST":"GET",headers:{apikey:key,"Content-Type":"application/json",...(test.profile?{"Accept-Profile":test.profile}:{})},...(test.body?{body:JSON.stringify(test.body)}:{}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
  const body=await response.json();
  const denied=[401,403].includes(response.status)&&body?.code==="42501";
  const unexposed=!!test.profile&&response.status===406&&body?.code==="PGRST106";
  const result=denied||unexposed?"PASS":"FAIL";
  results.push({name:test.name,status:response.status,code:typeof body?.code==="string"?body.code:null,result,observation:unexposed?"Private schema not exposed":denied?"Permission denied":"Unexpected response; body not saved"});
  if(result==="FAIL")break;
 }catch{results.push({name:test.name,result:"BLOCKED",observation:"HTTP/JSON unavailable; raw error not saved"});}
}
const summary=Object.fromEntries(["PASS","FAIL","BLOCKED"].map(s=>[s,results.filter(r=>r.result===s).length]));
await writeFile("tests/security/crm-ads-agent-anon-http-20261030.json",JSON.stringify({executed_at:new Date().toISOString(),environment:"Supabase staging sdpqphiooiuglywcmkxv",authentication:"anonymous public key, NOT user/worker JWT",provider_or_worker_endpoint_called:false,private_response_bodies_saved:false,limitation:"ACL denials only, not a live worker or real provider connection",results,summary},null,2)+"\n");
console.log(JSON.stringify(summary));assert.equal(results.length,cases.length);assert.equal(summary.FAIL+summary.BLOCKED,0);
