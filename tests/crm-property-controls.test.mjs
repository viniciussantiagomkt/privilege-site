import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function harness({ mismatch = false, denied = false } = {}) {
  const property = { id: 900001, status: 'ativo', presentation_enabled: false };
  const states = [];
  const queued = [];
  const writes = [];
  let hook = 0;
  let patch;
  const ctx = { busy: false, run: async action => { queued.push(action); } };
  const chain = { update: value => { writes.push(value); patch = value; return chain; }, eq: () => chain, select: () => chain,
    single: async () => denied ? { data: null, error: {message:'Permission denied'} } : { data: {id:property.id,...patch,...(mismatch ? {status:'ativo'} : {})}, error:null } };
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(new URL('../components/crm/Properties.tsx', import.meta.url), 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020} }).outputText;
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: name => {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react') return { useState: initial => { const index=hook++; if (!(index in states)) states[index]=initial; return [states[index],value => {states[index]=value;}]; } };
    if (name === './Workspace') return {useWorkspace: () => ctx};
    if (name === '@/lib/supabase') return {supabase: {from: () => chain}};
    return new Proxy({}, {get: () => () => null});
  }});
  function find(node, label) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found=find(child,label); if(found)return found; } return; }
    if (node.props?.['aria-label'] === label) return node;
    return find(node.props?.children,label);
  }
  return { render: () => {hook=0;return loaded.exports.PropertySettings({property});}, find, queued, writes, ctx };
}
test('property choices stay in local draft until explicit save, then survive delayed session check', async () => {
 const h=harness();
 let tree=h.render();
 h.find(tree,'Disponibilidade comercial').props.onChange({currentTarget:{value:'reservado'}});
 h.find(tree,'Habilitar página de apresentação').props.onChange({currentTarget:{value:'true'}});
 tree=h.render();
 assert.equal(h.find(tree,'Disponibilidade comercial').props.value,'reservado');
 assert.equal(h.find(tree,'Habilitar página de apresentação').props.value,'true');
 assert.equal(h.queued.length,0);
 await tree.props.onSubmit({preventDefault(){}});
 assert.equal(h.writes.length,0);
 const result=await h.queued[0]();
 assert.equal(result.error,null);
 assert.deepEqual(JSON.parse(JSON.stringify(h.writes)),[{status:'reservado',presentation_enabled:true}]);
});
for (const config of [{mismatch:true},{denied:true}]) {
 test(`save refuses success when database ${config.denied ? 'denies update' : 'returns different values'}`, async () => {
  const h=harness(config);
  h.find(h.render(),'Disponibilidade comercial').props.onChange({currentTarget:{value:'reservado'}});
  await h.render().props.onSubmit({preventDefault(){}});
  assert.ok((await h.queued[0]()).error);
 });
}
test('unchanged or busy settings do not submit',async()=>{
 const h=harness();await h.render().props.onSubmit({preventDefault(){}});assert.equal(h.queued.length,0);
 h.find(h.render(),'Disponibilidade comercial').props.onChange({currentTarget:{value:'vendido'}});
 h.ctx.busy=true;await h.render().props.onSubmit({preventDefault(){}});assert.equal(h.queued.length,0);
});
