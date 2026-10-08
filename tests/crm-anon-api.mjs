import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url, "https://sdpqphiooiuglywcmkxv.supabase.co", "This test is restricted to staging");
assert.ok(key, "Staging publishable key required");
const results = [];
for (const table of ["leads", "clients", "tasks", "visits", "proposals", "negotiations", "sales", "audit_logs", "lead_assignments", "notifications"]) {
  const response = await fetch(url + "/rest/v1/" + table + "?select=*&limit=1", {headers:{apikey:key}});
  const body = await response.json();
  const passed = response.status === 200 && Array.isArray(body) && body.length === 0;
  results.push({name:"anonymous API cannot read " + table,passed,status:response.status});
}
for (const [name, body] of [
  ["crm_assign_lead", {target_lead:-910001,target_broker:"00000000-0000-4000-8000-000000000001",assignment_reason:"SYNTHETIC denied"}],
  ["crm_record_contact", {target_lead:-910001}],
  ["sync_property_media_arrays", {target_property_id:-910001}],
  ["increment_property_view", {target_property_id:-910001}],
  ["crm_save_property_media", {target_property_id:-910001,image_urls:[],video_urls:[]}]
]) {
  const response = await fetch(url + "/rest/v1/rpc/" + name, {method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify(body)});
  results.push({name:"anonymous API denied " + name,passed:[401,403].includes(response.status),status:response.status});
}
await writeFile("tests/crm-api-results.json",JSON.stringify({environment:"staging",authentication:"anon",results},null,2)+"\n");
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed)},null,2));
assert.ok(results.every(x=>x.passed),"Anonymous API regression failed");

