// Explicit local-only rehearsal on a verified restored PostgreSQL 17 database.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const container = "privilege-crm-restore-20261028";
const image =
  "supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00";
const expectedSQL =
  "da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa";
const [backupDir, database] = process.argv.slice(2);
assert.ok(
  backupDir && /^privilege_restore_[a-f0-9]{12}$/.test(database || ""),
  "Explicit verified local restore required",
);
assert.ok(
  !process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT,
  "Custom Docker endpoint rejected",
);
assert.equal(
  execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim(),
  "work/crm-broker-quick-service-20261104",
);
const manifest = JSON.parse(
  fs
    .readFileSync(path.join(backupDir, "manifest.json"), "utf8")
    .replace(/^\uFEFF/, ""),
);
const restored = JSON.parse(
  fs
    .readFileSync(
      path.join(backupDir, `restore-validation-${database}.json`),
      "utf8",
    )
    .replace(/^\uFEFF/, ""),
);
assert.equal(manifest.project, "sdpqphiooiuglywcmkxv");
assert.equal(restored.result, "PASS");
assert.equal(restored.local_database, database);
const hash = (b) => createHash("sha256").update(b).digest("hex");
assert.equal(
  hash(fs.readFileSync(path.join(backupDir, manifest.archive))),
  manifest.archive_sha256.toLowerCase(),
);
const migration = fs
  .readFileSync(
    "supabase/migrations/20261105172215_crm_quick_service.sql",
    "utf8",
  )
  .replace(/\r\n/g, "\n");
assert.equal(hash(migration), expectedSQL);
assert.equal(
  execFileSync("docker", ["context", "show"], { encoding: "utf8" }).trim(),
  "desktop-linux",
);
assert.match(
  execFileSync(
    "docker",
    [
      "context",
      "inspect",
      "desktop-linux",
      "--format",
      "{{.Endpoints.docker.Host}}",
    ],
    { encoding: "utf8" },
  ),
  /^npipe:/,
);
const isolated = JSON.parse(
  execFileSync(
    "docker",
    [
      "inspect",
      "--format",
      '{"image":{{json .Config.Image}},"network":{{json .HostConfig.NetworkMode}},"ports":{{json .HostConfig.PortBindings}},"binds":{{json .HostConfig.Binds}},"privileged":{{json .HostConfig.Privileged}}}',
      container,
    ],
    { encoding: "utf8" },
  ),
);
assert.equal(isolated.image, image);
assert.equal(isolated.network, "none");
assert.ok(!isolated.ports || !Object.keys(isolated.ports).length);
assert.ok(!isolated.binds?.length);
assert.equal(isolated.privileged, false);
const privateDir = path.join(backupDir, `stage03c-${randomUUID()}`);
fs.mkdirSync(privateDir);
const report = {
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  runnerSHA256: hash(fs.readFileSync(new URL(import.meta.url))),
  sqlSHA256: expectedSQL,
  environment:
    "isolated restored PostgreSQL 17, independent psql connections over Docker Unix socket; synthetic SQL claims, NOT remote Auth",
  backup: {
    createdUTC: manifest.created_utc,
    bytes: manifest.archive_bytes,
    sha256: manifest.archive_sha256.toLowerCase(),
    privateFolder: path.basename(backupDir),
    archiveValidation: manifest.archive_list_and_decode,
    restore: "PASS",
  },
  isolation: isolated,
  results: [],
  benchmarks: [],
  pending: [
    "Real authenticated homologation",
    "Explicit authorization and fresh preflight before any remote change",
  ],
  remoteWrites: false,
};
const backendPids = new Set();
let sequence = 0;
const literal = (v) =>
  v === null ? "null" : "'" + String(v).replaceAll("'", "''") + "'";
