import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function harness() {
  const property = { id: 900001, title: 'Fixture', workflow_status: 'rascunho', status: 'ativo', presentation_enabled: false, images: [], broker_id: 'owner' };
  const queued = [];
  const writes = [];
  let hook = 0;
  const ctx = { userId: 'owner', operations: false, data: { properties: [property], brokers: [], crm_contact_links: [], clients: [] }, run: (action) => { queued.push(action); }, notice: null };
  const chain = { update: (value) => { writes.push(value); return chain; }, eq: () => chain, select: () => chain, single: () => Promise.resolve({error:null}) };
  const fakeComponent = () => null;
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(new URL('../components/crm/Properties.tsx', import.meta.url), 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020} }).outputText;
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: (name) => {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react') return { useState: (initial) => [hook++ === 6 ? property : initial, () => {}], useEffect: () => {}, useRef: () => ({current:false}) };
    if (name === './Workspace') return {useWorkspace: () => ctx};
    if (name === '@/lib/supabase') return {supabase: {from: () => chain}};
    if (name === '@/lib/crm/model') return {matches: () => true, dateTime: () => ''};
    return new Proxy({}, {get: () => fakeComponent});
  }});
  function find(node, label) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found=find(child,label); if(found)return found; } return; }
    if (node.props?.['aria-label'] === label) return node;
    return find(node.props?.children,label);
  }
  const tree = loaded.exports.Properties();
  return {find: label => find(tree,label), queued, writes};
}
for (const [label, chosen, restored, expected] of [
 ['Disponibilidade comercial','reservado','ativo',{status:'reservado'}],
 ['Habilitar página de apresentação','true','false',{presentation_enabled:true}],
 ['Habilitar página de apresentação','false','true',{presentation_enabled:false}],
]) {
 test(`${label}: preserves ${chosen} while session check delays mutation`, async () => {
  const h=harness();
  const select=h.find(label);
  assert.ok(select);
  const element={value:chosen};
  const event={currentTarget:element,target:element};
  select.props.onChange(event);
  // React may restore the controlled field while the async identity check runs.
  element.value=restored;
  event.currentTarget=null;
  assert.equal(h.writes.length,0);
  await h.queued[0]();
  assert.deepEqual(JSON.parse(JSON.stringify(h.writes)),[expected]);
 });
}
