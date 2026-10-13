import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import Module from 'node:module';
function load(relative, deps={}){
 const file=fileURLToPath(new URL(relative,import.meta.url));
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m=new Module(file);m.require=name=>{if(!(name in deps))throw new Error(`Unexpected import ${name}`);return deps[name];};m._compile(source,file);return m.exports;
}
const {streamPublicStorageObject:stream}=load('../lib/storage-stream.ts');
const path='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.mp4';
async function mocked(fetcher,fn){
 const original=globalThis.fetch,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 globalThis.fetch=fetcher;process.env.NEXT_PUBLIC_SUPABASE_URL='https://staging.example.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_synthetic';
 try{return await fn();}finally{globalThis.fetch=original;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;}
}
test('video preserva streaming e Range sem chave privilegiada',async()=>{
 const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array([1,2,3]));c.close();}},{highWaterMark:0});
 const upstream=new Response(body,{status:206,headers:{'Content-Range':'bytes 0-2/6000000','Content-Length':'3','Accept-Ranges':'bytes'}});
 await mocked(async(url,options)=>{assert.equal(url,`https://staging.example.invalid/storage/v1/object/authenticated/crm-marketing/${path}`);assert.equal(options.headers.get('Range'),'bytes=0-2');assert.equal(options.headers.get('apikey'),'sb_publishable_synthetic');assert.equal(options.headers.has('Authorization'),false);assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');return upstream;},async()=>{
  const r=await stream(new Request('https://preview.example.invalid/media',{headers:{Range:'bytes=0-2'}}),'crm-marketing',path,'video/mp4');
  assert.equal(r.status,206);assert.equal(r.body,upstream.body);assert.equal(r.headers.get('Content-Range'),'bytes 0-2/6000000');assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[1,2,3]);
 });
});
test('resposta maior que 4.5MB e encaminhada como stream, sem blob intermediario',async()=>{
 const size=6*1024*1024;const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(size));c.close();}},{highWaterMark:0});const upstream=new Response(body);
 await mocked(async()=>upstream,async()=>{const r=await stream(new Request('https://preview.example.invalid/media'),'crm-marketing',path,'video/mp4');assert.equal(r.body,upstream.body);assert.equal((await r.arrayBuffer()).byteLength,size);});
});
test('Range invalido e recusado sem buscar Storage',async()=>{
 await mocked(async()=>{throw new Error('Must not call Storage');},async()=>{const r=await stream(new Request('https://preview.example.invalid/media',{headers:{Range:'bytes=0-3,6-9'}}),'crm-marketing',path,'video/mp4');assert.equal(r.status,400);});
});
test('Storage negado ou ausente nao entrega dados e instabilidade e 503',async()=>{
 for(const status of [400,401,403,404,429,500])await mocked(async()=>new Response('private diagnostic',{status}),async()=>{const r=await stream(new Request('https://preview.example.invalid/media'),'crm-marketing',path,'video/mp4');assert.equal(r.status,status>=500||status===429?503:404);assert.equal(await r.text(),'');});
});
test('falha de rede e indisponibilidade, nao inexistencia',async()=>{
 await mocked(async()=>{throw new Error('Synthetic network failure');},async()=>{assert.equal((await stream(new Request('https://preview.example.invalid/media'),'crm-marketing',path,'video/mp4')).status,503);});
});
test('Range fora do arquivo preserva 416 e Content-Range',async()=>{
 await mocked(async()=>new Response(null,{status:416,headers:{'Content-Range':'bytes */100'}}),async()=>{const r=await stream(new Request('https://preview.example.invalid/media',{headers:{Range:'bytes=999-'}}),'crm-marketing',path,'video/mp4');assert.equal(r.status,416);assert.equal(r.headers.get('Content-Range'),'bytes */100');});
});
test('token revogado ou inexistente nao busca bytes',async()=>{
 const {GET}=load('../app/api/presentation-media/[token]/[asset]/route.ts',{'@/lib/supabase-server':{createServerClient:()=>({rpc:async()=>({data:null,error:null})})},'@/lib/crm/marketing':{UUID:/^[0-9a-f-]{36}$/,ASSET_PATH:/^[0-9a-f-]{36}\/[0-9a-f-]{36}[.]mp4$/},'@/lib/storage-stream':{streamPublicStorageObject:()=>{throw new Error('Must not fetch bytes');}}});
 const r=await GET(new Request('https://preview.example.invalid/media'),{params:Promise.resolve({token:'00000000-0000-4000-8000-000000000001',asset:'1'})});assert.equal(r.status,404);
});
test('asset que nao foi selecionado no link nao busca bytes',async()=>{
 const {GET}=load('../app/api/presentation-media/[token]/[asset]/route.ts',{'@/lib/supabase-server':{createServerClient:()=>({rpc:async()=>({data:{assets:[{id:2,path,mime_type:'video/mp4'}]},error:null})})},'@/lib/crm/marketing':{UUID:/^[0-9a-f-]{36}$/,ASSET_PATH:/^[0-9a-f-]{36}\/[0-9a-f-]{36}[.]mp4$/},'@/lib/storage-stream':{streamPublicStorageObject:()=>{throw new Error('Must not fetch bytes');}}});
 const r=await GET(new Request('https://preview.example.invalid/media'),{params:Promise.resolve({token:'00000000-0000-4000-8000-000000000001',asset:'1'})});assert.equal(r.status,404);
});
