/** Isolated PostgreSQL/WASM tests. Never connects to staging or Auth HTTP. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { PGlite } = await import(
  process.env.CRM_PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const results = [];
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
  await db.exec(readFileSync("tests/fixtures/crm-schema-20261019.sql", "utf8"));
  await check(
    "schema adapter: preflight baseline has no function/policy drift",
    async () => {
      const out = await db.exec(
        readFileSync("tests/crm-operational-preflight-readonly.sql", "utf8"),
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
    .filter((f) => f.startsWith("20261019"))
    .sort();
  for (const name of migrations)
    await db.exec(readFileSync("supabase/migrations/" + name, "utf8"));
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
  const historicalIds = {
    "84c5604b-d728-4759-8572-ea4a832af9ce": ids.admin,
    "0d92c58c-d6f0-4465-95e1-303e7d9f9a69": ids.manager,
    "73a767b8-218d-4910-a370-2b93cf32bf74": ids.a,
    "779c7220-06dd-4180-8b52-05136bee21cb": ids.b,
  };
  for (const file of ["crm-staging-rls.sql", "crm-marketing-rls.sql"]) {
    await check("SQL regression suite " + file, async () => {
      let sql = readFileSync("tests/" + file, "utf8");
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
      .update(readFileSync("supabase/migrations/" + name))
      .digest("hex"),
  })),
  results,
  summary: {
    passed: results.filter((r) => r.result === "APROVADO").length,
    failed: results.filter((r) => r.result === "REPROVADO").length,
  },
};
writeFileSync(
  "tests/security/crm-operational-local-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report.summary);
if (report.summary.failed) process.exitCode = 1;
