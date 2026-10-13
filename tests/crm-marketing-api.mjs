import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(url, "https://sdpqphiooiuglywcmkxv.supabase.co");
assert.ok(key);
const tests = [];
for (const table of [
  "developers",
  "developments",
  "development_units",
  "marketing_assets",
  "asset_versions",
  "asset_relations",
  "marketing_collections",
  "marketing_collection_items",
  "marketing_favorites",
  "marketing_shares",
  "marketing_share_events",
  "crm_automation_preferences",
  "crm_event_log",
  "asset_imports",
]) {
  tests.push({
    name: `anonymous cannot read ${table}`,
    path: `/rest/v1/${table}?select=*&limit=1`,
    check: (r) => [401, 403].includes(r.status),
  });
}
const token = "00000000-0000-4000-8000-000000099999";
tests.push({
  name: "unknown token returns no presentation",
  path: "/rest/v1/rpc/crm_public_presentation",
  body: { target_token: token },
  check: (r, b) => r.status === 200 && b === null,
});
tests.push({
  name: "opening without consent not recorded",
  path: "/rest/v1/rpc/crm_record_presentation_open",
  body: { target_token: token, event_nonce: token, consented: false },
  check: (r, b) => r.status === 200 && b === false,
});
tests.push({
  name: "anonymous cannot confirm presentation share",
  path: "/rest/v1/rpc/crm_confirm_presentation_share",
  body: { target_share: -920001 },
  check: (r) => [401, 403].includes(r.status),
});
tests.push({
  name: "real Auth rejects invalid password",
  path: "/auth/v1/token?grant_type=password",
  body: {
    email: "crm-synthetic-no-account-20261013@example.invalid",
    password: "Synthetic-Not-A-Real-Password-20261013",
  },
  check: (r, b) => r.status === 400 && b.error_code === "invalid_credentials",
});
const results = await Promise.all(
  tests.map(async (t) => {
    try {
      const r = await fetch(url + t.path, {
        method: t.body ? "POST" : "GET",
        headers: { apikey: key, "Content-Type": "application/json" },
        ...(t.body ? { body: JSON.stringify(t.body) } : {}),
        signal: AbortSignal.timeout(25000),
      });
      const b = await r.json();
      return { name: t.name, passed: t.check(r, b), status: r.status };
    } catch (e) {
      return { name: t.name, passed: false, blocked: e.message };
    }
  }),
);
await writeFile(
  "tests/crm-marketing-api-results.json",
  JSON.stringify(
    {
      environment: "staging",
      authentication: "anonymous and invalid synthetic login",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed),
  }),
);
assert.ok(results.every((r) => r.passed));
