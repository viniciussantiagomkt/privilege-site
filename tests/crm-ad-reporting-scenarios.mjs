import assert from 'node:assert/strict';
export async function runAdReportingScenarios({db,actor,check,denied,ids}){
 const personal='88888888-8888-4888-8888-888888888881',company='88888888-8888-4888-8888-888888888882';
 await db.query("insert into crm_ad_accounts(id,owner_id,scope,provider,external_id,name,status) values($1,$3,'personal','meta','111','Private fixture','connected'),($2,$4,'company','google','1234567890','Company fixture','connected')",[personal,company,ids.a,ids.admin]);
 const claim=async id=>(await db.query('select crm_claim_ad_sync($1) result',[id])).rows[0].result;
 const report=(id=personal)=>({provider:id===personal?'meta':'google',accountId:id===personal?'111':'1234567890',currency:'BRL',timezone:'America/Sao_Paulo',campaigns:[{externalId:'77',name:'Live fixture',status:'ACTIVE',active:true}],daily:[{campaignId:'77',day:'2026-10-01',spendMicros:'12340000',impressions:'100',clicks:'5',conversions:id===personal?null:'1.5',actions:id===personal?[{type:'lead',value:'2'},{type:'other_lead',value:'2'}]:[]}]});
 const commit=async(id,lease,payload=report(id))=>db.query("select crm_commit_ad_report($1,$2,$3::jsonb,'2026-10-01','2026-10-02')",[id,lease,JSON.stringify(payload)]);
 const ready=async id=>db.query("update crm_ad_accounts set next_attempt_at=now()-interval '1 minute' where id=$1",[id]);
 await check('ads: personal/institutional visibility remains isolated across four profiles',async()=>{
  assert.equal((await actor('a','select id from crm_ad_accounts where id=$1',[personal])).length,1);
  for(const who of ['b','manager','admin','anon'])await denied(who,'select id from crm_ad_accounts where id=$1',[personal]);
  for(const who of ['manager','admin'])assert.equal((await actor(who,'select id from crm_ad_accounts where id=$1',[company])).length,1);
  await denied('a','select id from crm_ad_accounts where id=$1',[company]);
 });
 await check('ads: browser roles cannot write reports, claim jobs or read private state',async()=>{
  for(const who of ['anon','a','manager','admin']){
   await denied(who,'select crm_claim_ad_sync($1)',[personal]);
   await denied(who,'select crm_commit_ad_report($1,$2,$3::jsonb,current_date,current_date)',[personal,personal,JSON.stringify(report())]);
   await denied(who,"update crm_ad_accounts set status='connected' where id=$1 returning id",[personal]);
   await denied(who,'select * from crm_private.ad_sync_leases');
  }
  for(const name of ['crm_claim_ad_sync(uuid)','crm_commit_ad_report(uuid,uuid,jsonb,date,date)','crm_fail_ad_sync(uuid,uuid,text)'])assert.equal((await db.query("select has_function_privilege('service_role',$1,'EXECUTE') allowed",[name])).rows[0].allowed,true);
 });
 await check('ads: second claim skips active lease; atomic successful import observes due interval',async()=>{
  const first=await claim(personal);assert.ok(first.lease);assert.equal(await claim(personal),null);await commit(personal,first.lease);
  const r=(await actor('a',"select crm_ad_report($1,'2026-10-01','2026-10-02') result",[personal]))[0].result;
  assert.equal(r.campaigns[0].spend_micros,'12340000');assert.equal(r.complete_period,true);assert.equal(r.campaigns[0].platform_actions.length,2);
  assert.equal(await claim(personal),null);
  for(const who of ['b','manager','admin'])await denied(who,'select * from crm_ad_daily where account_id=$1',[personal]);
 });
 await check('ads: repeat does not add spend; correction and omitted zero rows replace previous observations',async()=>{
  for(let n=0;n<2;n++){await ready(personal);await commit(personal,(await claim(personal)).lease);}
  assert.equal((await db.query('select sum(spend_micros)::text spend from crm_ad_daily where account_id=$1',[personal])).rows[0].spend,'12340000');
  await ready(personal);const corrected=report();corrected.daily[0].spendMicros='10000000';await commit(personal,(await claim(personal)).lease,corrected);
  assert.equal((await db.query('select spend_micros::text spend from crm_ad_daily where account_id=$1',[personal])).rows[0].spend,'10000000');
  await ready(personal);const zero=report();zero.daily=[];await commit(personal,(await claim(personal)).lease,zero);
  assert.equal((await db.query('select count(*)::int n from crm_ad_daily where account_id=$1',[personal])).rows[0].n,0);
 });
 await check('ads: invalid reports roll back the whole replacement without losing prior money',async()=>{
  await ready(personal);await commit(personal,(await claim(personal)).lease);await ready(personal);const l=(await claim(personal)).lease;
  const variants=[{...report(),accountId:'222'},{...report(),currency:'USD'},{...report(),daily:[{...report().daily[0],day:'2026-10-03'}]},{...report(),daily:[{...report().daily[0],campaignId:'99'}]},{...report(),daily:[report().daily[0],report().daily[0]]},{...report(),daily:[{...report().daily[0],conversions:'2'}]}];
  for(const r of variants)await assert.rejects(commit(personal,l,r));
  assert.equal((await db.query('select sum(spend_micros)::text spend from crm_ad_daily where account_id=$1',[personal])).rows[0].spend,'12340000');await commit(personal,l);
 });
 await check('ads: expired and superseded leases cannot overwrite a later run',async()=>{
  await ready(personal);const old=(await claim(personal)).lease;await db.query("update crm_private.ad_sync_leases set lease_until=now()-interval '1 minute' where account_id=$1",[personal]);
  await assert.rejects(commit(personal,old));const next=(await claim(personal)).lease;await assert.rejects(commit(personal,old));await commit(personal,next);
 });
 await check('ads: transient errors back off; auth requires reconnect; successful history is retained',async()=>{
  const prior=(await db.query('select last_success_at from crm_ad_accounts where id=$1',[personal])).rows[0].last_success_at;
  await ready(personal);let l=(await claim(personal)).lease;await db.query("select crm_fail_ad_sync($1,$2,'rate_limit')",[personal,l]);assert.equal(await claim(personal),null);
  const a=(await db.query('select * from crm_ad_accounts where id=$1',[personal])).rows[0];assert.equal(a.status,'error');assert.equal(+new Date(a.last_success_at),+new Date(prior));
  await ready(personal);l=(await claim(personal)).lease;await db.query("select crm_fail_ad_sync($1,$2,'auth')",[personal,l]);await ready(personal);assert.equal(await claim(personal),null);
  await db.query("update crm_ad_accounts set status='connected' where id=$1",[personal]);
 });
 await check('ads: suspension is authorized, invalidates active lease and preserves history',async()=>{
  const l=(await claim(personal)).lease;for(const who of ['manager','b'])await denied(who,'select crm_disconnect_ad_account($1)',[personal]);
  await actor('a','select crm_disconnect_ad_account($1)',[personal]);await assert.rejects(commit(personal,l));assert.equal(await claim(personal),null);
  assert.equal((await actor('a','select * from crm_ad_daily where account_id=$1',[personal])).length,1);
 });
 await check('ads: incomplete coverage explicit; dates and cross-account/anonymous reports denied',async()=>{
  assert.equal((await actor('a',"select crm_ad_report($1,'2026-09-01','2026-10-02') result",[personal]))[0].result.complete_period,false);
  for(const who of ['b','anon'])await denied(who,"select crm_ad_report($1,'2026-10-01','2026-10-02')",[personal]);
  await denied('a',"select crm_ad_report($1,'2026-10-02','2026-10-01')",[personal]);
 });
 await check('ads: institutional Google platform conversions remain distinct from CRM sales',async()=>{
  await commit(company,(await claim(company)).lease,report(company));
  const r=(await actor('manager',"select crm_ad_report($1,'2026-10-01','2026-10-02') result",[company]))[0].result;
  assert.equal(Number(r.campaigns[0].platform_conversions),1.5);assert.equal(r.account.currency,'BRL');await denied('a','select * from crm_ad_campaigns where account_id=$1',[company]);
 });
 await check('ads: inactive owner loses access and cannot keep polling personal account',async()=>{
  await db.query("update crm_ad_accounts set status='connected',next_attempt_at=now()-interval '1 minute' where id=$1",[personal]);await db.query('update brokers set active=false where id=$1',[ids.a]);
  try{assert.equal(await claim(personal),null);await denied('a','select * from crm_ad_accounts where id=$1',[personal]);}finally{await db.query('update brokers set active=true where id=$1',[ids.a]);}
 });
}