function pg(
  sql,
  {
    actor,
    hold = 0,
    timeout = 60000,
    prelude = "",
    verbosity = "sqlstate",
  } = {},
) {
  const number = ++sequence;
  const id = actor?.id || "";
  const role = actor?.role || "authenticated";
  const settings = actor
    ? `set local request.jwt.claim.sub=${literal(id)}; set local request.jwt.claim.role=${literal(role)}; set local request.jwt.claims=${literal(JSON.stringify({ sub: id, role }))}; set local role ${role};`
    : "";
  const input = `\\set ON_ERROR_STOP on\n\\set VERBOSITY ${verbosity}\nset search_path=public,extensions; begin; set local statement_timeout='45s'; ${prelude} ${settings}\nselect json_build_object('backend_pid',pg_backend_pid())::text;\n${sql}\n${hold ? `do $$begin perform pg_sleep(${hold}); end$$;` : ""}\ncommit;\n`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "supabase_admin",
        "-h",
        "/run/postgresql",
        "-d",
        database,
        "-X",
        "-q",
        "-t",
        "-A",
        "-f",
        "-",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => child.kill(), timeout);
    child.stdout.on("data", (b) => (stdout += b));
    child.stderr.on("data", (b) => (stderr += b));
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      fs.writeFileSync(
        path.join(privateDir, `connection-${number}.log`),
        stderr,
      );
      const rows = stdout
        .split(/\r?\n/)
        .filter((s) => s.startsWith("{") || s.startsWith("["))
        .map((s) => JSON.parse(s));
      const pid = rows.shift()?.backend_pid;
      if (pid) backendPids.add(pid);
      if (code !== 0) {
        const e = Error("Local PostgreSQL operation failed");
        e.sqlstate =
          stderr.match(/ERROR:\s+([0-9A-Z]{5})/)?.[1] || "LOCAL_ERROR";
        e.backendPid = pid;
        return reject(e);
      }
      resolve({ rows, pid, stderr });
    });
    child.stdin.end(input);
  });
}
const value = async (sql, options) =>
  (
    await pg(`select json_build_object('value',(${sql}))::text;`, options)
  ).rows.at(-1).value;
const commandValue = async (sql, options) =>
  (await pg(sql, options)).rows.at(-1).value;
async function check(name, fn) {
  try {
    await fn();
    report.results.push({ name, status: "PASS" });
  } catch (e) {
    report.results.push({
      name,
      status: "FAIL",
      reason: e.sqlstate || e.code || "ASSERTION_FAILED",
    });
  }
  console.log(`${report.results.at(-1).status}: ${name}`);
}
async function denied(fn, codes = ["42501"]) {
  await assert.rejects(fn, (e) => codes.includes(e.sqlstate));
}
const actor = {
  a: { id: randomUUID() },
  b: { id: randomUUID() },
  manager: { id: randomUUID() },
  admin: { id: randomUUID() },
  inactive: { id: randomUUID() },
  invalid: { id: randomUUID() },
  anon: { id: "", role: "anon" },
  bench: { id: randomUUID() },
};
const payload = (phone, name = "Cliente sintético") => ({
  name,
  phone,
  interest_profile: { purpose: "compra" },
});
const save = (
  who,
  p,
  { id = null, revision = null, key = randomUUID(), hold = 0 } = {},
) =>
  value(
    `public.crm_save_quick_client(${id},${revision},${literal(key)}::uuid,${literal(JSON.stringify(p))}::jsonb)`,
    { actor: actor[who], hold },
  );
const tableRows = async (table, where) =>
  value(`select count(*)::int from public.${table} where ${where}`);
const catalog = () =>
  value(
    `select json_build_object('functions',(select json_object_agg(sig,body) from (select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' sig,md5(pg_get_functiondef(p.oid)) body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','crm_private') and p.prokind='f') f),'policies',(select md5(string_agg(row(p.*)::text,',' order by schemaname,tablename,policyname)) from pg_policies p),'grants',(select md5(string_agg(n.nspname||c.relname||coalesce(c.relacl::text,''),',' order by n.nspname,c.relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','auth','storage','crm_private','supabase_migrations')),'tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname='public'),'columns',(select count(*) from information_schema.columns where table_schema='public'),'indexes',(select count(*) from pg_indexes where schemaname in ('public','crm_private')),'constraints',(select count(*) from pg_constraint k join pg_namespace n on n.oid=k.connamespace where n.nspname in ('public','crm_private')),'triggers',(select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='public'))`,
  );
