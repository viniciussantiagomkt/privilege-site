import assert from 'node:assert/strict';
export async function runCampaignScenarios({db,actor,check,denied,ids}) {
 const base={name:'Campanha fictícia',platform:'meta',objective:'leads',entry_channel:'native_form',status:'active',property_id:null,development_id:null,routing:'broker'};
 const save=async(who,payload,id=null)=>(await actor(who,'select crm_save_campaign($1,$2::jsonb) id',[id,JSON.stringify(payload)]))[0].id;
 let event=0;
 const eventId=()=>`77777777-7777-4777-8777-${String(++event).padStart(12,'0')}`;
 const capture=async(who,campaign,id=eventId(),details={},name='Contato fictício',phone='+55 (83) 99999-0000')=>(await actor(who,'select crm_capture_campaign_lead($1,$2,$3,$4,$5::jsonb) result',[campaign,id,name,phone,JSON.stringify(details)]))[0].result;
 const privateA=await save('a',{...base,scope:'personal'});
 const privateB=await save('b',{...base,name:'Campanha B fictícia',scope:'personal'});
 const companyPayload={...base,name:'Institucional fictícia',scope:'company',destination_broker_id:ids.b};
 const company=await save('admin',companyPayload);
 await check('campaign: private metadata isolated from other broker and management',async()=>{
  assert.equal((await actor('a','select id from crm_campaigns where id=$1',[privateA])).length,1);
  for(const who of ['b','manager','admin'])await denied(who,'select id from crm_campaigns where id=$1',[privateA]);
  for(const who of ['admin','manager'])assert.equal((await actor(who,'select id from crm_campaigns where id=$1',[company])).length,1);
  await denied('b','select id from crm_campaigns where id=$1',[company]);
 });
 await check('campaign: anonymous and direct writes are denied; no forged owner or scope',async()=>{
  await denied('anon','select * from crm_campaigns');
  await denied('anon','select * from crm_lead_attributions');
  await denied('anon','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify(base)]);
  await denied('a',"update crm_campaigns set status='active' where id=$1 returning id",[privateA]);
  await denied('a','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify({...companyPayload})]);
  await denied('a','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify({...base,scope:'personal',owner_id:ids.b})]);
  await denied('b','select crm_save_campaign($1,$2::jsonb)',[privateA,JSON.stringify({...base,scope:'personal'})]);
  await denied('manager','select * from crm_private.campaign_receipts');
 });
 await check('campaign: management edits institutional campaign without changing owner',async()=>{
  await save('manager',{...companyPayload,name:'Institucional revisada'},company);
  const [row]=await actor('admin','select owner_id,name from crm_campaigns where id=$1',[company]);
  assert.equal(row.owner_id,ids.admin);assert.equal(row.name,'Institucional revisada');
 });
 let companyLead;
 await check('campaign: institutional routing assigns lead and stores provenance for current broker only',async()=>{
  const out=await capture('manager',company,eventId(),{utm_source:'  meta  ',utm_campaign:'Campanha fixture',adset_id:'set-fixture',ad_id:'ad-fixture',keyword:'casa',landing_path:'/imoveis/casa'});
  companyLead=out.lead_id;assert.equal(out.routing_result,'assigned');assert.equal(out.replayed,false);
  const [lead]=await actor('b','select * from leads where id=$1',[companyLead]);
  assert.equal(lead.origin_type,'company');assert.equal(lead.broker_id,ids.b);assert.equal(lead.phone,'5583999990000');
  const [attribution]=await actor('b','select * from crm_lead_attributions where lead_id=$1',[companyLead]);
  assert.equal(attribution.provenance,'manual');assert.equal(attribution.details.utm_source,'meta');assert.equal(attribution.campaign_name,'Institucional revisada');
  for(const who of ['a','manager'])await denied(who,'select * from crm_lead_attributions where lead_id=$1',[companyLead]);
 });
 await check('campaign: retry returns same lead, one attribution, one assignment and one notification',async()=>{
  const id=eventId();const first=await capture('manager',company,id,{utm_campaign:'Repeat fixture'});const repeat=await capture('manager',company,id,{utm_campaign:'Repeat fixture'});
  assert.equal(first.lead_id,repeat.lead_id);assert.equal(repeat.replayed,true);
  for(const table of ['crm_lead_attributions','lead_assignments'])assert.equal((await db.query(`select count(*)::int n from ${table} where lead_id=$1`,[first.lead_id])).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int n from notifications where entity_type='lead' and entity_id=$1",[first.lead_id])).rows[0].n,1);
  await denied('manager','select crm_capture_campaign_lead($1,$2,$3,$4)',[company,id,'Different fictitious name','83999990000']);
 });
 await check('campaign: destination becoming inactive falls back to institutional queue',async()=>{
  await db.query('update brokers set active=false where id=$1',[ids.b]);
  try {
   const out=await capture('manager',company);assert.equal(out.routing_result,'fallback_queue');
   const [lead]=await actor('manager','select broker_id,origin_type from leads where id=$1',[out.lead_id]);
   assert.equal(lead.broker_id,null);assert.equal(lead.origin_type,'company');
   await save('manager',{...companyPayload,status:'archived'},company);
   await denied('manager','select crm_save_campaign($1,$2::jsonb)',[company,JSON.stringify(companyPayload)]);
  } finally {await db.query('update brokers set active=true where id=$1',[ids.b]);}
  await save('manager',{...companyPayload,name:'Institucional revisada'},company);
 });
 let personalLead;
 await check('campaign: personal campaign cannot route contacts to a different broker',async()=>{
  await save('a',{...base,scope:'personal',destination_broker_id:ids.b},privateA);
  const out=await capture('a',privateA);personalLead=out.lead_id;assert.equal(out.routing_result,'personal');
  const [lead]=await actor('a','select broker_id,origin_type from leads where id=$1',[personalLead]);assert.equal(lead.broker_id,ids.a);assert.equal(lead.origin_type,'personal');
  for(const who of ['b','manager','anon'])await denied(who,'select crm_capture_campaign_lead($1,$2,$3,$4)',[privateA,eventId(),'Fixture','83999990000']);
 });
 await check('campaign: attribution follows consented transfer; old campaign metadata does not',async()=>{
  const [request]=await actor('a',"select crm_request_lead_transfer($1,$2,'') id",[personalLead,ids.b]);
  await actor('b','select crm_accept_lead_transfer($1)',[request.id]);
  await denied('a','select * from crm_lead_attributions where lead_id=$1',[personalLead]);
  assert.equal((await actor('b','select * from crm_lead_attributions where lead_id=$1',[personalLead])).length,1);
  await denied('b','select * from crm_campaigns where id=$1',[privateA]);
 });
 await check('campaign: campaign names are snapshotted without rewriting prior attribution',async()=>{
  await save('manager',{...companyPayload,name:'New institutional fixture name'},company);
  assert.equal((await actor('b','select campaign_name from crm_lead_attributions where lead_id=$1',[companyLead]))[0].campaign_name,'Institucional revisada');
 });
 await check('campaign: forged provenance/routing and landing query strings rejected',async()=>{
  for(const details of [{verified:'true'},{broker_id:ids.b},{utm_source:12},{utm_term:'x'.repeat(257)},{utm_term:'line\nbreak'},{landing_path:'https://outside.invalid/'},{landing_path:'//outside.invalid'},{landing_path:'/page?token=fixture'}]) {
   await denied('a','select crm_capture_campaign_lead($1,$2,$3,$4,$5::jsonb)',[privateA,eventId(),'Fixture','83999990000',JSON.stringify(details)]);
  }
 });
 await check('campaign: missing attribution is explicit; equal phones do not merge private portfolios',async()=>{
  const a=await capture('a',privateA);const b=await capture('b',privateB);
  assert.notEqual(a.lead_id,b.lead_id);
  assert.deepEqual((await actor('a','select details from crm_lead_attributions where lead_id=$1',[a.lead_id]))[0].details,{});
  await denied('a','select * from leads where id=$1',[b.lead_id]);
 });
 await check('campaign: paused/draft/archived campaigns and invalid contacts reject capture',async()=>{
  for(const status of ['paused','draft','archived']) {
   await save('b',{...base,scope:'personal',status},privateB);
   await denied('b','select crm_capture_campaign_lead($1,$2,$3,$4)',[privateB,eventId(),'Fixture','83999990000']);
  }
  for(const [name,phone] of [['','83999990000'],['Fixture','123'],['x'.repeat(161),'83999990000']])await denied('a','select crm_capture_campaign_lead($1,$2,$3,$4)',[privateA,eventId(),name,phone]);
 });
 await check('campaign: inactive recipient, unrelated property and unknown payload fields denied on save',async()=>{
  await denied('manager','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify({...companyPayload,destination_broker_id:ids.disabled})]);
  await denied('a','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify({...base,scope:'personal',property_id:99999999})]);
  await denied('a','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify({...base,scope:'personal',api_token:'fixture'})]);
  await denied('disabled','select crm_save_campaign(null,$1::jsonb)',[JSON.stringify({...base,scope:'personal'})]);
 });
 await check('campaign: private attribution and receipt cannot be modified directly',async()=>{
  await denied('b',"update crm_lead_attributions set provenance='manual' where lead_id=$1 returning id",[companyLead]);
  await denied('a','select * from crm_private.campaign_receipts');
  for(const name of ['crm_campaigns','crm_lead_attributions'])assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+name])).rows[0].relrowsecurity,true);
 });
 await check('campaign: property reassignment is revalidated at capture time',async()=>{
  await db.query("insert into properties(id,title,slug,description,location,category,price,owner_id,broker_id,workflow_status,publish_on_site) overriding system value values(97001,'Campaign property fixture','campaign-property-fixture','Fixture','Fixture','casas','100000',$1,$1,'rascunho',false)",[ids.a]);
  const campaign=await save('a',{...base,scope:'personal',property_id:97001});
  await actor('manager','update properties set owner_id=$1,broker_id=$1 where id=97001 returning id',[ids.b]);
  await denied('a','select crm_capture_campaign_lead($1,$2,$3,$4)',[campaign,eventId(),'Fixture','83999990000']);
 });

}
