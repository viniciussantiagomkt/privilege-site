import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const path=fileURLToPath(new URL('../supabase/functions/_shared/ads/reporting.ts',import.meta.url));
const mod=new Module(path);
mod._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,path);
const {readMetaReport,readGoogleReport,spendToMicros}=mod.exports;
const cfg={accountId:'1234567890',version:'v26',accessToken:'fixture-private',since:'2026-10-01',until:'2026-10-02'};
const account={customer:{id:cfg.accountId,currencyCode:'BRL',timeZone:'America/Sao_Paulo'}};
const campaign={campaign:{id:'77',name:'Casa',status:'ENABLED'}};
function fixture(items){const requests=[]; const fetcher=async(url,options)=>{requests.push({url,options});assert.ok(items.length,'unexpected request');const v=items.shift();if(v instanceof Error)throw v;return {ok:true,json:async()=>v};};return {fetcher,requests};}
function meta(items=[]){return fixture([{account_id:cfg.accountId,currency:'BRL',timezone_name:'America/Sao_Paulo'},{data:[{id:'77',name:'Casa',effective_status:'ACTIVE'}]},...items]);}
const metaCfg={...cfg,version:'v99.0'}; // Deliberate fixture version, never sent to a real provider.
test('money normalization is exact and rejects fractional micros or floating overflow',()=>{
 assert.equal(spendToMicros('9007199254740993.123456'),'9007199254740993123456');
 assert.equal(spendToMicros('12.34'),'12340000');
 for(const v of ['-1','NaN','1e6','0.0000001'])assert.throws(()=>spendToMicros(v));
});
test('Google retains int64 spend, daily boundaries, currency and platform conversion meaning',async()=>{
 const f=fixture([{results:[account]},{results:[campaign]},{results:[{campaign:{id:'77'},segments:{date:'2026-10-01'},metrics:{costMicros:'9007199254740993',impressions:'10',clicks:'2',conversions:0.5}}]}]);
 const r=await readGoogleReport(cfg,f.fetcher);
 assert.equal(r.daily[0].spendMicros,'9007199254740993');assert.equal(r.daily[0].conversions,'0.5');assert.equal(r.currency,'BRL');
 assert.ok(f.requests.every(x=>x.url.startsWith('https://googleads.googleapis.com/v26/customers/1234567890/googleAds:search')));
 assert.ok(f.requests.every(x=>x.options.method==='POST'&&!JSON.parse(x.options.body).query.includes('mutate')));
 assert.ok(f.requests.every(x=>!x.url.includes(cfg.accessToken)&&x.options.redirect==='error'));
});
test('Google account discovery, paused campaign preservation and metric pagination',async()=>{
 const f=fixture([{results:[account]},{results:[{campaign:{...campaign.campaign,status:'PAUSED'}}]}, {results:[],nextPageToken:'second'}, {results:[{campaign:{id:'77'},segments:{date:'2026-10-02'},metrics:{}}]}]);
 const r=await readGoogleReport(cfg,f.fetcher);
 assert.equal(r.campaigns[0].active,false);assert.equal(r.daily[0].spendMicros,'0');assert.equal(JSON.parse(f.requests[3].options.body).pageToken,'second');
});
test('Meta preserves action types instead of summing overlapping results as leads',async()=>{
 const f=meta([{data:[{campaign_id:'77',date_start:'2026-10-01',date_stop:'2026-10-01',spend:'12.34',impressions:'100',clicks:'5',actions:[{action_type:'lead',value:'2'},{action_type:'offsite_conversion.fb_pixel_lead',value:'2'}]}]}]);
 const r=await readMetaReport(metaCfg,f.fetcher);
 assert.equal(r.daily[0].spendMicros,'12340000');assert.equal(r.daily[0].conversions,null);assert.equal(r.daily[0].actions.length,2);
 assert.ok(f.requests.every(x=>!x.url.includes(cfg.accessToken)&&x.options.headers.Authorization==='Bearer fixture-private'));
});
test('Meta pagination reconstructs trusted origin, never forwards auth to supplied next URL',async()=>{
 const f=meta([{data:[],paging:{next:'https://untrusted.invalid/?access_token=malicious',cursors:{after:'cursor'}}},{data:[]}]);
 await readMetaReport(metaCfg,f.fetcher);
 assert.ok(f.requests[3].url.startsWith('https://graph.facebook.com/v99.0/act_1234567890/insights?'));assert.ok(f.requests[3].url.includes('after=cursor'));
});
test('repeated page tokens fail rather than returning partial reports or looping',async()=>{
 const f=fixture([{results:[account]},{results:[],nextPageToken:'same'},{results:[],nextPageToken:'same'}]);
 await assert.rejects(readGoogleReport(cfg,f.fetcher),{code:'invalid_response'});
});
test('account mismatches, foreign campaign IDs and out-of-range dates fail closed',async()=>{
 await assert.rejects(readGoogleReport(cfg,fixture([{results:[{customer:{...account.customer,id:'9999999999'}}]}]).fetcher),{code:'invalid_response'});
 for(const row of [{campaign:{id:'99'},segments:{date:'2026-10-01'},metrics:{}},{campaign:{id:'77'},segments:{date:'2026-09-30'},metrics:{}}]){
  await assert.rejects(readGoogleReport(cfg,fixture([{results:[account]},{results:[campaign]},{results:[row]}]).fetcher),{code:'invalid_response'});
 }
});
test('duplicate daily rows fail instead of double counting spend',async()=>{
 const row={campaign:{id:'77'},segments:{date:'2026-10-01'},metrics:{costMicros:'10'}};
 await assert.rejects(readGoogleReport(cfg,fixture([{results:[account]},{results:[campaign]},{results:[row,row]}]).fetcher),{code:'invalid_response'});
});
test('unsafe identifiers and unbounded date windows do not issue requests',async()=>{
 let calls=0;const f=async()=>{calls++;throw Error('must not run');};
 for(const bad of [{accountId:'../another'},{version:'v26/elsewhere'},{since:"2026-01-01' OR 1=1"},{until:'2026-12-01'},{accessToken:'bad\r\nheader'}])await assert.rejects(readGoogleReport({...cfg,...bad},f));
 assert.equal(calls,0);
});
test('provider HTTP errors and fetch errors are sanitized without leaking credential/body',async()=>{
 for(const [status,code] of [[401,'auth'],[403,'auth'],[429,'rate_limit'],[500,'unavailable']]){
  await assert.rejects(readGoogleReport(cfg,async()=>({ok:false,status,json:async()=>{throw Error('fixture-private');}})),e=>e.code===code&&!e.message.includes('fixture-private'));
 }
 await assert.rejects(readGoogleReport(cfg,async()=>{throw Error('fixture-private');}),{message:'ads_unavailable'});
});
