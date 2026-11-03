import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function harness({campaign=false,search='?utm_source=meta&utm_campaign=fixture&token=private',blocked=false}={}){
 const window={location:{origin:'https://fixture.invalid',pathname:'/campanhas/imovel/fixture',search,href:'https://fixture.invalid/campanhas/imovel/fixture'+search}};
 let requests=0;const writes=[];
 const context={window,URLSearchParams,Date,Math,process:{env:{NODE_ENV:'test'}},fetch:()=>{requests++;throw Error('Unexpected ingestion');},navigator:{sendBeacon:()=>{requests++;throw Error('Unexpected ingestion');}},Blob};
 function load(path,deps={}){
  const m={exports:{}};const file=fileURLToPath(new URL(path,import.meta.url));
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{...context,module:m,exports:m.exports,require:n=>{if(n in deps)return deps[n];throw Error('Unexpected dependency '+n);}});return m.exports;
 }
 const analytics=load('../lib/analytics.ts');
 const deps={'react/jsx-runtime':jsx,'react':{useState:()=>[false,v=>writes.push(v)]},'next/image':{default:()=>null},'@/lib/analytics':blocked?{trackWhatsAppLead:()=>{throw Error('Analytics unavailable');}}:analytics};
 let anchor;
 if(campaign){
  const filters=load('../lib/property-filters.ts');
  const publication=load('../lib/property-publication.ts',{'@/lib/property-filters':filters});
  deps['@/lib/crm/campaign-links']=load('../lib/crm/campaign-links.ts',{'@/lib/property-publication':publication});
  const component=load('../components/CampaignWhatsAppButton.tsx',deps);
  anchor=component.CampaignWhatsAppButton({phone:'5583999990000',title:'Fixture',propertyCode:'P77',propertyId:77,location:'hero'}).props.children[0];
 }else{
  const component=load('../components/WhatsAppLeadButton.tsx',deps);
  anchor=component.WhatsAppLeadButton({href:'https://wa.me/5583999990000?text=Fixture',propertyId:77,propertyTitle:'Fixture'});
 }
 return {window,anchor,writes,click:()=>{const event={currentTarget:{href:anchor.props.href}};anchor.props.onClick(event);return event.currentTarget.href;},requests:()=>requests};
}

test('legacy WhatsApp click emits one analytics event without creating a fictional CRM contact',()=>{
 const h=harness();assert.equal(h.click(),h.anchor.props.href);
 assert.equal(h.requests(),0);assert.equal(h.window.dataLayer.length,1);
 const event=h.window.dataLayer[0];assert.equal(event.event,'whatsapp_lead');assert.equal(event.interaction_type,'click');assert.equal(event.lead_type,'whatsapp');assert.ok(event.event_id);
 assert.equal(event.page_url,'https://fixture.invalid/campanhas/imovel/fixture');assert.ok(!JSON.stringify(event).includes('private'));
 assert.equal(event.phone,undefined);assert.equal(event.name,undefined);
});
test('campaign click uses the published GTM event once and clears stale property/broker context',()=>{
 const h=harness({campaign:true});const href=h.click(),event=h.window.dataLayer[0];
 assert.equal(h.requests(),0);assert.equal(h.window.dataLayer.length,1);
 assert.equal(event.event,'whatsapp_lead');assert.equal(event.source,'campaign_landing');assert.equal(event.interaction_type,'click');
 assert.equal(event.property_id,77);assert.equal(event.property_title,'Fixture');assert.equal(event.property_price,null);assert.equal(event.broker_name,null);
 assert.equal(event.utm_source,'meta');assert.equal(event.utm_campaign,'fixture');assert.equal(event.token,undefined);
 assert.ok(!JSON.stringify(event).includes('private'));assert.ok(new URL(href).searchParams.get('text').includes('meta / fixture'));
});
test('ambiguous campaign UTMs are not forwarded to analytics or the WhatsApp message',()=>{
 const h=harness({campaign:true,search:'?utm_source=a&utm_source=b&token=private'});const href=h.click(),event=h.window.dataLayer[0];
 assert.equal(event.utm_source,undefined);assert.equal(event.token,undefined);
 assert.ok(!new URL(href).searchParams.get('text').includes('Referência da campanha'));
 assert.equal(event.event,'whatsapp_lead');assert.equal(h.requests(),0);
});
test('unavailable analytics never prevents either WhatsApp destination from opening',()=>{
 for(const campaign of [false,true]){
  const h=harness({campaign,blocked:true});let href;assert.doesNotThrow(()=>{href=h.click();});
  assert.equal(new URL(href).hostname,'wa.me');assert.equal(new URL(href).pathname,'/5583999990000');
  assert.equal(h.anchor.props.target,'_blank');assert.equal(h.requests(),0);
 }
});
