import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const backup = readFileSync(new URL("../scripts/backup-crm-staging.ps1", import.meta.url), "utf8");
const restore = readFileSync(new URL("../scripts/restore-crm-backup-local.ps1", import.meta.url), "utf8");
const fingerprint = readFileSync(new URL("../scripts/crm-backup-schema-fingerprint.sql", import.meta.url), "utf8");
const contract = readFileSync(new URL("../scripts/crm-recovery-contract.ps1", import.meta.url), "utf8");

test("catalog comparison avoids identifier truncation and physical-column gaps", () => {
  assert.match(fingerprint, /set search_path = pg_catalog/);
  assert.match(fingerprint, /nspname::text key/);
  assert.match(fingerprint, /nspowner::regrole::text/);
  assert.match(fingerprint, /row_number\(\) over \(partition by c\.oid order by a\.attnum\)/);
});

test("backup baseline pins exactly the 22 approved migrations, not just a count", () => {
  const versions = backup.match(/\$expectedMigrationVersions = '([^']+)'/)[1].split(",");
  const actual = readdirSync(new URL("../supabase/migrations", import.meta.url))
    .filter(n => n.endsWith(".sql") && !n.endsWith("_crm_stage03_security_surface.sql"))
    .map(n => n.split("_")[0]).sort();
  assert.equal(versions.length, 22);
  assert.deepEqual(versions, actual);
  assert.match(backup, /source\.migration_versions -ne \$expectedMigrationVersions/);
  assert.match(backup, /source\.security_migration_present/);
});
test("backup remains read-only, staging-only, private and outside the repository", () => {
  assert.match(backup, /default_transaction_read_only=on/);
  assert.match(backup, /PGSSLMODE = 'require'/);
  assert.match(backup, /sdpqphiooiuglywcmkxv/);
  assert.match(backup, /LocalApplicationData/);
  assert.match(backup, /AsSecureString/);
  assert.match(backup, /schema_stable_during_backup/);
});
test("restore requires verified 22-version archive and isolated local container", () => {
  for (const marker of ["migration_count -ne 22", "schema_fingerprint", "--single-transaction", "--exit-on-error", "desktop-linux", "npipe:", "network -ne 'none'", "archive_sha256"])
    assert.ok(restore.includes(marker), marker);
});

test("restore has no obsolete backup defaults and pins manifest and algorithm", () => {
  const parameters = restore.slice(0, restore.indexOf("Set-StrictMode"));
  for (const name of ["BackupDirectory", "ExpectedArchiveSha256", "ExpectedArchiveBytes", "ExpectedManifestSha256"]) {
    assert.ok(parameters.includes(name));
    assert.ok(!new RegExp(`\\$${name}\\s*=`).test(parameters));
  }
  assert.equal((parameters.match(/Mandatory=\$true/g) || []).length, 4);
  assert.match(restore, /Assert-RecoveryFingerprint/);
  assert.match(restore, /Assert-RecoveryHistory/);
  assert.match(restore, /foreach \(\$part in \$RecoveryCategories\)/);
  assert.match(backup, /ExpectedBaselineSha256/);
  assert.match(backup, /crm_history = \$platformBefore.crm_history/);
  assert.match(backup, /storage_history = \$platformBefore.storage_history/);
  assert.match(fingerprint, /crm-recovery-catalog-v2/);
  assert.match(fingerprint, /collate "C"/);
  assert.match(contract, /18cfbf5c5b356469e1e95f3aa1b59ba111d82a06/);
});

test("PowerShell contract rejects omitted/extra categories, legacy algorithms and new histories", () => {
  const path = fileURLToPath(new URL("../scripts/crm-recovery-contract.ps1", import.meta.url)).replaceAll("'", "''");
  const command = `$ErrorActionPreference='Stop'; Set-StrictMode -Version Latest;
    . '${path}';
    function Expect-Rejection([scriptblock]$Action) { $rejected=$false; try { & $Action } catch { $rejected=$true }; if(!$rejected){throw 'Unsafe contract accepted'} }
    $categories=[ordered]@{}; foreach($k in $RecoveryCategories){$categories[$k]=[pscustomobject]@{count=1;md5=('a'*32)}};
    $f=[pscustomobject]@{algorithm_version=$RecoveryFingerprintVersion;categories=[pscustomobject]$categories}; Assert-RecoveryFingerprint $f;
    $f.algorithm_version='legacy'; Expect-Rejection {Assert-RecoveryFingerprint $f}; $f.algorithm_version=$RecoveryFingerprintVersion;
    $f.categories.PSObject.Properties.Remove('views'); Expect-Rejection {Assert-RecoveryFingerprint $f};
    $f.categories | Add-Member views ([pscustomobject]@{count=1;md5=('a'*32)}); Assert-RecoveryFingerprint $f;
    $f.categories | Add-Member unexpected ([pscustomobject]@{count=1;md5=('a'*32)}); Expect-Rejection {Assert-RecoveryFingerprint $f};
    $crm=@($RecoveryCrmVersions.Split(',') | ForEach-Object {[pscustomobject]@{version=$_}});
    $storage=@(0..80 | ForEach-Object {[pscustomobject]@{id=$_;name='historical';hash='historical'}});
    $storage[80].name='revoke-extra-lifecycle-postgres-grants'; $storage[80].hash='18cfbf5c5b356469e1e95f3aa1b59ba111d82a06';
    $p=[pscustomobject]@{crm_history=$crm;storage_history=$storage}; Assert-RecoveryHistory $p;
    $p.storage_history+=([pscustomobject]@{id=81}); Expect-Rejection {Assert-RecoveryHistory $p}; $p.storage_history=$storage;
    $p.crm_history+=([pscustomobject]@{version='20261111151927'}); Expect-Rejection {Assert-RecoveryHistory $p};
    Expect-Rejection {Assert-RecoveryEqual ([pscustomobject]@{x=1}) ([pscustomobject]@{x=2}) 'Fixture'};
    'RECOVERY_CONTRACT_PASS';`;
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /RECOVERY_CONTRACT_PASS/);
});
