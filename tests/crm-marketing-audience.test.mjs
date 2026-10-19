import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";
const file = new URL("../lib/crm/marketing.ts", import.meta.url);
const loadedModule = new Module(file.pathname);
loadedModule._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  file.pathname,
);
const { approvedAsset, assetsForProperty } = loadedModule.exports;
const asset = {
  id: 1,
  scope: "institutional",
  audience: "team",
  status: "aprovado",
  visibility: "public",
  current_version_id: 2,
  expires_at: null,
};
test("public presentation excludes personal, selected, pending and expired marketing", () => {
  assert.equal(approvedAsset(asset), true);
  for (const patch of [
    { scope: "personal" },
    { audience: "owner" },
    { audience: "selected" },
    { status: "pendente" },
    { visibility: "internal" },
    { current_version_id: null },
    { expires_at: "2000-01-01T00:00:00Z" },
  ])
    assert.equal(approvedAsset({ ...asset, ...patch }), false);
});
test("public material requires a relation to the chosen property or development", () => {
  assert.equal(assetsForProperty([asset], [], [], 10).length, 0);
  assert.equal(
    assetsForProperty([asset], [{ asset_id: 1, property_id: 10 }], [], 10)
      .length,
    1,
  );
  assert.equal(
    assetsForProperty(
      [asset],
      [{ asset_id: 1, development_id: 20 }],
      [{ development_id: 20, property_id: 10 }],
      10,
    ).length,
    1,
  );
  assert.equal(
    assetsForProperty(
      [{ ...asset, audience: "selected" }],
      [{ asset_id: 1, property_id: 10 }],
      [],
      10,
    ).length,
    0,
  );
});
