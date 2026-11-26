import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";
import { demoData, DEMO_PROFILES } from "./fixtures/operational-demo-data.mjs";
function compile(file, deps = {}) { const m = new Module(file);m.require = name => deps[name] || Module.createRequire(import.meta.url)(name);m._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);return m.exports; }
const filters = compile("lib/property-filters.ts"), ops = compile("lib/crm/operations.ts", { "../property-filters": filters });
const now = new Date("2026-11-25T15:00:00Z"), data = demoData(now), a = DEMO_PROFILES[0].id;
const release = compile("lib/crm/release-scope.ts");

test("restricted preview denies unverified routes on the server and fails closed without scope", () => {
  const env = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/crm-operational-priority-20261125" };
  assert.equal(release.operationalRouteBlocked("/admin", env), true);
  const enabled = { ...env, CRM_OPERATIONAL_SCOPE: "daily-operations" };
  for (const route of ["/admin", "/admin/agenda", "/admin/contatos", "/admin/imoveis"]) assert.equal(release.operationalRouteBlocked(route, enabled), false);
  for (const route of ["/admin/equipe", "/admin/apresentacoes/", "/api/presentation-open", "/api/admin/brokers", "/apresentacoes/test"]) assert.equal(release.operationalRouteBlocked(route, enabled), true);
  assert.equal(release.operationalRouteBlocked("/admin/agenda", { ...enabled, VERCEL_ENV: "production" }), true);
  assert.equal(release.operationalRouteBlocked("/admin/equipe", {}), false);
  const { proxy } = compile("proxy.ts", { "@/lib/crm/release-scope": release });
  const previous = { VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF };
  Object.assign(process.env, env);
  try { assert.equal(proxy({ nextUrl: new URL("https://preview.invalid/admin/equipe") }).status, 403); }
  finally { for (const [k,v] of Object.entries(previous)) { if(v===undefined) delete process.env[k]; else process.env[k]=v; } }
});

test("canonical applied SQL is versioned without rewriting approved bytes", () => {
  const crypto = Module.createRequire(import.meta.url)("node:crypto");
  for (const [name, sha] of [["20261118163136_crm_preserve_omitted_client_interest.sql", "32398a29e75d062baac775cbf449648ce737f60882486a09ce0492f8c947bb33"], ["20261125140440_crm_quick_client_revision_conflict.sql", "f7eaf871f07b25c4b23d690efb079557804dd4f0dcdfba179420c6ca0d7bbd0a"]]) {
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync("supabase/migrations/"+name)).digest("hex"), sha);
  }
});

test("operational client editor recognizes the approved PT409 contract without replacing native serialization", () => {
  const source = fs.readFileSync("components/crm/ClientEditor.tsx", "utf8");
  assert.match(source, /PT409:\s*"O cadastro mudou em outra sessão/);
  assert.match(source, /"40001":\s*"O cadastro mudou em outra sessão/);
});
test("daily priorities are personal, deterministic and never expose B's task", () => { const rows = ops.dailyQueue(data, a, now);assert.equal(rows[0].id, 1);assert.ok(rows.every(r => r.title !== "Retorno privado B"));assert.deepEqual(rows, ops.dailyQueue(data, a, now));assert.deepEqual(ops.dailyQueue(data, "", now), []); });
test("completed/cancelled tasks and invalid dates are excluded", () => { const d = structuredClone(data);d.tasks[0].status = "concluida";d.tasks[1].due_at = "invalid";assert.ok(!ops.dailyQueue(d, a, now).some(r => r.kind === "task" && [1, 2].includes(r.id))); });
test("business civil day handles UTC midnight without local-machine timezone", () => { assert.equal(ops.inAgendaPeriod("2026-11-26T01:00:00Z", "today", now), true);assert.equal(ops.inAgendaPeriod("2026-11-26T04:00:00Z", "today", now), false);assert.equal(ops.inAgendaPeriod("bad", "all", now), false); });
test("week includes seven civil days and excludes more distant dates", () => { assert.equal(ops.inAgendaPeriod("2026-12-02T15:00:00Z", "week", now), true);assert.equal(ops.inAgendaPeriod("2026-12-03T15:00:00Z", "week", now), false); });

test("agenda separates pending, concluded and cancelled without reopening them", () => {
  for (const [kind, closed] of [["task", ["concluida", "cancelada"]], ["visit", ["realizada", "cancelada"]]]) {
    for (const status of closed) {
      assert.equal(ops.agendaStatusMatches(kind, status, "pending"), false);
      assert.equal(ops.agendaStatusMatches(kind, status, "closed"), true);
      assert.equal(ops.agendaStatusMatches(kind, status, "all"), true);
    }
    assert.equal(ops.agendaStatusMatches(kind, "agendada", "closed"), false);
  }
});
test("portfolio budget never treats unknown price as zero", () => { const f = { ...ops.EMPTY_PORTFOLIO_FILTERS, maxPrice: "600000" };assert.deepEqual(ops.filterPortfolio(data.properties, f).map(p => p.id), [1]); });
test("combined city/category/bedroom/availability filters use only supplied authorized rows", () => { const f = { city: "Campina Grande", category: "casas", maxPrice: "", bedrooms: "3", available: true };assert.deepEqual(ops.filterPortfolio(data.properties, f).map(p => p.id), [2]); });
test("capture gaps resolve only the current owner's owner contact link", () => { const gaps = ops.captureGaps(data.properties[2], data, a);assert.ok(gaps.includes("Fotos pendentes"));assert.ok(!gaps.includes("Vínculo de proprietário não carregado"));assert.ok(ops.captureGaps(data.properties[2], data, DEMO_PROFILES[1].id).includes("Vínculo de proprietário não carregado")); });
test("proposal readiness distinguishes missing fields without inventing document approval", () => { const rows = ops.proposalGaps(data, a);assert.deepEqual(rows[0].gaps, []);assert.ok(rows[1].gaps.includes("Valor pendente"));assert.deepEqual(ops.proposalGaps(data, DEMO_PROFILES[1].id), []); });
