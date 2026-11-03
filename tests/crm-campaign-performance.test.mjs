import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
function load(path,deps={}){
 const file=fileURLToPath(new URL(path,import.meta.url)),m=new Module(file);
 const require=createRequire(file);m.require=n=>deps[n]||require(n);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return m.exports;
}
const model=load('../lib/crm/campaign-performance.ts');
const campaigns=[{id:1,name:'Campanha fixture'},{id:2,name:'Outra fixture'}];
const leads=[{id:11,status:'novo',first_contact_at:null},{id:12,status:'visita_agendada',first_contact_at:'2026-11-01T12:00:00Z'},{id:13,status:'convertido',first_contact_at:null},{id:14,status:'etapa futura',first_contact_at:'invalid'}];
const links=[{campaign_id:1,lead_id:11},{campaign_id:1,lead_id:12},{campaign_id:1,lead_id:13},{campaign_id:1,lead_id:14},{campaign_id:2,lead_id:13}];
test('campaign totals use unique linked CRM leads and disjoint current stages, not clicks or sales',()=>{
 const [row]=model.campaignPerformance(campaigns,[...links,links[0]],leads);
 assert.equal(row.total,4);assert.equal(row.contactRecorded,1);assert.equal(row.counts.novo,1);assert.equal(row.counts['visita agendada'],1);assert.equal(row.counts.convertido,1);assert.equal(row.counts.outro,1);
 assert.equal(Object.values(row.counts).reduce((a,b)=>a+b,0),row.total);assert.equal(row.conversionRate,0.25);assert.equal(row.sales,undefined);
});
test('campaign selection excludes other rows; one lead can belong to two campaigns without becoming two people',()=>{
 const rows=model.campaignPerformance(campaigns,links,leads);assert.equal(rows[1].total,1);
 assert.deepEqual(model.campaignPerformance([campaigns[1]],links,leads).map(r=>r.id),[2]);
 assert.deepEqual(model.campaignPerformance([],links,leads),[]);
});
test('unavailable leads do not become known zero stages and no-lead conversion has no denominator',()=>{
 const [row]=model.campaignPerformance([campaigns[0]],[{campaign_id:1,lead_id:999}],leads);
 assert.equal(row.total,0);assert.equal(row.unavailable,1);assert.equal(row.conversionRate,null);
});
function render({errors={},loading=false,selected=campaigns,rows=leads,attributions=links}={}){
 const ctx={data:{leads:rows,crm_lead_attributions:attributions},errors,loading,reload:async()=>{}};
 const workspace={useWorkspace:()=>ctx};const ui=load('../components/crm/UI.tsx',{'./Workspace':workspace});
 const {CampaignPerformance}=load('../components/crm/CampaignPerformance.tsx',{'./Workspace':workspace,'./UI':ui,'@/lib/crm/campaign-performance':model});
 return renderToStaticMarkup(createElement(CampaignPerformance,{campaigns:selected}));
}
test('real UI hides the aggregate table for errors in any required table, including overflow',()=>{
 for(const table of ['leads','crm_lead_attributions','crm_campaigns']){
  const html=render({errors:{[table]:'Mais de 500 registros'}});
  assert.ok(html.includes('dados incompletos'));assert.ok(!html.includes('<table'));assert.ok(!html.includes('25%'));
 }
});
test('real loading boundary suppresses old aggregate data and empty campaigns remain explicit',()=>{
 const loading=render({loading:true});assert.ok(loading.includes('aria-busy="true"'));assert.ok(!loading.includes('<table'));
 const empty=render({selected:[]});assert.ok(empty.includes('Nenhuma campanha nesta seleção'));assert.ok(!empty.includes('<table'));
});
test('UI labels identify current pipeline conversion, missing links and unavailable financial metrics',()=>{
 const html=render({attributions:[...links,{campaign_id:1,lead_id:999}]});
 assert.ok(html.includes('25%'));assert.ok(html.includes('não comprova venda'));assert.ok(html.includes('aguardam conexão dos custos'));assert.ok(html.includes('Há vínculos sem lead disponível'));assert.ok(html.includes('sem filtro de período'));
 assert.ok(!html.includes('R$'));
});
