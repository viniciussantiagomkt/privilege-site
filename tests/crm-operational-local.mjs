/** Isolated PostgreSQL/WASM tests. Never connects to staging or Auth HTTP. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { PGlite } = await import(
  process.env.CRM_PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const results = [];
// Git checkouts on Windows can use CRLF inside dollar-quoted function bodies.
// Replay the canonical LF SQL so PostgreSQL fingerprints stay platform-independent.
const readSql = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  manager: "22222222-2222-4222-8222-222222222222",
  a: "33333333-3333-4333-8333-333333333333",
  b: "44444444-4444-4444-8444-444444444444",
  disabled: "55555555-5555-4555-8555-555555555555",
};
async function actor(who, sql, params = []) {
  await db.exec(
    "begin;set local role " + (who === "anon" ? "anon" : "authenticated"),
  );
  try {
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [
        ids[who] || "",
        JSON.stringify({
          sub: ids[who] || null,
          role: who === "anon" ? "anon" : "authenticated",
        }),
      ],
    );
    await db.query(
      "select set_config('crm.test_storage_operation','object.get_authenticated',true)",
    );
    const out = await db.query(sql, params);
    await db.exec("commit");
    return out.rows;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, result: "APROVADO" });
  } catch (e) {
    results.push({ name, result: "REPROVADO", error: e.message });
    console.error(name, e.message);
  }
}
async function denied(who, sql, params = []) {
  try {
    const rows = await actor(who, sql, params);
    assert.equal(rows.length, 0, "operation unexpectedly returned data");
  } catch (e) {
    if (e.code === "42501" || e.code === "23514" || e.code === "22023") return;
    throw e;
  }
}
let migrations = [];
try {
  await db.exec(readSql("tests/fixtures/crm-schema-20261019.sql"));
  await check(
    "schema adapter: preflight baseline has no function/policy drift",
    async () => {
      const out = await db.exec(
        readSql("tests/crm-operational-preflight-readonly.sql"),
      );
      const drift = out.filter((r) =>
        r.fields?.some((f) => f.name === "expected_md5"),
      );
      assert.equal(drift.length, 2);
      assert.deepEqual(
        drift.flatMap((r) => r.rows),
        [],
      );
    },
  );
  migrations = readdirSync("supabase/migrations")
    .filter((f) => f.startsWith("20261019") || f === "20261028143926_crm_marketing_delivery_notifications.sql" || f.endsWith("_crm_optional_lead_reasons.sql"))
    .sort();
  for (const name of migrations)
    await db.exec(readSql("supabase/migrations/" + name));
  await db.exec(
    "insert into organizations(id,name) values('00000000-0000-4000-8000-000000000001','Local fictitious organization')",
  );
  for (const [name, id] of Object.entries(ids)) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [
      id,
      name + "@example.invalid",
    ]);
    await db.query(
      "insert into user_roles(id,role,disabled_at) values($1,$2,$3)",
      [
        id,
        ["admin", "manager"].includes(name) ? name : "broker",
        name === "disabled" ? new Date().toISOString() : null,
      ],
    );
    if (!["admin", "manager"].includes(name))
      await db.query("insert into brokers(id,name) values($1,$2)", [
        id,
        "Fictitious " + name,
      ]);
  }
  for (const [who, id] of [
    ["a", 10],
    ["b", 20],
    ["admin", 30],
    ["manager", 40],
  ])
    await db.query("insert into clients(id,name,broker_id) values($1,$2,$3)", [
      id,
      "Private fixture " + who,
      ids[who],
    ]);
  for (const [who, id] of [
    ["a", 100],
    ["b", 200],
  ])
    await db.query(
      "insert into properties(id,title,slug,description,location,category,price,owner_id,broker_id,workflow_status,publish_on_site) overriding system value values($1,'Fictitious property',$2,'Fixture only','Fixture','casas','100000',$3,$3,'rascunho',false)",
      [id, "fixture-" + id, ids[who]],
    );
  for (const [id, who, origin] of [
    [1000, "a", "personal"],
    [2000, "b", "personal"],
    [3000, null, "company"],
    [4000, "b", "company"],
  ])
    await db.query(
      "insert into leads(id,name,broker_id,origin_type) values($1,$2,$3,$4)",
      [id, "Private lead fixture " + id, ids[who] || null, origin],
    );
  await db.query(
    "insert into tasks(title,broker_id,lead_id,client_id,due_at) values('Private task',$1,2000,20,now())",
    [ids.b],
  );
  await db.query(
    "insert into visits(broker_id,client_id,property_id,scheduled_at) values($1,20,200,now())",
    [ids.b],
  );
  await db.query(
    "insert into proposals(broker_id,client_id,property_id,value) values($1,20,200,100000)",
    [ids.b],
  );
  for (const who of ["admin", "manager", "a", "b"]) {
    await check(who + ": effective role", async () =>
      assert.equal(
        (await actor(who, "select current_user_role() role"))[0].role,
        ["a", "b"].includes(who) ? "broker" : who,
      ),
    );
    await check(who + ": private leads and institutional queue", async () =>
      assert.deepEqual(
        (await actor(who, "select id from leads order by id")).map((r) => r.id),
        who === "a" ? [1000] : who === "b" ? [2000, 4000] : [3000],
      ),
    );
    await check(who + ": private client isolation", async () =>
      assert.deepEqual(
        (await actor(who, "select id from clients order by id")).map(
          (r) => r.id,
        ),
        [who === "a" ? 10 : who === "b" ? 20 : who === "admin" ? 30 : 40],
      ),
    );
    await check(who + ": create own client exact form payload", async () =>
      assert.equal(
        (
          await actor(
            who,
            "insert into clients(name,broker_id,contact_type) values('New fictitious client',$1,'cliente') returning id",
            [ids[who]],
          )
        ).length,
        1,
      ),
    );
    await check(who + ": deny forged client owner", () =>
      denied(
        who,
        "insert into clients(name,broker_id) values('Forged',$1) returning id",
        [ids[who === "b" ? "a" : "b"]],
      ),
    );
    await check(who + ": cannot read foreign lead activities", async () =>
      assert.equal(
        (
          await actor(who, "select * from lead_activities where lead_id=$1", [
            who === "b" ? 1000 : 2000,
          ])
        ).length,
        0,
      ),
    );
    await check(who + ": cannot update foreign lead", () =>
      denied(who, "update leads set notes='forged' where id=$1 returning id", [
        who === "b" ? 1000 : 2000,
      ]),
    );
    await check(who + ": cannot delete foreign lead", () =>
      denied(who, "delete from leads where id=$1 returning id", [
        who === "b" ? 1000 : 2000,
      ]),
    );
    await check(
      who + ": cannot invoke privileged contact RPC for foreign lead",
      () =>
        denied(who, "select crm_record_contact($1)", [
          who === "b" ? 1000 : 2000,
        ]),
    );
    await check(who + ": no foreign task/visit/proposal", async () => {
      if (who !== "b")
        for (const t of ["tasks", "visits", "proposals"])
          assert.equal((await actor(who, "select * from " + t)).length, 0);
    });
  }
  await check("disabled: no authorized role or data", async () => {
    assert.equal(
      (await actor("disabled", "select current_user_role() role"))[0].role,
      "visitor",
    );
    assert.equal((await actor("disabled", "select * from leads")).length, 0);
  });
  await check("manager: cannot distribute personal lead by guessed ID", () =>
    denied("manager", "select crm_assign_lead(1000,$1,'forged transfer')", [
      ids.b,
    ]),
  );
  await check("manager: assign queue, then loses all PII access", async () => {
    await actor(
      "manager",
      "select crm_assign_lead(3000,$1,'Fictitious assignment')",
      [ids.a],
    );
    assert.equal(
      (await actor("manager", "select * from leads where id=3000")).length,
      0,
    );
    assert.equal(
      (await actor("a", "select * from leads where id=3000")).length,
      1,
    );
  });
  await check("broker: direct reassignment denied", () =>
    denied("a", "update leads set broker_id=$1 where id=1000 returning id", [
      ids.b,
    ]),
  );
  await check(
    "broker: consent transfer, acceptance and retry are atomic/idempotent",
    async () => {
      const r = (
        await actor(
          "a",
          "select crm_request_lead_transfer(1000,$1,'Fictitious consent') id",
          [ids.b],
        )
      )[0];
      await actor("b", "select crm_accept_lead_transfer($1)", [r.id]);
      await actor("b", "select crm_accept_lead_transfer($1)", [r.id]);
      assert.equal(
        (await actor("a", "select * from leads where id=1000")).length,
        0,
      );
      assert.equal(
        (await actor("b", "select * from leads where id=1000")).length,
        1,
      );
      assert.equal(
        (await db.query("select * from lead_assignments where lead_id=1000"))
          .rows.length,
        1,
      );
      assert.equal(
        (await actor("b", "select * from clients where id=10")).length,
        0,
      );
    },
  );
  await check(
    "property: both brokers eligible despite owning properties",
    async () =>
      assert.deepEqual(
        (await actor("manager", "select id from crm_eligible_brokers()"))
          .map((r) => r.id)
          .sort(),
        [ids.a, ids.b].sort(),
      ),
  );
  await check(
    "property: submit persists notifications for admin and manager, no duplicate updates",
    async () => {
      await actor(
        "a",
        "update properties set workflow_status='pendente' where id=100 returning id",
      );
      await actor(
        "a",
        "update properties set title='Fictitious edit' where id=100 returning id",
      );
      for (const who of ["admin", "manager"]) {
        const n = await actor(
          who,
          "select * from notifications where type='property_review'",
        );
        assert.equal(n.length, 1);
        assert.equal(n[0].read, false);
        assert.equal(n[0].target_path, "/admin/imoveis?imovel=100");
      }
    },
  );
  await check("property: broker cannot approve own publication", () =>
    denied(
      "a",
      "update properties set workflow_status='aprovado',approved_by=$1,approved_at=now() where id=100 returning id",
      [ids.a],
    ),
  );
  for (const who of ["manager", "admin"])
    await check("property: " + who + " approves pending property", async () =>
      assert.equal(
        (
          await actor(
            who,
            "update properties set workflow_status='aprovado',approved_by=$1,approved_at=now(),publish_on_site=true where id=100 returning id",
            [ids[who]],
          )
        ).length,
        1,
      ),
    );
  await check(
    "notifications: foreign reads and raw forged writes denied",
    async () => {
      assert.equal(
        (
          await actor(
            "a",
            "select * from notifications where type='property_review'",
          )
        ).length,
        0,
      );
      await denied(
        "a",
        "insert into notifications(user_id,title) values($1,'forged') returning id",
        [ids.manager],
      );
    },
  );
  let sale;
  await check(
    "sale: A registers own commercial sale with recorded authorship",
    async () => {
      sale = (
        await actor(
          "a",
          "insert into sales(broker_id,client_id,property_id,value,date) values($1,10,100,100000,current_date) returning *",
          [ids.a],
        )
      )[0];
      assert.equal(sale.recorded_by, ids.a);
    },
  );
  await check(
    "sale: reject forged professional, foreign client and foreign property",
    async () => {
      for (const params of [
        [ids.b, 10, 100],
        [ids.a, 20, 100],
        [ids.a, 10, 200],
      ])
        await denied(
          "a",
          "insert into sales(broker_id,client_id,property_id,value) values($1,$2,$3,100) returning id",
          params,
        );
    },
  );
  await check(
    "sale: B/admin/manager cannot read or edit A private sale",
    async () => {
      for (const who of ["b", "admin", "manager"]) {
        assert.equal(
          (await actor(who, "select * from sales where id=$1", [sale.id]))
            .length,
          0,
        );
        await denied(who, "update sales set value=1 where id=$1 returning id", [
          sale.id,
        ]);
      }
    },
  );
  await check(
    "sale: separate financial DTO has no client/property fields",
    async () => {
      const rows = await actor(
        "manager",
        "select * from crm_sale_review_queue()",
      );
      assert.equal(rows.length, 1);
      assert.deepEqual(
        Object.keys(rows[0]).sort(),
        [
          "sale_id",
          "broker_id",
          "value",
          "sale_date",
          "revision",
          "status",
        ].sort(),
      );
    },
  );
  await check(
    "sale: broker cannot self-confirm; manager confirms revision",
    async () => {
      await denied(
        "a",
        "select crm_review_sale($1,1,'confirmed','Fictitious review')",
        [sale.id],
      );
      await actor(
        "manager",
        "select crm_review_sale($1,1,'confirmed','Fictitious review')",
        [sale.id],
      );
      assert.equal(
        (
          await actor(
            "a",
            "select status from sale_confirmations where sale_id=$1",
            [sale.id],
          )
        )[0].status,
        "confirmed",
      );
    },
  );
  await check("sale: edit invalidates financial confirmation", async () => {
    await actor("a", "update sales set value=120000 where id=$1 returning id", [
      sale.id,
    ]);
    assert.equal(
      (
        await actor(
          "a",
          "select status from sale_confirmations where sale_id=$1",
          [sale.id],
        )
      )[0].status,
      "pending",
    );
    await assert.rejects(
      () =>
        actor(
          "manager",
          "select crm_review_sale($1,1,'confirmed','stale revision')",
          [sale.id],
        ),
      (e) => e.code === "40001",
    );
  });
  await check(
    "aggregates: management totals without PII, broker denied",
    async () => {
      const m = (
        await actor("manager", "select crm_management_metrics(180) dto")
      )[0].dto;
      assert.equal(m.leads, 4);
      assert.equal(m.volume, 120000);
      assert(!JSON.stringify(m).includes("Private"));
      await denied("a", "select crm_management_metrics(180)");
      await denied("anon", "select crm_management_metrics(180)");
    },
  );
  const asset = (
    await actor(
      "manager",
      "insert into marketing_assets(title,scope,audience) values('Fictitious marketing','institutional','team') returning id",
    )
  )[0].id;
  const path = ids.manager + "/66666666-6666-4666-8666-666666666666.pdf";
  const version = (
    await actor(
      "manager",
      "insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values($1,$2,'application/pdf',100,$3,'fictitious.pdf') returning id",
      [asset, path, "a".repeat(64)],
    )
  )[0].id;
  await actor(
    "manager",
    "update marketing_assets set current_version_id=$1 where id=$2 returning id",
    [version, asset],
  );
  await actor(
    "manager",
    "insert into asset_relations(asset_id,property_id) values($1,100) returning id",
    [asset],
  );
  await db.query(
    "insert into storage.objects(bucket_id,name) values('crm-marketing',$1)",
    [path],
  );
  await check(
    "marketing: pending team material invisible to brokers and anon Storage",
    async () => {
      for (const who of ["a", "b"])
        assert.equal(
          (
            await actor(who, "select * from marketing_assets where id=$1", [
              asset,
            ])
          ).length,
          0,
        );
      assert.equal(
        (
          await actor("anon", "select * from storage.objects where name=$1", [
            path,
          ])
        ).length,
        0,
      );
    },
  );
  await check(
    "marketing: approved team material visible to A and B with current Storage bytes",
    async () => {
      await actor(
        "manager",
        "update marketing_assets set status='aprovado',visibility='public' where id=$1 returning id",
        [asset],
      );
      for (const who of ["a", "b", "anon"])
        assert.equal(
          (
            await actor(who, "select * from storage.objects where name=$1", [
              path,
            ])
          ).length,
          1,
        );
      for (const who of ["a", "b"])
        assert.equal(
          (
            await actor(who, "select * from marketing_assets where id=$1", [
              asset,
            ])
          ).length,
          1,
        );
    },
  );
  let share;
  await check(
    "presentation: approved linked material and own lead; anonymous sanitized DTO",
    async () => {
      share = (
        await actor(
          "a",
          "insert into marketing_shares(title,lead_id,property_ids,asset_ids,expires_at) values('Fictitious presentation',3000,array[100]::bigint[],array[$1]::bigint[],now()+interval '1 day') returning *",
          [asset],
        )
      )[0];
      const dto = (
        await actor("anon", "select crm_public_presentation($1) dto", [
          share.token,
        ])
      )[0].dto;
      assert.equal(dto.assets.length, 1);
      assert(!("lead_id" in dto));
    },
  );
  await check(
    "presentation: foreign share and confirmation RPC denied; send confirmation idempotent",
    async () => {
      for (const who of ["b", "manager", "admin"]) {
        assert.equal(
          (
            await actor(who, "select * from marketing_shares where id=$1", [
              share.id,
            ])
          ).length,
          0,
        );
        await denied(who, "select crm_confirm_presentation_share($1)", [
          share.id,
        ]);
      }
      await actor("a", "select crm_confirm_presentation_share($1)", [share.id]);
      await actor("a", "select crm_confirm_presentation_share($1)", [share.id]);
      assert.equal(
        (
          await db.query(
            "select * from crm_event_log where idempotency_key=$1",
            ["share-confirmed:" + share.id],
          )
        ).rows.length,
        1,
      );
    },
  );
  await check(
    "presentation: revocation removes anonymous access; cannot un-revoke",
    async () => {
      await actor(
        "a",
        "update marketing_shares set revoked_at=now() where id=$1 returning id",
        [share.id],
      );
      assert.equal(
        (
          await actor("anon", "select crm_public_presentation($1) dto", [
            share.token,
          ])
        )[0].dto,
        null,
      );
      await denied(
        "a",
        "update marketing_shares set revoked_at=null where id=$1 returning id",
        [share.id],
      );
    },
  );
  await check(
    "marketing: audience change requires reapproval; selected recipient isolated",
    async () => {
      await actor(
        "manager",
        "select crm_set_asset_audience($1,'selected',array[$2]::uuid[])",
        [asset, ids.a],
      );
      assert.equal(
        (
          await actor("a", "select * from marketing_assets where id=$1", [
            asset,
          ])
        ).length,
        0,
      );
      await actor(
        "manager",
        "update marketing_assets set status='aprovado' where id=$1 returning id",
        [asset],
      );
      assert.equal(
        (
          await actor("a", "select * from marketing_assets where id=$1", [
            asset,
          ])
        ).length,
        1,
      );
      assert.equal(
        (
          await actor("b", "select * from marketing_assets where id=$1", [
            asset,
          ])
        ).length,
        0,
      );
      assert.equal(
        (
          await actor("anon", "select * from storage.objects where name=$1", [
            path,
          ])
        ).length,
        0,
      );
      await denied(
        "a",
        "update marketing_assets set audience='team' where id=$1 returning id",
        [asset],
      );
    },
  );
  await check(
    "archive: own client receipt, row disappears and no hard delete",
    async () => {
      assert.equal(
        (await actor("a", "select crm_archive_client(10) ok"))[0].ok,
        true,
      );
      assert.equal(
        (await actor("a", "select * from clients where id=10")).length,
        0,
      );
      await denied("b", "delete from clients where id=20 returning id");
    },
  );
  await check(
    "privileges: anon and authenticated cannot TRUNCATE private portfolios",
    async () => {
      for (const who of ["anon", "a", "manager", "admin"])
        await denied(who, "truncate table clients");
    },
  );
  await check(
    "broker B: own lead/client/task/visit/proposal/sale payloads persist",
    async () => {
      assert.equal(
        (
          await actor(
            "b",
            "insert into leads(name,broker_id,origin_type) values('Fictitious B new lead',$1,'personal') returning id",
            [ids.b],
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await actor(
            "b",
            "insert into tasks(title,broker_id,client_id,due_at) values('Fictitious B task',$1,20,now()) returning id",
            [ids.b],
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await actor(
            "b",
            "insert into visits(broker_id,client_id,property_id,scheduled_at) values($1,20,200,now()) returning id",
            [ids.b],
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await actor(
            "b",
            "insert into proposals(broker_id,client_id,property_id,value) values($1,20,200,200) returning id",
            [ids.b],
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await actor(
            "b",
            "insert into sales(broker_id,client_id,property_id,value) values($1,20,200,200) returning id",
            [ids.b],
          )
        ).length,
        1,
      );
    },
  );
  await check(
    "A against B and B against A: private clients cannot be patched or deleted",
    async () => {
      for (const [who, target] of [
        ["a", 20],
        ["b", 10],
      ]) {
        await denied(
          who,
          "update clients set notes='forged' where id=$1 returning id",
          [target],
        );
        await denied(who, "delete from clients where id=$1 returning id", [
          target,
        ]);
      }
    },
  );
  await check(
    "archive and restore: ownership and history preserved",
    async () => {
      await actor("a", "select crm_restore_client(10)");
      assert.equal(
        (await actor("a", "select * from clients where id=10")).length,
        1,
      );
      await actor("a", "select crm_archive_lead(3000)");
      assert.equal(
        (await actor("a", "select * from leads where id=3000")).length,
        0,
      );
      await denied("b", "select crm_restore_lead(3000)");
      await actor("a", "select crm_restore_lead(3000)");
      assert.equal(
        (await actor("a", "select * from leads where id=3000")).length,
        1,
      );
    },
  );
  await check(
    "disabled disposable identity: live disable with same claims denies access, restore recovers",
    async () => {
      await db.query("update user_roles set disabled_at=null where id=$1", [
        ids.disabled,
      ]);
      assert.equal(
        (await actor("disabled", "select current_user_role() role"))[0].role,
        "broker",
      );
      await db.query("update user_roles set disabled_at=now() where id=$1", [
        ids.disabled,
      ]);
      assert.equal(
        (await actor("disabled", "select current_user_role() role"))[0].role,
        "visitor",
      );
      await denied(
        "disabled",
        "insert into clients(name,broker_id) values('forged',$1) returning id",
        [ids.disabled],
      );
      await db.query("update user_roles set disabled_at=null where id=$1", [
        ids.disabled,
      ]);
      assert.equal(
        (await actor("disabled", "select current_user_role() role"))[0].role,
        "broker",
      );
      await db.query("update user_roles set disabled_at=now() where id=$1", [
        ids.disabled,
      ]);
    },
  );
  await check(
    "marketing: personal owner intent enables management review without automatic approval",
    async () => {
      const row = (
        await actor(
          "a",
          "insert into marketing_assets(title) values('Fictitious personal') returning id",
        )
      )[0];
      assert.equal(
        (
          await actor("manager", "select * from marketing_assets where id=$1", [
            row.id,
          ])
        ).length,
        0,
      );
      await denied(
        "manager",
        "select crm_set_asset_audience($1,'team','{}'::uuid[])",
        [row.id],
      );
      await actor(
        "a",
        "select crm_set_asset_audience($1,'team','{}'::uuid[])",
        [row.id],
      );
      assert.equal(
        (
          await actor(
            "manager",
            "select status from marketing_assets where id=$1",
            [row.id],
          )
        )[0].status,
        "pendente",
      );
      assert.equal(
        (
          await actor("b", "select * from marketing_assets where id=$1", [
            row.id,
          ])
        ).length,
        0,
      );
    },
  );
  await check(
    "marketing: new current version requires review; recipient reads only current version",
    async () => {
      const path2 = ids.manager + "/77777777-7777-4777-8777-777777777777.pdf";
      const v2 = (
        await actor(
          "manager",
          "insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values($1,$2,'application/pdf',100,$3,'fictitious-v2.pdf') returning id",
          [asset, path2, "b".repeat(64)],
        )
      )[0].id;
      await actor(
        "manager",
        "update marketing_assets set current_version_id=$1 where id=$2 returning id",
        [v2, asset],
      );
      assert.equal(
        (await actor("a", "select * from asset_versions where id=$1", [v2]))
          .length,
        0,
      );
      await actor(
        "manager",
        "update marketing_assets set status='aprovado' where id=$1 returning id",
        [asset],
      );
      assert.equal(
        (await actor("a", "select * from asset_versions where id=$1", [v2]))
          .length,
        1,
      );
      assert.equal(
        (
          await actor("a", "select * from asset_versions where id=$1", [
            version,
          ])
        ).length,
        0,
      );
    },
  );
  await check(
    "presentation: expired link cannot be created and elapsed link loses access",
    async () => {
      await denied(
        "a",
        "insert into marketing_shares(title,property_ids,expires_at) values('Expired attempt',array[100]::bigint[],now()-interval '1 second') returning id",
      );
      const link = (
        await actor(
          "a",
          "insert into marketing_shares(title,property_ids,expires_at) values('Fictitious expiry',array[100]::bigint[],now()+interval '10 milliseconds') returning token",
        )
      )[0];
      // Allow the short-lived local fixture link to expire naturally.
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(
        (
          await actor("anon", "select crm_public_presentation($1) dto", [
            link.token,
          ])
        )[0].dto,
        null,
      );
    },
  );
  await check(
    "new privileged RPCs: anonymous execute revoked and search_path fixed",
    async () => {
      const names = [
        "crm_management_metrics",
        "crm_sale_review_queue",
        "crm_review_sale",
        "crm_eligible_brokers",
        "crm_request_lead_transfer",
        "crm_accept_lead_transfer",
        "crm_archive_lead",
        "crm_archive_client",
        "crm_restore_lead",
        "crm_restore_client",
        "crm_set_asset_audience",
        "crm_transfer_candidates",
        "crm_marketing_recipients",
        "crm_submit_asset_review",
        "crm_unread_notification_count",
      ];
      const found = (
        await db.query(
          "select p.proname,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1::text[])",
          [names],
        )
      ).rows;
      assert.equal(found.length, names.length);
      for (const f of found) {
        assert.equal(f.anon_exec, false, f.proname);
        assert(f.proconfig.includes("search_path=public"), f.proname);
      }
    },
  );
  // Delivery regression: a fresh fixture owned by each real role equivalent.
  for (const owner of ["admin", "manager", "a", "b"]) {
    await check(
      `delivery ${owner}: directory includes all four roles, excludes disabled`,
      async () => {
        const rows = await actor(
          owner,
          "select * from crm_marketing_recipients()",
        );
        assert.deepEqual(
          rows.map((r) => r.id).sort(),
          [ids.admin, ids.manager, ids.a, ids.b].sort(),
        );
      },
    );
    const material = (
      await actor(
        owner,
        "insert into marketing_assets(title) values('Fictitious delivery') returning id",
      )
    )[0];
    const path = `${ids[owner]}/00000000-0000-4000-8000-${String(material.id).padStart(12, "0")}.pdf`;
    const v = (
      await actor(
        owner,
        "insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values($1,$2,'application/pdf',100,repeat('d',64),'fictitious.pdf') returning id",
        [material.id, path],
      )
    )[0];
    await actor(
      owner,
      "update marketing_assets set current_version_id=$1 where id=$2",
      [v.id, material.id],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('crm-marketing',$1)",
      [path],
    );
    await check(
      `delivery ${owner}: private material and Storage denied to all others`,
      async () => {
        for (const who of ["admin", "manager", "a", "b"].filter(
          (x) => x !== owner,
        )) {
          assert.equal(
            (
              await actor(who, "select id from marketing_assets where id=$1", [
                material.id,
              ])
            ).length,
            0,
          );
          assert.equal(
            (
              await actor(
                who,
                "select name from storage.objects where name=$1",
                [path],
              )
            ).length,
            0,
          );
        }
      },
    );
    await check(
      `delivery ${owner}: team pending invisible to brokers, persistent review once`,
      async () => {
        await actor(owner, "select crm_set_asset_audience($1,'team','{}')", [
          material.id,
        ]);
        await actor(owner, "select crm_set_asset_audience($1,'team','{}')", [
          material.id,
        ]);
        const notes = (
          await db.query(
            "select * from notifications where entity_type='marketing_asset' and entity_id=$1 and type='asset_review'",
            [material.id],
          )
        ).rows;
        assert.equal(notes.length, 2);
        for (const who of ["a", "b"].filter((x) => x !== owner))
          assert.equal(
            (
              await actor(who, "select id from marketing_assets where id=$1", [
                material.id,
              ])
            ).length,
            0,
          );
      },
    );
    await actor(
      "manager",
      "update marketing_assets set status='aprovado' where id=$1",
      [material.id],
    );
    await check(
      `delivery ${owner}: approved team and Storage visible to all, never anonymous`,
      async () => {
        for (const who of ["admin", "manager", "a", "b"]) {
          assert.equal(
            (
              await actor(who, "select id from marketing_assets where id=$1", [
                material.id,
              ])
            ).length,
            1,
          );
          assert.equal(
            (
              await actor(
                who,
                "select name from storage.objects where name=$1",
                [path],
              )
            ).length,
            1,
          );
        }
        assert.equal(
          (
            await actor(
              "anon",
              "select name from storage.objects where name=$1",
              [path],
            )
          ).length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from notifications where entity_id=$1 and type in ('asset_approved','asset_shared')",
              [material.id],
            )
          ).rows[0].n,
          4,
        );
      },
    );
    const recipient = owner === "admin" ? "manager" : "admin";
    const outsider = ["a", "b"].find((x) => x !== owner);
    await check(
      `delivery ${owner}: selected administrator/manager allowed, unselected blocked, owner retained`,
      async () => {
        await actor(
          owner,
          "select crm_set_asset_audience($1,'selected',array[$2]::uuid[])",
          [material.id, ids[recipient]],
        );
        await denied(
          owner,
          "select crm_set_asset_audience($1,'selected',array[$2]::uuid[])",
          [material.id, ids.disabled],
        );
        await actor(
          "manager",
          "update marketing_assets set status='aprovado' where id=$1",
          [material.id],
        );
        for (const who of [owner, recipient])
          assert.equal(
            (
              await actor(
                who,
                "select name from storage.objects where name=$1",
                [path],
              )
            ).length,
            1,
          );
        assert.equal(
          (
            await actor(
              outsider,
              "select name from storage.objects where name=$1",
              [path],
            )
          ).length,
          0,
        );
        const unselectedManager = ["admin", "manager"].find(
          (x) => x !== recipient && x !== owner,
        );
        if (unselectedManager)
          assert.equal(
            (
              await actor(
                unselectedManager,
                "select id from marketing_assets where id=$1",
                [material.id],
              )
            ).length,
            0,
          );
        await denied(
          outsider,
          "select crm_set_asset_audience($1,'team','{}')",
          [material.id],
        );
      },
    );
    await check(
      `delivery ${owner}: revoke to owner removes recipient Storage immediately`,
      async () => {
        await actor(owner, "select crm_set_asset_audience($1,'owner','{}')", [
          material.id,
        ]);
        assert.equal(
          (
            await actor(
              recipient,
              "select name from storage.objects where name=$1",
              [path],
            )
          ).length,
          0,
        );
        assert.equal(
          (
            await actor(
              owner,
              "select name from storage.objects where name=$1",
              [path],
            )
          ).length,
          1,
        );
      },
    );
  }
  await check(
    "delivery: selected manager cannot download superseded version",
    async () => {
      const a = (
        await actor(
          "a",
          "insert into marketing_assets(title) values('Fictitious version isolation') returning id",
        )
      )[0];
      const versions = [];
      for (const suffix of ["8888", "8889"]) {
        const path =
          ids.a + "/00000000-0000-4000-8000-00000000" + suffix + ".pdf";
        const v = (
          await actor(
            "a",
            "insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values($1,$2,'application/pdf',100,repeat($3,64),'fictitious.pdf') returning id",
            [a.id, path, suffix === "8888" ? "e" : "a"],
          )
        )[0];
        await db.query(
          "insert into storage.objects(bucket_id,name) values('crm-marketing',$1)",
          [path],
        );
        versions.push({ ...v, path });
      }
      await actor(
        "a",
        "update marketing_assets set current_version_id=$1 where id=$2",
        [versions[1].id, a.id],
      );
      await actor(
        "a",
        "select crm_set_asset_audience($1,'selected',array[$2]::uuid[])",
        [a.id, ids.manager],
      );
      await actor(
        "manager",
        "update marketing_assets set status='aprovado' where id=$1",
        [a.id],
      );
      assert.equal(
        (
          await actor(
            "manager",
            "select id from asset_versions where asset_id=$1",
            [a.id],
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await actor(
            "manager",
            "select name from storage.objects where name=$1",
            [versions[0].path],
          )
        ).length,
        0,
      );
      assert.equal(
        (
          await actor(
            "manager",
            "select name from storage.objects where name=$1",
            [versions[1].path],
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await actor("a", "select id from asset_versions where asset_id=$1", [
            a.id,
          ])
        ).length,
        2,
      );
    },
  );
  await check(
    "delivery notifications: exact unread count, mark read and cross-user denial",
    async () => {
      for (const who of ["admin", "manager", "a", "b"]) {
        const expected = (
          await actor(
            who,
            "select count(*)::int n from notifications where not read",
          )
        )[0].n;
        assert.equal(
          Number(
            (await actor(who, "select crm_unread_notification_count() n"))[0].n,
          ),
          expected,
        );
        const note = (
          await actor(
            who,
            "select id from notifications where not read limit 1",
          )
        )[0];
        assert(note);
        await actor(who, "select crm_read_notification($1)", [note.id]);
        assert.equal(
          Number(
            (await actor(who, "select crm_unread_notification_count() n"))[0].n,
          ),
          expected - 1,
        );
        const other = who === "a" ? "b" : "a";
        await denied(other, "select crm_read_notification($1)", [note.id]);
      }
      await denied("anon", "select crm_marketing_recipients()");
      await denied("anon", "select crm_unread_notification_count()");
    },
  );
  await check(
    "delivery events: property result persists once and contains no private title",
    async () => {
      const notes = (
        await db.query(
          "select * from notifications where entity_type='property' and entity_id=100 and type='property_result'",
        )
      ).rows;
      assert.equal(notes.length, 1);
      assert.equal(notes[0].user_id, ids.a);
      assert.equal(notes[0].target_path, "/admin/imoveis?imovel=100");
      assert.equal(notes[0].title, "Revisão do imóvel atualizada");
    },
  );
  await check(
    "delivery events: assignment has persistent exact link and idempotent retry",
    async () => {
      const before = (
        await db.query(
          "select count(*)::int n from notifications where entity_type='lead' and entity_id=3000",
        )
      ).rows[0].n;
      const assigned = (
        await db.query("select broker_id from leads where id=3000")
      ).rows[0].broker_id;
      await actor(
        "manager",
        "select crm_assign_lead(3000,$1,'Retry fixture')",
        [assigned],
      );
      const notes = (
        await db.query(
          "select * from notifications where entity_type='lead' and entity_id=3000",
        )
      ).rows;
      assert(before > 0);
      assert.equal(notes.length, before);
      assert.equal(notes[0].target_path, "/admin/leads?lead=3000");
    },
  );
  await check(
    "delivery events: transfer request and acceptance notify only participants without private lead data",
    async () => {
      const request = (
        await db.query(
          "select * from lead_transfer_requests where lead_id=1000 and status='accepted' limit 1",
        )
      ).rows[0];
      assert(request);
      const notes = (
        await db.query(
          "select * from notifications where entity_type='lead_transfer' and entity_id=$1",
          [request.id],
        )
      ).rows;
      assert.equal(notes.length, 3);
      assert(
        notes.every((n) =>
          [request.from_user, request.to_user].includes(n.user_id),
        ),
      );
      assert(
        notes.every(
          (n) => !n.title.includes("1000") && !n.description.includes("1000"),
        ),
      );
      const before = notes.length;
      await actor("b", "select crm_accept_lead_transfer($1)", [request.id]);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from notifications where entity_type='lead_transfer' and entity_id=$1",
            [request.id],
          )
        ).rows[0].n,
        before,
      );
    },
  );
  await check(
    "delivery events: explicit submission for old pending material is idempotent",
    async () => {
      const asset = (
        await actor(
          "a",
          "insert into marketing_assets(title) values('Old fictitious pending') returning id",
        )
      )[0];
      await denied(
        "a",
        "update marketing_assets set status='aprovado' where id=$1 returning id",
        [asset.id],
      );
      const v = (
        await actor(
          "a",
          "insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values($1,$2,'image/png',100,repeat('f',64),'fictitious.png') returning id",
          [asset.id, ids.a + "/00000000-0000-4000-8000-000000009999.png"],
        )
      )[0];
      await actor(
        "a",
        "update marketing_assets set current_version_id=$1 where id=$2",
        [v.id, asset.id],
      );
      await actor("a", "select crm_set_asset_audience($1,'team','{}')", [
        asset.id,
      ]);
      await db.query(
        "delete from notifications where entity_type='marketing_asset' and entity_id=$1",
        [asset.id],
      );
      await actor("a", "select crm_submit_asset_review($1)", [asset.id]);
      await actor("a", "select crm_submit_asset_review($1)", [asset.id]);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from notifications where entity_type='marketing_asset' and entity_id=$1 and type='asset_review'",
            [asset.id],
          )
        ).rows[0].n,
        2,
      );
      await denied("b", "select crm_submit_asset_review($1)", [asset.id]);
    },
  );
  await check(
    "delivery guard: client cannot forge notification cycles or approve missing bytes",
    async () => {
      const asset = (
        await actor(
          "a",
          "insert into marketing_assets(title) values('Fictitious cycle forgery') returning id",
        )
      )[0];
      await denied(
        "a",
        "update marketing_assets set delivery_cycle=999 where id=$1 returning id",
        [asset.id],
      );
      await denied(
        "admin",
        "update marketing_assets set status='aprovado' where id=$1 returning id",
        [asset.id],
      );
    },
  );
  const historicalIds = {
    "84c5604b-d728-4759-8572-ea4a832af9ce": ids.admin,
    "0d92c58c-d6f0-4465-95e1-303e7d9f9a69": ids.manager,
    "73a767b8-218d-4910-a370-2b93cf32bf74": ids.a,
    "779c7220-06dd-4180-8b52-05136bee21cb": ids.b,
  };
  for (const [index, reason] of ["", "   ", null, "x".repeat(500), undefined].entries()) {
    const companyId = 8000 + index;
    const personalId = 8100 + index;
    await db.query("insert into leads(id,name,broker_id,origin_type) values($1,'Optional reason fixture',null,'company'),($2,'Optional transfer fixture',$3,'personal')", [companyId, personalId, ids.a]);
    await check(`optional assignment reason variant ${index}: audit, notification and retry`, async () => {
      const sql = reason === undefined ? "select crm_assign_lead($1,$2)" : "select crm_assign_lead($1,$2,$3)";
      const params = reason === undefined ? [companyId, ids.b] : [companyId, ids.b, reason];
      await actor("manager", sql, params);
      await actor("manager", sql, params);
      const rows = (await db.query("select reason from lead_assignments where lead_id=$1", [companyId])).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].reason, (reason || "").trim());
      assert.equal((await db.query("select count(*)::int n from notifications where entity_type='lead' and entity_id=$1", [companyId])).rows[0].n, 1);
    });
    await check(`optional transfer reason variant ${index}: consent, accept, isolation and idempotency`, async () => {
      const sql = reason === undefined ? "select crm_request_lead_transfer($1,$2) id" : "select crm_request_lead_transfer($1,$2,$3) id";
      const params = reason === undefined ? [personalId, ids.b] : [personalId, ids.b, reason];
      const [request] = await actor("a", sql, params);
      assert.equal((await db.query("select broker_id from leads where id=$1", [personalId])).rows[0].broker_id, ids.a);
      await denied("a", "select crm_accept_lead_transfer($1)", [request.id]);
      await actor("b", "select crm_accept_lead_transfer($1)", [request.id]);
      await actor("b", "select crm_accept_lead_transfer($1)", [request.id]);
      const rows = (await db.query("select reason from lead_assignments where lead_id=$1", [personalId])).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].reason, (reason || "").trim());
      await denied("a", "select id from leads where id=$1", [personalId]);
      assert.equal((await actor("b", "select id from leads where id=$1", [personalId])).length, 1);
    });
  }
  await check("optional reasons do not bypass authorization, eligibility or length limits", async () => {
    await denied("a", "select crm_assign_lead(8000,$1,'')", [ids.a]);
    await denied("manager", "select crm_assign_lead(8000,$1,'')", [ids.disabled]);
    await denied("manager", "select crm_assign_lead(8000,$1,$2)", [ids.a, "x".repeat(501)]);
    await denied("b", "select crm_request_lead_transfer(8100,$1,$2)", [ids.a, "x".repeat(501)]);
    await denied("a", "select crm_request_lead_transfer(8100,$1,'')", [ids.b]);
  });
  for (const file of ["crm-staging-rls.sql", "crm-marketing-rls.sql"]) {
    await check("SQL regression suite " + file, async () => {
      let sql = readSql("tests/" + file);
      for (const [from, to] of Object.entries(historicalIds))
        sql = sql.replaceAll(from, to);
      const localDb = (await db.query("select current_database() name")).rows[0]
        .name;
      assert.match(localDb, /^[a-z0-9_]+$/);
      sql = sql.replace(
        "current_database() <> 'postgres'",
        "current_database() <> '" + localDb + "'",
      );
      try {
        const out = await db.exec(sql);
        const rows = out.flatMap((o) => o.rows).find((r) => r.results)?.results;
        assert(rows?.length, "missing regression assertions");
        for (const r of rows)
          results.push({
            name: file + ": " + r.name,
            result: r.passed ? "APROVADO" : "REPROVADO",
            ...(r.passed ? {} : { error: r.detail }),
          });
        assert.equal(
          rows.filter((r) => !r.passed).length,
          0,
          JSON.stringify(rows.filter((r) => !r.passed)),
        );
      } catch (e) {
        await db.exec("rollback");
        throw e;
      }
    });
  }
  const draftMigrations = readdirSync("supabase/migrations").filter((name) => name.endsWith("_crm_owner_draft_presentations.sql"));
  assert.equal(draftMigrations.length, 1, "Exactly one managed owner-presentation migration is required");
  const draftMigration = draftMigrations[0];
  await db.exec(readSql("supabase/migrations/" + draftMigration));
  migrations.push(draftMigration);
  for (const [index, workflow] of ["rascunho", "pendente", "aprovado", "publicado"].entries()) {
    const pid = 9000 + index;
    await db.query("insert into properties(id,title,slug,description,location,category,price,owner_id,broker_id,workflow_status,publish_on_site,presentation_enabled) overriding system value values($1,'Draft presentation fixture',$2,'Fixture only','Fixture','casas','100000',$3,$3,$4,false,true)", [pid,"draft-presentation-"+pid,ids.a,workflow]);
    await check(`owner presentation ${workflow}: hidden from anonymous listing, link allowed, other broker denied`, async () => {
      const [share] = await actor("a", "insert into marketing_shares(property_ids,title,expires_at) values(array[$1::bigint],'Private presentation fixture',now()+interval '1 day') returning id,token", [pid]);
      const [payload] = await actor("anon", "select crm_public_presentation($1) data", [share.token]);
      assert.equal(payload.data.properties[0].id, pid);
      assert.equal(payload.data.properties[0].owner_id, undefined);
      assert.equal((await actor("anon", "select id from properties where id=$1", [pid])).length, 0);
      await denied("b", "insert into marketing_shares(property_ids,title,expires_at) values(array[$1::bigint],'Forbidden',now()+interval '1 day') returning id", [pid]);
      await actor("a", "update marketing_shares set revoked_at=now() where id=$1 returning id", [share.id]);
      assert.equal((await actor("anon", "select crm_public_presentation($1) data", [share.token]))[0].data, null);
    });
  }
  await check("owner presentation: disable, expiry and ownership transfer invalidate capability", async () => {
    const make = async (pid) => (await actor("a", "insert into marketing_shares(property_ids,title,expires_at) values(array[$1::bigint],'Capability fixture',now()+interval '1 day') returning token", [pid]))[0].token;
    const token = await make(9000);
    await actor("a", "update properties set presentation_enabled=false where id=9000 returning id");
    assert.equal((await actor("anon", "select crm_public_presentation($1) data", [token]))[0].data,null);
    await denied("a", "insert into marketing_shares(property_ids,title,expires_at) values(array[9000::bigint],'Disabled',now()+interval '1 day') returning id");
    const transferred = await make(9001);
    await actor("manager", "update properties set owner_id=$1,broker_id=$1 where id=9001 returning id", [ids.b]);
    assert.equal((await actor("anon", "select crm_public_presentation($1) data", [transferred]))[0].data,null);
    const [expired] = await actor("a", "insert into marketing_shares(property_ids,title,expires_at) values(array[9002::bigint],'Short fixture',now()+interval '100 milliseconds') returning token");
    await new Promise(resolve => setTimeout(resolve,150));
    assert.equal((await actor("anon", "select crm_public_presentation($1) data", [expired.token]))[0].data,null);
  });
  await check("owner presentation: hidden property accepts only approved public team material; direct Storage stays private", async () => {
    const [material] = await actor("a", "insert into marketing_assets(title) values('Owner presentation material fixture') returning id");
    const storagePath=ids.a+"/99999999-9999-4999-8999-999999999999.pdf";
    const [version] = await actor("a", "insert into asset_versions(asset_id,storage_path,mime_type,size_bytes,checksum,original_name) values($1,$2,'application/pdf',100,repeat('e',64),'presentation-fixture.pdf') returning id", [material.id,storagePath]);
    await actor("a", "update marketing_assets set current_version_id=$1 where id=$2", [version.id,material.id]);
    await actor("a", "insert into asset_relations(asset_id,property_id) values($1,9003)", [material.id]);
    await db.query("insert into storage.objects(bucket_id,name) values('crm-marketing',$1)", [storagePath]);
    await actor("a", "select crm_set_asset_audience($1,'team','{}'::uuid[])", [material.id]);
    const create = "insert into marketing_shares(property_ids,asset_ids,title,expires_at) values(array[9003::bigint],array[$1::bigint],'Approved hidden material',now()+interval '1 day') returning token";
    await denied("a",create,[material.id]);
    await actor("manager", "update marketing_assets set status='aprovado',visibility='public' where id=$1", [material.id]);
    const [share]=await actor("a",create,[material.id]);
    const payload=(await actor("anon","select crm_public_presentation($1) data",[share.token]))[0].data;
    assert.equal(payload.assets.length,1);assert.equal(payload.assets[0].path,storagePath);
    await denied("anon","select name from storage.objects where bucket_id='crm-marketing' and name=$1",[storagePath]);
    await actor("a","select crm_set_asset_audience($1,'owner','{}'::uuid[])",[material.id]);
    assert.equal((await actor("anon","select crm_public_presentation($1) data",[share.token]))[0].data.assets.length,0);
  });
  const campaignMigrations=readdirSync("supabase/migrations").filter(name=>name.endsWith("_crm_campaign_attribution.sql"));
  assert.equal(campaignMigrations.length,1,"Exactly one managed campaign migration is required");
  const campaignMigration=campaignMigrations[0];
  await db.exec(readSql("supabase/migrations/"+campaignMigration));
  migrations.push(campaignMigration);
  const {runCampaignScenarios}=await import("./crm-campaign-scenarios.mjs");
  await runCampaignScenarios({db,actor,check,denied,ids});
} catch (e) {
  results.push({
    name: "suite infrastructure/fixture",
    result: "REPROVADO",
    error: e.message,
  });
  console.error(e.message, e.query?.slice(0, 300));
} finally {
  await db.close();
}
const report = {
  environment:
    "isolated PGlite PostgreSQL, synthetic SQL claims; NOT Auth HTTP, Storage bytes, Realtime or staging",
  migrations: migrations.map((name) => ({
    name,
    sha256: createHash("sha256")
      .update(readSql("supabase/migrations/" + name))
      .digest("hex"),
  })),
  results,
  summary: {
    passed: results.filter((r) => r.result === "APROVADO").length,
    failed: results.filter((r) => r.result === "REPROVADO").length,
  },
};
writeFileSync(
  process.env.CRM_LOCAL_REPORT_PATH || "tests/security/crm-operational-local-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report.summary);
if (report.summary.failed) process.exitCode = 1;
