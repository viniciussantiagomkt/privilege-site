import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";
import { demoData, DEMO_PROFILES } from "./fixtures/operational-demo-data.mjs";
function compile(file, deps = {}) { const m = new Module(file);m.require = name => deps[name] || Module.createRequire(import.meta.url)(name);m._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);return m.exports; }
const filters = compile("lib/property-filters.ts"), ops = compile("lib/crm/operations.ts", { "../property-filters": filters });
const now = new Date("2026-11-25T15:00:00Z"), data = demoData(now), a = DEMO_PROFILES[0].id;
test("daily priorities are personal, deterministic and never expose B's task", () => { const rows = ops.dailyQueue(data, a, now);assert.equal(rows[0].id, 1);assert.ok(rows.every(r => r.title !== "Retorno privado B"));assert.deepEqual(rows, ops.dailyQueue(data, a, now));assert.deepEqual(ops.dailyQueue(data, "", now), []); });
test("completed/cancelled tasks and invalid dates are excluded", () => { const d = structuredClone(data);d.tasks[0].status = "concluida";d.tasks[1].due_at = "invalid";assert.ok(!ops.dailyQueue(d, a, now).some(r => r.kind === "task" && [1, 2].includes(r.id))); });
test("business civil day handles UTC midnight without local-machine timezone", () => { assert.equal(ops.inAgendaPeriod("2026-11-26T01:00:00Z", "today", now), true);assert.equal(ops.inAgendaPeriod("2026-11-26T04:00:00Z", "today", now), false);assert.equal(ops.inAgendaPeriod("bad", "all", now), false); });
test("week includes seven civil days and excludes more distant dates", () => { assert.equal(ops.inAgendaPeriod("2026-12-02T15:00:00Z", "week", now), true);assert.equal(ops.inAgendaPeriod("2026-12-03T15:00:00Z", "week", now), false); });
test("portfolio budget never treats unknown price as zero", () => { const f = { ...ops.EMPTY_PORTFOLIO_FILTERS, maxPrice: "600000" };assert.deepEqual(ops.filterPortfolio(data.properties, f).map(p => p.id), [1]); });
test("combined city/category/bedroom/availability filters use only supplied authorized rows", () => { const f = { city: "Campina Grande", category: "casas", maxPrice: "", bedrooms: "3", available: true };assert.deepEqual(ops.filterPortfolio(data.properties, f).map(p => p.id), [2]); });
test("capture gaps resolve only the current owner's owner contact link", () => { const gaps = ops.captureGaps(data.properties[2], data, a);assert.ok(gaps.includes("Fotos pendentes"));assert.ok(!gaps.includes("Vínculo de proprietário não carregado"));assert.ok(ops.captureGaps(data.properties[2], data, DEMO_PROFILES[1].id).includes("Vínculo de proprietário não carregado")); });
test("proposal readiness distinguishes missing fields without inventing document approval", () => { const rows = ops.proposalGaps(data, a);assert.deepEqual(rows[0].gaps, []);assert.ok(rows[1].gaps.includes("Valor pendente"));assert.deepEqual(ops.proposalGaps(data, DEMO_PROFILES[1].id), []); });
