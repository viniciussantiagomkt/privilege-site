import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3001"],{stdio:"ignore"});
try {
 let ready=false;
 for(let attempt=0;attempt<40;attempt++) {
  try {await fetch("http://127.0.0.1:3001/login");ready=true;break;} catch {await new Promise(resolve=>setTimeout(resolve,250));}
 }
 assert.ok(ready,"Local staging build did not start");
const results=[];
for(const [path,expected] of [["/",200],["/imoveis",200],["/contato",200],["/login",200],["/apresentacao/synthetic-missing",404]]) {
 const r=await fetch("http://127.0.0.1:3001"+path);
 const html=await r.text();
 const passed=expected===404 ? r.status===404 || (r.status===200 && html.includes("NEXT_HTTP_ERROR_FALLBACK;404") && html.includes("noindex")) : r.status===expected;
 results.push({name:expected===404 ? "missing presentation renders not-found without indexing" : "HTTP "+path,passed,status:r.status});
}
for(const body of ["invalid-json","[]",JSON.stringify({name:123,phone:"1"}),JSON.stringify({name:"Synthetic",phone:"1",property_id:-1})]) {
 const r=await fetch("http://127.0.0.1:3001/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body});
 results.push({name:"invalid lead payload rejected",passed:r.status===400,status:r.status});
}
await writeFile("tests/crm-http-results.json",JSON.stringify({environment:"local connected to staging",results},null,2)+"\n");
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed)},null,2));
assert.ok(results.every(x=>x.passed));
} finally {server.kill("SIGTERM");}

