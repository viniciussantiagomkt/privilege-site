import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";

test("security work on PR16 cannot trigger automatic deployment", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.git.deploymentEnabled["work/crm-stage03f-controlled-fixes-20261109"], false);
});

test("historical quick-service migration stays immutable during grant hardening", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261105172215_crm_quick_service.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(createHash("sha256").update(sql).digest("hex"), "da0c21248461ef2a7594f12ddc8520c6a60d87fe749a62311cb5c7b646a154fa");
});
