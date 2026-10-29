import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
const file=new URL('../lib/crm/campaigns.ts',import.meta.url);
const loaded=new Module(file.pathname);
loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file.pathname);
const {attributionFromForm,campaignLabel}=loaded.exports;
function form(values){const f=new FormData();for(const [key,value]of Object.entries(values))f.set(key,value);return f;}
test('campaign attribution allowlist does not turn user-provided routing/provenance into authority',()=>{
 assert.deepEqual(attributionFromForm(form({utm_source:' meta ',utm_term:' ',broker_id:'forged',verified:'true',api_token:'fixture'})),{utm_source:'meta'});
});
test('landing attribution excludes query strings, fragments and external URLs',()=>{
 for(const landing_path of ['https://external.invalid/','//external.invalid','/page?phone=fixture','/page#token'])assert.throws(()=>attributionFromForm(form({landing_path})));
 assert.deepEqual(attributionFromForm(form({landing_path:'/imoveis/casa'})),{landing_path:'/imoveis/casa'});
});
test('oversized attribution and control characters are rejected without truncating identifiers',()=>{
 assert.throws(()=>attributionFromForm(form({ad_id:'x'.repeat(257)})));
 assert.throws(()=>attributionFromForm(form({utm_content:'foo\nbar'})));
 assert.equal(attributionFromForm(form({ad_id:'x'.repeat(256)})).ad_id.length,256);
});
test('unknown source is explicit; empty attribution does not invent campaign information',()=>{
 assert.equal(campaignLabel('unexpected'),'Não identificada');
 assert.deepEqual(attributionFromForm(new FormData()),{});
});
