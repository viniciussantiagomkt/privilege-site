import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const base={...process.env,VERCEL_GIT_COMMIT_REF:"work/crm-staging-audit-20261008",VERCEL_ENV:"preview"};
delete base.SUPABASE_SERVICE_ROLE_KEY;
const cases=[
 ["verified staging accepted",{},true],
 ["wrong project blocked",{NEXT_PUBLIC_SUPABASE_URL:"https://wrong-project.invalid"},false],
 ["production deployment blocked",{VERCEL_ENV:"production"},false],
 ["unverified public key blocked",{NEXT_PUBLIC_SUPABASE_ANON_KEY:"synthetic-invalid-key"},false],
 ["service-role key blocked",{SUPABASE_SERVICE_ROLE_KEY:"synthetic-invalid-key"},false]
];
const results=cases.map(([name,extra,expected])=>{
 const result=spawnSync(process.execPath,["--env-file=.env.staging.local","--input-type=module","-e","await import('./next.config.ts')"],{env:{...base,...extra},encoding:"utf8"});
 return {name,passed:(result.status===0)===expected};
});
await writeFile("tests/crm-preview-guard-results.json",JSON.stringify({results},null,2)+"\n");
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed)}));
assert.ok(results.every(x=>x.passed));

