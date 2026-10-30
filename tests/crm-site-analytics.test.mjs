import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync,verify} from 'node:crypto';
import ts from 'typescript';
function load(relative,deps={}){const path=fileURLToPath(new URL(relative,import.meta.url)),m=new Module(path);m.require=n=>deps[n]||Module.prototype.require.call(m,n);m._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);return m.exports;}
const model=load('../lib/crm/site-analytics.ts');
const api=load('../lib/server/ga4-reporting.ts',{'@/lib/crm/site-analytics':model});
const {siteAnalyticsHandler}=load('../lib/server/site-analytics-handler.ts',{'./ga4-reporting':api});
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const config={propertyId:'123456789',serviceAccountJson:JSON.stringify({type:'service_account',client_email:'analytics-reader@fixture-project.iam.gserviceaccount.com',private_key:privateKey.export({type:'pkcs8',format:'pem'})})};
function provider({denied=false,badPath=false,partial=false,threshold=false,badNumber=false,badDate=false}={}){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});const ok=data=>({ok:true,json:async()=>data});
  if(url==='https://oauth2.googleapis.com/token')return ok({access_token:'access-token-fixture'});
  if(denied)return {ok:false,status:403};
  const input=JSON.parse(options.body);
  const reports=input.requests.map(q=>{
   const dimension=q.dimensions[0]?.name;
   let values,labels=[];
   if(!dimension)values=q.dateRanges[0].endDate==='yesterday'?['100','150','220','0.5']:['50','100','180','0.4'];
   else if(dimension==='date'){labels=[badDate?'20261399':'20261029'];values=['20','30','40'];}
   else if(dimension==='pagePath'){labels=[badPath?'/apresentacoes/private-token':'/imoveis/casa-ficticia'];values=['40'];}
   else if(dimension==='eventName'){labels=['generate_lead'];values=['7'];}
   else{labels=[dimension==='city'?'Campina Grande':dimension==='deviceCategory'?'mobile':'Organic Search'];values=['30'];}
   if(badNumber)values[0]='9007199254740993';
   return {dimensionHeaders:q.dimensions.map(d=>({name:d.name})),metricHeaders:q.metrics.map(m=>({name:m.name})),rows:[{dimensionValues:labels.map(value=>({value})),metricValues:values.map(value=>({value}))}],metadata:{timeZone:'America/Sao_Paulo',subjectToThresholding:threshold}};
  });
  return ok({reports:partial?reports.slice(1):reports});
 };return {fetcher,calls};
}
test('GA4 configuration requires numeric property and server service account; never accepts measurement ID',()=>{
 for(const c of [{propertyId:'',serviceAccountJson:''},{...config,propertyId:'G-JQDDVHWSWG'},{...config,propertyId:'../another'},{...config,serviceAccountJson:'{"type":"authorized_user"}'}])assert.throws(()=>api.validateGa4Config(c));
 assert.equal(api.validateGa4Config(config).email,'analytics-reader@fixture-project.iam.gserviceaccount.com');
});
test('report uses signed read-only JWT, fixed endpoints and batches of no more than five',async()=>{
 const h=provider();const r=await api.fetchGa4Report(config,28,h.fetcher,new Date('2026-10-30T18:00:00Z'));
 const assertion=h.calls[0].options.body.get('assertion'),[header,payload,signature]=assertion.split('.');
 assert.equal(verify('RSA-SHA256',Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')),true);
 const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.scope,'https://www.googleapis.com/auth/analytics.readonly');assert.equal(claims.aud,'https://oauth2.googleapis.com/token');assert.equal(claims.exp-claims.iat,3600);
 const batches=h.calls.slice(1).map(c=>JSON.parse(c.options.body).requests);assert.deepEqual(batches.map(b=>b.length),[5,3]);
 assert.ok(h.calls.slice(1).every(c=>c.url==='https://analyticsdata.googleapis.com/v1beta/properties/123456789:batchRunReports'));
 assert.ok(h.calls.every(c=>c.options.redirect==='error'&&c.options.cache==='no-store'&&!c.url.includes('access-token-fixture')));
 assert.equal(r.current.activeUsers,100);assert.equal(r.daily[0].users,20);assert.equal(r.previous.activeUsers,50);assert.equal(r.events[0].name,'generate_lead');assert.equal(r.events[0].count,7);
});
test('all report filters exclude preview hostnames and private CRM/login/share pages',async()=>{
 const h=provider();await api.fetchGa4Report(config,7,h.fetcher);
 for(const call of h.calls.slice(1))for(const q of JSON.parse(call.options.body).requests){const filters=JSON.stringify(q.dimensionFilter);assert.ok(filters.includes('www.privilegeimoveispb.com.br'));assert.ok(filters.includes('admin|login|api|apresentacoes'));assert.ok(!filters.includes('vercel.app'));}
 const first=JSON.parse(h.calls[1].options.body).requests;assert.equal(first[0].dateRanges[0].endDate,'yesterday');assert.equal(first[1].dateRanges[0].endDate,'8daysAgo');
});
test('provider denial, incomplete batch and unsafe paths fail instead of returning zeros or private token',async()=>{
 for(const [settings,code] of [[{denied:true},'provider_access'],[{partial:true},'invalid_response'],[{badPath:true},'invalid_response'],[{badNumber:true},'invalid_response'],[{badDate:true},'invalid_response']])await assert.rejects(api.fetchGa4Report(config,28,provider(settings).fetcher),e=>e.code===code&&!e.message.includes('private-token'));
});
test('privacy thresholds are shown explicitly',async()=>{const r=await api.fetchGa4Report(config,28,provider({threshold:true}).fetcher);assert.ok(r.warnings.some(w=>w.includes('privacidade')));});
test('aggregate cache avoids repeated Google reads; carries source query time and cached marker',async()=>{
 const original=globalThis.fetch,h=provider();globalThis.fetch=h.fetcher;
 try{const first=await api.cachedGa4Report(config,90),next=await api.cachedGa4Report(config,90);assert.equal(first.cached,false);assert.equal(next.cached,true);assert.equal(next.generatedAt,first.generatedAt);assert.equal(h.calls.length,3);}finally{globalThis.fetch=original;}
});
const token='valid-shaped-session-token-fixture';
const request=(query='',auth=token)=>new Request('https://crm.invalid/api/admin/site-analytics'+query,{headers:auth?{Authorization:'Bearer '+auth}:{}});
test('backend authenticates and authorizes before any Google query or configuration disclosure',async()=>{
 let reports=0;const deps={authorize:async()=>200,report:async()=>{reports++;throw new api.Ga4Error('not_configured');}};
 assert.equal((await siteAnalyticsHandler(request('',null),deps)).status,401);
 for(const role of [401,403,503])assert.equal((await siteAnalyticsHandler(request(),{...deps,authorize:async()=>role})).status,role);
 assert.equal(reports,0);
 const r=await siteAnalyticsHandler(request(),deps);assert.equal(r.status,503);assert.equal((await r.json()).code,'not_configured');assert.equal(r.headers.get('Cache-Control'),'private, no-store');
});
test('request cannot choose property, credentials, arbitrary dates, repeated periods or hidden filters',async()=>{
 let reports=0;const deps={authorize:async()=>200,report:async()=>{reports++;return {};}};
 for(const query of ['?property=999','?days=365','?days=28&days=7','?days=07','?days=7&host=outside.invalid'])assert.equal((await siteAnalyticsHandler(request(query),deps)).status,400);
 assert.equal(reports,0);assert.equal((await siteAnalyticsHandler(request('?days=7'),deps)).status,200);assert.equal(reports,1);
});
test('unexpected upstream exceptions never expose keys or raw response bodies',async()=>{
 const r=await siteAnalyticsHandler(request(),{authorize:async()=>200,report:async()=>{throw Error('PRIVATE KEY secret-fixture');}});assert.equal(r.status,503);assert.ok(!(await r.text()).includes('secret-fixture'));
});
test('zero comparison base is explicit and no infinite percentage is fabricated',()=>{
 assert.equal(model.changeLabel(0,0),'Sem variação');assert.equal(model.changeLabel(10,0),'Sem base no período anterior');assert.ok(model.changeLabel(20,10).startsWith('+100'));
});
test('real route validates user and current database permission with public Supabase key, ignoring editable metadata',async()=>{
 const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','GA4_PROPERTY_ID','GA4_SERVICE_ACCOUNT_JSON'];const original=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://staging-fixture.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-fixture';
 let allowed=false,invalid=false,permissionError=false,reports=0;const calls=[];
 const sdk={createClient:(url,key,options)=>{calls.push({url,key,options});return {auth:{getUser:async received=>{assert.equal(received,token);return invalid?{data:{user:null},error:{status:401}}:{data:{user:{id:'fixture',user_metadata:{role:'admin'}}},error:null};}},rpc:async name=>{assert.equal(name,'can_manage_operations');return {data:allowed,error:permissionError?{message:'fixture'}:null};}};}};
 const route=load('../app/api/admin/site-analytics/route.ts',{'@supabase/supabase-js':sdk,'@/lib/server/site-analytics-handler':{siteAnalyticsHandler},'@/lib/server/ga4-reporting':{cachedGa4Report:async()=>{reports++;return {};}}});
 try{
  assert.equal((await route.GET(request())).status,403);assert.equal(reports,0);
  allowed=true;assert.equal((await route.GET(request())).status,200);assert.equal(reports,1);
  invalid=true;assert.equal((await route.GET(request())).status,401);assert.equal(reports,1);
  invalid=false;permissionError=true;assert.equal((await route.GET(request())).status,503);assert.equal(reports,1);
  assert.ok(calls.every(c=>c.key==='public-fixture'&&c.options.global.headers.Authorization==='Bearer '+token&&c.options.auth.persistSession===false));
 }finally{for(const key of names){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}}
});
