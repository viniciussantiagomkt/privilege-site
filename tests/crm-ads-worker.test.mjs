import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
function load(path,deps={}){const m=new Module(path);m.require=n=>deps[n]||Module.prototype.require.call(m,n);m._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,path);return m.exports;}
const folder=fileURLToPath(new URL('../supabase/functions/_shared/ads/',import.meta.url));
const reporting=load(folder+'reporting.ts');const {syncAds,reportPeriod}=load(folder+'worker.ts',{'./reporting.ts':reporting});
const {formatAdMoney,adRatio,adCostPerClick}=load(fileURLToPath(new URL('../lib/crm/ad-reports.ts',import.meta.url)));
const id='88888888-8888-4888-8888-888888888881',lease='99999999-9999-4999-8999-999999999999';
const env={url:'https://sdpqphiooiuglywcmkxv.supabase.co',serviceKey:'service-fixture',cronSecret:'c'.repeat(40),connections:JSON.stringify([{id,provider:'meta',externalId:'111',version:'v99.0',timezone:'America/Sao_Paulo',accessToken:'provider-fixture'}])};
const request=(body={account_id:id},secret=env.cronSecret)=>new Request('https://worker.invalid/',{method:'POST',headers:{authorization:`Bearer ${secret}`},body:JSON.stringify(body)});
function fake({skip=false,providerError=false,failCommit=false,google=false}={}){
 const calls=[];const f=async(url,options)=>{
  calls.push({url,options});const body=typeof options?.body==='string'?JSON.parse(options.body):null;const ok=data=>({ok:true,status:200,json:async()=>data});
  if(url.endsWith('/crm_claim_ad_sync'))return ok(skip?null:{lease,account_id:id,provider:google?'google':'meta',external_id:google?'1234567890':'111',timezone:'America/Sao_Paulo'});
  if(url.endsWith('/crm_commit_ad_report'))return failCommit?{ok:false,status:503}:ok(null);
  if(url.endsWith('/crm_fail_ad_sync'))return ok(null);
  if(providerError)return {ok:false,status:401};
  if(url==='https://oauth2.googleapis.com/token')return ok({access_token:'refreshed-fixture'});
  if(url.includes('googleads.googleapis.com')){
   if(body.query.includes('FROM customer'))return ok({results:[{customer:{id:'1234567890',currencyCode:'BRL',timeZone:'America/Sao_Paulo'}}]});
   if(body.query.includes('segments.date'))return ok({results:[]});
   return ok({results:[{campaign:{id:'77',name:'Google fixture',status:'ENABLED'}}]});
  }
  if(url.includes('/campaigns?'))return ok({data:[{id:'77',name:'Meta fixture',effective_status:'ACTIVE'}]});
  if(url.includes('/insights?'))return ok({data:[{campaign_id:'77',date_start:'2026-10-29',date_stop:'2026-10-29',spend:'5.20',impressions:'10',clicks:'2'}]});
  if(url.includes('graph.facebook.com'))return ok({account_id:'111',currency:'BRL',timezone_name:'America/Sao_Paulo'});
  throw Error('unexpected request');
 };return {f,calls};
}
test('worker rejects unauthorized callers, arbitrary payload and production without outbound requests',async()=>{
 let count=0;const f=async()=>{count++;throw Error('must not run');};
 assert.equal((await syncAds(request({},'bad'),env,f)).status,401);
 assert.equal((await syncAds(request({account_id:id,forged:'value'}),env,f)).status,400);
 assert.equal((await syncAds(request(),{...env,url:'https://production.invalid'},f)).status,503);assert.equal(count,0);
});
test('Meta worker flow claims lease, reads and persists a complete period exactly once',async()=>{
 const h=fake();const r=await syncAds(request(),env,h.f,new Date('2026-10-29T19:00:00Z'));assert.equal(r.status,200);assert.equal((await r.json()).status,'synced');
 const commits=h.calls.filter(c=>c.url.endsWith('/crm_commit_ad_report'));assert.equal(commits.length,1);const p=JSON.parse(commits[0].options.body);
 assert.equal(p.report.daily[0].spendMicros,'5200000');assert.equal(p.period_start,'2026-09-30');assert.equal(p.period_end,'2026-10-29');assert.ok(!h.calls.some(c=>c.url.includes('fixture')));
});
test('busy or not-due account skips provider calls',async()=>{const h=fake({skip:true});assert.equal((await(await syncAds(request(),env,h.f)).json()).status,'skipped');assert.equal(h.calls.length,1);});
test('provider and database errors do not report success or expose credentials',async()=>{
 for(const options of [{providerError:true},{failCommit:true}]){const h=fake(options);const r=await syncAds(request(),env,h.f,new Date('2026-10-29T19:00:00Z'));assert.equal(r.status,503);const fail=h.calls.filter(c=>c.url.endsWith('/crm_fail_ad_sync'));assert.equal(fail.length,1);assert.equal(JSON.parse(fail[0].options.body).lease,lease);assert.ok(!(await r.text()).includes('fixture'));}
});
test('Google refresh stays on backend before reporting and transaction commit',async()=>{
 const h=fake({google:true}),configured={...env,connections:JSON.stringify([{id,provider:'google',externalId:'1234567890',version:'v26',timezone:'America/Sao_Paulo',clientId:'client-fixture',clientSecret:'secret-fixture',refreshToken:'refresh-fixture'}])};
 assert.equal((await syncAds(request(),configured,h.f,new Date('2026-10-29T19:00:00Z'))).status,200);
 assert.equal(h.calls.find(c=>c.url==='https://oauth2.googleapis.com/token').options.body.get('refresh_token'),'refresh-fixture');
 assert.ok(h.calls.filter(c=>c.url.includes('googleads.googleapis.com')).every(c=>c.options.headers.Authorization==='Bearer refreshed-fixture'));
});
test('server allowlist prevents caller from choosing an unconfigured account',async()=>{const h=fake();assert.equal((await syncAds(request({account_id:'88888888-8888-4888-8888-888888888883'}),env,h.f)).status,503);assert.equal(h.calls.length,0);});
test('timezone dates, exact money, CPC and zero denominators retain correct meaning',()=>{
 assert.equal(reportPeriod(new Date('2026-10-30T01:00:00Z'),'America/Sao_Paulo').until,'2026-10-29');assert.equal(formatAdMoney('9007199254740993123456','BRL'),'BRL 9.007.199.254.740.993,12');
 assert.equal(adRatio('5','100',100),5);assert.equal(adRatio('2','0'),null);assert.equal(adCostPerClick('10000000','4','BRL'),'BRL 2,50');assert.equal(adCostPerClick('10','0','BRL'),'Indisponível');
});
