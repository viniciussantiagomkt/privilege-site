import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Module from 'node:module';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
const helperPath=new URL('../lib/crm/ad-reports.ts',import.meta.url).pathname;const helpers=new Module(helperPath);
helpers._compile(ts.transpileModule(fs.readFileSync(helperPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,helperPath);
function harness({storedIdentity='a:staff',currentIdentity='a:staff',complete=false,meta=false}={}){
 const id='fixture-account',account={id,name:'PRIVATE ACCOUNT FIXTURE',provider:meta?'meta':'google',status:'connected',scope:'personal',currency:'BRL',timezone:'America/Sao_Paulo',last_success_at:'2026-10-02T12:00:00Z'};
 const campaign={external_id:'77',name:'PRIVATE CAMPAIGN FIXTURE',remote_status:'ENABLED',active:true,days_with_data:0,spend_micros:'0',impressions:'0',clicks:'0',platform_conversions:null,platform_actions:meta?[{type:'lead',value:'2'},{type:'other_lead',value:'2'}]:[]};
 const states=['',{since:'2026-10-01',until:'2026-10-02'},0,{identity:storedIdentity,rows:[account]},{key:`${storedIdentity}:${id}:2026-10-01:2026-10-02:0`,data:{account,campaigns:[campaign],complete_period:complete},error:''},{identity:storedIdentity,text:''},false,Date.parse('2026-10-02T12:01:00Z')];
 const [userId,role]=currentIdentity.split(':');const effects=[],writes=[];let hook=0,resolve;
 const code=ts.transpileModule(fs.readFileSync(new URL('../components/crm/AdReports.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;const mod={exports:{}};
 vm.runInNewContext(code,{module:mod,exports:mod.exports,Date,AbortController,setInterval,clearInterval,require:name=>{
  if(name==='react/jsx-runtime')return jsx;
  if(name==='react')return {useState:()=>{const index=hook++;return [states[index],value=>writes.push({index,value})];},useEffect:f=>effects.push(f)};
  if(name==='./Workspace')return {useWorkspace:()=>({userId,role,busy:false})};
  if(name==='@/lib/crm/ad-reports')return helpers.exports;
  if(name==='@/lib/supabase')return {supabase:{rpc:()=>({abortSignal:()=>new Promise(r=>{resolve=r;})})}};
  if(name==='./UI')return {Panel:({children,title})=>jsx.jsxs('section',{children:[jsx.jsx('h2',{children:title}),children]}),Badge:({children})=>jsx.jsx('span',{children}),Button:({children})=>jsx.jsx('button',{children}),Empty:({title,description})=>jsx.jsxs('div',{children:[title,description]})};
  throw Error(name);
 }});return {html:renderToStaticMarkup(mod.exports.AdReports()),effects,writes,resolveReport:data=>resolve(data)};
}
test('identity change hides previous account and report before async reload',()=>{const h=harness({currentIdentity:'b:staff'});assert.ok(!h.html.includes('PRIVATE ACCOUNT FIXTURE'));assert.ok(!h.html.includes('PRIVATE CAMPAIGN FIXTURE'));});
test('incomplete coverage cannot display omitted rows as confirmed zero spend',()=>{const h=harness();assert.ok(h.html.includes('cobertura completa'));assert.ok(h.html.includes('Sem dados'));assert.ok(!h.html.includes('BRL 0,00'));});
test('Meta action types remain distinct instead of adding overlapping leads',()=>{const h=harness({meta:true,complete:true});assert.ok(h.html.includes('lead: 2'));assert.ok(h.html.includes('other_lead: 2'));assert.ok(!h.html.includes('lead: 4'));});
test('response resolving after cleanup cannot populate current view',async()=>{const h=harness();const cleanup=h.effects[1]();cleanup();h.resolveReport({data:{private:'fixture'},error:null});await new Promise(r=>setImmediate(r));assert.equal(h.writes.filter(w=>w.index===4).length,0);});
