import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
const helpersPath=fileURLToPath(new URL('../lib/crm/site-analytics.ts',import.meta.url));const helpers=new Module(helpersPath);helpers._compile(ts.transpileModule(fs.readFileSync(helpersPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,helpersPath);
function harness({current='a:manager',stored='a:manager',operations=true,missing=false}={}){
 const report={days:28,generatedAt:'2026-10-30T18:00:00Z',timezone:'America/Sao_Paulo',cached:false,warnings:[],current:{activeUsers:12345,sessions:50,views:80,engagementRate:0.5},previous:{activeUsers:50,sessions:40,views:70,engagementRate:0.4},daily:[],channels:[],devices:[],cities:[],pages:[],events:[]};
 const states=[28,0,{key:`${stored}:28:0`,data:missing?null:report,error:missing?'Conexão de leitura pendente':'',code:missing?'not_configured':''}],effects=[],writes=[];let hook=0,resolve,authCalls=0;
 const file=fileURLToPath(new URL('../components/crm/SiteAnalytics.tsx',import.meta.url)),m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const [userId,role]=current.split(':');
 vm.runInNewContext(code,{module:m,exports:m.exports,Date,AbortController,fetch:()=>new Promise(r=>{resolve=r;}),require:n=>{
  if(n==='react/jsx-runtime')return jsx;
  if(n==='react')return {useState:()=>{const index=hook++;return [states[index],value=>writes.push({index,value})];},useEffect:f=>effects.push(f)};
  if(n==='@/lib/supabase')return {supabase:{auth:{getSession:async()=>{authCalls++;return {data:{session:{access_token:'fixture'}}};}}}};
  if(n==='./Workspace')return {useWorkspace:()=>({userId,role,operations})};
  if(n==='@/lib/crm/site-analytics')return helpers.exports;
  if(n==='./site-analytics.css')return {};
  if(n==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(n==='./UI')return {PageHeading:({title,description})=>jsx.jsxs('header',{children:[title,description]}),Metric:({label,value,detail})=>jsx.jsxs('div',{children:[label,String(value),detail]}),Panel:({title,description,children})=>jsx.jsxs('section',{children:[title,description,children]}),Button:({children})=>jsx.jsx('button',{children}),Empty:({title,description})=>jsx.jsxs('div',{children:[title,description]})};
  throw Error(n);
 }});
 const html=renderToStaticMarkup(m.exports.SiteAnalytics());return {html,effects,writes,getAuthCalls:()=>authCalls,resolve:r=>resolve(r)};
}
test('missing read connection is explicit and does not fabricate zero KPIs',()=>{const h=harness({missing:true});assert.ok(h.html.includes('Conexão de relatórios pendente'));assert.ok(!h.html.includes('Taxa de engajamento'));assert.ok(!h.html.includes('12.345'));});
test('old account data disappears immediately on identity swap',()=>{const h=harness({current:'b:manager'});assert.ok(h.html.includes('Consultando o Google Analytics'));assert.ok(!h.html.includes('12.345'));});
test('broker view neither renders institutional metrics nor starts report session request',()=>{const h=harness({current:'b:corretor',operations:false});h.effects[0]();assert.equal(h.getAuthCalls(),0);assert.ok(!h.html.includes('12.345'));assert.ok(h.html.includes('gestores e administradores'));});
test('late request after cleanup cannot paint report on another session',async()=>{const h=harness();const cleanup=h.effects[0]();await new Promise(r=>setImmediate(r));cleanup();h.resolve({ok:true,json:async()=>({data:{private:'fixture'}})});await new Promise(r=>setImmediate(r));assert.equal(h.writes.length,0);});
