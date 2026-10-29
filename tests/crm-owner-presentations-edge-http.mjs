/** Real staging Edge negatives only. No session, secret, fixtures or mutations. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

const endpoint = "https://sdpqphiooiuglywcmkxv.supabase.co/functions/v1/crm-presentation-media";
const unknown = randomUUID();
const tests = [
  { name: "missing capability", query: "property=1&image=0", status: 404 },
  { name: "malformed capability", query: "token=invalid&property=1&image=0", status: 404 },
  { name: "unknown capability image", query: `token=${unknown}&property=1&image=0`, status: 404 },
  { name: "unknown capability material", query: `token=${unknown}&asset=1`, status: 404 },
  { name: "ambiguous image and material", query: `token=${unknown}&asset=1&property=1&image=0`, status: 404 },
  { name: "negative property id", query: `token=${unknown}&property=-1&image=0`, status: 404 },
  { name: "non-numeric image index", query: `token=${unknown}&property=1&image=invalid`, status: 404 },
  { name: "multiple ranges rejected", query: `token=${unknown}&property=1&image=0`, range: "bytes=0-2,5-7", status: 400 },
  { name: "valid Range does not bypass unknown capability", query: `token=${unknown}&property=1&image=0`, range: "bytes=0-2", status: 404 },
  { name: "POST unsupported", query: "", method: "POST", status: 405 },
  { name: "HEAD unsupported", query: "", method: "HEAD", status: 405 },
];
const results = [];
for (const test of tests) {
  try {
    const response = await fetch(`${endpoint}?${test.query}`, {
      method: test.method || "GET",
      headers: test.range ? { Range: test.range } : {},
      signal: AbortSignal.timeout(30000),
      redirect: "error",
      cache: "no-store",
    });
    const bytes = (await response.arrayBuffer()).byteLength;
    const noStore = (response.headers.get("cache-control") || "").includes("no-store");
    results.push({ name: test.name, expected: test.status, status: response.status, response_bytes: bytes, no_store: noStore, result: response.status === test.status && bytes === 0 && noStore ? "PASS" : "FAIL" });
  } catch {
    results.push({ name: test.name, result: "BLOCKED", observation: "HTTP unavailable; raw error not retained" });
  }
}
const summary = Object.fromEntries(["PASS", "FAIL", "BLOCKED"].map((status) => [status, results.filter((r) => r.result === status).length]));
await writeFile("tests/security/crm-owner-presentations-edge-http-20261029.json", JSON.stringify({ executed_at: new Date().toISOString(), environment: "Supabase staging sdpqphiooiuglywcmkxv, deployed Edge version 1", authentication: "anonymous, no API key or user JWT supplied", limitation: "Unknown capability is not a real revoked/expired link. No positive bytes/206 streaming, selected record or old-version authorization tested over HTTP.", fixtures_created: false, secrets_or_usable_capability_urls_saved: false, results, summary }, null, 2) + "\n");
console.log(JSON.stringify(summary));
assert.equal(summary.FAIL + summary.BLOCKED, 0);
