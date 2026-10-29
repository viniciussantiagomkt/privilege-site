/** Local configuration import only. No deployment or network request. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const branch="work/crm-campaign-attribution-20261029";
const cases=[
 ["verified staging accepted",{},true],
 ["production environment blocked",{VERCEL_ENV:"production"},false],
 ["wrong project blocked",{NEXT_PUBLIC_SUPABASE_URL:"https://wrong-project.invalid"},false],
 ["unverified public key blocked",{NEXT_PUBLIC_SUPABASE_ANON_KEY:"synthetic-invalid-key"},false],
 ["privileged key blocked",{SUPABASE_SERVICE_ROLE_KEY:"synthetic-invalid-key"},false],
];
const results=cases.map(([name,extra,expected])=>{
 const env={...process.env,VERCEL_GIT_COMMIT_REF:branch,VERCEL_ENV:"preview",...extra};
 const out=spawnSync(process.execPath,["--env-file=.env.staging.local","--input-type=module","-e","await import('./next.config.ts')"],{env,encoding:"utf8"});
 return {name,result:(out.status===0)===expected?"PASS":"FAIL"};
});
await writeFile("tests/security/crm-campaign-agent-guard-20261029.json",JSON.stringify({branch,environment:"local configuration validation only",results},null,2)+"\n");
console.log(JSON.stringify({passed:results.filter(r=>r.result==="PASS").length,failed:results.filter(r=>r.result==="FAIL").length}));
assert.ok(results.every(r=>r.result==="PASS"));
