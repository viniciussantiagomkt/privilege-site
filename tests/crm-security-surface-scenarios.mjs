import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// PGlite roles/claims only. Never loads credentials or calls a remote service.
export async function runSecuritySurfaceScenarios({ db, actor, check, ids }) {
  const views = ["admin_dashboard_metrics", "property_admin_metrics", "lead_origin_metrics"];
  for (const view of views) {
    await check("surface: anonymous SELECT denied for " + view, async () => {
      await assert.rejects(actor("anon", "select * from public." + view), e => e.code === "42501");
      assert.equal((await db.query(
        "select exists(select 1 from aclexplode(coalesce(relacl,acldefault('r',relowner))) a where grantee=0 and privilege_type='SELECT') allowed from pg_class where oid=$1::regclass",
        ["public." + view],
      )).rows[0].allowed, false);
    });
  }
  for (const who of ["a", "b", "manager", "admin"]) {
    await check("surface: " + who + " metrics retain grants and underlying RLS", async () => {
      const [counts] = await actor(who, "select * from admin_dashboard_metrics");
      const [visible] = await actor(who, "select count(*)::int n from leads");
      assert.equal(Number(counts.total_leads), visible.n);
      const properties = new Set((await actor(who, "select id from properties")).map(p => p.id));
      assert.ok((await actor(who, "select id from property_admin_metrics")).every(p => properties.has(p.id)));
      const origins = await actor(who, "select * from lead_origin_metrics");
      assert.equal(origins.reduce((n, row) => n + Number(row.total), 0), visible.n);
    });
  }
  await check("surface: public property_metrics remains callable and RLS scoped", async () => {
    assert.equal((await db.query("select has_table_privilege('anon','public.property_metrics','SELECT') allowed")).rows[0].allowed, true);
    const visible = new Set((await actor("anon", "select id from properties")).map(p => p.id));
    assert.ok((await actor("anon", "select id from property_metrics")).every(p => visible.has(p.id)));
  });
  const privileged = [
    "set_user_role(text,text)", "sync_property_media_arrays(bigint)",
    "crm_save_quick_client(bigint,bigint,uuid,jsonb)", "crm_archive_client(bigint)",
    "crm_client_timeline(bigint,integer)", "crm_record_client_contact(bigint,uuid)",
  ];
  for (const signature of privileged) {
    await check("surface: privileged RPC ACL " + signature, async () => {
      const [acl] = (await db.query(
        "select has_function_privilege('anon',$1,'EXECUTE') anonymous,has_function_privilege('authenticated',$1,'EXECUTE') member, exists(select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid=$1::regprocedure and grantee=0 and privilege_type='EXECUTE') world",
        ["public." + signature],
      )).rows;
      assert.deepEqual(acl, { anonymous: false, member: true, world: false });
    });
  }
  for (const name of ["crm_audit_change", "crm_followup_timeline", "crm_lead_timeline", "crm_set_property_code", "handle_new_auth_user"]) {
    await check("surface: trigger is not an anonymous RPC " + name, async () => {
      assert.equal((await db.query("select has_function_privilege('anon',$1,'EXECUTE') allowed", ["public." + name + "()"])).rows[0].allowed, false);
    });
  }
  await check("surface: authorized admin role management remains functional", async () => {
    try {
      await actor("admin", "select set_user_role('a@example.invalid','corretor')");
      assert.equal((await actor("a", "select current_user_role() role"))[0].role, "corretor");
    } finally {
      await actor("admin", "select set_user_role('a@example.invalid','broker')");
    }
  });
  const payload = {
    name: "Security surface fixture", phone: "(83) 90000-4011",
    contact_type: "ambos", interest_profile: { purpose: "compra" },
  };
  const save = (who, id, revision, body, key = randomUUID()) => actor(
    who, "select crm_save_quick_client($1,$2,$3,$4::jsonb) data",
    [id, revision, key, JSON.stringify(body)],
  );
  const a = (await save("a", null, null, payload))[0].data;
  const b = (await save("b", null, null, { ...payload, phone: "(83) 90000-4012" }))[0].data;
  // Exact authorization code prevents validation errors from making this pass.
  for (const [who, target, owner] of [
    ["a", b, ids.b], ["b", a, ids.a], ["manager", a, ids.a], ["admin", a, ids.a],
  ]) {
    await check("surface: " + who + " foreign client valid payload and direct RLS rejected", async () => {
      assert.equal((await actor(who, "select id from clients where id=$1", [target.id])).length, 0);
      assert.equal((await actor(who, "update clients set name='Forbidden' where id=$1 returning id", [target.id])).length, 0);
      await assert.rejects(save(who, target.id, 0, payload), e => e.code === "42501");
      await assert.rejects(actor(who, "select crm_client_timeline($1,0)", [target.id]), e => e.code === "42501");
      await assert.rejects(actor(who, "select crm_record_client_contact($1,$2)", [target.id, randomUUID()]), e => e.code === "42501");
      await assert.rejects(actor(who, "select crm_archive_client($1)", [target.id]), e => e.code === "42501");
      await assert.rejects(actor(who,
        "insert into clients(name,phone,broker_id) values('Forbidden fixture','83900004019',$1) returning id", [owner]),
      e => e.code === "42501");
      assert.equal((await db.query("select name from clients where id=$1", [target.id])).rows[0].name, payload.name);
    });
  }
  await check("surface: own write conflict and idempotency are preserved", async () => {
    const edited = { ...payload, name: "Security surface edited" };
    const key = randomUUID();
    const updated = (await save("a", a.id, a.revision, edited, key))[0].data;
    assert.deepEqual((await save("a", a.id, a.revision, edited, key))[0].data, updated);
    await assert.rejects(save("a", a.id, a.revision, payload), e => e.code === "40001");
    assert.equal((await db.query("select broker_id from clients where id=$1", [a.id])).rows[0].broker_id, ids.a);
  });
  await check("surface: media sync keeps owner authorization", async () => {
    await actor("a", "select sync_property_media_arrays(9002)");
    await assert.rejects(actor("b", "select sync_property_media_arrays(9002)"), e => e.code === "42501");
    await assert.rejects(actor("anon", "select sync_property_media_arrays(9002)"), e => e.code === "42501");
  });
  for (const state of ["invalid", "revoked", "expired"]) {
    await check("surface: public presentation " + state + " reveals nothing and creates no event", async () => {
      let token = randomUUID();
      if (state !== "invalid") {
        const [share] = await actor("a",
          "insert into marketing_shares(property_ids,title,expires_at) values(array[9002::bigint],'Security presentation fixture',now()+$1::interval) returning id,token",
          [state === "expired" ? "200 milliseconds" : "1 day"]);
        token = share.token;
        if (state === "revoked") await actor("a", "update marketing_shares set revoked_at=now() where id=$1", [share.id]);
        else await new Promise(resolve => setTimeout(resolve, 300));
      }
      const before = (await db.query("select count(*)::int n from marketing_share_events")).rows[0].n;
      assert.equal((await actor("anon", "select crm_public_presentation($1) data", [token]))[0].data, null);
      assert.equal((await actor("anon", "select crm_record_presentation_open($1,$2,true) allowed", [token, randomUUID()]))[0].allowed, false);
      assert.equal((await db.query("select count(*)::int n from marketing_share_events")).rows[0].n, before);
    });
  }
  await check("surface: public presentation capability and consented idempotent opens remain valid", async () => {
    const [share] = await actor("a", "insert into marketing_shares(property_ids,title,expires_at) values(array[9002::bigint],'Valid security fixture',now()+interval '1 day') returning id,token");
    const dto = (await actor("anon", "select crm_public_presentation($1) data", [share.token]))[0].data;
    assert.equal(dto.title, "Valid security fixture");
    assert.equal(dto.properties[0].owner_id, undefined);
    const nonce = randomUUID();
    assert.equal((await actor("anon", "select crm_record_presentation_open($1,$2,false) allowed", [share.token, nonce]))[0].allowed, false);
    for (let retry = 0; retry < 2; retry++) assert.equal((await actor("anon", "select crm_record_presentation_open($1,$2,true) allowed", [share.token, nonce]))[0].allowed, true);
    assert.equal((await db.query("select count(*)::int n from marketing_share_events where share_id=$1 and nonce=$2", [share.id, nonce])).rows[0].n, 1);
  });
}
