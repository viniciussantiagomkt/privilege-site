import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { quickService } from "./helpers/load-quick-service.mjs";
import { quickPhoneCases } from "./fixtures/crm-quick-phone-cases.mjs";

export async function runQuickServiceScenarios({ db, actor, check, denied }) {
  const normalized = await actor(
    "a",
    "select (v.n-1)::int as index, public.crm_normalize_client_phone(v.item->>'input') as phone from jsonb_array_elements($1::jsonb) with ordinality as v(item,n) order by v.n",
    [JSON.stringify(quickPhoneCases)],
  );
  for (const [index, { name, input, expected }] of quickPhoneCases.entries())
    await check(`quick phone SQL/TypeScript parity: ${name}`, async () => {
      let typescript = null;
      try {
        typescript = quickService.normalizeClientPhone(input);
      } catch {
        /* Invalid input is rejected in TypeScript, NULL in SQL. */
      }
      assert.equal(normalized[index].phone, expected);
      assert.equal(typescript, expected);
      assert.equal(normalized[index].phone, typescript);
    });
  await db.exec(
    "select setval(pg_get_serial_sequence('public.clients','id'),(select max(id) from public.clients))",
  );
  const payload = {
    name: "Cliente fictício Etapa 03",
    phone: "(83) 90000-0099",
    interest_profile: {
      purpose: "compra",
      budget_min: "300000",
      budget_max: "600000",
      bedrooms: 2,
      financing: true,
    },
  };
  const save = (who, id, revision, key, p) =>
    actor(who, "select crm_save_quick_client($1,$2,$3,$4::jsonb) data", [
      id,
      revision,
      key,
      JSON.stringify(p),
    ]);
  await check(
    "quick phone RPC: explicit incomplete prefixes rejected before insert",
    async () => {
      const before = (await db.query("select count(*)::int n from clients"))
        .rows[0].n;
      for (const phone of ["+55 (83) 9000-00", "0055 (83) 9000-00"])
        await assert.rejects(
          save("a", null, null, randomUUID(), { ...payload, phone }),
          (e) => e.code === "22023",
        );
      assert.equal(
        (await db.query("select count(*)::int n from clients")).rows[0].n,
        before,
      );
    },
  );
  await check(
    "quick phone RPC: DDD55 aliases remain valid and duplicate within own portfolio",
    async () => {
      await save("a", null, null, randomUUID(), {
        ...payload,
        phone: "(55) 90000-0000",
      });
      for (const phone of ["+55 (55) 90000-0000", "0055 (55) 90000-0000"])
        await assert.rejects(
          save("a", null, null, randomUUID(), { ...payload, phone }),
          (e) => e.code === "23505",
        );
      assert.ok(
        (
          await save("b", null, null, randomUUID(), {
            ...payload,
            phone: "+55 (55) 90000-0000",
          })
        )[0].data.id,
      );
    },
  );
  let client;
  await check(
    "quick service: create, normalize, receipt replay, no automatic lead",
    async () => {
      const count = (await db.query("select count(*)::int n from leads"))
        .rows[0].n;
      const key = randomUUID();
      client = (await save("a", null, null, key, payload))[0].data;
      assert.ok(client.id);
      assert.equal(client.revision, 0);
      assert.deepEqual(
        (await save("a", null, null, key, payload))[0].data,
        client,
      );
      assert.equal(
        (
          await actor("a", "select phone from clients where id=$1", [client.id])
        )[0].phone,
        "5583900000099",
      );
      assert.equal(
        (await db.query("select count(*)::int n from leads")).rows[0].n,
        count,
      );
      await assert.rejects(
        save("a", null, null, key, { ...payload, name: "Outro fictício" }),
        (e) => e.code === "22023",
      );
    },
  );
  await check(
    "quick service: duplicates restricted to own portfolio",
    async () => {
      await assert.rejects(
        save("a", null, null, randomUUID(), payload),
        (e) => e.code === "23505",
      );
      const other = (await save("b", null, null, randomUUID(), payload))[0]
        .data;
      assert.notEqual(other.id, client.id);
      assert.equal(
        (await actor("a", "select id from clients where id=$1", [other.id]))
          .length,
        0,
      );
    },
  );
  await check(
    "quick service: revisions, no-op audit, stale edits",
    async () => {
      const changed = {
        ...payload,
        interest_profile: { ...payload.interest_profile, bedrooms: 3 },
      };
      const result = (await save("a", client.id, 0, randomUUID(), changed))[0]
        .data;
      assert.equal(result.revision, 1);
      await assert.rejects(
        save("a", client.id, 0, randomUUID(), payload),
        (e) => e.code === "40001",
      );
      const before = (
        await db.query(
          "select count(*)::int n from audit_logs where entity='clients' and entity_id=$1",
          [String(client.id)],
        )
      ).rows[0].n;
      assert.equal(
        (await save("a", client.id, 1, randomUUID(), changed))[0].data.revision,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from audit_logs where entity='clients' and entity_id=$1",
            [String(client.id)],
          )
        ).rows[0].n,
        before,
      );
    },
  );
  for (const role of ["anon", "b", "manager", "admin", "disabled"]) {
    await check(
      `quick service: ${role} cannot read/edit A private client or record contact`,
      async () => {
        await denied(role, "select crm_client_timeline($1,0)", [client.id]);
        await denied(role, "select crm_record_client_contact($1,$2)", [
          client.id,
          randomUUID(),
        ]);
        await denied(role, "select crm_save_quick_client($1,1,$2,$3::jsonb)", [
          client.id,
          randomUUID(),
          JSON.stringify(payload),
        ]);
      },
    );
  }
  await check(
    "quick service: sanitized timeline and idempotent real contact",
    async () => {
      const key = randomUUID();
      await actor("a", "select crm_record_client_contact($1,$2)", [
        client.id,
        key,
      ]);
      await actor("a", "select crm_record_client_contact($1,$2)", [
        client.id,
        key,
      ]);
      const history = (
        await actor("a", "select crm_client_timeline($1,0) data", [client.id])
      )[0].data;
      assert.equal(
        history.filter(
          (e) => e.description === "Contato registrado pelo corretor",
        ).length,
        1,
      );
      assert.ok(
        history.some((e) => e.description === "Perfil de interesse atualizado"),
      );
      assert.ok(history.some((e) => e.description === "Cliente cadastrado"));
      assert.equal(JSON.stringify(history).includes("90000"), false);
      assert.equal(JSON.stringify(history).includes("before_data"), false);
    },
  );
  for (const profile of [
    { purpose: "outro" },
    { bedrooms: -1 },
    { parking_spaces: 1.5 },
    { budget_min: "600", budget_max: "300" },
    { budget_max: 500 },
    { down_payment: "1e9" },
    { secret: "no" },
    { neighborhoods: [null] },
  ]) {
    await check(
      "quick service: rejects invalid profile " + JSON.stringify(profile),
      async () => {
        await assert.rejects(
          save("a", client.id, 1, randomUUID(), {
            ...payload,
            interest_profile: profile,
          }),
          (e) => e.code === "22023",
        );
        await assert.rejects(
          actor(
            "a",
            "update clients set interest_profile=$1::jsonb where id=$2 returning id",
            [JSON.stringify(profile), client.id],
          ),
          (e) => e.code === "23514",
        );
      },
    );
  }
  await check(
    "quick service: direct table updates cannot forge revision",
    async () => {
      const [row] = await actor(
        "a",
        "update clients set interest_revision=999 where id=$1 returning interest_revision",
        [client.id],
      );
      assert.equal(row.interest_revision, 1);
    },
  );
  await check(
    "quick service: national DDD 55 preserved and malformed phones rejected",
    async () => {
      assert.equal(
        (
          await actor(
            "a",
            "select crm_normalize_client_phone('55900000000') phone",
          )
        )[0].phone,
        "5555900000000",
      );
      for (const value of ["abc83900000099", "123", "+1 202 555 0100"])
        assert.equal(
          (
            await actor("a", "select crm_normalize_client_phone($1) phone", [
              value,
            ])
          )[0].phone,
          null,
        );
    },
  );
  await check(
    "quick service: payload cannot select broker or organization",
    async () => {
      for (const field of ["broker_id", "organization_id", "interest_revision"])
        await assert.rejects(
          save("a", client.id, 1, randomUUID(), {
            ...payload,
            [field]: "forged",
          }),
          (e) => e.code === "22023",
        );
    },
  );
  await check(
    "quick service: duplicate email normalization is private",
    async () => {
      const p = {
        ...payload,
        phone: "83900000123",
        email: "Fixture.Quick@Example.invalid",
      };
      await save("a", null, null, randomUUID(), p);
      await assert.rejects(
        save("a", null, null, randomUUID(), {
          ...p,
          phone: "83900000124",
          email: "fixture.quick@example.invalid",
        }),
        (e) => e.code === "23505",
      );
      assert.ok(
        (
          await save("b", null, null, randomUUID(), {
            ...p,
            phone: "83900000124",
          })
        )[0].data.id,
      );
    },
  );
  await check(
    "quick service: agenda retry creates one task, visit and audit entry",
    async () => {
      for (const table of ["tasks", "visits"])
        await db.exec(
          `select setval(pg_get_serial_sequence('public.${table}','id'),(select max(id) from public.${table}))`,
        );
      const taskKey = randomUUID(),
        visitKey = randomUUID();
      const task =
        "insert into tasks(title,broker_id,client_id,due_at,quick_action_id) values('Retorno fictício Etapa 03',auth.uid(),$1,now(),$2) on conflict(quick_action_id) do nothing returning id";
      const visit =
        "insert into visits(client_id,property_id,broker_id,scheduled_at,quick_action_id) values($1,100,auth.uid(),now(),$2) on conflict(quick_action_id) do nothing returning id";
      const t = (await actor("a", task, [client.id, taskKey]))[0];
      const v = (await actor("a", visit, [client.id, visitKey]))[0];
      assert.equal((await actor("a", task, [client.id, taskKey])).length, 0);
      assert.equal((await actor("a", visit, [client.id, visitKey])).length, 0);
      for (const [entity, id] of [
        ["tasks", t.id],
        ["visits", v.id],
      ])
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from audit_logs where entity=$1 and entity_id=$2 and action='INSERT'",
              [entity, String(id)],
            )
          ).rows[0].n,
          1,
        );
      const history = (
        await actor("a", "select crm_client_timeline($1,0) data", [client.id])
      )[0].data;
      assert.ok(
        history.some(
          (r) => r.description === "Tarefa / retorno registrado ou atualizado",
        ),
      );
      assert.ok(
        history.some(
          (r) => r.description === "Visita registrada ou atualizada",
        ),
      );
      await denied("b", task, [client.id, randomUUID()]);
      assert.equal(
        (
          await actor("b", "select id from tasks where quick_action_id=$1", [
            taskKey,
          ])
        ).length,
        0,
      );
    },
  );
  for (const role of ["manager", "admin"])
    await check(
      `quick service: ${role} keeps its own private portfolio`,
      async () => {
        assert.ok(
          (
            await save(role, null, null, randomUUID(), {
              ...payload,
              phone: "83900000666",
            })
          )[0].data.id,
        );
      },
    );
  // Reviewed from PR #19; isolated SQL fixtures, not authenticated HTTP.
  for (const role of ["anon", "a", "b", "manager", "disabled"]) {
    await check("security: " + role + " cannot escalate privileges with set_user_role RPC", async () => {
      await assert.rejects(
        actor(role, "select public.set_user_role($1,$2)", [
          "nonexistent-fixture@example.invalid", "admin",
        ]),
        e => e.code === "42501",
      );
    });
  }
  for (const role of ["anon", "b", "manager", "admin", "disabled"]) {
    await check("security: " + role + " cannot mutate A private client by direct SQL", async () => {
      await denied(role, "update public.clients set name='Unauthorized fixture edit' where id=$1 returning id", [client.id]);
      await denied(role, "delete from public.clients where id=$1 returning id", [client.id]);
      assert.equal(
        (await db.query("select name from public.clients where id=$1", [client.id])).rows[0].name,
        "Cliente fictício Etapa 03",
      );
    });
  }
  await check(
    "quick service: archived client rejects timeline, update and receipt replay",
    async () => {
      const key = randomUUID(),
        p = { ...payload, phone: "83900000777" };
      const row = (await save("a", null, null, key, p))[0].data;
      await actor("a", "select crm_archive_client($1)", [row.id]);
      await denied("a", "select crm_client_timeline($1,0)", [row.id]);
      await denied("a", "select crm_save_quick_client($1,0,$2,$3::jsonb)", [
        row.id,
        randomUUID(),
        JSON.stringify(p),
      ]);
      await assert.rejects(
        save("a", null, null, key, p),
        (e) => e.code === "22023",
      );
    },
  );
}
