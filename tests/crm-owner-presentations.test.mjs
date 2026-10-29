import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
function load(path) {
 const file=new URL('../'+path,import.meta.url);const loaded=new Module(file.pathname);
 loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file.pathname);
 return loaded.exports;
}
const {eligibleProperty}=load('lib/crm/marketing.ts');
const {presentationMedia}=load('supabase/functions/_shared/presentation-media.ts');
const fixture={id:80001,owner_id:'a',broker_id:'b',presentation_enabled:true,publish_on_site:false};
test('owner/responsible can present unpublished draft/pending/approved property, others cannot',()=>{
 for(const workflow_status of ['rascunho','pendente','aprovado','publicado'])for(const actor of ['a','b','other','']) {
  assert.equal(!!eligibleProperty({...fixture,workflow_status},actor),['a','b'].includes(actor));
 }
 for(const patch of [{presentation_enabled:false},{deleted_at:'2026-01-01'},{workflow_status:'arquivado'}])assert.equal(!!eligibleProperty({...fixture,workflow_status:'rascunho',...patch},'a'),false);
});
const token='11111111-1111-4111-8111-111111111111';
const path='22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp';
const env={url:'https://staging.invalid',publicKey:'sb_publishable_fixture',storageKey:'server-only-fixture'};
const request=(query=`token=${token}&property=80001&image=0`)=>new Request('https://edge.invalid/?'+query);
test('image capability verifies with public key before streaming one exact storage object with server key',async()=>{
 const calls=[];
 const response=await presentationMedia(request(),env,async(url,options)=>{
  calls.push({url,options});
  return calls.length===1?Response.json({properties:[{id:80001,images:['https://crm.invalid/api/property-media/'+path]}]}):new Response('fixture-bytes');
 });
 assert.equal(response.status,200);assert.equal(await response.text(),'fixture-bytes');
 assert.equal(calls[0].options.headers.apikey,env.publicKey);
 assert.equal(calls[1].url,`${env.url}/storage/v1/object/authenticated/crm-property-images/${path}`);
 assert.equal(calls[1].options.headers.Authorization,'Bearer '+env.storageKey);
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.ok(!JSON.stringify([...response.headers]).includes(env.storageKey));
});
for(const [name,payload] of [['revoked/expired',null],['other property',{properties:[{id:42,images:['/api/property-media/'+path]}]}],['path injection',{properties:[{id:80001,images:['/api/property-media/../../secret']}]}]]) {
 test(`image capability denies ${name} without touching storage`,async()=>{
  let calls=0;
  const result=await presentationMedia(request(),env,async()=>{calls++;return Response.json(payload);});
  assert.equal(result.status,404);assert.equal(calls,1);
 });
}
test('invalid capability and out-of-bounds image never disclose file',async()=>{
 const invalid=await presentationMedia(request('token=invalid&property=80001&image=0'),env,()=>{throw Error('must not call')});assert.equal(invalid.status,404);
 let calls=0;
 const result=await presentationMedia(request(`token=${token}&property=80001&image=2`),env,async()=>{calls++;return Response.json({properties:[{id:80001,images:[]}]});});
 assert.equal(result.status,404);assert.equal(calls,1);
});
test('RPC failure and storage denial fail closed',async()=>{
 const rpcError=await presentationMedia(request(),env,async()=>new Response(null,{status:500}));assert.equal(rpcError.status,503);
 let calls=0;
 const storageError=await presentationMedia(request(),env,async()=>++calls===1?Response.json({properties:[{id:80001,images:['/api/property-media/'+path]}]}):new Response(null,{status:403}));assert.equal(storageError.status,404);
});
test('approved material streams Range without opening unselected assets',async()=>{
 const media=path.replace('.webp','.mp4');let calls=0;
 const result=await presentationMedia(new Request(`https://edge.invalid/?token=${token}&asset=88`,{headers:{Range:'bytes=10-19'}}),env,async(url,opts)=>{
  if(++calls===1)return Response.json({assets:[{id:88,path:media,mime_type:'video/mp4'}]});
  assert.match(url,/crm-marketing/);assert.equal(opts.headers.Range,'bytes=10-19');
  return new Response('fixture',{status:206,headers:{'Content-Range':'bytes 10-19/100'}});
 });
 assert.equal(result.status,206);assert.equal(result.headers.get('content-type'),'video/mp4');assert.equal(result.headers.get('content-range'),'bytes 10-19/100');
 let absentCalls=0;
 const absent=await presentationMedia(request(`token=${token}&asset=99`),env,async()=>{absentCalls++;return Response.json({assets:[]});});assert.equal(absent.status,404);assert.equal(absentCalls,1);
});
