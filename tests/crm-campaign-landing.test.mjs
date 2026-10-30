import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
function load(relative,deps={}){
 const path=fileURLToPath(new URL(relative,import.meta.url));const m=new Module(path);
 m.require=n=>deps[n]||Module.prototype.require.call(m,n);
 m._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,path);return m.exports;
}
const filters=load('../lib/property-filters.ts');
const publication=load('../lib/property-publication.ts',{'@/lib/property-filters':filters});
const helpers=load('../lib/crm/campaign-links.ts',{'@/lib/property-publication':publication});
const media=load('../lib/property-media.ts');
const fixture={id:77,slug:'casa-ficticia',title:'Imóvel fictício de teste',description:'Fixture',price:'R$ 200.000',images:[],status:'ativo',publish_on_site:true,workflow_status:'aprovado',available_for_campaigns:true};
test('campaign landing requires explicit site publication and campaign permission, not private presentation permission',()=>{
 assert.equal(helpers.campaignLandingEligible(fixture),true);
 for(const change of [{publish_on_site:false},{publish_on_site:undefined},{available_for_campaigns:false},{available_for_campaigns:undefined},{workflow_status:'pendente'},{workflow_status:'rascunho'},{deleted_at:'2026-10-30'},{status:'vendido'},{status:'reservado'},{status:'alugado'},{presentation_enabled:true,publish_on_site:false}])assert.equal(helpers.campaignLandingEligible({...fixture,...change}),false);
});
test('link builder keeps exact origin, encodes UTMs and rejects path/duplicate/control injection',()=>{
 const link=helpers.campaignLandingLink('https://preview.invalid/admin','casa-ficticia',new URLSearchParams({utm_campaign:'Casa & jardim',utm_source:' meta ',owner_id:'forged',token:'private'}));
 const url=new URL(link);assert.equal(url.origin,'https://preview.invalid');assert.equal(url.pathname,'/campanhas/imovel/casa-ficticia');assert.equal(url.searchParams.get('utm_campaign'),'Casa & jardim');assert.equal(url.searchParams.get('utm_source'),'meta');assert.equal(url.searchParams.has('owner_id'),false);assert.equal(url.searchParams.has('token'),false);
 for(const slug of ['../casa','//outside','casa?secret=x','casa#x','casa/com/barra'])assert.throws(()=>helpers.campaignLandingLink('https://preview.invalid',slug,new URLSearchParams()));
 for(const params of [new URLSearchParams('utm_source=a&utm_source=b'),new URLSearchParams({utm_campaign:'x'.repeat(161)}),new URLSearchParams({utm_content:'line\nbreak'})])assert.throws(()=>helpers.campaignUtm(params));
});
function loader(property=fixture,{dbError=false}={}){
 const calls=[];const db={from:table=>{
  calls.push(table);const conditions=[];const query={select:()=>query,in:(key,values)=>{conditions.push(p=>values.includes(p[key]));return query;},eq:(key,value)=>{conditions.push(p=>p[key]===value);return query;},is:(key,value)=>{conditions.push(p=>(p[key]??null)===value);return query;},maybeSingle:async()=>({data:dbError?null:conditions.every(f=>f(property))?property:null,error:dbError?{message:'private DB detail'}:null}),then:resolve=>resolve({data:[],error:null})};return query;
 }};
 const loaded=load('../lib/campaign-property.ts',{'react':{cache:f=>f},'@/lib/supabase-server':{createServerClient:()=>db},'@/lib/property-publication':publication,'@/lib/property-media':media});return {read:loaded.loadCampaignProperty,calls};
}
test('server loader does not fetch media or broker after public/campaign restrictions reject a property',async()=>{
 for(const change of [{publish_on_site:false},{available_for_campaigns:false},{workflow_status:'pendente'},{deleted_at:'2026-10-30'},{status:'vendido'},{status:'rascunho'}]){
  const h=loader({...fixture,...change});assert.equal(await h.read('casa-ficticia'),null);assert.deepEqual(h.calls,['properties']);
 }
 const invalid=loader();assert.equal(await invalid.read('../private'),null);assert.equal(invalid.calls.length,0);
 const valid=loader();assert.equal((await valid.read('casa-ficticia')).property.id,77);
});
test('database error does not disguise unavailable storage as missing property or leak raw error',async()=>{
 const h=loader(fixture,{dbError:true});await assert.rejects(h.read('casa-ficticia'),e=>e.message==='Não foi possível consultar este imóvel agora.'&&!e.message.includes('private'));
});
test('WhatsApp click forwards only allowed origin and never calls the lead ingestion API',()=>{
 const path=fileURLToPath(new URL('../components/CampaignWhatsAppButton.tsx',import.meta.url));const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 const m={exports:{}};const events=[];
 vm.runInNewContext(code,{module:m,exports:m.exports,URLSearchParams,window:{location:{origin:'https://preview.invalid',pathname:'/campanhas/imovel/casa-ficticia',search:'?utm_source=meta&utm_campaign=fixture&phone=private&broker_id=forged'}},require:n=>{
  if(n==='react/jsx-runtime')return jsx;if(n==='react')return {useState:()=>[false,()=>{}]};if(n==='@/lib/crm/campaign-links')return helpers;if(n==='@/lib/analytics')return {trackEvent:(...args)=>events.push(args)};throw Error('Unexpected dependency '+n);
 }});
 const root=m.exports.CampaignWhatsAppButton({phone:'5583999990000',title:'Fixture',propertyCode:'P77',propertyId:77,location:'hero'});const anchor=root.props.children[0];const event={currentTarget:{href:anchor.props.href}};anchor.props.onClick(event);
 const url=new URL(event.currentTarget.href);assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/5583999990000');assert.ok(url.searchParams.get('text').includes('meta / fixture'));
 assert.equal(events[0][0],'campaign_whatsapp_click');assert.equal(events[0][1].page_url,'https://preview.invalid/campanhas/imovel/casa-ficticia');assert.equal(events[0][1].phone,undefined);assert.equal(events[0][1].broker_id,undefined);
 assert.ok(!code.includes('/api/leads'));assert.ok(!code.includes('sendBeacon'));
});
