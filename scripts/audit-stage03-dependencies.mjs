import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const cliFlag = process.argv.indexOf("--npm-cli");
const candidates = [
  process.env.npm_execpath,
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
  join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
].filter(Boolean);
const cli = cliFlag >= 0 ? resolve(process.argv[cliFlag + 1]) : candidates.find(existsSync);
if (!cli || !existsSync(cli)) throw new Error("Pass --npm-cli pointing to the installed npm/bin/npm-cli.js.");
const run = args => {
  const out = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  if (out.error || out.signal || ![0, 1].includes(out.status)) throw new Error("npm command failed; output suppressed to avoid exposing local settings.");
  return out;
};
const npmVersion = run(["--version"]).stdout.trim();
if (!/^\d+\.\d+\.\d+$/.test(npmVersion)) throw new Error("Unexpected npm version.");
const lockPath = "package-lock.json";
const lockBytes = readFileSync(lockPath);
const lock = JSON.parse(lockBytes);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const results = [];
for (const scope of ["complete", "production"]) {
  const args = ["audit", "--package-lock-only", "--json",
    scope === "complete" ? "--include=dev" : "--omit=dev",
    "--registry=https://registry.npmjs.org/"];
  const out = run(args);
  let report;
  try { report = JSON.parse(out.stdout); } catch { throw new Error("Audit did not return JSON; raw output suppressed."); }
  if (report.error || !report.metadata?.vulnerabilities) throw new Error("Registry audit failed; no result recorded.");
  results.push({
    scope, args, exitCode: out.status, totals: report.metadata.vulnerabilities,
    packages: Object.values(report.vulnerabilities || {}).map(item => ({
      name: item.name, severity: item.severity, direct: item.isDirect,
      versions: [...new Set((item.nodes || []).map(node => lock.packages[node]?.version).filter(Boolean))],
      devOnlyInLock: (item.nodes || []).every(node => lock.packages[node]?.dev === true),
      via: item.via, fixAvailable: item.fixAvailable,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  });
}
if (hash(readFileSync(lockPath)) !== hash(lockBytes)) throw new Error("Lockfile changed unexpectedly.");
const evidence = {
  generatedAtUTC: new Date().toISOString(), nodeVersion: process.version,
  npmVersion, platform: process.platform, registry: "https://registry.npmjs.org/",
  lockfileSha256: hash(lockBytes), auditDatabaseIsTimeDependent: true, results,
};
const destination = "tests/security/crm-stage03-dependency-audit-npm-" + npmVersion + ".json";
writeFileSync(destination, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify({ evidence: destination, npmVersion, results: results.map(r => ({ scope: r.scope, totals: r.totals })) }));