const dataState = () =>
  value(
    `select json_build_object('clients',(select md5(coalesce(string_agg((to_jsonb(t)-'interest_profile'-'interest_revision')::text,',' order by id),'')) from public.clients t),'tasks',(select md5(coalesce(string_agg((to_jsonb(t)-'quick_action_id')::text,',' order by id),'')) from public.tasks t),'visits',(select md5(coalesce(string_agg((to_jsonb(t)-'quick_action_id')::text,',' order by id),'')) from public.visits t),'audit',(select count(*) from public.audit_logs),'events',(select count(*) from public.crm_event_log),'history',(select string_agg(version,',' order by version) from supabase_migrations.schema_migrations))`,
  );
let clientA, clientB, propertyA;
try {
  assert.equal(
    await value(`current_setting('server_version_num')::int/10000`),
    17,
  );
  assert.equal(
    await value(`select count(*) from supabase_migrations.schema_migrations`),
    21,
  );
  assert.equal(
    await value(
      `to_regprocedure('public.crm_save_quick_client(bigint,bigint,uuid,jsonb)') is null`,
    ),
    true,
    "Already applied locally: use a NEW restore, never replay",
  );
  const before = await catalog(),
    dataBefore = await dataState();
  // The migration has its own single transaction. Apply once, only through the verified local socket.
  await pg(migration.replace(/^begin;/m, "").replace(/^commit;/m, ""));
  const after = await catalog();
  await check(
    "migration: exact expansion, unchanged previous functions/RLS/grants/data/history",
    async () => {
      assert.deepEqual(await dataState(), dataBefore);
      assert.equal(after.tables, before.tables);
      assert.equal(after.columns - before.columns, 4);
      assert.equal(after.indexes - before.indexes, 3);
      assert.equal(after.constraints - before.constraints, 4);
      assert.equal(after.triggers - before.triggers, 1);
      assert.equal(
        Object.keys(after.functions).length -
          Object.keys(before.functions).length,
        6,
      );
      assert.equal(after.policies, before.policies);
      assert.equal(after.grants, before.grants);
      for (const [name, body] of Object.entries(before.functions))
        assert.equal(after.functions[name], body);
    },
  );
  assert.equal(
    report.results.at(-1).status,
    "PASS",
    "Migration expansion mismatch; stop before synthetic writes",
  );
  await pg(
    Object.entries(actor)
      .filter(([k]) => !["invalid", "anon"].includes(k))
      .map(
        ([k, a]) =>
          `insert into auth.users(id,aud,role,email) values(${literal(a.id)},'authenticated','authenticated',${literal(`stage03c-${a.id}@example.invalid`)}); insert into public.user_roles(id,role) values(${literal(a.id)},${literal(["manager", "admin"].includes(k) ? k : "broker")}) on conflict(id) do update set role=excluded.role; insert into public.brokers(id,name,active,phone) values(${literal(a.id)},${literal("Fixture " + k)},${k !== "inactive"},'83900000000');`,
      )
      .join("\n"),
  );
  clientA = await save("a", payload("83900000001"));
  clientB = await save("b", payload("83900000002"));
  propertyA = await commandValue(
    `with p as (insert into public.properties(title,slug,description,location,category,price,owner_id,broker_id,workflow_status,publish_on_site,presentation_enabled) values('Fixture local',${literal("stage03c-" + randomUUID())},'Synthetic only','Fixture','casas','100000',${literal(actor.a.id)},${literal(actor.a.id)},'rascunho',false,true) returning id) select json_build_object('value',id)::text from p;`,
  );
  await check(
    "concurrency: different action IDs, one private duplicate winner",
    async () => {
      const p = payload("83900000101");
      const results = await Promise.allSettled([
        save("a", p, { hold: 0.4 }),
        save("a", p, { hold: 0.4 }),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        results.find((r) => r.status === "rejected").reason.sqlstate,
        "23505",
      );
      assert.equal(
        await tableRows(
          "clients",
          `broker_id=${literal(actor.a.id)} and phone='5583900000101'`,
        ),
        1,
      );
    },
  );
  await check(
    "concurrency: same action and payload return same receipt exactly once",
    async () => {
      const key = randomUUID(),
        p = payload("83900000102");
      const r = await Promise.all([
        save("a", p, { key, hold: 0.4 }),
        save("a", p, { key, hold: 0.4 }),
      ]);
      assert.deepEqual(r[0], r[1]);
      assert.equal(
        await tableRows(
          "crm_event_log",
          `idempotency_key=${literal("client-save:" + actor.a.id + ":" + key)}`,
        ),
        1,
      );
    },
  );
  await check(
    "concurrency: one action cannot be reused for different payloads",
    async () => {
      const key = randomUUID();
      const r = await Promise.allSettled([
        save("a", payload("83900000103", "Fixture first"), { key, hold: 0.4 }),
        save("a", payload("83900000104", "Fixture second"), { key, hold: 0.4 }),
      ]);
      assert.equal(r.filter((v) => v.status === "fulfilled").length, 1);
      assert.equal(
        r.find((v) => v.status === "rejected").reason.sqlstate,
        "22023",
      );
    },
  );
  await check(
    "concurrency: stale simultaneous edit loses without overwrite",
    async () => {
      const r = await Promise.allSettled([
        save("a", payload("83900000001", "Fixture edit one"), {
          id: clientA.id,
          revision: 0,
          hold: 0.4,
        }),
        save("a", payload("83900000001", "Fixture edit two"), {
          id: clientA.id,
          revision: 0,
          hold: 0.4,
        }),
      ]);
      assert.equal(r.filter((v) => v.status === "fulfilled").length, 1);
      assert.equal(
        r.find((v) => v.status === "rejected").reason.sqlstate,
        "40001",
      );
      assert.equal(
        await value(
          `select interest_revision from public.clients where id=${clientA.id}`,
        ),
        1,
      );
    },
  );
  await check(
    "duplicate and normalization: DDD55 aliases and incomplete explicit prefixes",
    async () => {
      await save("a", payload("(55) 90000-0000"));
      await denied(() => save("a", payload("+55 (55) 90000-0000")), ["23505"]);
      await denied(() => save("a", payload("0055 (55) 90000-0000")), ["23505"]);
      for (const phone of ["+55 (83) 9000-00", "0055 (83) 9000-00"])
        await denied(() => save("a", payload(phone)), ["22023"]);
    },
  );
  await check(
    "private portfolios: B may duplicate a phone but cannot access A",
    async () => {
      await save("b", payload("83900000001"));
      assert.equal(
        await value(
          `select count(*) from public.clients where id=${clientA.id}`,
          { actor: actor.b },
        ),
        0,
      );
      assert.equal(
        await value(
          `select count(*) from public.clients where id=${clientB.id}`,
          { actor: actor.a },
        ),
        0,
      );
      await denied(() =>
        value(`public.crm_client_timeline(${clientB.id},0)`, {
          actor: actor.a,
        }),
      );
      await denied(() =>
        value(`public.crm_client_timeline(${clientA.id},0)`, {
          actor: actor.b,
        }),
      );
      await denied(() =>
        save("b", payload("83900000001"), { id: clientA.id, revision: 1 }),
      );
    },
  );
  for (const who of ["manager", "admin", "anon", "invalid", "inactive"])
    await check(
      `security: ${who} cannot read/alter/record private A client`,
      async () => {
        await denied(() =>
          value(`public.crm_client_timeline(${clientA.id},0)`, {
            actor: actor[who],
          }),
        );
        await denied(() =>
          save(who, payload("83900000001"), { id: clientA.id, revision: 1 }),
        );
        await denied(() =>
          value(
            `public.crm_record_client_contact(${clientA.id},${literal(randomUUID())})`,
            { actor: actor[who] },
          ),
        );
      },
    );
  await check(
    "security: ownership injection rejected at RPC and direct-table boundaries",
    async () => {
      await denied(
        () => save("a", { ...payload("83900000110"), broker_id: actor.b.id }),
        ["22023"],
      );
      await denied(() =>
        commandValue(
          `with r as(update public.clients set broker_id=${literal(actor.b.id)} where id=${clientA.id} returning id)select json_build_object('value',count(*))::text from r;`,
          { actor: actor.a },
        ),
      );
      assert.equal(
        await value(
          `select broker_id from public.clients where id=${clientA.id}`,
        ),
        actor.a.id,
      );
    },
  );
  await check(
    "events: simultaneous real-contact retry records one event, no payload leakage",
    async () => {
      const key = randomUUID();
      await Promise.all([
        value(
          `public.crm_record_client_contact(${clientA.id},${literal(key)})`,
          { actor: actor.a, hold: 0.3 },
        ),
        value(
          `public.crm_record_client_contact(${clientA.id},${literal(key)})`,
          { actor: actor.a, hold: 0.3 },
        ),
      ]);
      assert.equal(
        await tableRows(
          "crm_event_log",
          `idempotency_key=${literal("client-contact:" + actor.a.id + ":" + clientA.id + ":" + key)}`,
        ),
        1,
      );
    },
  );
  for (const table of ["tasks", "visits"])
    await check(
      `agenda: concurrent ${table} retry and one audit INSERT`,
      async () => {
        const key = randomUUID();
        const columns =
          table === "tasks"
            ? "title,client_id,broker_id,due_at,quick_action_id"
            : "client_id,broker_id,scheduled_at,property_id,quick_action_id";
        const values =
          table === "tasks"
            ? `'Fixture return',${clientA.id},${literal(actor.a.id)},now(),${literal(key)}`
            : `${clientA.id},${literal(actor.a.id)},now(),${propertyA},${literal(key)}`;
        const query = `with r as(insert into public.${table}(${columns}) values(${values}) on conflict(quick_action_id) do nothing returning id) select json_build_object('value',coalesce(json_agg(id),'[]'::json))::text from r;`;
        const result = await Promise.all([
          commandValue(query, { actor: actor.a, hold: 0.3 }),
          commandValue(query, { actor: actor.a, hold: 0.3 }),
        ]);
        assert.equal(result.flat().length, 1);
        const id = result.flat()[0];
        assert.equal(
          await tableRows(
            "audit_logs",
            `entity=${literal(table)} and entity_id=${literal(id)} and action='INSERT'`,
          ),
          1,
        );
        assert.equal(
          await value(
            `select count(*) from public.${table} where quick_action_id=${literal(key)}`,
            { actor: actor.b },
          ),
          0,
        );
      },
    );
  await check(
    "legacy Etapa02: old client and agenda payloads still work with defaults",
    async () => {
      const id = await commandValue(
        `with c as(insert into public.clients(name,phone,broker_id)values('Legacy synthetic',null,${literal(actor.a.id)})returning id)select json_build_object('value',id)::text from c;`,
        { actor: actor.a },
      );
      assert.deepEqual(
        await value(
          `select interest_profile from public.clients where id=${id}`,
          { actor: actor.a },
        ),
        {},
      );
      await commandValue(
        `with t as(insert into public.tasks(title,client_id,broker_id,due_at)values('Legacy task',${id},${literal(actor.a.id)},now())returning quick_action_id)select json_build_object('value',quick_action_id)::text from t;`,
        { actor: actor.a },
      );
      await pg(
        `update public.clients set notes='Legacy synthetic update' where id=${id};`,
        { actor: actor.a },
      );
    },
  );
  await check(
    "application rollback contract: legacy update preserves new interest profile and audit",
    async () => {
      const interest = {
        purpose: "compra",
        city: "Cidade sintética",
        budget_max: "600000",
        financing: true,
      };
      const c = await save("a", {
        ...payload("83900000112"),
        interest_profile: interest,
      });
      await pg(
        `update public.clients set notes='Legacy UI patch, synthetic only' where id=${c.id};`,
        { actor: actor.a },
      );
      assert.deepEqual(
        await value(
          `select interest_profile from public.clients where id=${c.id}`,
          { actor: actor.a },
        ),
        interest,
      );
      assert.equal(
        await value(
          `select interest_revision from public.clients where id=${c.id}`,
          { actor: actor.a },
        ),
        1,
      );
      assert.ok(
        (await tableRows(
          "audit_logs",
          `entity='clients' and entity_id=${literal(c.id)}`,
        )) >= 2,
      );
    },
  );
  await check(
    "timeline: authorized summaries only, no notes/email/phone/snapshots",
    async () => {
      const secret = "SYNTHETIC_PRIVATE_" + randomUUID();
      const c = await save("a", {
        ...payload("83900000111"),
        notes: secret,
        email: "synthetic-private@example.invalid",
      });
      const rows = await value(`public.crm_client_timeline(${c.id},0)`, {
        actor: actor.a,
      });
      assert.ok(rows.length > 0 && rows.length <= 51);
      for (const row of rows)
        assert.deepEqual(Object.keys(row).sort(), [
          "created_at",
          "description",
          "id",
        ]);
      assert.ok(!JSON.stringify(rows).includes(secret));
      assert.ok(!JSON.stringify(rows).includes("83900000111"));
    },
  );
  report.independentBackendConnectionsObserved = backendPids.size;
  assert.ok(backendPids.size > 20, "Independent connections not observed");
  // Synthetic load only. No historical audit rows are changed or deleted.
  const benchClient = await save("bench", payload("83900000999"));
  const target = benchClient.id;
  const related = {};
  for (const [who, client] of [
    ["bench", target],
    ["b", clientB.id],
  ]) {
    const owner = actor[who].id;
    const property = await commandValue(
      `with p as(insert into public.properties(title,slug,description,location,category,price,owner_id,broker_id,workflow_status,publish_on_site,presentation_enabled)values('Benchmark synthetic',${literal("bench-" + randomUUID())},'Synthetic only','Fixture','casas','100000',${literal(owner)},${literal(owner)},'rascunho',false,true)returning id)select json_build_object('value',id)::text from p;`,
    );
    const tasks = await commandValue(
      `with r as(insert into public.tasks(title,client_id,broker_id,due_at)select 'Benchmark synthetic',${client},${literal(owner)},now() from generate_series(1,2000)returning id)select json_build_object('value',json_agg(id))::text from r;`,
      { actor: actor[who] },
    );
    const visits = await commandValue(
      `with r as(insert into public.visits(client_id,property_id,broker_id,scheduled_at)select ${client},${property},${literal(owner)},now() from generate_series(1,1000)returning id)select json_build_object('value',json_agg(id))::text from r;`,
      { actor: actor[who] },
    );
    const proposals = await commandValue(
      `with r as(insert into public.proposals(client_id,property_id,broker_id,value)select ${client},${property},${literal(owner)},100000 from generate_series(1,500)returning id)select json_build_object('value',json_agg(id))::text from r;`,
      { actor: actor[who] },
    );
    const negotiations = await commandValue(
      `with r as(insert into public.negotiations(proposal_id)select unnest(array[${proposals}]::bigint[])returning id)select json_build_object('value',json_agg(id))::text from r;`,
      { actor: actor[who] },
    );
    const shares = await commandValue(
      `with r as(insert into public.marketing_shares(owner_id,client_id,property_ids,title,expires_at)select ${literal(owner)},${client},array[${property}]::bigint[],'Benchmark synthetic',now()+interval '1 day' from generate_series(1,100)returning id)select json_build_object('value',json_agg(id))::text from r;`,
      { actor: actor[who] },
    );
    related[who] = {
      clients: [client],
      tasks,
      visits,
      proposals,
      negotiations,
      marketing_shares: shares,
    };
  }
  report.benchmarkWorkload = {
    validRelatedRecordsPerPortfolio: {
      clients: 1,
      tasks: 2000,
      visits: 1000,
      proposals: 500,
      negotiations: 500,
      presentations: 100,
    },
    portfolios: 2,
    auditTargetFraction:
      "1/19; existing authorized vs foreign relationships, no fabricated orphan IDs",
    cache:
      "warm cache, five instrumented server executions; not production SLA",
  };
  const relatedId = (who) =>
    `case (i%6) ${["clients", "tasks", "visits", "proposals", "negotiations", "marketing_shares"].map((table, index) => `when ${index} then (array[${related[who][table]}]::bigint[])[(i%${related[who][table].length}+1)::int]::text`).join(" ")} end`;
  let seeded = 0;
  function plans(text) {
    const output = [];
    let start = -1,
      depth = 0,
      string = false,
      escape = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (string) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') string = false;
        continue;
      }
      if (ch === '"' && depth) {
        string = true;
        continue;
      }
      if (ch === "{") {
        if (!depth) start = i;
        depth++;
      }
      if (ch === "}" && depth && !--depth) {
        try {
          output.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          /* Non-JSON notices are not plans. */
        }
      }
    }
    return output;
  }
  function summarize(node, out = []) {
    out.push({
      type: node["Node Type"],
      relation: node["Relation Name"] || null,
      actualRows: node["Actual Rows"],
      loops: node["Actual Loops"],
      rowsRemoved: node["Rows Removed by Filter"] || 0,
      sharedHitBlocks: node["Shared Hit Blocks"] || 0,
      sharedReadBlocks: node["Shared Read Blocks"] || 0,
    });
    for (const child of node.Plans || []) summarize(child, out);
    return out;
  }
  for (const volume of [1000, 10000, 100000, 300000]) {
    await pg(
      `insert into public.audit_logs(actor_id,entity,entity_id,action,changed_fields,created_at) select ${literal(actor.bench.id)}::uuid,(array['clients','tasks','visits','proposals','negotiations','marketing_shares'])[(i%6+1)::int],case when i%19=0 then (${relatedId("bench")}) else (${relatedId("b")}) end,'UPDATE',array['interest_profile'],now()-i*interval '1 second' from generate_series(${seeded + 1},${volume}) i; analyze public.audit_logs; analyze public.tasks; analyze public.visits; analyze public.proposals; analyze public.negotiations; analyze public.marketing_shares;`,
    );
    seeded = volume;
    for (const page of [0, 20, 200]) {
      const measurements = [];
      let detailed;
      for (let sample = 0; sample < 5; sample++) {
        const prelude =
          "load 'auto_explain'; set local auto_explain.log_min_duration=0; set local auto_explain.log_nested_statements=on; set local auto_explain.log_analyze=on; set local auto_explain.log_buffers=on; set local auto_explain.log_timing=on; set local auto_explain.log_parameter_max_length=0; set local auto_explain.log_format=json; set local auto_explain.log_level=notice;";
        const q = await pg(
          `select json_build_object('value',public.crm_client_timeline(${target},${page}))::text;`,
          { actor: actor.bench, timeout: 90000, prelude, verbosity: "default" },
        );
        const inner = plans(q.stderr).find(
          (p) =>
            p["Query Text"]?.includes("jsonb_agg") &&
            p["Query Text"]?.includes("audit_logs"),
        );
        assert.ok(
          inner?.Plan,
          "Nested EXPLAIN ANALYZE not available; do not claim plan coverage",
        );
        const ms = inner["Execution Time"] ?? inner.Plan["Actual Total Time"];
        assert.ok(
          Number.isFinite(ms) && ms >= 0,
          "Measured execution time required",
        );
        measurements.push(ms);
        detailed = summarize(inner.Plan);
        assert.ok(q.rows.at(-1).value.length <= 51);
      }
      measurements.sort((a, b) => a - b);
      report.benchmarks.push({
        syntheticEvents: volume,
        page,
        samples: 5,
        medianMs: measurements[2],
        maxMs: measurements[4],
        planNodes: detailed,
      });
    }
  }
  report.timelineAcceptance = {
    basis:
      "Local engineering threshold, not a production SLA: max <=500ms at 100k, <=1500ms at 300k synthetic events; five measured nested executions per page",
    passed: report.benchmarks.every(
      (b) => b.maxMs <= (b.syntheticEvents <= 100000 ? 500 : 1500),
    ),
  };
  if (!report.timelineAcceptance.passed)
    report.pending.push(
      "Timeline performance requires correction before remote authorization",
    );
  report.archiveUnchanged =
    hash(fs.readFileSync(path.join(backupDir, manifest.archive))) ===
    manifest.archive_sha256.toLowerCase();
  report.recommendation =
    report.results.every((r) => r.status === "PASS") &&
    report.timelineAcceptance.passed &&
    report.archiveUnchanged
      ? "LOCAL_REHEARSAL_PASS"
      : "BLOCKED";
} catch (e) {
  report.recommendation = "BLOCKED";
  report.infrastructureError = e.sqlstate || e.code || "LOCAL_REHEARSAL_FAILED";
  fs.writeFileSync(path.join(privateDir, "failure.txt"), String(e.stack || e));
} finally {
  report.finishedUTC = new Date().toISOString();
  fs.writeFileSync(
    path.join(privateDir, "rehearsal-report.json"),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(
    "tests/security/crm-quick-service-postgres-20261105.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      recommendation: report.recommendation,
      passed: report.results.filter((r) => r.status === "PASS").length,
      failed: report.results.filter((r) => r.status === "FAIL").length,
      infrastructureError: report.infrastructureError || null,
      benchmarkSamples: report.benchmarks.length,
    }),
  );
}
if (report.recommendation !== "LOCAL_REHEARSAL_PASS") process.exitCode = 1;
