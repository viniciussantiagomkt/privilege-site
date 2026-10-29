/** Authorized staging ACL negatives only. No user JWT or created fixtures. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url,"https://sdpqphiooiuglywcmkxv.supabase.co");
assert.equal(createHash("sha256").update(key||"").digest("hex"),"1d6911a13f337d0eec833199e2ed4b45ad44f2262e0b9a1e5b25c7c33ae131d5");
assert.ok(!process.env.SUPABASE_SERVICE_ROLE_KEY);
const cases=[
 ...["crm_campaigns","crm_lead_attributions"].flatMap(table=>[
  {name:`anonymous read ${table}`,path:`/${table}?select=id&limit=1`},
  {name:`anonymous direct write ${table}`,path:`/${table}`,body:{}},
 ]),
 {name:"anonymous save RPC",path:"/rpc/crm_save_campaign",body:{target_campaign:null,payload:{name:"SYNTHETIC denied",scope:"personal",platform:"meta",objective:"leads",entry_channel:"native_form",status:"active",routing:"broker"}}},
 {name:"anonymous capture RPC",path:"/rpc/crm_capture_campaign_lead",body:{target_campaign:9000000000000000,capture_id:randomUUID(),contact_name:"SYNTHETIC denied",contact_phone:"5583999990000",attribution:{}}},
 {name:"private receipts schema/table read",path:"/campaign_receipts?select=actor_id&limit=1",profile:"crm_private"},
];
const results=[];
for(const test of cases){
 try{
  const response=await fetch(url+"/rest/v1"+test.path,{method:test.body?"POST":"GET",headers:{apikey:key,"Content-Type":"application/json",...(test.profile?{"Accept-Profile":test.profile}:{})},...(test.body?{body:JSON.stringify(test.body)}:{}),redirect:"error",signal:AbortSignal.timeout(20000),cache:"no-store"});
  const body=await response.json();
  const denied=[401,403].includes(response.status)&&body?.code==="42501";
  const unexposed=!!test.profile&&response.status===406&&body?.code==="PGRST106";
  const result=denied||unexposed?"PASS":"FAIL";
  results.push({name:test.name,status:response.status,code:typeof body?.code==="string"?body.code:null,result,observation:unexposed?"Private schema not exposed":denied?"Permission denied":"Unexpected response; body not retained"});
  if(result==="FAIL")break;
 }catch{results.push({name:test.name,result:"BLOCKED",observation:"HTTP/JSON unavailable; no raw error retained"});}
}
const summary=Object.fromEntries(["PASS","FAIL","BLOCKED"].map(status=>[status,results.filter(r=>r.result===status).length]));
await writeFile("tests/security/crm-campaign-agent-anon-http-20261029.json",JSON.stringify({executed_at:new Date().toISOString(),environment:"Supabase staging sdpqphiooiuglywcmkxv",authentication:"anonymous public key; NOT a user JWT",limitation:"Permission denials only; not authenticated write, UI or concurrency homologation",private_response_bodies_saved:false,results,summary},null,2)+"\n");
console.log(JSON.stringify(summary));
assert.equal(results.length,cases.length);assert.equal(summary.FAIL+summary.BLOCKED,0);
