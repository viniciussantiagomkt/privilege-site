import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Module from 'node:module';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
function loadHelpers(){const file=new URL('../lib/crm/campaigns.ts',import.meta.url);const loaded=new Module(file.pathname);loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file.pathname);return loaded.exports;}
function harness({operations=false,mode='editor',responses=[]}={}){
 const campaign={id:12,owner_id:'a',scope:'personal',name:'Campaign fixture',platform:'meta',status:'active',routing:'broker'};
 const states=mode==='editor'?['new',null,'']:[null,campaign,''];let hook=0;const ref={current:null};const calls=[];const notices=[];
 const ctx={operations,userId:operations?'manager':'a',query:'',busy:false,data:{crm_campaigns:[],crm_lead_attributions:[],properties:[{id:1,owner_id:'a',broker_id:'a',property_code:'A',title:'Fixture A'},{id:2,owner_id:'b',broker_id:'b',property_code:'B',title:'Fixture B'}],developments:[],brokers:[{id:'a',active:true,name:'A'},{id:'b',active:true,name:'B'}]},setNotice:n=>notices.push(n),run:async action=>!(await action()).error};
 const loaded={exports:{}};const code=ts.transpileModule(fs.readFileSync(new URL('../components/crm/Campaigns.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{module:loaded,exports:loaded.exports,crypto:globalThis.crypto,require:name=>{
  if(name==='react/jsx-runtime')return jsx;
  if(name==='react')return {useState:initial=>[hook<states.length?states[hook++]:initial,()=>{}],useRef:()=>ref};
  if(name==='./Workspace')return {useWorkspace:()=>ctx};
  if(name==='@/lib/crm/campaigns')return loadHelpers();
  if(name==='@/lib/supabase')return {supabase:{rpc:async(name,args)=>{calls.push({name,args});return responses.shift()||{data:{routing_result:'personal'},error:null};}}};
  if(name==='@/lib/crm/model')return {matches:()=>true};
  if(name==='./UI')return new Proxy({text:(f,k)=>String(f.get(k)||'').trim(),numberId:(f,k)=>f.get(k)?Number(f.get(k)):null},{get:(target,key)=>target[key]||({[key]:()=>null})[key]});
  return new Proxy({},{get:(_,key)=>({[key]:()=>null})[key]});
 }});
 function find(node,predicate){if(!node||typeof node!=='object')return;if(Array.isArray(node)){for(const child of node){const result=find(child,predicate);if(result)return result;}return;}if(predicate(node))return node;return find(node.props?.children,predicate);}
 const root=loaded.exports.Campaigns();const child=find(root,n=>n.type?.name===(mode==='editor'?'CampaignEditor':'CampaignCapture'));assert.ok(child);
 const modal=child.type(child.props);const form=find(modal,n=>Array.isArray(n.props?.fields)&&typeof n.props?.onSubmit==='function');assert.ok(form);
 return {form:form.props,calls,notices};
}
function payload(){const f=new FormData();for(const [k,v]of Object.entries({name:'Fixture',platform:'meta',objective:'leads',entry_channel:'native_form',status:'active',routing:'broker',destination_broker_id:'b',phone:'83999990000',scope:'company'}))f.set(k,v);return f;}
test('personal campaign form shows only own properties and forces own routing despite forged form fields',async()=>{
 const h=harness();const properties=h.form.fields.find(f=>f.name==='property_id').options;assert.equal(properties.length,1);assert.equal(properties[0].value,1);
 await h.form.onSubmit(payload());assert.equal(h.calls[0].name,'crm_save_campaign');assert.equal(h.calls[0].args.payload.scope,'personal');assert.equal(h.calls[0].args.payload.destination_broker_id,'a');
});
test('management campaign form sends institutional configuration without changing ownership',async()=>{
 const h=harness({operations:true});await h.form.onSubmit(payload());assert.equal(h.calls[0].args.payload.name,'Fixture');assert.equal(h.calls[0].args.payload.scope,'company');assert.equal(h.calls[0].args.payload.destination_broker_id,'b');assert.equal(h.calls[0].args.payload.owner_id,undefined);
});
test('manual capture preserves action ID after failed attempt and reports institutional fallback',async()=>{
 const h=harness({mode:'capture',responses:[{data:null,error:{message:'Network fixture'}},{data:{routing_result:'fallback_queue'},error:null}]});
 assert.equal(await h.form.onSubmit(payload()),false);assert.equal(await h.form.onSubmit(payload()),true);
 assert.equal(h.calls[0].args.capture_id,h.calls[1].args.capture_id);assert.equal(h.calls[0].args.target_campaign,12);assert.match(h.notices.at(-1).text,/recepção institucional/);
});
